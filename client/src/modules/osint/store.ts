import { create } from 'zustand';
import { osintApi } from './api';

interface OSINTStore {
  items: any[];
  selected: any | null;
  results: any[];
  resultsPagination: { page: number; limit: number; total: number; totalPages: number };
  pagination: { page: number; limit: number; total: number; totalPages: number };
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  fetchList: (params?: any) => Promise<void>;
  fetchOne: (id: string) => Promise<void>;
  create: (data: any) => Promise<any>;
  update: (id: string, data: any) => Promise<any>;
  remove: (id: string) => Promise<void>;
  run: (id: string) => Promise<void>;
  fetchResults: (id: string, params?: any) => Promise<void>;
  setSelected: (item: any | null) => void;
  reset: () => void;
}

export const useOSINTStore = create<OSINTStore>((set, get) => ({
  items: [],
  selected: null,
  results: [],
  resultsPagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
  pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
  isLoading: false,
  isSubmitting: false,
  error: null,

  fetchList: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await osintApi.list(params);
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
      const { data } = await osintApi.get(id);
      set({ selected: data.data || data, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || err.message, isLoading: false });
    }
  },

  create: async (formData: any) => {
    set({ isSubmitting: true, error: null });
    try {
      const { data } = await osintApi.create(formData);
      set({ isSubmitting: false });
      return data;
    } catch (err: any) {
      set({ isSubmitting: false, error: err.response?.data?.message || err.message });
      throw err;
    }
  },

  update: async (id: string, formData: any) => {
    set({ isSubmitting: true, error: null });
    try {
      const { data } = await osintApi.update(id, formData);
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
      await osintApi.delete(id);
      set({ isSubmitting: false });
      get().fetchList();
    } catch (err: any) {
      set({ isSubmitting: false, error: err.response?.data?.message || err.message });
      throw err;
    }
  },

  run: async (id: string) => {
    set({ isSubmitting: true, error: null });
    try {
      await osintApi.run(id);
      set({ isSubmitting: false });
      get().fetchOne(id);
    } catch (err: any) {
      set({ isSubmitting: false, error: err.response?.data?.message || err.message });
      throw err;
    }
  },

  fetchResults: async (id: string, params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await osintApi.getResults(id, params);
      set({
        results: data.data || data.items || [],
        resultsPagination: {
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

  setSelected: (item) => set({ selected: item }),
  reset: () => set({
    items: [], selected: null, results: [],
    resultsPagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    isLoading: false, isSubmitting: false, error: null,
  }),
}));
