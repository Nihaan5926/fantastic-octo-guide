import api from '../../api/client';

const BASE = '/training';

export const trainingApi = {
  listCourses: (params?: Record<string, any>) => api.get(`${BASE}/courses`, { params }),
  getCourse: (id: string) => api.get(`${BASE}/courses/${id}`),
  createCourse: (data: any) => api.post(`${BASE}/courses`, data),
  updateCourse: (id: string, data: any) => api.put(`${BASE}/courses/${id}`, data),
  deleteCourse: (id: string) => api.delete(`${BASE}/courses/${id}`),
  listEnrollments: (params?: Record<string, any>) => api.get(`${BASE}/enrollments`, { params }),
  getEnrollment: (id: string) => api.get(`${BASE}/enrollments/${id}`),
  createEnrollment: (data: any) => api.post(`${BASE}/enrollments`, data),
  updateEnrollment: (id: string, data: any) => api.put(`${BASE}/enrollments/${id}`, data),
  deleteEnrollment: (id: string) => api.delete(`${BASE}/enrollments/${id}`),
  listAARs: (params?: Record<string, any>) => api.get(`${BASE}/aar`, { params }),
  getAAR: (id: string) => api.get(`${BASE}/aar/${id}`),
  createAAR: (data: any) => api.post(`${BASE}/aar`, data),
  updateAAR: (id: string, data: any) => api.put(`${BASE}/aar/${id}`, data),
  deleteAAR: (id: string) => api.delete(`${BASE}/aar/${id}`),
};
