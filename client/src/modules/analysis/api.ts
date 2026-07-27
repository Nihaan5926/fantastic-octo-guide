import api from '../../api/client';

export const analysisApi = {
  list: (params?: any) => api.get('/analysis/relationships', { params }),
  get: (id: string) => api.get(`/analysis/relationships/${id}`),
  create: (data: any) => api.post('/analysis/relationships', data),
  delete: (id: string) => api.delete(`/analysis/relationships/${id}`),
  importCsv: (csv: string) => api.post('/analysis/relationships/import', { csv }),
  getGraph: (params?: any) => api.get('/analysis/graph', { params }),
  getGraphStats: () => api.get('/analysis/graph/stats'),
  getTimeline: () => api.get('/analysis/timeline'),
};
