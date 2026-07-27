import { create } from 'zustand';
import { threatsApi } from './api';

interface ThreatStore {
  actors: any[];
  selectedActor: any | null;
  indicators: any[];
  relationships: any[];
  summary: any | null;
  pagination: { page: number; limit: number; total: number; totalPages: number };
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  fetchActors: (params?: any) => Promise<void>;
  fetchActor: (id: string) => Promise<void>;
  createActor: (data: any) => Promise<any>;
  updateActor: (id: string, data: any) => Promise<any>;
  removeActor: (id: string) => Promise<void>;
  fetchIndicators: (actorId: string, params?: any) => Promise<void>;
  createIndicator: (actorId: string, data: any) => Promise<any>;
  removeIndicator: (id: string) => Promise<void>;
  fetchActorRelationships: (id: string) => Promise<void>;
  fetchActorSummary: (id: string) => Promise<void>;
  setSelectedActor: (actor: any | null) => void;
  reset: () => void;
}

export const useThreatStore = create<ThreatStore>((set, get) => ({
  actors: [],
  selectedActor: null,
  indicators: [],
  relationships: [],
  summary: null,
  pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
  isLoading: false,
  isSubmitting: false,
  error: null,

  fetchActors: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await threatsApi.listActors(params);
      set({
        actors: data.data || data.items || [],
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

  fetchActor: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await threatsApi.getActor(id);
      set({ selectedActor: data.data || data, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || err.message, isLoading: false });
    }
  },

  createActor: async (formData: any) => {
    set({ isSubmitting: true, error: null });
    try {
      const { data } = await threatsApi.createActor(formData);
      set({ isSubmitting: false });
      return data;
    } catch (err: any) {
      set({ isSubmitting: false, error: err.response?.data?.message || err.message });
      throw err;
    }
  },

  updateActor: async (id: string, formData: any) => {
    set({ isSubmitting: true, error: null });
    try {
      const { data } = await threatsApi.updateActor(id, formData);
      set({ isSubmitting: false });
      return data;
    } catch (err: any) {
      set({ isSubmitting: false, error: err.response?.data?.message || err.message });
      throw err;
    }
  },

  removeActor: async (id: string) => {
    set({ isSubmitting: true, error: null });
    try {
      await threatsApi.deleteActor(id);
      set({ isSubmitting: false });
      get().fetchActors();
    } catch (err: any) {
      set({ isSubmitting: false, error: err.response?.data?.message || err.message });
      throw err;
    }
  },

  fetchIndicators: async (actorId: string, params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await threatsApi.listIndicators({ ...params, actor_id: actorId });
      set({ indicators: data.data || data.items || [], isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || err.message, isLoading: false });
    }
  },

  createIndicator: async (actorId: string, formData: any) => {
    set({ isSubmitting: true, error: null });
    try {
      const { data } = await threatsApi.createIndicator({ ...formData, actor_id: actorId });
      set({ isSubmitting: false });
      return data;
    } catch (err: any) {
      set({ isSubmitting: false, error: err.response?.data?.message || err.message });
      throw err;
    }
  },

  removeIndicator: async (id: string) => {
    set({ isSubmitting: true, error: null });
    try {
      await threatsApi.deleteIndicator(id);
      set({ isSubmitting: false });
      get().fetchIndicators(get().selectedActor?.id || '');
    } catch (err: any) {
      set({ isSubmitting: false, error: err.response?.data?.message || err.message });
      throw err;
    }
  },

  fetchActorRelationships: async (id: string) => {
    try {
      const { data } = await threatsApi.getActorRelationships(id);
      set({ relationships: data.data || data || [] });
    } catch { /* ignore */ }
  },

  fetchActorSummary: async (id: string) => {
    try {
      const { data } = await threatsApi.getActorSummary(id);
      set({ summary: data });
    } catch { /* ignore */ }
  },

  setSelectedActor: (actor) => set({ selectedActor: actor, indicators: [], relationships: [], summary: null }),
  reset: () => set({
    actors: [], selectedActor: null, indicators: [], relationships: [], summary: null,
    pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    isLoading: false, isSubmitting: false, error: null,
  }),
}));
