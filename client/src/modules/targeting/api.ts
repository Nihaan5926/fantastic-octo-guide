import api from '../../api/client';

const targetPackagesApi = {
  list: (params?: Record<string, any>) => api.get('/targeting/packages', { params }).then((r) => r.data),
  get: (id: string) => api.get(`/targeting/packages/${id}`).then((r) => r.data),
  create: (data: any) => api.post('/targeting/packages', data).then((r) => r.data),
  update: (id: string, data: any) => api.put(`/targeting/packages/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/targeting/packages/${id}`).then((r) => r.data),
};

const targetNominationsApi = {
  list: (packageId: string, params?: Record<string, any>) =>
    api.get(`/targeting/packages/${packageId}/nominations`, { params }).then((r) => r.data),
  create: (packageId: string, data: any) =>
    api.post(`/targeting/packages/${packageId}/nominations`, data).then((r) => r.data),
  update: (id: string, data: any) =>
    api.put(`/targeting/nominations/${id}`, data).then((r) => r.data),
  delete: (id: string) =>
    api.delete(`/targeting/nominations/${id}`).then((r) => r.data),
};

export { targetPackagesApi, targetNominationsApi };
