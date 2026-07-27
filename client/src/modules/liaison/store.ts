import { create } from 'zustand';

interface Partner {
  id: string;
  name: string;
  organization: string;
  contact_info: any;
  classification: string;
  status: string;
  notes?: string;
  created_at?: string;
}

interface Mou {
  id: string;
  reference_number: string;
  title: string;
  partner_id: string;
  partner_name?: string;
  start_date: string;
  end_date: string;
  classification: string;
  status: string;
  created_at?: string;
}

interface ContactLog {
  id: string;
  partner_id: string;
  partner_name?: string;
  contact_date: string;
  summary: string;
  follow_up_required: boolean;
  status: string;
  created_at?: string;
}

interface LiaisonState {
  partners: Partner[];
  mous: Mou[];
  contactLogs: ContactLog[];
  activeTab: 'partners' | 'mous' | 'contactLogs';
  pagination: { page: number; limit: number; total: number; totalPages: number };
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  search: string;

  setSearch: (search: string) => void;
  setActiveTab: (tab: 'partners' | 'mous' | 'contactLogs') => void;
  fetchPartners: (page?: number) => Promise<void>;
  createPartner: (data: Partial<Partner>) => Promise<void>;
  updatePartner: (id: string, data: Partial<Partner>) => Promise<void>;
  deletePartner: (id: string) => Promise<void>;
  fetchMous: (page?: number) => Promise<void>;
  createMou: (data: Partial<Mou>) => Promise<void>;
  updateMou: (id: string, data: Partial<Mou>) => Promise<void>;
  deleteMou: (id: string) => Promise<void>;
  fetchContactLogs: (page?: number) => Promise<void>;
  createContactLog: (data: Partial<ContactLog>) => Promise<void>;
  deleteContactLog: (id: string) => Promise<void>;
  setPage: (page: number) => void;
  fetchCurrentTab: () => Promise<void>;
}

export const useLiaisonStore = create<LiaisonState>((set, get) => ({
  partners: [],
  mous: [],
  contactLogs: [],
  activeTab: 'partners',
  pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
  isLoading: false,
  isSaving: false,
  error: null,
  search: '',

  setSearch: (search: string) => set({ search }),

  setActiveTab: (tab: 'partners' | 'mous' | 'contactLogs') => {
    set({ activeTab: tab, pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } });
  },

  fetchCurrentTab: async () => {
    const { activeTab } = get();
    if (activeTab === 'partners') await get().fetchPartners();
    else if (activeTab === 'mous') await get().fetchMous();
    else await get().fetchContactLogs();
  },

  fetchPartners: async (page?: number) => {
    const { search, pagination } = get();
    set({ isLoading: true, error: null });
    try {
      const { data } = await (await import('./api')).liaisonApi.listPartners({
        page: page || pagination.page,
        limit: pagination.limit,
        search,
      });
      set({ partners: data.data, pagination: data.pagination, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, isLoading: false });
    }
  },

  createPartner: async (partnerData) => {
    set({ isSaving: true });
    try {
      await (await import('./api')).liaisonApi.createPartner(partnerData);
      set({ isSaving: false });
      await get().fetchPartners();
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, isSaving: false });
    }
  },

  updatePartner: async (id, partnerData) => {
    set({ isSaving: true });
    try {
      await (await import('./api')).liaisonApi.updatePartner(id, partnerData);
      set({ isSaving: false });
      await get().fetchPartners();
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, isSaving: false });
    }
  },

  deletePartner: async (id) => {
    set({ isSaving: true });
    try {
      await (await import('./api')).liaisonApi.deletePartner(id);
      set({ isSaving: false });
      await get().fetchPartners();
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, isSaving: false });
    }
  },

  fetchMous: async (page?: number) => {
    const { search, pagination } = get();
    set({ isLoading: true, error: null });
    try {
      const { data } = await (await import('./api')).liaisonApi.listMous({
        page: page || pagination.page,
        limit: pagination.limit,
        search,
      });
      set({ mous: data.data, pagination: data.pagination, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, isLoading: false });
    }
  },

  createMou: async (mouData) => {
    set({ isSaving: true });
    try {
      await (await import('./api')).liaisonApi.createMou(mouData);
      set({ isSaving: false });
      await get().fetchMous();
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, isSaving: false });
    }
  },

  updateMou: async (id, mouData) => {
    set({ isSaving: true });
    try {
      await (await import('./api')).liaisonApi.updateMou(id, mouData);
      set({ isSaving: false });
      await get().fetchMous();
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, isSaving: false });
    }
  },

  deleteMou: async (id) => {
    set({ isSaving: true });
    try {
      await (await import('./api')).liaisonApi.deleteMou(id);
      set({ isSaving: false });
      await get().fetchMous();
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, isSaving: false });
    }
  },

  fetchContactLogs: async (page?: number) => {
    const { search, pagination } = get();
    set({ isLoading: true, error: null });
    try {
      const { data } = await (await import('./api')).liaisonApi.listContactLogs(undefined, {
        page: page || pagination.page,
        limit: pagination.limit,
        search,
      });
      set({ contactLogs: data.data, pagination: data.pagination, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, isLoading: false });
    }
  },

  createContactLog: async (logData) => {
    set({ isSaving: true });
    try {
      await (await import('./api')).liaisonApi.createContactLog(logData);
      set({ isSaving: false });
      await get().fetchContactLogs();
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, isSaving: false });
    }
  },

  deleteContactLog: async (id) => {
    set({ isSaving: true });
    try {
      await (await import('./api')).liaisonApi.deleteContactLog(id);
      set({ isSaving: false });
      await get().fetchContactLogs();
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, isSaving: false });
    }
  },

  setPage: (page: number) => {
    set((s) => ({ pagination: { ...s.pagination, page } }));
  },
}));
