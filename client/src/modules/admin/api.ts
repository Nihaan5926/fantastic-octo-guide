import api from '../../api/client';

export const adminApi = {
  // Users
  listUsers: (params?: any) => api.get('/admin/users', { params }).then((r) => r.data),
  getUser: (id: string) => api.get(`/admin/users/${id}`).then((r) => r.data),
  createUser: (data: any) => api.post('/admin/users', data).then((r) => r.data),
  updateUser: (id: string, data: any) => api.put(`/admin/users/${id}`, data).then((r) => r.data),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`).then((r) => r.data),
  permanentDeleteUser: (id: string) => api.delete(`/admin/users/${id}/permanent`).then((r) => r.data),
  reactivateUser: (id: string) => api.post(`/admin/users/${id}/reactivate`).then((r) => r.data),

  // User sessions (admin)
  getUserSessions: (userId: string) => api.get(`/admin/users/${userId}/sessions`).then((r) => r.data),
  revokeUserSession: (userId: string, sessionId: string) => api.delete(`/admin/users/${userId}/sessions/${sessionId}`).then((r) => r.data),

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

  // Announcements
  listAnnouncements: () => api.get('/admin/announcements').then((r) => r.data),
  createAnnouncement: (data: any) => api.post('/admin/announcements', data).then((r) => r.data),
  updateAnnouncement: (id: string, data: any) => api.put(`/admin/announcements/${id}`, data).then((r) => r.data),
  deleteAnnouncement: (id: string) => api.delete(`/admin/announcements/${id}`).then((r) => r.data),

  // API Keys
  listApiKeys: () => api.get('/admin/api-keys').then((r) => r.data),
  createApiKey: (data: any) => api.post('/admin/api-keys', data).then((r) => r.data),
  deleteApiKey: (id: string) => api.delete(`/admin/api-keys/${id}`).then((r) => r.data),
};
