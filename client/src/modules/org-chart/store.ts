import { create } from 'zustand';
import { orgChartApi } from './api';

export interface OrgUnit {
  id: string;
  name: string;
  parent_id: string | null;
  unit_type: string;
  commander_id: string | null;
  description: string | null;
  location: string | null;
  established_date: string | null;
  children?: OrgUnit[];
  created_at?: string;
  updated_at?: string;
}

export interface PersonnelAssignment {
  id: string;
  unit_id: string;
  user_id: string;
  role: string;
  is_primary: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at?: string;
  updated_at?: string;
}

interface OrgChartState {
  tree: OrgUnit[];
  units: OrgUnit[];
  assignments: PersonnelAssignment[];
  selectedUnit: OrgUnit | null;
  pagination: { page: number; limit: number; total: number; totalPages: number };
  assignmentsPagination: { page: number; limit: number; total: number; totalPages: number };
  isLoading: boolean;
  error: string | null;
  fetchTree: () => Promise<void>;
  fetchUnits: (params?: Record<string, any>) => Promise<void>;
  fetchAssignments: (params?: Record<string, any>) => Promise<void>;
  createUnit: (data: Partial<OrgUnit>) => Promise<void>;
  updateUnit: (id: string, data: Partial<OrgUnit>) => Promise<void>;
  deleteUnit: (id: string) => Promise<void>;
  createAssignment: (data: Partial<PersonnelAssignment>) => Promise<void>;
  updateAssignment: (id: string, data: Partial<PersonnelAssignment>) => Promise<void>;
  deleteAssignment: (id: string) => Promise<void>;
  setSelectedUnit: (unit: OrgUnit | null) => void;
}

export const useOrgChartStore = create<OrgChartState>((set, get) => ({
  tree: [],
  units: [],
  assignments: [],
  selectedUnit: null,
  pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
  assignmentsPagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
  isLoading: false,
  error: null,

  fetchTree: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await orgChartApi.getTree();
      set({ tree: data.data || data || [], isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to fetch', isLoading: false });
    }
  },

  fetchUnits: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await orgChartApi.listUnits(params);
      set({
        units: data.data || [],
        pagination: data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 },
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to fetch', isLoading: false });
    }
  },

  fetchAssignments: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await orgChartApi.listAssignments(params);
      set({
        assignments: data.data || [],
        assignmentsPagination: data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 },
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to fetch', isLoading: false });
    }
  },

  createUnit: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      await orgChartApi.createUnit(payload);
      await Promise.all([get().fetchTree(), get().fetchUnits()]);
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to create', isLoading: false });
      throw err;
    }
  },

  updateUnit: async (id, payload) => {
    set({ isLoading: true, error: null });
    try {
      await orgChartApi.updateUnit(id, payload);
      await Promise.all([get().fetchTree(), get().fetchUnits()]);
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to update', isLoading: false });
      throw err;
    }
  },

  deleteUnit: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await orgChartApi.deleteUnit(id);
      await Promise.all([get().fetchTree(), get().fetchUnits()]);
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to delete', isLoading: false });
      throw err;
    }
  },

  createAssignment: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      await orgChartApi.createAssignment(payload);
      await get().fetchAssignments();
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to create', isLoading: false });
      throw err;
    }
  },

  updateAssignment: async (id, payload) => {
    set({ isLoading: true, error: null });
    try {
      await orgChartApi.updateAssignment(id, payload);
      await get().fetchAssignments();
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to update', isLoading: false });
      throw err;
    }
  },

  deleteAssignment: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await orgChartApi.deleteAssignment(id);
      await get().fetchAssignments();
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to delete', isLoading: false });
      throw err;
    }
  },

  setSelectedUnit: (unit) => set({ selectedUnit: unit }),
}));
