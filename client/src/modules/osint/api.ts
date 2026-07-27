import api from '../../api/client';

export const osintApi = {
  list: (params?: any) => api.get('/osint/tasks', { params }),
  get: (id: string) => api.get(`/osint/tasks/${id}`),
  create: (data: any) => api.post('/osint/tasks', data),
  update: (id: string, data: any) => api.put(`/osint/tasks/${id}`, data),
  delete: (id: string) => api.delete(`/osint/tasks/${id}`),
  run: (id: string) => api.post(`/osint/tasks/${id}/run`),
  getResults: (id: string, params?: any) => api.get(`/osint/tasks/${id}/results`, { params }),
  schedule: (id: string, schedule: string, enabled?: boolean) => api.put(`/osint/tasks/${id}/schedule`, { schedule, enabled }),
  exportResults: (id: string, format?: string) => api.get(`/osint/tasks/${id}/results/export`, { params: { format } }),
};
