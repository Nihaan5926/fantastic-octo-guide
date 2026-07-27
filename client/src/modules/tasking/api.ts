import api from '../../api/client';

const taskingAssignmentsApi = {
  list: (params?: Record<string, any>) =>
    api.get('/tasking/assignments', { params }).then((r) => r.data),
  get: (id: string) =>
    api.get(`/tasking/assignments/${id}`).then((r) => r.data),
  create: (data: any) =>
    api.post('/tasking/assignments', data).then((r) => r.data),
  update: (id: string, data: any) =>
    api.put(`/tasking/assignments/${id}`, data).then((r) => r.data),
  delete: (id: string) =>
    api.delete(`/tasking/assignments/${id}`).then((r) => r.data),
};

const taskingWorkflowsApi = {
  list: (params?: Record<string, any>) =>
    api.get('/tasking/workflows', { params }).then((r) => r.data),
  get: (id: string) =>
    api.get(`/tasking/workflows/${id}`).then((r) => r.data),
  create: (data: any) =>
    api.post('/tasking/workflows', data).then((r) => r.data),
  update: (id: string, data: any) =>
    api.put(`/tasking/workflows/${id}`, data).then((r) => r.data),
  delete: (id: string) =>
    api.delete(`/tasking/workflows/${id}`).then((r) => r.data),
};

export { taskingAssignmentsApi, taskingWorkflowsApi };
