import api from '../../api/client';

const BASE = '/org-chart';

export const orgChartApi = {
  getTree: () => api.get(`${BASE}/units/tree`),
  listUnits: (params?: Record<string, any>) => api.get(`${BASE}/units`, { params }),
  getUnit: (id: string) => api.get(`${BASE}/units/${id}`),
  createUnit: (data: any) => api.post(`${BASE}/units`, data),
  updateUnit: (id: string, data: any) => api.put(`${BASE}/units/${id}`, data),
  deleteUnit: (id: string) => api.delete(`${BASE}/units/${id}`),
  listAssignments: (params?: Record<string, any>) => api.get(`${BASE}/assignments`, { params }),
  createAssignment: (data: any) => api.post(`${BASE}/assignments`, data),
  updateAssignment: (id: string, data: any) => api.put(`${BASE}/assignments/${id}`, data),
  deleteAssignment: (id: string) => api.delete(`${BASE}/assignments/${id}`),
};
