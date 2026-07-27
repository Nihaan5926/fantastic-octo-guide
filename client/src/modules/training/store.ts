import { create } from 'zustand';
import { trainingApi } from './api';

export interface TrainingCourse {
  id: string;
  title: string;
  description: string | null;
  course_type: string;
  duration_hours: number;
  instructor: string | null;
  is_required: boolean;
  prerequisite_course_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TrainingEnrollment {
  id: string;
  course_id: string;
  user_id: string;
  status: string;
  enrolled_date: string | null;
  completed_date: string | null;
  score: number | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AfterActionReport {
  id: string;
  course_id: string;
  report_date: string | null;
  summary: string | null;
  recommendations: string | null;
  created_by: string | null;
  created_at?: string;
  updated_at?: string;
}

interface TrainingState {
  courses: TrainingCourse[];
  enrollments: TrainingEnrollment[];
  aars: AfterActionReport[];
  coursesPagination: { page: number; limit: number; total: number; totalPages: number };
  enrollmentsPagination: { page: number; limit: number; total: number; totalPages: number };
  aarsPagination: { page: number; limit: number; total: number; totalPages: number };
  isLoading: boolean;
  error: string | null;
  fetchCourses: (params?: Record<string, any>) => Promise<void>;
  fetchEnrollments: (params?: Record<string, any>) => Promise<void>;
  fetchAARs: (params?: Record<string, any>) => Promise<void>;
  createCourse: (data: Partial<TrainingCourse>) => Promise<void>;
  updateCourse: (id: string, data: Partial<TrainingCourse>) => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;
  createEnrollment: (data: Partial<TrainingEnrollment>) => Promise<void>;
  updateEnrollment: (id: string, data: Partial<TrainingEnrollment>) => Promise<void>;
  deleteEnrollment: (id: string) => Promise<void>;
  createAAR: (data: Partial<AfterActionReport>) => Promise<void>;
  updateAAR: (id: string, data: Partial<AfterActionReport>) => Promise<void>;
  deleteAAR: (id: string) => Promise<void>;
}

export const useTrainingStore = create<TrainingState>((set, get) => ({
  courses: [],
  enrollments: [],
  aars: [],
  coursesPagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
  enrollmentsPagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
  aarsPagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
  isLoading: false,
  error: null,

  fetchCourses: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await trainingApi.listCourses(params);
      set({
        courses: data.data || [],
        coursesPagination: data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 },
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to fetch', isLoading: false });
    }
  },

  fetchEnrollments: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await trainingApi.listEnrollments(params);
      set({
        enrollments: data.data || [],
        enrollmentsPagination: data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 },
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to fetch', isLoading: false });
    }
  },

  fetchAARs: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await trainingApi.listAARs(params);
      set({
        aars: data.data || [],
        aarsPagination: data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 },
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to fetch', isLoading: false });
    }
  },

  createCourse: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      await trainingApi.createCourse(payload);
      await get().fetchCourses();
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to create', isLoading: false });
      throw err;
    }
  },

  updateCourse: async (id, payload) => {
    set({ isLoading: true, error: null });
    try {
      await trainingApi.updateCourse(id, payload);
      await get().fetchCourses();
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to update', isLoading: false });
      throw err;
    }
  },

  deleteCourse: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await trainingApi.deleteCourse(id);
      await get().fetchCourses();
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to delete', isLoading: false });
      throw err;
    }
  },

  createEnrollment: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      await trainingApi.createEnrollment(payload);
      await get().fetchEnrollments();
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to create', isLoading: false });
      throw err;
    }
  },

  updateEnrollment: async (id, payload) => {
    set({ isLoading: true, error: null });
    try {
      await trainingApi.updateEnrollment(id, payload);
      await get().fetchEnrollments();
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to update', isLoading: false });
      throw err;
    }
  },

  deleteEnrollment: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await trainingApi.deleteEnrollment(id);
      await get().fetchEnrollments();
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to delete', isLoading: false });
      throw err;
    }
  },

  createAAR: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      await trainingApi.createAAR(payload);
      await get().fetchAARs();
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to create', isLoading: false });
      throw err;
    }
  },

  updateAAR: async (id, payload) => {
    set({ isLoading: true, error: null });
    try {
      await trainingApi.updateAAR(id, payload);
      await get().fetchAARs();
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to update', isLoading: false });
      throw err;
    }
  },

  deleteAAR: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await trainingApi.deleteAAR(id);
      await get().fetchAARs();
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to delete', isLoading: false });
      throw err;
    }
  },
}));
