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
};
