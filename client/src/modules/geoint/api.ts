import api from '../../api/client';

export const geointApi = {
  // Features
  listFeatures: (params?: any) => api.get('/geoint/features', { params }),
  getFeature: (id: string) => api.get(`/geoint/features/${id}`),
  createFeature: (data: any) => api.post('/geoint/features', data),
  updateFeature: (id: string, data: any) => api.put(`/geoint/features/${id}`, data),
  deleteFeature: (id: string) => api.delete(`/geoint/features/${id}`),

  // Annotations
  listAnnotations: (featureId: string, params?: any) =>
    api.get(`/geoint/features/${featureId}/annotations`, { params }),
  createAnnotation: (featureId: string, data: any) =>
    api.post(`/geoint/features/${featureId}/annotations`, data),
  updateAnnotation: (id: string, data: any) => api.put(`/geoint/annotations/${id}`, data),
  deleteAnnotation: (id: string) => api.delete(`/geoint/annotations/${id}`),
};
