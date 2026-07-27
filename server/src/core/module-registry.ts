import { Router } from 'express';
import { readdirSync } from 'fs';
import path from 'path';
import type { Module, ModuleManifest, ModuleContext, EventBus } from './types';
import type { Knex } from 'knex';
import type { Server as SocketIOServer } from 'socket.io';

class ModuleRegistry {
  private modules: Map<string, Module> = new Map();

  async loadAll(moduleDir: string, ctx: ModuleContext): Promise<void> {
    const entries = readdirSync(moduleDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('_') || entry.name.startsWith('.')) continue;

      const modulePath = path.join(moduleDir, entry.name, 'index');
      try {
        const mod = require(modulePath).default as Module;
        if (!mod || !mod.manifest || !mod.router) {
          console.warn(`[ModuleRegistry] Skipping "${entry.name}": missing manifest or router`);
          continue;
        }
        this.modules.set(mod.manifest.name, mod);

        if (mod.register) {
          mod.register(ctx);
        }

        console.log(`[ModuleRegistry] Loaded module: ${mod.manifest.name} (${mod.manifest.category})`);
      } catch (err: any) {
        console.error(`[ModuleRegistry] Failed to load module "${entry.name}":`, err.message);
      }
    }
  }

  get(name: string): Module | undefined {
    return this.modules.get(name);
  }

  getAll(): Module[] {
    return Array.from(this.modules.values());
  }

  getAllManifests(): ModuleManifest[] {
    return this.getAll().map(m => m.manifest);
  }

  getAllMigrations(): Array<{ module: string; migration: any }> {
    const result: Array<{ module: string; migration: any }> = [];
    for (const [name, mod] of this.modules) {
      for (const mig of mod.migrations) {
        result.push({ module: name, migration: mig });
      }
    }
    return result;
  }
}

export const moduleRegistry = new ModuleRegistry();
