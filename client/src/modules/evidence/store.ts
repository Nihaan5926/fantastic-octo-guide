import { create } from 'zustand';
import { evidenceApi } from './api';

interface EvidenceStore {
  items: any[];
  selected: any | null;
  pagination: { page: number; limit: number; total: number; totalPages: number };
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  fetchList: (params?: any) => Promise<void>;
  fetchOne: (id: string) => Promise<void>;
  create: (data: any) => Promise<any>;
  createWithFile: (formData: FormData) => Promise<any>;
  remove: (id: string) => Promise<void>;
  setSelected: (item: any | null) => void;
  reset: () => void;
}

export const useEvidenceStore = create<EvidenceStore>((set, get) => ({
  items: [],
  selected: null,
  pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
  isLoading: false,
  isSubmitting: false,
  error: null,

  fetchList: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await evidenceApi.list(params);
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
      const { data } = await evidenceApi.get(id);
      set({ selected: data.data || data, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || err.message, isLoading: false });
    }
  },

  create: async (formData: any) => {
    set({ isSubmitting: true, error: null });
    try {
      const { data } = await evidenceApi.create(formData);
      set({ isSubmitting: false });
      return data;
    } catch (err: any) {
      set({ isSubmitting: false, error: err.response?.data?.message || err.message });
      throw err;
    }
  },

  createWithFile: async (formData: FormData) => {
    set({ isSubmitting: true, error: null });
    try {
      const { data } = await evidenceApi.createWithFile(formData);
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
      await evidenceApi.delete(id);
      set({ isSubmitting: false });
      get().fetchList();
    } catch (err: any) {
      set({ isSubmitting: false, error: err.response?.data?.message || err.message });
      throw err;
    }
  },

  setSelected: (item) => set({ selected: item }),
  reset: () => set({ items: [], selected: null, pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }, isLoading: false, isSubmitting: false, error: null }),
}));
