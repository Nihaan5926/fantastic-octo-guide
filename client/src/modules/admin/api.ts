import api from '../../api/client';

export const adminApi = {
  // Users
  listUsers: (params?: any) => api.get('/admin/users', { params }).then((r) => r.data),
  getUser: (id: string) => api.get(`/admin/users/${id}`).then((r) => r.data),
  createUser: (data: any) => api.post('/admin/users', data).then((r) => r.data),
  updateUser: (id: string, data: any) => api.put(`/admin/users/${id}`, data).then((r) => r.data),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`).then((r) => r.data),
  permanentDeleteUser: (id: string) => api.delete(`/admin/users/${id}/permanent`).then((r) => r.data),

  // Roles
  listRoles: () => api.get('/admin/roles').then((r) => r.data),
  getRole: (id: string) => api.get(`/admin/roles/${id}`).then((r) => r.data),
  createRole: (data: any) => api.post('/admin/roles', data).then((r) => r.data),
  updateRole: (id: string, data: any) => api.put(`/admin/roles/${id}`, data).then((r) => r.data),
  deleteRole: (id: string) => api.delete(`/admin/roles/${id}`).then((r) => r.data),

  // Audit Logs
  listAuditLogs: (params?: any) => api.get('/admin/audit-logs', { params }).then((r) => r.data),

  // Stats
  getStats: () => api.get('/admin/stats').then((r) => r.data),
};
