import api from '../../api/client';

export const briefingsApi = {
  list: (params?: any) => api.get('/briefings', { params }),
  get: (id: string) => api.get(`/briefings/${id}`),
  create: (data: any) => api.post('/briefings', data),
  update: (id: string, data: any) => api.put(`/briefings/${id}`, data),
  delete: (id: string) => api.delete(`/briefings/${id}`),

  listDistributions: (briefingId: string) => api.get(`/briefings/${briefingId}/distributions`),
  addDistribution: (briefingId: string, data: any) => api.post(`/briefings/${briefingId}/distributions`, data),
  removeDistribution: (briefingId: string, distributionId: string) => api.delete(`/briefings/${briefingId}/distributions/${distributionId}`),

  listAttachments: (briefingId: string) => api.get(`/briefings/${briefingId}/attachments`),
  uploadAttachment: (briefingId: string, formData: FormData) =>
    api.post(`/briefings/${briefingId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteAttachment: (briefingId: string, attachmentId: string) =>
    api.delete(`/briefings/${briefingId}/attachments/${attachmentId}`),
};
