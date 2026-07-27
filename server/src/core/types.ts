import { Router } from 'express';
import type { Server as SocketIOServer } from 'socket.io';
import type { Knex } from 'knex';

export interface ModuleManifest {
  name: string;
  version: string;
  category: string;
  permissions: readonly string[];
  apiPrefix: string;
  navItems: readonly NavItemDef[];
  dashboardWidgets: readonly WidgetDef[];
  globalSearchEnabled: boolean;
}

export interface NavItemDef {
  label: string;
  path: string;
  icon: string;
  category: string;
  order: number;
  permissions?: readonly string[];
  children?: readonly NavItemDef[];
}

export interface WidgetDef {
  id: string;
  title: string;
  icon: string;
  defaultWidth: number;
  defaultHeight: number;
  permissions?: readonly string[];
}

export interface Migration {
  name: string;
  up: (knex: Knex) => Promise<void>;
  down: (knex: Knex) => Promise<void>;
}

export interface ModuleContext {
  db: Knex;
  io: SocketIOServer;
  eventBus: EventBus;
}

export interface Module {
  manifest: ModuleManifest;
  router: Router;
  register?: (ctx: ModuleContext) => void;
  migrations: Migration[];
}

export class EventBus {
  private handlers: Map<string, Set<(payload: any) => void>> = new Map();

  emit(event: string, payload: any): void {
    const listeners = this.handlers.get(event);
    if (listeners) {
      for (const handler of listeners) {
        try { handler(payload); } catch (e) { console.error(`[EventBus] Error in handler for "${event}":`, e); }
      }
    }
  }

  on(event: string, handler: (payload: any) => void): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    return () => this.handlers.get(event)?.delete(handler);
  }

  off(event: string, handler: (payload: any) => void): void {
    this.handlers.get(event)?.delete(handler);
  }

  clear(): void {
    this.handlers.clear();
  }
}
