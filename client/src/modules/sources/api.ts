import api from '../../api/client';

export const sourcesApi = {
  list: (params?: any) => api.get('/sources', { params }),
  get: (id: string) => api.get(`/sources/${id}`),
  create: (data: any) => api.post('/sources', data),
  update: (id: string, data: any) => api.put(`/sources/${id}`, data),
  delete: (id: string) => api.delete(`/sources/${id}`),
};
