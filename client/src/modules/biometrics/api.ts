import api from '../../api/client';

export const biometricsApi = {
  // Records
  listRecords: (params?: any) => api.get('/biometrics/records', { params }),
  getRecord: (id: string) => api.get(`/biometrics/records/${id}`),
  createRecord: (data: any) => api.post('/biometrics/records', data),
  updateRecord: (id: string, data: any) => api.put(`/biometrics/records/${id}`, data),
  deleteRecord: (id: string) => api.delete(`/biometrics/records/${id}`),

  // Watchlists
  listWatchlists: (params?: any) => api.get('/biometrics/watchlists', { params }),
  getWatchlist: (id: string) => api.get(`/biometrics/watchlists/${id}`),
  createWatchlist: (data: any) => api.post('/biometrics/watchlists', data),
  updateWatchlist: (id: string, data: any) => api.put(`/biometrics/watchlists/${id}`, data),
  deleteWatchlist: (id: string) => api.delete(`/biometrics/watchlists/${id}`),

  // Encounters
  listEncounters: (params?: any) => api.get('/biometrics/encounters', { params }),
  getEncounter: (id: string) => api.get(`/biometrics/encounters/${id}`),
  createEncounter: (data: any) => api.post('/biometrics/encounters', data),
  updateEncounter: (id: string, data: any) => api.put(`/biometrics/encounters/${id}`, data),
  deleteEncounter: (id: string) => api.delete(`/biometrics/encounters/${id}`),
};
