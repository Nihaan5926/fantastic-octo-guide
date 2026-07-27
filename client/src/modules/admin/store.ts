import { create } from 'zustand';
import { adminApi } from './api';

interface User { id: string; email: string; first_name: string; last_name: string; rank?: string; clearance: string; is_active: boolean; role_name: string; last_login_at?: string; created_at?: string; }
interface Role { id: string; name: string; description?: string; permissions: string[]; userCount: number; }
interface AuditLog { id: string; user_id?: string; user_email?: string; user_first?: string; user_last?: string; action: string; entity_type?: string; entity_id?: string; changes: any; ip_address?: string; created_at: string; }

interface AdminStore {
  users: User[];
  usersPagination: any;
  roles: Role[];
  auditLogs: AuditLog[];
  auditLogsPagination: any;
  stats: { users: number; roles: number; auditLogs: number };
  isLoading: boolean;
  error: string | null;

  fetchUsers: (params?: any) => Promise<void>;
  createUser: (data: any) => Promise<void>;
  updateUser: (id: string, data: any) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  permanentDeleteUser: (id: string) => Promise<void>;
  reactivateUser: (id: string) => Promise<void>;
  fetchRoles: () => Promise<void>;
  createRole: (data: any) => Promise<void>;
  updateRole: (id: string, data: any) => Promise<void>;
  deleteRole: (id: string) => Promise<void>;
  fetchAuditLogs: (params?: any) => Promise<void>;
  fetchStats: () => Promise<void>;
}

export const useAdminStore = create<AdminStore>((set, get) => ({
  users: [],
  usersPagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
  roles: [],
  auditLogs: [],
  auditLogsPagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
  stats: { users: 0, roles: 0, auditLogs: 0 },
  isLoading: false,
  error: null,

  fetchUsers: async (params = {}) => {
    set({ isLoading: true });
    try { const d = await adminApi.listUsers(params); set({ users: d.data, usersPagination: d.pagination, isLoading: false }); }
    catch (e: any) { set({ error: e.message, isLoading: false }); }
  },
  createUser: async (data) => { await adminApi.createUser(data); await get().fetchUsers(); },
  updateUser: async (id, data) => { await adminApi.updateUser(id, data); await get().fetchUsers(); },
  deleteUser: async (id) => { await adminApi.deleteUser(id); set((s) => ({ users: s.users.map((u) => u.id === id ? { ...u, is_active: false } : u) })); },
  permanentDeleteUser: async (id) => { await adminApi.permanentDeleteUser(id); set((s) => ({ users: s.users.filter((u) => u.id !== id) })); },
  reactivateUser: async (id) => { await adminApi.reactivateUser(id); set((s) => ({ users: s.users.map((u) => u.id === id ? { ...u, is_active: true } : u) })); },

  fetchRoles: async () => {
    try { const d = await adminApi.listRoles(); set({ roles: d.data }); } catch { set({ error: 'Operation failed' }); }
  },
  createRole: async (data) => { await adminApi.createRole(data); await get().fetchRoles(); },
  updateRole: async (id, data) => { await adminApi.updateRole(id, data); await get().fetchRoles(); },
  deleteRole: async (id) => { await adminApi.deleteRole(id); set((s) => ({ roles: s.roles.filter((r) => r.id !== id) })); },

  fetchAuditLogs: async (params = {}) => {
    set({ isLoading: true });
    try { const d = await adminApi.listAuditLogs(params); set({ auditLogs: d.data, auditLogsPagination: d.pagination, isLoading: false }); }
    catch (e: any) { set({ error: e.message, isLoading: false }); }
  },
  fetchStats: async () => {
    try { const d = await adminApi.getStats(); set({ stats: d }); } catch { set({ error: 'Operation failed' }); }
  },
}));
