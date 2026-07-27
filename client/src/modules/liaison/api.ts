import api from '../../api/client';

export const liaisonApi = {
  listPartners: (params?: any) => api.get('/liaison/partners', { params }),
  getPartner: (id: string) => api.get(`/liaison/partners/${id}`),
  createPartner: (data: any) => api.post('/liaison/partners', data),
  updatePartner: (id: string, data: any) => api.put(`/liaison/partners/${id}`, data),
  deletePartner: (id: string) => api.delete(`/liaison/partners/${id}`),

  listMous: (params?: any) => api.get('/liaison/agreements', { params }),
  getMou: (id: string) => api.get(`/liaison/agreements/${id}`),
  createMou: (data: any) => api.post('/liaison/agreements', data),
  updateMou: (id: string, data: any) => api.put(`/liaison/agreements/${id}`, data),
  deleteMou: (id: string) => api.delete(`/liaison/agreements/${id}`),

  listContactLogs: (partnerId?: string, params?: any) => {
    const url = partnerId ? `/liaison/partners/${partnerId}/contact-logs` : '/liaison/contact-logs';
    return api.get(url, { params });
  },
  createContactLog: (data: any) => api.post('/liaison/contact-logs', data),
  deleteContactLog: (id: string) => api.delete(`/liaison/contact-logs/${id}`),
};
