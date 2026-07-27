import api from '../../api/client';

export const casesApi = {
  list: (params?: any) => api.get('/cases', { params }),
  get: (id: string) => api.get(`/cases/${id}`),
  create: (data: any) => api.post('/cases', data),
  update: (id: string, data: any) => api.put(`/cases/${id}`, data),
  delete: (id: string) => api.delete(`/cases/${id}`),
  addMember: (id: string, data: any) => api.post(`/cases/${id}/members`, data),
  removeMember: (id: string, userId: string) => api.delete(`/cases/${id}/members/${userId}`),
  getTimeline: (id: string) => api.get(`/cases/${id}/timeline`),
  getChildren: (id: string) => api.get(`/cases/${id}/children`),
  createChild: (id: string, data: any) => api.post(`/cases/${id}/children`, data),
  listAttachments: (id: string) => api.get(`/cases/${id}/attachments`),
  uploadAttachment: (id: string, formData: FormData) =>
    api.post(`/cases/${id}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteAttachment: (id: string, attachmentId: string) =>
    api.delete(`/cases/${id}/attachments/${attachmentId}`),
};
