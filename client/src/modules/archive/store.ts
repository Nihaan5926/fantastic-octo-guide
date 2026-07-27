import { create } from 'zustand';

interface ArchiveRecord {
  id: string;
  reference_number: string;
  title: string;
  entity_type: string;
  classification: string;
  retention_period_days: number;
  destruction_date: string;
  review_date: string;
  status: string;
  location?: string;
  created_at?: string;
}

interface DeclassRequest {
  id: string;
  reference_number: string;
  title: string;
  entity_type: string;
  entity_id: string;
  classification: string;
  requested_by: string;
  justification: string;
  status: string;
  review_date: string;
  created_at?: string;
}

interface ArchiveState {
  records: ArchiveRecord[];
  declassRequests: DeclassRequest[];
  activeTab: 'records' | 'declassRequests';
  pagination: { page: number; limit: number; total: number; totalPages: number };
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  search: string;

  setSearch: (search: string) => void;
  setActiveTab: (tab: 'records' | 'declassRequests') => void;
  fetchRecords: (page?: number) => Promise<void>;
  createRecord: (data: Partial<ArchiveRecord>) => Promise<void>;
  updateRecord: (id: string, data: Partial<ArchiveRecord>) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
  fetchDeclassRequests: (page?: number) => Promise<void>;
  createDeclassRequest: (data: Partial<DeclassRequest>) => Promise<void>;
  updateDeclassRequest: (id: string, data: Partial<DeclassRequest>) => Promise<void>;
  deleteDeclassRequest: (id: string) => Promise<void>;
  setPage: (page: number) => void;
  fetchCurrentTab: () => Promise<void>;
}

export const useArchiveStore = create<ArchiveState>((set, get) => ({
  records: [],
  declassRequests: [],
  activeTab: 'records',
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
    if (activeTab === 'records') await get().fetchRecords();
    else await get().fetchDeclassRequests();
  },

  fetchRecords: async (page?: number) => {
    const { search, pagination } = get();
    set({ isLoading: true, error: null });
    try {
      const { data } = await (await import('./api')).archiveApi.listRecords({
        page: page || pagination.page, limit: pagination.limit, search,
      });
      set({ records: data.data, pagination: data.pagination, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, isLoading: false });
    }
  },

  createRecord: async (recordData) => {
    set({ isSaving: true });
    try {
      await (await import('./api')).archiveApi.createRecord(recordData);
      set({ isSaving: false });
      await get().fetchRecords();
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, isSaving: false });
    }
  },

  updateRecord: async (id, recordData) => {
    set({ isSaving: true });
    try {
      await (await import('./api')).archiveApi.updateRecord(id, recordData);
      set({ isSaving: false });
      await get().fetchRecords();
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, isSaving: false });
    }
  },

  deleteRecord: async (id) => {
    set({ isSaving: true });
    try {
      await (await import('./api')).archiveApi.deleteRecord(id);
      set({ isSaving: false });
      await get().fetchRecords();
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, isSaving: false });
    }
  },

  fetchDeclassRequests: async (page?: number) => {
    const { search, pagination } = get();
    set({ isLoading: true, error: null });
    try {
      const { data } = await (await import('./api')).archiveApi.listDeclassRequests({
        page: page || pagination.page, limit: pagination.limit, search,
      });
      set({ declassRequests: data.data, pagination: data.pagination, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, isLoading: false });
    }
  },

  createDeclassRequest: async (reqData) => {
    set({ isSaving: true });
    try {
      await (await import('./api')).archiveApi.createDeclassRequest(reqData);
      set({ isSaving: false });
      await get().fetchDeclassRequests();
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, isSaving: false });
    }
  },

  updateDeclassRequest: async (id, reqData) => {
    set({ isSaving: true });
    try {
      await (await import('./api')).archiveApi.updateDeclassRequest(id, reqData);
      set({ isSaving: false });
      await get().fetchDeclassRequests();
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, isSaving: false });
    }
  },

  deleteDeclassRequest: async (id) => {
    set({ isSaving: true });
    try {
      await (await import('./api')).archiveApi.deleteDeclassRequest(id);
      set({ isSaving: false });
      await get().fetchDeclassRequests();
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, isSaving: false });
    }
  },

  setPage: (page: number) => {
    set((s) => ({ pagination: { ...s.pagination, page } }));
  },
}));
