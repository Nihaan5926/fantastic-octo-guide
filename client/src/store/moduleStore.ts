import { create } from 'zustand';
import type { ModuleManifest, NavItem, DashboardWidget } from '../types';
import api from '../api/client';

interface ModuleState {
  manifests: ModuleManifest[];
  navItems: NavItem[];
  widgets: DashboardWidget[];
  isLoading: boolean;

  loadModules: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

export const useModuleStore = create<ModuleState>((set, get) => ({
  manifests: [],
  navItems: [],
  widgets: [],
  isLoading: false,

  loadModules: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/');
      set({
        manifests: data.modules || [],
        navItems: data.navItems || [],
        widgets: data.dashboardWidgets || [],
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  hasPermission: (permission: string) => {
    const manifests = get().manifests;
    // Check if user's role has access to any module that requires this permission
    // This is a client-side fast check; the server enforces actual RBAC
    return manifests.some((m) => m.permissions.includes(permission) || m.permissions.includes('*'));
  },
}));
