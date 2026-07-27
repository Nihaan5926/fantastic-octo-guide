import api from '../../api/client';

const BASE = '/watch-center';

export const watchCenterApi = {
  listShifts: (params?: Record<string, any>) => api.get(`${BASE}/shifts`, { params }),
  getShift: (id: string) => api.get(`${BASE}/shifts/${id}`),
  createShift: (data: any) => api.post(`${BASE}/shifts`, data),
  updateShift: (id: string, data: any) => api.put(`${BASE}/shifts/${id}`, data),
  deleteShift: (id: string) => api.delete(`${BASE}/shifts/${id}`),
  listLogs: (params?: Record<string, any>) => api.get(`${BASE}/logs`, { params }),
  getLog: (id: string) => api.get(`${BASE}/logs/${id}`),
  createLog: (data: any) => api.post(`${BASE}/logs`, data),
  updateLog: (id: string, data: any) => api.put(`${BASE}/logs/${id}`, data),
  deleteLog: (id: string) => api.delete(`${BASE}/logs/${id}`),
  listSITREPs: (params?: Record<string, any>) => api.get(`${BASE}/sitreps`, { params }),
  getSITREP: (id: string) => api.get(`${BASE}/sitreps/${id}`),
  createSITREP: (data: any) => api.post(`${BASE}/sitreps`, data),
  updateSITREP: (id: string, data: any) => api.put(`${BASE}/sitreps/${id}`, data),
  deleteSITREP: (id: string) => api.delete(`${BASE}/sitreps/${id}`),
};
