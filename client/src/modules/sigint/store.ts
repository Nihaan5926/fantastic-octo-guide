import { create } from 'zustand';
import { sigintApi } from './api';
import toast from 'react-hot-toast';

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface SigintState {
  activeTab: 'intercepts' | 'emitters';

  intercepts: any[];
  interceptsPagination: Pagination;
  interceptsLoading: boolean;
  interceptsError: string | null;
  interceptSearch: string;

  emitters: any[];
  emittersPagination: Pagination;
  emittersLoading: boolean;
  emittersError: string | null;
  emitterSearch: string;

  setActiveTab: (tab: 'intercepts' | 'emitters') => void;
  setInterceptSearch: (search: string) => void;
  setEmitterSearch: (search: string) => void;

  fetchIntercepts: (params?: any) => Promise<void>;
  createIntercept: (data: any) => Promise<boolean>;
  updateIntercept: (id: string, data: any) => Promise<boolean>;
  deleteIntercept: (id: string) => Promise<boolean>;

  fetchEmitters: (params?: any) => Promise<void>;
  createEmitter: (data: any) => Promise<boolean>;
  updateEmitter: (id: string, data: any) => Promise<boolean>;
  deleteEmitter: (id: string) => Promise<boolean>;
}

const defaultPagination: Pagination = { page: 1, limit: 10, total: 0, totalPages: 0 };

export const useSigintStore = create<SigintState>((set, get) => ({
  activeTab: 'intercepts',

  intercepts: [],
  interceptsPagination: defaultPagination,
  interceptsLoading: false,
  interceptsError: null,
  interceptSearch: '',

  emitters: [],
  emittersPagination: defaultPagination,
  emittersLoading: false,
  emittersError: null,
  emitterSearch: '',

  setActiveTab: (tab) => set({ activeTab: tab }),

  setInterceptSearch: (search) => set({ interceptSearch: search }),
  setEmitterSearch: (search) => set({ emitterSearch: search }),

  fetchIntercepts: async (params = {}) => {
    set({ interceptsLoading: true, interceptsError: null });
    try {
      const { data } = await sigintApi.listIntercepts({
        ...params,
        search: get().interceptSearch,
        limit: params.limit || 10,
        page: params.page || 1,
      });
      set({ intercepts: data.data, interceptsPagination: data.pagination, interceptsLoading: false });
    } catch (err: any) {
      set({
        interceptsError: err.response?.data?.message || 'Failed to load intercepts',
        interceptsLoading: false,
      });
      toast.error('Failed to load intercepts');
    }
  },

  createIntercept: async (formData) => {
    try {
      await sigintApi.createIntercept(formData);
      toast.success('Intercept created');
      get().fetchIntercepts();
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create intercept');
      return false;
    }
  },

  updateIntercept: async (id, formData) => {
    try {
      await sigintApi.updateIntercept(id, formData);
      toast.success('Intercept updated');
      get().fetchIntercepts();
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update intercept');
      return false;
    }
  },

  deleteIntercept: async (id) => {
    try {
      await sigintApi.deleteIntercept(id);
      toast.success('Intercept deleted');
      get().fetchIntercepts();
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete intercept');
      return false;
    }
  },

  fetchEmitters: async (params = {}) => {
    set({ emittersLoading: true, emittersError: null });
    try {
      const { data } = await sigintApi.listEmitters({
        ...params,
        search: get().emitterSearch,
        limit: params.limit || 10,
        page: params.page || 1,
      });
      set({ emitters: data.data, emittersPagination: data.pagination, emittersLoading: false });
    } catch (err: any) {
      set({
        emittersError: err.response?.data?.message || 'Failed to load emitters',
        emittersLoading: false,
      });
      toast.error('Failed to load emitters');
    }
  },

  createEmitter: async (formData) => {
    try {
      await sigintApi.createEmitter(formData);
      toast.success('Emitter created');
      get().fetchEmitters();
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create emitter');
      return false;
    }
  },

  updateEmitter: async (id, formData) => {
    try {
      await sigintApi.updateEmitter(id, formData);
      toast.success('Emitter updated');
      get().fetchEmitters();
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update emitter');
      return false;
    }
  },

  deleteEmitter: async (id) => {
    try {
      await sigintApi.deleteEmitter(id);
      toast.success('Emitter deleted');
      get().fetchEmitters();
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete emitter');
      return false;
    }
  },
}));
