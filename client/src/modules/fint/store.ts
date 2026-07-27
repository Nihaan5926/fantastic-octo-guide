import { create } from 'zustand';
import { fintApi } from './api';
import toast from 'react-hot-toast';

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface FintState {
  activeTab: 'transactions' | 'entities';

  transactions: any[];
  transactionsPagination: Pagination;
  transactionsLoading: boolean;
  transactionsError: string | null;
  transactionSearch: string;

  entities: any[];
  entitiesPagination: Pagination;
  entitiesLoading: boolean;
  entitiesError: string | null;
  entitySearch: string;

  setActiveTab: (tab: 'transactions' | 'entities') => void;
  setTransactionSearch: (s: string) => void;
  setEntitySearch: (s: string) => void;

  fetchTransactions: (params?: any) => Promise<void>;
  createTransaction: (data: any) => Promise<boolean>;
  updateTransaction: (id: string, data: any) => Promise<boolean>;
  deleteTransaction: (id: string) => Promise<boolean>;

  fetchEntities: (params?: any) => Promise<void>;
  createEntity: (data: any) => Promise<boolean>;
  updateEntity: (id: string, data: any) => Promise<boolean>;
  deleteEntity: (id: string) => Promise<boolean>;
}

const dp: Pagination = { page: 1, limit: 10, total: 0, totalPages: 0 };

export const useFintStore = create<FintState>((set, get) => ({
  activeTab: 'transactions',

  transactions: [],
  transactionsPagination: dp,
  transactionsLoading: false,
  transactionsError: null,
  transactionSearch: '',

  entities: [],
  entitiesPagination: dp,
  entitiesLoading: false,
  entitiesError: null,
  entitySearch: '',

  setActiveTab: (tab) => set({ activeTab: tab }),

  setTransactionSearch: (s) => set({ transactionSearch: s }),
  setEntitySearch: (s) => set({ entitySearch: s }),

  fetchTransactions: async (params = {}) => {
    set({ transactionsLoading: true, transactionsError: null });
    try {
      const { data } = await fintApi.listTransactions({
        ...params,
        search: get().transactionSearch,
        limit: params.limit || 10,
        page: params.page || 1,
      });
      set({ transactions: data.data, transactionsPagination: data.pagination, transactionsLoading: false });
    } catch (err: any) {
      set({ transactionsError: err.response?.data?.message || 'Failed to load transactions', transactionsLoading: false });
      toast.error('Failed to load transactions');
    }
  },

  createTransaction: async (fd) => {
    try {
      await fintApi.createTransaction(fd);
      toast.success('Transaction created');
      get().fetchTransactions();
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create transaction');
      return false;
    }
  },

  updateTransaction: async (id, fd) => {
    try {
      await fintApi.updateTransaction(id, fd);
      toast.success('Transaction updated');
      get().fetchTransactions();
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update transaction');
      return false;
    }
  },

  deleteTransaction: async (id) => {
    try {
      await fintApi.deleteTransaction(id);
      toast.success('Transaction deleted');
      get().fetchTransactions();
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete transaction');
      return false;
    }
  },

  fetchEntities: async (params = {}) => {
    set({ entitiesLoading: true, entitiesError: null });
    try {
      const { data } = await fintApi.listEntities({
        ...params,
        search: get().entitySearch,
        limit: params.limit || 10,
        page: params.page || 1,
      });
      set({ entities: data.data, entitiesPagination: data.pagination, entitiesLoading: false });
    } catch (err: any) {
      set({ entitiesError: err.response?.data?.message || 'Failed to load entities', entitiesLoading: false });
      toast.error('Failed to load entities');
    }
  },

  createEntity: async (fd) => {
    try {
      await fintApi.createEntity(fd);
      toast.success('Entity created');
      get().fetchEntities();
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create entity');
      return false;
    }
  },

  updateEntity: async (id, fd) => {
    try {
      await fintApi.updateEntity(id, fd);
      toast.success('Entity updated');
      get().fetchEntities();
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update entity');
      return false;
    }
  },

  deleteEntity: async (id) => {
    try {
      await fintApi.deleteEntity(id);
      toast.success('Entity deleted');
      get().fetchEntities();
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete entity');
      return false;
    }
  },
}));
