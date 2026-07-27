import api from '../../api/client';

export const threatsApi = {
  listActors: (params?: any) => api.get('/threats/actors', { params }),
  getActor: (id: string) => api.get(`/threats/actors/${id}`),
  createActor: (data: any) => api.post('/threats/actors', data),
  updateActor: (id: string, data: any) => api.put(`/threats/actors/${id}`, data),
  deleteActor: (id: string) => api.delete(`/threats/actors/${id}`),
  listIndicators: (params?: any) => api.get('/threats/indicators', { params }),
  createIndicator: (data: any) => api.post('/threats/indicators', data),
  deleteIndicator: (id: string) => api.delete(`/threats/indicators/${id}`),
  getActorRelationships: (id: string) => api.get(`/threats/actors/${id}/relationships`),
  getActorSummary: (id: string) => api.get(`/threats/actors/${id}/summary`),
  listAttachments: (id: string) => api.get(`/threats/actors/${id}/attachments`),
  uploadAttachment: (id: string, formData: FormData) =>
    api.post(`/threats/actors/${id}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteAttachment: (id: string, attachmentId: string) =>
    api.delete(`/threats/actors/${id}/attachments/${attachmentId}`),
  calculateRisk: (id: string) => api.post(`/threats/actors/${id}/calculate-risk`),
  updateAssessment: (id: string, data: { likelihood: number; impact: number }) =>
    api.put(`/threats/actors/${id}/assessment`, data),
  screening: (values: string[]) => api.post('/threats/screening', { values }),
  importBulk: (data: any) => api.post('/threats/import', data),
};
