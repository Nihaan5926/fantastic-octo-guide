import api from '../../api/client';

export const legalApi = {
  listReviews: (params?: any) => api.get('/legal/reviews', { params }),
  getReview: (id: string) => api.get(`/legal/reviews/${id}`),
  createReview: (data: any) => api.post('/legal/reviews', data),
  updateReview: (id: string, data: any) => api.put(`/legal/reviews/${id}`, data),
  deleteReview: (id: string) => api.delete(`/legal/reviews/${id}`),

  listCompliance: (params?: any) => api.get('/legal/compliance', { params }),
  getCompliance: (id: string) => api.get(`/legal/compliance/${id}`),
  createCompliance: (data: any) => api.post('/legal/compliance', data),
  updateCompliance: (id: string, data: any) => api.put(`/legal/compliance/${id}`, data),
  deleteCompliance: (id: string) => api.delete(`/legal/compliance/${id}`),
};
