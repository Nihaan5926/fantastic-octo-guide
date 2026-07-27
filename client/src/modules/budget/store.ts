import { create } from 'zustand';

interface ProgramBudget {
  id: string;
  reference_number: string;
  program_name: string;
  fiscal_year: number;
  total_amount: number;
  allocated_amount: number;
  spent_amount: number;
  status: string;
  notes?: string;
  created_at?: string;
}

interface Contract {
  id: string;
  reference_number: string;
  vendor_name: string;
  description: string;
  contract_type: string;
  value: number;
  start_date: string;
  end_date: string;
  status: string;
  budget_id?: string;
  created_at?: string;
}

interface BudgetState {
  programs: ProgramBudget[];
  contracts: Contract[];
  activeTab: 'programs' | 'contracts';
  pagination: { page: number; limit: number; total: number; totalPages: number };
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  search: string;

  setSearch: (search: string) => void;
  setActiveTab: (tab: 'programs' | 'contracts') => void;
  fetchPrograms: (page?: number) => Promise<void>;
  createProgram: (data: Partial<ProgramBudget>) => Promise<void>;
  updateProgram: (id: string, data: Partial<ProgramBudget>) => Promise<void>;
  deleteProgram: (id: string) => Promise<void>;
  fetchContracts: (page?: number) => Promise<void>;
  createContract: (data: Partial<Contract>) => Promise<void>;
  updateContract: (id: string, data: Partial<Contract>) => Promise<void>;
  deleteContract: (id: string) => Promise<void>;
  setPage: (page: number) => void;
  fetchCurrentTab: () => Promise<void>;
}

export const useBudgetStore = create<BudgetState>((set, get) => ({
  programs: [],
  contracts: [],
  activeTab: 'programs',
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
    if (activeTab === 'programs') await get().fetchPrograms();
    else await get().fetchContracts();
  },

  fetchPrograms: async (page?: number) => {
    const { search, pagination } = get();
    set({ isLoading: true, error: null });
    try {
      const { data } = await (await import('./api')).budgetApi.listPrograms({
        page: page || pagination.page, limit: pagination.limit, search,
      });
      set({ programs: data.data, pagination: data.pagination, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, isLoading: false });
    }
  },

  createProgram: async (programData) => {
    set({ isSaving: true });
    try {
      await (await import('./api')).budgetApi.createProgram(programData);
      set({ isSaving: false });
      await get().fetchPrograms();
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, isSaving: false });
    }
  },

  updateProgram: async (id, programData) => {
    set({ isSaving: true });
    try {
      await (await import('./api')).budgetApi.updateProgram(id, programData);
      set({ isSaving: false });
      await get().fetchPrograms();
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, isSaving: false });
    }
  },

  deleteProgram: async (id) => {
    set({ isSaving: true });
    try {
      await (await import('./api')).budgetApi.deleteProgram(id);
      set({ isSaving: false });
      await get().fetchPrograms();
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, isSaving: false });
    }
  },

  fetchContracts: async (page?: number) => {
    const { search, pagination } = get();
    set({ isLoading: true, error: null });
    try {
      const { data } = await (await import('./api')).budgetApi.listContracts({
        page: page || pagination.page, limit: pagination.limit, search,
      });
      set({ contracts: data.data, pagination: data.pagination, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, isLoading: false });
    }
  },

  createContract: async (contractData) => {
    set({ isSaving: true });
    try {
      await (await import('./api')).budgetApi.createContract(contractData);
      set({ isSaving: false });
      await get().fetchContracts();
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, isSaving: false });
    }
  },

  updateContract: async (id, contractData) => {
    set({ isSaving: true });
    try {
      await (await import('./api')).budgetApi.updateContract(id, contractData);
      set({ isSaving: false });
      await get().fetchContracts();
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, isSaving: false });
    }
  },

  deleteContract: async (id) => {
    set({ isSaving: true });
    try {
      await (await import('./api')).budgetApi.deleteContract(id);
      set({ isSaving: false });
      await get().fetchContracts();
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, isSaving: false });
    }
  },

  setPage: (page: number) => {
    set((s) => ({ pagination: { ...s.pagination, page } }));
  },
}));
