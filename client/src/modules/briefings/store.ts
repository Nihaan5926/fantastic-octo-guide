import { create } from 'zustand';

interface Briefing {
  id: string;
  reference_number: string;
  title: string;
  classification: string;
  status: string;
  prepared_by: string;
  audience: any;
  content: any;
  slides_count: number;
  created_at?: string;
  updated_at?: string;
}

interface Distribution {
  id: string;
  briefing_id: string;
  recipient: string;
  distribution_date: string;
  acknowledged: boolean;
  notes?: string;
}

interface BriefingState {
  briefings: Briefing[];
  selectedBriefing: Briefing | null;
  distributions: Distribution[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  search: string;

  setSearch: (search: string) => void;
  fetchBriefings: (page?: number) => Promise<void>;
  fetchBriefing: (id: string) => Promise<void>;
  createBriefing: (data: Partial<Briefing>) => Promise<void>;
  updateBriefing: (id: string, data: Partial<Briefing>) => Promise<void>;
  deleteBriefing: (id: string) => Promise<void>;
  fetchDistributions: (briefingId: string) => Promise<void>;
  addDistribution: (briefingId: string, data: Partial<Distribution>) => Promise<void>;
  removeDistribution: (briefingId: string, distributionId: string) => Promise<void>;
  setPage: (page: number) => void;
}

export const useBriefingStore = create<BriefingState>((set, get) => ({
  briefings: [],
  selectedBriefing: null,
  distributions: [],
  pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
  isLoading: false,
  isSaving: false,
  error: null,
  search: '',

  setSearch: (search: string) => set({ search }),

  fetchBriefings: async (page?: number) => {
    const { search, pagination } = get();
    set({ isLoading: true, error: null });
    try {
      const { data } = await (await import('./api')).briefingsApi.list({
        page: page || pagination.page,
        limit: pagination.limit,
        search,
      });
      set({
        briefings: data.data,
        pagination: data.pagination,
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, isLoading: false });
    }
  },

  fetchBriefing: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await (await import('./api')).briefingsApi.get(id);
      set({ selectedBriefing: data, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, isLoading: false });
    }
  },

  createBriefing: async (briefingData) => {
    set({ isSaving: true, error: null });
    try {
      await (await import('./api')).briefingsApi.create(briefingData);
      set({ isSaving: false });
      await get().fetchBriefings();
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, isSaving: false });
    }
  },

  updateBriefing: async (id, briefingData) => {
    set({ isSaving: true, error: null });
    try {
      await (await import('./api')).briefingsApi.update(id, briefingData);
      set({ isSaving: false });
      await get().fetchBriefings();
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, isSaving: false });
    }
  },

  deleteBriefing: async (id) => {
    set({ isSaving: true, error: null });
    try {
      await (await import('./api')).briefingsApi.delete(id);
      set({ isSaving: false });
      await get().fetchBriefings();
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, isSaving: false });
    }
  },

  fetchDistributions: async (briefingId) => {
    try {
      const { data } = await (await import('./api')).briefingsApi.listDistributions(briefingId);
      set({ distributions: data.data || data });
    } catch { set({ error: 'Operation failed' }); }
  },

  addDistribution: async (briefingId, distData) => {
    try {
      await (await import('./api')).briefingsApi.addDistribution(briefingId, distData);
      await get().fetchDistributions(briefingId);
    } catch { set({ error: 'Operation failed' }); }
  },

  removeDistribution: async (briefingId, distributionId) => {
    try {
      await (await import('./api')).briefingsApi.removeDistribution(briefingId, distributionId);
      await get().fetchDistributions(briefingId);
    } catch { set({ error: 'Operation failed' }); }
  },

  setPage: (page: number) => {
    set((s) => ({ pagination: { ...s.pagination, page } }));
  },
}));
