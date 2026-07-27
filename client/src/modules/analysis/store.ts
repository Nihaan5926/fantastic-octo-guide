import { create } from 'zustand';
import { analysisApi } from './api';

interface AnalysisStore {
  items: any[];
  selected: any | null;
  graph: any | null;
  graphStats: any | null;
  pagination: { page: number; limit: number; total: number; totalPages: number };
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  fetchList: (params?: any) => Promise<void>;
  fetchOne: (id: string) => Promise<void>;
  create: (data: any) => Promise<any>;
  remove: (id: string) => Promise<void>;
  fetchGraph: (params?: any) => Promise<void>;
  fetchGraphStats: () => Promise<void>;
  setSelected: (item: any | null) => void;
  reset: () => void;
}

export const useAnalysisStore = create<AnalysisStore>((set, get) => ({
  items: [],
  selected: null,
  graph: null,
  graphStats: null,
  pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
  isLoading: false,
  isSubmitting: false,
  error: null,

  fetchList: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await analysisApi.list(params);
      set({
        items: data.data || data.items || [],
        pagination: {
          page: data.page || 1,
          limit: data.limit || 10,
          total: data.total || 0,
          totalPages: data.totalPages || 0,
        },
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: err.response?.data?.message || err.message, isLoading: false });
    }
  },

  fetchOne: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await analysisApi.get(id);
      set({ selected: data.data || data, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || err.message, isLoading: false });
    }
  },

  create: async (formData: any) => {
    set({ isSubmitting: true, error: null });
    try {
      const { data } = await analysisApi.create(formData);
      set({ isSubmitting: false });
      return data;
    } catch (err: any) {
      set({ isSubmitting: false, error: err.response?.data?.message || err.message });
      throw err;
    }
  },

  remove: async (id: string) => {
    set({ isSubmitting: true, error: null });
    try {
      await analysisApi.delete(id);
      set({ isSubmitting: false });
      get().fetchList();
    } catch (err: any) {
      set({ isSubmitting: false, error: err.response?.data?.message || err.message });
      throw err;
    }
  },

  fetchGraph: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await analysisApi.getGraph(params);
      set({ graph: data.data || data, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || err.message, isLoading: false });
    }
  },

  fetchGraphStats: async () => {
    try {
      const { data } = await analysisApi.getGraphStats();
      set({ graphStats: data });
    } catch { /* ignore */ }
  },

  setSelected: (item) => set({ selected: item }),
  reset: () => set({
    items: [], selected: null, graph: null, graphStats: null,
    pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    isLoading: false, isSubmitting: false, error: null,
  }),
}));
