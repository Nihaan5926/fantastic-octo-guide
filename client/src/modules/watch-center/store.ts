import { create } from 'zustand';
import { watchCenterApi } from './api';

export interface ShiftSchedule {
  id: string;
  shift_name: string;
  start_time: string;
  end_time: string;
  assigned_users: any;
  supervisor_id: string | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface WatchLog {
  id: string;
  shift_id: string | null;
  log_entry: string;
  log_type: string;
  severity: string;
  logged_by: string | null;
  logged_at: string | null;
  actions_taken: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SITREP {
  id: string;
  reference_number: string;
  period_start: string | null;
  period_end: string | null;
  classification: string;
  content: any;
  status: string;
  created_by: string | null;
  approved_by: string | null;
  created_at?: string;
  updated_at?: string;
}

interface WatchCenterState {
  shifts: ShiftSchedule[];
  logs: WatchLog[];
  sitreps: SITREP[];
  shiftsPagination: { page: number; limit: number; total: number; totalPages: number };
  logsPagination: { page: number; limit: number; total: number; totalPages: number };
  sitrepsPagination: { page: number; limit: number; total: number; totalPages: number };
  isLoading: boolean;
  error: string | null;
  fetchShifts: (params?: Record<string, any>) => Promise<void>;
  fetchLogs: (params?: Record<string, any>) => Promise<void>;
  fetchSITREPs: (params?: Record<string, any>) => Promise<void>;
  createShift: (data: Partial<ShiftSchedule>) => Promise<void>;
  updateShift: (id: string, data: Partial<ShiftSchedule>) => Promise<void>;
  deleteShift: (id: string) => Promise<void>;
  createLog: (data: Partial<WatchLog>) => Promise<void>;
  updateLog: (id: string, data: Partial<WatchLog>) => Promise<void>;
  deleteLog: (id: string) => Promise<void>;
  createSITREP: (data: Partial<SITREP>) => Promise<void>;
  updateSITREP: (id: string, data: Partial<SITREP>) => Promise<void>;
  deleteSITREP: (id: string) => Promise<void>;
}

export const useWatchCenterStore = create<WatchCenterState>((set, get) => ({
  shifts: [],
  logs: [],
  sitreps: [],
  shiftsPagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
  logsPagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
  sitrepsPagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
  isLoading: false,
  error: null,

  fetchShifts: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await watchCenterApi.listShifts(params);
      set({
        shifts: data.data || [],
        shiftsPagination: data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 },
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to fetch', isLoading: false });
    }
  },

  fetchLogs: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await watchCenterApi.listLogs(params);
      set({
        logs: data.data || [],
        logsPagination: data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 },
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to fetch', isLoading: false });
    }
  },

  fetchSITREPs: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await watchCenterApi.listSITREPs(params);
      set({
        sitreps: data.data || [],
        sitrepsPagination: data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 },
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to fetch', isLoading: false });
    }
  },

  createShift: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      await watchCenterApi.createShift(payload);
      await get().fetchShifts();
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to create', isLoading: false });
      throw err;
    }
  },

  updateShift: async (id, payload) => {
    set({ isLoading: true, error: null });
    try {
      await watchCenterApi.updateShift(id, payload);
      await get().fetchShifts();
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to update', isLoading: false });
      throw err;
    }
  },

  deleteShift: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await watchCenterApi.deleteShift(id);
      await get().fetchShifts();
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to delete', isLoading: false });
      throw err;
    }
  },

  createLog: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      await watchCenterApi.createLog(payload);
      await get().fetchLogs();
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to create', isLoading: false });
      throw err;
    }
  },

  updateLog: async (id, payload) => {
    set({ isLoading: true, error: null });
    try {
      await watchCenterApi.updateLog(id, payload);
      await get().fetchLogs();
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to update', isLoading: false });
      throw err;
    }
  },

  deleteLog: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await watchCenterApi.deleteLog(id);
      await get().fetchLogs();
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to delete', isLoading: false });
      throw err;
    }
  },

  createSITREP: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      await watchCenterApi.createSITREP(payload);
      await get().fetchSITREPs();
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to create', isLoading: false });
      throw err;
    }
  },

  updateSITREP: async (id, payload) => {
    set({ isLoading: true, error: null });
    try {
      await watchCenterApi.updateSITREP(id, payload);
      await get().fetchSITREPs();
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to update', isLoading: false });
      throw err;
    }
  },

  deleteSITREP: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await watchCenterApi.deleteSITREP(id);
      await get().fetchSITREPs();
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to delete', isLoading: false });
      throw err;
    }
  },
}));
