import api from '../../api/client';

export const sourcesApi = {
  list: (params?: any) => api.get('/sources', { params }),
  get: (id: string) => api.get(`/sources/${id}`),
  create: (data: any) => api.post('/sources', data),
  update: (id: string, data: any) => api.put(`/sources/${id}`, data),
  delete: (id: string) => api.delete(`/sources/${id}`),
  listAttachments: (id: string) => api.get(`/sources/${id}/attachments`),
  uploadAttachment: (id: string, formData: FormData) =>
    api.post(`/sources/${id}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteAttachment: (id: string, attachmentId: string) =>
    api.delete(`/sources/${id}/attachments/${attachmentId}`),
};
