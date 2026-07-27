import React from 'react';
import type { ModuleManifest } from '../types';

export interface FrontendModule {
  name: string;
  routes: any[];
  navItems: any[];
  dashboardWidgets?: any[];
  permissions: string[];
}

class FrontendModuleRegistry {
  private modules: Map<string, FrontendModule> = new Map();

  register(mod: FrontendModule): void {
    this.modules.set(mod.name, mod);
  }

  get(name: string): FrontendModule | undefined {
    return this.modules.get(name);
  }

  getAllRoutes(): any[] {
    return Array.from(this.modules.values()).flatMap((m) => m.routes || []);
  }

  getAll(): FrontendModule[] {
    return Array.from(this.modules.values());
  }
}

export const frontendRegistry = new FrontendModuleRegistry();
