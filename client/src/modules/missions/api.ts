import api from '../../api/client';

const missionPlansApi = {
  list: (params?: Record<string, any>) => api.get('/missions/plans', { params }).then((r) => r.data),
  get: (id: string) => api.get(`/missions/plans/${id}`).then((r) => r.data),
  create: (data: any) => api.post('/missions/plans', data).then((r) => r.data),
  update: (id: string, data: any) => api.put(`/missions/plans/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/missions/plans/${id}`).then((r) => r.data),
  listAttachments: (id: string) => api.get(`/missions/plans/${id}/attachments`),
  uploadAttachment: (id: string, formData: FormData) =>
    api.post(`/missions/plans/${id}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteAttachment: (id: string, attachmentId: string) =>
    api.delete(`/missions/plans/${id}/attachments/${attachmentId}`),
  getRoster: (id: string) => api.get(`/missions/plans/${id}/roster`),
  addRosterMember: (id: string, data: any) => api.post(`/missions/plans/${id}/roster`, data),
  removeRosterMember: (id: string, userId: string) => api.delete(`/missions/plans/${id}/roster/${userId}`),
};

const missionBriefsApi = {
  list: (planId: string, params?: Record<string, any>) =>
    api.get(`/missions/plans/${planId}/briefs`, { params }).then((r) => r.data),
  get: (planId: string, id: string) =>
    api.get(`/missions/plans/${planId}/briefs/${id}`).then((r) => r.data),
  create: (planId: string, data: any) =>
    api.post(`/missions/plans/${planId}/briefs`, data).then((r) => r.data),
  update: (planId: string, id: string, data: any) =>
    api.put(`/missions/plans/${planId}/briefs/${id}`, data).then((r) => r.data),
  delete: (planId: string, id: string) =>
    api.delete(`/missions/plans/${planId}/briefs/${id}`).then((r) => r.data),
};

const missionDebriefsApi = {
  list: (planId: string, params?: Record<string, any>) =>
    api.get(`/missions/plans/${planId}/debriefs`, { params }).then((r) => r.data),
  get: (planId: string, id: string) =>
    api.get(`/missions/plans/${planId}/debriefs/${id}`).then((r) => r.data),
  create: (planId: string, data: any) =>
    api.post(`/missions/plans/${planId}/debriefs`, data).then((r) => r.data),
  update: (planId: string, id: string, data: any) =>
    api.put(`/missions/plans/${planId}/debriefs/${id}`, data).then((r) => r.data),
  delete: (planId: string, id: string) =>
    api.delete(`/missions/plans/${planId}/debriefs/${id}`).then((r) => r.data),
};

export { missionPlansApi, missionBriefsApi, missionDebriefsApi };
