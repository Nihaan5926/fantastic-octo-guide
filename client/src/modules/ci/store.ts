import { create } from 'zustand';
import { ciApi } from './api';
import toast from 'react-hot-toast';

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface CIState {
  activeTab: 'investigations' | 'foreign_agents' | 'insider_threats';

  investigations: any[];
  investigationsPagination: Pagination;
  investigationsLoading: boolean;
  investigationsError: string | null;
  investigationSearch: string;

  foreignAgents: any[];
  foreignAgentsPagination: Pagination;
  foreignAgentsLoading: boolean;
  foreignAgentsError: string | null;
  foreignAgentSearch: string;

  insiderThreats: any[];
  insiderThreatsPagination: Pagination;
  insiderThreatsLoading: boolean;
  insiderThreatsError: string | null;
  insiderThreatSearch: string;

  setActiveTab: (tab: 'investigations' | 'foreign_agents' | 'insider_threats') => void;
  setInvestigationSearch: (s: string) => void;
  setForeignAgentSearch: (s: string) => void;
  setInsiderThreatSearch: (s: string) => void;

  fetchInvestigations: (params?: any) => Promise<void>;
  createInvestigation: (data: any) => Promise<boolean>;
  updateInvestigation: (id: string, data: any) => Promise<boolean>;
  deleteInvestigation: (id: string) => Promise<boolean>;

  fetchForeignAgents: (params?: any) => Promise<void>;
  createForeignAgent: (data: any) => Promise<boolean>;
  updateForeignAgent: (id: string, data: any) => Promise<boolean>;
  deleteForeignAgent: (id: string) => Promise<boolean>;

  fetchInsiderThreats: (params?: any) => Promise<void>;
  createInsiderThreat: (data: any) => Promise<boolean>;
  updateInsiderThreat: (id: string, data: any) => Promise<boolean>;
  deleteInsiderThreat: (id: string) => Promise<boolean>;
}

const dp: Pagination = { page: 1, limit: 10, total: 0, totalPages: 0 };

export const useCIStore = create<CIState>((set, get) => ({
  activeTab: 'investigations',

  investigations: [],
  investigationsPagination: dp,
  investigationsLoading: false,
  investigationsError: null,
  investigationSearch: '',

  foreignAgents: [],
  foreignAgentsPagination: dp,
  foreignAgentsLoading: false,
  foreignAgentsError: null,
  foreignAgentSearch: '',

  insiderThreats: [],
  insiderThreatsPagination: dp,
  insiderThreatsLoading: false,
  insiderThreatsError: null,
  insiderThreatSearch: '',

  setActiveTab: (tab) => set({ activeTab: tab }),

  setInvestigationSearch: (s) => set({ investigationSearch: s }),
  setForeignAgentSearch: (s) => set({ foreignAgentSearch: s }),
  setInsiderThreatSearch: (s) => set({ insiderThreatSearch: s }),

  fetchInvestigations: async (params = {}) => {
    set({ investigationsLoading: true, investigationsError: null });
    try {
      const { data } = await ciApi.listInvestigations({
        ...params,
        search: get().investigationSearch,
        limit: params.limit || 10,
        page: params.page || 1,
      });
      set({ investigations: data.data, investigationsPagination: data.pagination, investigationsLoading: false });
    } catch (err: any) {
      set({ investigationsError: err.response?.data?.message || 'Failed to load investigations', investigationsLoading: false });
      toast.error('Failed to load investigations');
    }
  },

  createInvestigation: async (fd) => {
    try {
      await ciApi.createInvestigation(fd);
      toast.success('Investigation created');
      get().fetchInvestigations();
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create investigation');
      return false;
    }
  },

  updateInvestigation: async (id, fd) => {
    try {
      await ciApi.updateInvestigation(id, fd);
      toast.success('Investigation updated');
      get().fetchInvestigations();
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update investigation');
      return false;
    }
  },

  deleteInvestigation: async (id) => {
    try {
      await ciApi.deleteInvestigation(id);
      toast.success('Investigation deleted');
      get().fetchInvestigations();
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete investigation');
      return false;
    }
  },

  fetchForeignAgents: async (params = {}) => {
    set({ foreignAgentsLoading: true, foreignAgentsError: null });
    try {
      const { data } = await ciApi.listForeignAgents({
        ...params,
        search: get().foreignAgentSearch,
        limit: params.limit || 10,
        page: params.page || 1,
      });
      set({ foreignAgents: data.data, foreignAgentsPagination: data.pagination, foreignAgentsLoading: false });
    } catch (err: any) {
      set({ foreignAgentsError: err.response?.data?.message || 'Failed to load foreign agents', foreignAgentsLoading: false });
      toast.error('Failed to load foreign agents');
    }
  },

  createForeignAgent: async (fd) => {
    try {
      await ciApi.createForeignAgent(fd);
      toast.success('Foreign agent created');
      get().fetchForeignAgents();
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create foreign agent');
      return false;
    }
  },

  updateForeignAgent: async (id, fd) => {
    try {
      await ciApi.updateForeignAgent(id, fd);
      toast.success('Foreign agent updated');
      get().fetchForeignAgents();
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update foreign agent');
      return false;
    }
  },

  deleteForeignAgent: async (id) => {
    try {
      await ciApi.deleteForeignAgent(id);
      toast.success('Foreign agent deleted');
      get().fetchForeignAgents();
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete foreign agent');
      return false;
    }
  },

  fetchInsiderThreats: async (params = {}) => {
    set({ insiderThreatsLoading: true, insiderThreatsError: null });
    try {
      const { data } = await ciApi.listInsiderThreats({
        ...params,
        search: get().insiderThreatSearch,
        limit: params.limit || 10,
        page: params.page || 1,
      });
      set({ insiderThreats: data.data, insiderThreatsPagination: data.pagination, insiderThreatsLoading: false });
    } catch (err: any) {
      set({ insiderThreatsError: err.response?.data?.message || 'Failed to load insider threats', insiderThreatsLoading: false });
      toast.error('Failed to load insider threats');
    }
  },

  createInsiderThreat: async (fd) => {
    try {
      await ciApi.createInsiderThreat(fd);
      toast.success('Insider threat created');
      get().fetchInsiderThreats();
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create insider threat');
      return false;
    }
  },

  updateInsiderThreat: async (id, fd) => {
    try {
      await ciApi.updateInsiderThreat(id, fd);
      toast.success('Insider threat updated');
      get().fetchInsiderThreats();
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update insider threat');
      return false;
    }
  },

  deleteInsiderThreat: async (id) => {
    try {
      await ciApi.deleteInsiderThreat(id);
      toast.success('Insider threat deleted');
      get().fetchInsiderThreats();
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete insider threat');
      return false;
    }
  },
}));
