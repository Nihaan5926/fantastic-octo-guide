import api from '../../api/client';

const BASE = '/personnel';

export const personnelApi = {
  list: (params?: Record<string, any>) => api.get(BASE, { params }),
  get: (id: string) => api.get(`${BASE}/${id}`),
  create: (data: any) => api.post(BASE, data),
  update: (id: string, data: any) => api.put(`${BASE}/${id}`, data),
  delete: (id: string) => api.delete(`${BASE}/${id}`),

  listAttachments: (personnelId: string) => api.get(`${BASE}/${personnelId}/attachments`),
  uploadAttachment: (personnelId: string, formData: FormData) =>
    api.post(`${BASE}/${personnelId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteAttachment: (personnelId: string, attachmentId: string) =>
    api.delete(`${BASE}/${personnelId}/attachments/${attachmentId}`),
};
