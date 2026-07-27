import api from '../../api/client';

const collectionRequirementsApi = {
  list: (params?: Record<string, any>) =>
    api.get('/collection/requirements', { params }).then((r) => r.data),
  get: (id: string) =>
    api.get(`/collection/requirements/${id}`).then((r) => r.data),
  create: (data: any) =>
    api.post('/collection/requirements', data).then((r) => r.data),
  update: (id: string, data: any) =>
    api.put(`/collection/requirements/${id}`, data).then((r) => r.data),
  delete: (id: string) =>
    api.delete(`/collection/requirements/${id}`).then((r) => r.data),
};

const collectionAssetsApi = {
  list: (params?: Record<string, any>) =>
    api.get('/collection/assets', { params }).then((r) => r.data),
  get: (id: string) =>
    api.get(`/collection/assets/${id}`).then((r) => r.data),
  create: (data: any) =>
    api.post('/collection/assets', data).then((r) => r.data),
  update: (id: string, data: any) =>
    api.put(`/collection/assets/${id}`, data).then((r) => r.data),
  delete: (id: string) =>
    api.delete(`/collection/assets/${id}`).then((r) => r.data),
};

const collectionPirsApi = {
  list: (params?: Record<string, any>) =>
    api.get('/collection/pirs', { params }).then((r) => r.data),
  create: (data: any) =>
    api.post('/collection/pirs', data).then((r) => r.data),
  update: (id: string, data: any) =>
    api.put(`/collection/pirs/${id}`, data).then((r) => r.data),
  delete: (id: string) =>
    api.delete(`/collection/pirs/${id}`).then((r) => r.data),
};

const collectionGapsApi = {
  list: () => api.get('/collection/gaps').then((r) => r.data),
};

export { collectionRequirementsApi, collectionAssetsApi, collectionPirsApi, collectionGapsApi };
