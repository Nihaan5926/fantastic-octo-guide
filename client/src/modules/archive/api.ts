import api from '../../api/client';

export const archiveApi = {
  listRecords: (params?: any) => api.get('/archive/records', { params }),
  getRecord: (id: string) => api.get(`/archive/records/${id}`),
  createRecord: (data: any) => api.post('/archive/records', data),
  updateRecord: (id: string, data: any) => api.put(`/archive/records/${id}`, data),
  deleteRecord: (id: string) => api.delete(`/archive/records/${id}`),

  listDeclassRequests: (params?: any) => api.get('/archive/declassification', { params }),
  getDeclassRequest: (id: string) => api.get(`/archive/declassification/${id}`),
  createDeclassRequest: (data: any) => api.post('/archive/declassification', data),
  updateDeclassRequest: (id: string, data: any) => api.put(`/archive/declassification/${id}`, data),
  deleteDeclassRequest: (id: string) => api.delete(`/archive/declassification/${id}`),
};
