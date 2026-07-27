import { create } from 'zustand';
import { collectionRequirementsApi, collectionAssetsApi } from './api';

interface CollectionRequirement {
  id: string;
  reference_number: string;
  title: string;
  description: string;
  priority: string;
  intelligence_discipline: string;
  status: string;
  requester_id: string;
  created_at: string;
  updated_at: string;
}

interface CollectionAsset {
  id: string;
  name: string;
  asset_type: string;
  platform: string;
  capability: string;
  status: string;
  location: string;
  coverage_area: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface CollectionState {
  requirements: CollectionRequirement[];
  assets: CollectionAsset[];
  selectedRequirement: CollectionRequirement | null;
  selectedAsset: CollectionAsset | null;
  requirementsPagination: Pagination;
  assetsPagination: Pagination;
  isLoading: boolean;
  error: string | null;

  fetchRequirements: (params?: Record<string, any>) => Promise<void>;
  fetchRequirement: (id: string) => Promise<void>;
  createRequirement: (data: Partial<CollectionRequirement>) => Promise<CollectionRequirement>;
  updateRequirement: (id: string, data: Partial<CollectionRequirement>) => Promise<void>;
  deleteRequirement: (id: string) => Promise<void>;

  fetchAssets: (params?: Record<string, any>) => Promise<void>;
  fetchAsset: (id: string) => Promise<void>;
  createAsset: (data: Partial<CollectionAsset>) => Promise<CollectionAsset>;
  updateAsset: (id: string, data: Partial<CollectionAsset>) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;

  clearSelected: () => void;
}

const defaultPagination: Pagination = { page: 1, limit: 10, total: 0, totalPages: 0 };

export const useCollectionStore = create<CollectionState>((set) => ({
  requirements: [],
  assets: [],
  selectedRequirement: null,
  selectedAsset: null,
  requirementsPagination: defaultPagination,
  assetsPagination: defaultPagination,
  isLoading: false,
  error: null,

  fetchRequirements: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const res = await collectionRequirementsApi.list(params);
      set({ requirements: res.data, requirementsPagination: res.pagination, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to fetch requirements', isLoading: false });
    }
  },

  fetchRequirement: async (id) => {
    const data = await collectionRequirementsApi.get(id);
    set({ selectedRequirement: data });
  },

  createRequirement: async (data) => {
    const res = await collectionRequirementsApi.create(data);
    set((s) => ({ requirements: [res, ...s.requirements] }));
    return res;
  },

  updateRequirement: async (id, data) => {
    const res = await collectionRequirementsApi.update(id, data);
    set((s) => ({
      requirements: s.requirements.map((r) => (r.id === id ? res : r)),
      selectedRequirement: s.selectedRequirement?.id === id ? res : s.selectedRequirement,
    }));
  },

  deleteRequirement: async (id) => {
    await collectionRequirementsApi.delete(id);
    set((s) => ({ requirements: s.requirements.filter((r) => r.id !== id) }));
  },

  fetchAssets: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const res = await collectionAssetsApi.list(params);
      set({ assets: res.data, assetsPagination: res.pagination, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to fetch assets', isLoading: false });
    }
  },

  fetchAsset: async (id) => {
    const data = await collectionAssetsApi.get(id);
    set({ selectedAsset: data });
  },

  createAsset: async (data) => {
    const res = await collectionAssetsApi.create(data);
    set((s) => ({ assets: [res, ...s.assets] }));
    return res;
  },

  updateAsset: async (id, data) => {
    const res = await collectionAssetsApi.update(id, data);
    set((s) => ({
      assets: s.assets.map((a) => (a.id === id ? res : a)),
      selectedAsset: s.selectedAsset?.id === id ? res : s.selectedAsset,
    }));
  },

  deleteAsset: async (id) => {
    await collectionAssetsApi.delete(id);
    set((s) => ({ assets: s.assets.filter((a) => a.id !== id) }));
  },

  clearSelected: () => set({ selectedRequirement: null, selectedAsset: null }),
}));
