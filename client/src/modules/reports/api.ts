import api from '../../api/client';

export const reportsApi = {
  list: (params?: any) => api.get('/reports', { params }),
  get: (id: string) => api.get(`/reports/${id}`),
  create: (data: any) => api.post('/reports', data),
  update: (id: string, data: any) => api.put(`/reports/${id}`, data),
  delete: (id: string) => api.delete(`/reports/${id}`),
  submit: (id: string) => api.put(`/reports/${id}/submit`),
  approve: (id: string) => api.put(`/reports/${id}/approve`),
  reject: (id: string, reason: string) => api.put(`/reports/${id}/reject`, { rejection_reason: reason }),
  getComments: (id: string) => api.get(`/reports/${id}/comments`),
  addComment: (id: string, data: any) => api.post(`/reports/${id}/comments`, data),
  listAttachments: (id: string) => api.get(`/reports/${id}/attachments`),
  uploadAttachment: (id: string, formData: FormData) =>
    api.post(`/reports/${id}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteAttachment: (id: string, attachmentId: string) =>
    api.delete(`/reports/${id}/attachments/${attachmentId}`),
  getVersions: (id: string) => api.get(`/reports/${id}/versions`),
  getVersion: (id: string, vid: string) => api.get(`/reports/${id}/versions/${vid}`),
  generateSummary: (params: { startDate: string; endDate: string }) => api.post('/reports/generate-summary', params),
};
