import api from '../../api/client';

export const sigintApi = {
  // Intercepts
  listIntercepts: (params?: any) => api.get('/sigint/intercepts', { params }),
  getIntercept: (id: string) => api.get(`/sigint/intercepts/${id}`),
  createIntercept: (data: any) => api.post('/sigint/intercepts', data),
  updateIntercept: (id: string, data: any) => api.put(`/sigint/intercepts/${id}`, data),
  deleteIntercept: (id: string) => api.delete(`/sigint/intercepts/${id}`),

  // Emitters
  listEmitters: (params?: any) => api.get('/sigint/emitters', { params }),
  getEmitter: (id: string) => api.get(`/sigint/emitters/${id}`),
  createEmitter: (data: any) => api.post('/sigint/emitters', data),
  updateEmitter: (id: string, data: any) => api.put(`/sigint/emitters/${id}`, data),
  deleteEmitter: (id: string) => api.delete(`/sigint/emitters/${id}`),
};
