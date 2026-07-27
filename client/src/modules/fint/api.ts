import api from '../../api/client';

export const fintApi = {
  // Transactions
  listTransactions: (params?: any) => api.get('/fint/transactions', { params }),
  getTransaction: (id: string) => api.get(`/fint/transactions/${id}`),
  createTransaction: (data: any) => api.post('/fint/transactions', data),
  updateTransaction: (id: string, data: any) => api.put(`/fint/transactions/${id}`, data),
  deleteTransaction: (id: string) => api.delete(`/fint/transactions/${id}`),

  // Entities
  listEntities: (params?: any) => api.get('/fint/entities', { params }),
  getEntity: (id: string) => api.get(`/fint/entities/${id}`),
  createEntity: (data: any) => api.post('/fint/entities', data),
  updateEntity: (id: string, data: any) => api.put(`/fint/entities/${id}`, data),
  deleteEntity: (id: string) => api.delete(`/fint/entities/${id}`),
};
