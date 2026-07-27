import api from '../../api/client';

export const reportsApi = {
  list: (params?: any) => api.get('/reports', { params }),
  get: (id: string) => api.get(`/reports/${id}`),
  create: (data: any) => api.post('/reports', data),
  update: (id: string, data: any) => api.put(`/reports/${id}`, data),
  delete: (id: string) => api.delete(`/reports/${id}`),
  getComments: (id: string) => api.get(`/reports/${id}/comments`),
  addComment: (id: string, data: any) => api.post(`/reports/${id}/comments`, data),
};
