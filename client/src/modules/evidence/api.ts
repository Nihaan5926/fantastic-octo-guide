import api from '../../api/client';

export const evidenceApi = {
  list: (params?: any) => api.get('/evidence', { params }),
  get: (id: string) => api.get(`/evidence/${id}`),
  update: (id: string, data: any) => api.put(`/evidence/${id}`, data),
  create: (data: any) => api.post('/evidence', data),
  createWithFile: (formData: FormData) =>
    api.post('/evidence', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  addCustody: (id: string, action: string) =>
    api.post(`/evidence/${id}/custody`, { action }),
  preview: (id: string) => api.get(`/evidence/${id}/preview`),
  download: (id: string) =>
    api.get(`/evidence/${id}/download`, { responseType: 'blob' }),
  delete: (id: string) => api.delete(`/evidence/${id}`),
};
