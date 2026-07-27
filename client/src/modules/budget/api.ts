import api from '../../api/client';

export const budgetApi = {
  listPrograms: (params?: any) => api.get('/budget/budgets', { params }),
  getProgram: (id: string) => api.get(`/budget/budgets/${id}`),
  createProgram: (data: any) => api.post('/budget/budgets', data),
  updateProgram: (id: string, data: any) => api.put(`/budget/budgets/${id}`, data),
  deleteProgram: (id: string) => api.delete(`/budget/budgets/${id}`),

  listContracts: (params?: any) => api.get('/budget/contracts', { params }),
  getContract: (id: string) => api.get(`/budget/contracts/${id}`),
  createContract: (data: any) => api.post('/budget/contracts', data),
  updateContract: (id: string, data: any) => api.put(`/budget/contracts/${id}`, data),
  deleteContract: (id: string) => api.delete(`/budget/contracts/${id}`),
};
