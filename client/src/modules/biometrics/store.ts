import { create } from 'zustand';
import { biometricsApi } from './api';
import toast from 'react-hot-toast';

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface BiometricsState {
  activeTab: 'records' | 'watchlists' | 'encounters';

  records: any[];
  recordsPagination: Pagination;
  recordsLoading: boolean;
  recordsError: string | null;
  recordSearch: string;

  watchlists: any[];
  watchlistsPagination: Pagination;
  watchlistsLoading: boolean;
  watchlistsError: string | null;
  watchlistSearch: string;

  encounters: any[];
  encountersPagination: Pagination;
  encountersLoading: boolean;
  encountersError: string | null;
  encounterSearch: string;

  setActiveTab: (tab: 'records' | 'watchlists' | 'encounters') => void;
  setRecordSearch: (s: string) => void;
  setWatchlistSearch: (s: string) => void;
  setEncounterSearch: (s: string) => void;

  fetchRecords: (params?: any) => Promise<void>;
  createRecord: (data: any) => Promise<boolean>;
  updateRecord: (id: string, data: any) => Promise<boolean>;
  deleteRecord: (id: string) => Promise<boolean>;

  fetchWatchlists: (params?: any) => Promise<void>;
  createWatchlist: (data: any) => Promise<boolean>;
  updateWatchlist: (id: string, data: any) => Promise<boolean>;
  deleteWatchlist: (id: string) => Promise<boolean>;

  fetchEncounters: (params?: any) => Promise<void>;
  createEncounter: (data: any) => Promise<boolean>;
  updateEncounter: (id: string, data: any) => Promise<boolean>;
  deleteEncounter: (id: string) => Promise<boolean>;
}

const dp: Pagination = { page: 1, limit: 10, total: 0, totalPages: 0 };

export const useBiometricsStore = create<BiometricsState>((set, get) => ({
  activeTab: 'records',

  records: [],
  recordsPagination: dp,
  recordsLoading: false,
  recordsError: null,
  recordSearch: '',

  watchlists: [],
  watchlistsPagination: dp,
  watchlistsLoading: false,
  watchlistsError: null,
  watchlistSearch: '',

  encounters: [],
  encountersPagination: dp,
  encountersLoading: false,
  encountersError: null,
  encounterSearch: '',

  setActiveTab: (tab) => set({ activeTab: tab }),

  setRecordSearch: (s) => set({ recordSearch: s }),
  setWatchlistSearch: (s) => set({ watchlistSearch: s }),
  setEncounterSearch: (s) => set({ encounterSearch: s }),

  fetchRecords: async (params = {}) => {
    set({ recordsLoading: true, recordsError: null });
    try {
      const { data } = await biometricsApi.listRecords({
        ...params,
        search: get().recordSearch,
        limit: params.limit || 10,
        page: params.page || 1,
      });
      set({ records: data.data, recordsPagination: data.pagination, recordsLoading: false });
    } catch (err: any) {
      set({ recordsError: err.response?.data?.message || 'Failed to load records', recordsLoading: false });
      toast.error('Failed to load records');
    }
  },

  createRecord: async (fd) => {
    try {
      await biometricsApi.createRecord(fd);
      toast.success('Record created');
      get().fetchRecords();
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create record');
      return false;
    }
  },

  updateRecord: async (id, fd) => {
    try {
      await biometricsApi.updateRecord(id, fd);
      toast.success('Record updated');
      get().fetchRecords();
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update record');
      return false;
    }
  },

  deleteRecord: async (id) => {
    try {
      await biometricsApi.deleteRecord(id);
      toast.success('Record deleted');
      get().fetchRecords();
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete record');
      return false;
    }
  },

  fetchWatchlists: async (params = {}) => {
    set({ watchlistsLoading: true, watchlistsError: null });
    try {
      const { data } = await biometricsApi.listWatchlists({
        ...params,
        search: get().watchlistSearch,
        limit: params.limit || 10,
        page: params.page || 1,
      });
      set({ watchlists: data.data, watchlistsPagination: data.pagination, watchlistsLoading: false });
    } catch (err: any) {
      set({ watchlistsError: err.response?.data?.message || 'Failed to load watchlists', watchlistsLoading: false });
      toast.error('Failed to load watchlists');
    }
  },

  createWatchlist: async (fd) => {
    try {
      await biometricsApi.createWatchlist(fd);
      toast.success('Watchlist created');
      get().fetchWatchlists();
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create watchlist');
      return false;
    }
  },

  updateWatchlist: async (id, fd) => {
    try {
      await biometricsApi.updateWatchlist(id, fd);
      toast.success('Watchlist updated');
      get().fetchWatchlists();
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update watchlist');
      return false;
    }
  },

  deleteWatchlist: async (id) => {
    try {
      await biometricsApi.deleteWatchlist(id);
      toast.success('Watchlist deleted');
      get().fetchWatchlists();
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete watchlist');
      return false;
    }
  },

  fetchEncounters: async (params = {}) => {
    set({ encountersLoading: true, encountersError: null });
    try {
      const { data } = await biometricsApi.listEncounters({
        ...params,
        search: get().encounterSearch,
        limit: params.limit || 10,
        page: params.page || 1,
      });
      set({ encounters: data.data, encountersPagination: data.pagination, encountersLoading: false });
    } catch (err: any) {
      set({ encountersError: err.response?.data?.message || 'Failed to load encounters', encountersLoading: false });
      toast.error('Failed to load encounters');
    }
  },

  createEncounter: async (fd) => {
    try {
      await biometricsApi.createEncounter(fd);
      toast.success('Encounter created');
      get().fetchEncounters();
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create encounter');
      return false;
    }
  },

  updateEncounter: async (id, fd) => {
    try {
      await biometricsApi.updateEncounter(id, fd);
      toast.success('Encounter updated');
      get().fetchEncounters();
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update encounter');
      return false;
    }
  },

  deleteEncounter: async (id) => {
    try {
      await biometricsApi.deleteEncounter(id);
      toast.success('Encounter deleted');
      get().fetchEncounters();
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete encounter');
      return false;
    }
  },
}));
