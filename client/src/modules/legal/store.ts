import { create } from 'zustand';

interface LegalReview {
  id: string;
  reference_number: string;
  title: string;
  entity_type: string;
  entity_id: string;
  status: string;
  priority: string;
  due_date: string;
  assigned_to: string;
  findings?: string;
  created_at?: string;
}

interface ComplianceCheck {
  id: string;
  title: string;
  regulation: string;
  check_type: string;
  status: string;
  violations_found: boolean;
  remediation_required: boolean;
  findings?: string;
  assigned_to: string;
  due_date: string;
  created_at?: string;
}

interface LegalState {
  reviews: LegalReview[];
  complianceChecks: ComplianceCheck[];
  activeTab: 'reviews' | 'compliance';
  pagination: { page: number; limit: number; total: number; totalPages: number };
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  search: string;

  setSearch: (search: string) => void;
  setActiveTab: (tab: 'reviews' | 'compliance') => void;
  fetchReviews: (page?: number) => Promise<void>;
  createReview: (data: Partial<LegalReview>) => Promise<void>;
  updateReview: (id: string, data: Partial<LegalReview>) => Promise<void>;
  deleteReview: (id: string) => Promise<void>;
  fetchCompliance: (page?: number) => Promise<void>;
  createCompliance: (data: Partial<ComplianceCheck>) => Promise<void>;
  updateCompliance: (id: string, data: Partial<ComplianceCheck>) => Promise<void>;
  deleteCompliance: (id: string) => Promise<void>;
  setPage: (page: number) => void;
  fetchCurrentTab: () => Promise<void>;
}

export const useLegalStore = create<LegalState>((set, get) => ({
  reviews: [],
  complianceChecks: [],
  activeTab: 'reviews',
  pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
  isLoading: false,
  isSaving: false,
  error: null,
  search: '',

  setSearch: (search: string) => set({ search }),
  setActiveTab: (tab) => {
    set({ activeTab: tab, pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } });
  },

  fetchCurrentTab: async () => {
    const { activeTab } = get();
    if (activeTab === 'reviews') await get().fetchReviews();
    else await get().fetchCompliance();
  },

  fetchReviews: async (page?: number) => {
    const { search, pagination } = get();
    set({ isLoading: true, error: null });
    try {
      const { data } = await (await import('./api')).legalApi.listReviews({
        page: page || pagination.page, limit: pagination.limit, search,
      });
      set({ reviews: data.data, pagination: data.pagination, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, isLoading: false });
    }
  },

  createReview: async (reviewData) => {
    set({ isSaving: true });
    try {
      await (await import('./api')).legalApi.createReview(reviewData);
      set({ isSaving: false });
      await get().fetchReviews();
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, isSaving: false });
    }
  },

  updateReview: async (id, reviewData) => {
    set({ isSaving: true });
    try {
      await (await import('./api')).legalApi.updateReview(id, reviewData);
      set({ isSaving: false });
      await get().fetchReviews();
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, isSaving: false });
    }
  },

  deleteReview: async (id) => {
    set({ isSaving: true });
    try {
      await (await import('./api')).legalApi.deleteReview(id);
      set({ isSaving: false });
      await get().fetchReviews();
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, isSaving: false });
    }
  },

  fetchCompliance: async (page?: number) => {
    const { search, pagination } = get();
    set({ isLoading: true, error: null });
    try {
      const { data } = await (await import('./api')).legalApi.listCompliance({
        page: page || pagination.page, limit: pagination.limit, search,
      });
      set({ complianceChecks: data.data, pagination: data.pagination, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, isLoading: false });
    }
  },

  createCompliance: async (complianceData) => {
    set({ isSaving: true });
    try {
      await (await import('./api')).legalApi.createCompliance(complianceData);
      set({ isSaving: false });
      await get().fetchCompliance();
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, isSaving: false });
    }
  },

  updateCompliance: async (id, complianceData) => {
    set({ isSaving: true });
    try {
      await (await import('./api')).legalApi.updateCompliance(id, complianceData);
      set({ isSaving: false });
      await get().fetchCompliance();
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, isSaving: false });
    }
  },

  deleteCompliance: async (id) => {
    set({ isSaving: true });
    try {
      await (await import('./api')).legalApi.deleteCompliance(id);
      set({ isSaving: false });
      await get().fetchCompliance();
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, isSaving: false });
    }
  },

  setPage: (page: number) => {
    set((s) => ({ pagination: { ...s.pagination, page } }));
  },
}));
