import api from '../../api/client';

export const ciApi = {
  // Investigations
  listInvestigations: (params?: any) => api.get('/ci/investigations', { params }),
  getInvestigation: (id: string) => api.get(`/ci/investigations/${id}`),
  createInvestigation: (data: any) => api.post('/ci/investigations', data),
  updateInvestigation: (id: string, data: any) => api.put(`/ci/investigations/${id}`, data),
  deleteInvestigation: (id: string) => api.delete(`/ci/investigations/${id}`),

  // Foreign Agents
  listForeignAgents: (params?: any) => api.get('/ci/foreign-agents', { params }),
  getForeignAgent: (id: string) => api.get(`/ci/foreign-agents/${id}`),
  createForeignAgent: (data: any) => api.post('/ci/foreign-agents', data),
  updateForeignAgent: (id: string, data: any) => api.put(`/ci/foreign-agents/${id}`, data),
  deleteForeignAgent: (id: string) => api.delete(`/ci/foreign-agents/${id}`),

  // Insider Threats
  listInsiderThreats: (params?: any) => api.get('/ci/insider-threats', { params }),
  getInsiderThreat: (id: string) => api.get(`/ci/insider-threats/${id}`),
  createInsiderThreat: (data: any) => api.post('/ci/insider-threats', data),
  updateInsiderThreat: (id: string, data: any) => api.put(`/ci/insider-threats/${id}`, data),
  deleteInsiderThreat: (id: string) => api.delete(`/ci/insider-threats/${id}`),
};
