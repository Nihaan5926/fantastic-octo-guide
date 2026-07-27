import api from '../../api/client';

export const messagingApi = {
  listChannels: (params?: any) => api.get('/messaging/channels', { params }),
  getChannel: (id: string) => api.get(`/messaging/channels/${id}`),
  createChannel: (data: any) => api.post('/messaging/channels', data),
  updateChannel: (id: string, data: any) => api.put(`/messaging/channels/${id}`, data),
  deleteChannel: (id: string) => api.delete(`/messaging/channels/${id}`),

  listMessages: (params?: any) => api.get('/messaging/messages', { params }),
  sendMessage: (data: any) => api.post('/messaging/messages', data),
  updateMessage: (id: string, data: any) => api.put(`/messaging/messages/${id}`, data),
  deleteMessage: (id: string) => api.delete(`/messaging/messages/${id}`),

  listMembers: (channelId: string) => api.get(`/messaging/channels/${channelId}/members`),
  addMember: (channelId: string, data: any) => api.post(`/messaging/channels/${channelId}/members`, data),
  removeMember: (channelId: string, memberId: string) => api.delete(`/messaging/channels/${channelId}/members/${memberId}`),
};
