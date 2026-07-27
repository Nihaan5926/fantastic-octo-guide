import { create } from 'zustand';
import { personnelApi } from './api';

export interface PersonnelRecord {
  id: string;
  user_id: string;
  date_of_birth: string | null;
  nationality: string | null;
  position_title: string | null;
  clearance_level: string;
  clearance_expiry: string | null;
  special_accesses: any;
  languages: any;
  skills: any;
  certifications: any;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

interface PersonnelState {
  items: PersonnelRecord[];
  selected: PersonnelRecord | null;
  pagination: { page: number; limit: number; total: number; totalPages: number };
  isLoading: boolean;
  error: string | null;
  fetchList: (params?: Record<string, any>) => Promise<void>;
  fetchOne: (id: string) => Promise<void>;
  create: (data: Partial<PersonnelRecord>) => Promise<void>;
  update: (id: string, data: Partial<PersonnelRecord>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  setSelected: (record: PersonnelRecord | null) => void;
}

export const usePersonnelStore = create<PersonnelState>((set, get) => ({
  items: [],
  selected: null,
  pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
  isLoading: false,
  error: null,

  fetchList: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await personnelApi.list(params);
      set({
        items: data.data || [],
        pagination: data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 },
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to fetch', isLoading: false });
    }
  },

  fetchOne: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await personnelApi.get(id);
      set({ selected: data, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to fetch', isLoading: false });
    }
  },

  create: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      await personnelApi.create(payload);
      await get().fetchList();
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to create', isLoading: false });
      throw err;
    }
  },

  update: async (id, payload) => {
    set({ isLoading: true, error: null });
    try {
      await personnelApi.update(id, payload);
      await get().fetchList();
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to update', isLoading: false });
      throw err;
    }
  },

  remove: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await personnelApi.delete(id);
      await get().fetchList();
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to delete', isLoading: false });
      throw err;
    }
  },

  setSelected: (record) => set({ selected: record }),
}));
