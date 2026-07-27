import api from '../../api/client';

export const reportsApi = {
  list: (params?: any) => api.get('/reports', { params }),
  get: (id: string) => api.get(`/reports/${id}`),
  create: (data: any) => api.post('/reports', data),
  update: (id: string, data: any) => api.put(`/reports/${id}`, data),
  delete: (id: string) => api.delete(`/reports/${id}`),
  getComments: (id: string) => api.get(`/reports/${id}/comments`),
  addComment: (id: string, data: any) => api.post(`/reports/${id}/comments`, data),
  listAttachments: (id: string) => api.get(`/reports/${id}/attachments`),
  uploadAttachment: (id: string, formData: FormData) =>
    api.post(`/reports/${id}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteAttachment: (id: string, attachmentId: string) =>
    api.delete(`/reports/${id}/attachments/${attachmentId}`),
};
