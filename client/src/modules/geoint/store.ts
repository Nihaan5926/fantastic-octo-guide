import { create } from 'zustand';
import { geointApi } from './api';
import toast from 'react-hot-toast';

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface GeointState {
  features: any[];
  featuresPagination: Pagination;
  featuresLoading: boolean;
  featuresError: string | null;
  featureSearch: string;
  currentFeature: any | null;
  currentFeatureLoading: boolean;

  annotations: any[];
  annotationsLoading: boolean;

  setFeatureSearch: (search: string) => void;
  fetchFeatures: (params?: any) => Promise<void>;
  fetchFeature: (id: string) => Promise<void>;
  createFeature: (data: any) => Promise<boolean>;
  updateFeature: (id: string, data: any) => Promise<boolean>;
  deleteFeature: (id: string) => Promise<boolean>;

  fetchAnnotations: (featureId: string) => Promise<void>;
  createAnnotation: (featureId: string, data: any) => Promise<boolean>;
  deleteAnnotation: (id: string) => Promise<boolean>;
}

const defaultPagination: Pagination = { page: 1, limit: 10, total: 0, totalPages: 0 };

export const useGeointStore = create<GeointState>((set, get) => ({
  features: [],
  featuresPagination: defaultPagination,
  featuresLoading: false,
  featuresError: null,
  featureSearch: '',
  currentFeature: null,
  currentFeatureLoading: false,

  annotations: [],
  annotationsLoading: false,

  setFeatureSearch: (search) => set({ featureSearch: search }),

  fetchFeatures: async (params = {}) => {
    set({ featuresLoading: true, featuresError: null });
    try {
      const { data } = await geointApi.listFeatures({
        ...params,
        search: get().featureSearch,
        limit: params.limit || 10,
        page: params.page || 1,
      });
      set({ features: data.data, featuresPagination: data.pagination, featuresLoading: false });
    } catch (err: any) {
      set({
        featuresError: err.response?.data?.message || 'Failed to load features',
        featuresLoading: false,
      });
      toast.error('Failed to load features');
    }
  },

  fetchFeature: async (id) => {
    set({ currentFeatureLoading: true });
    try {
      const { data } = await geointApi.getFeature(id);
      set({ currentFeature: data, currentFeatureLoading: false });
    } catch {
      set({ currentFeatureLoading: false });
      toast.error('Failed to load feature');
    }
  },

  createFeature: async (formData) => {
    try {
      await geointApi.createFeature(formData);
      toast.success('Feature created');
      get().fetchFeatures();
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create feature');
      return false;
    }
  },

  updateFeature: async (id, formData) => {
    try {
      await geointApi.updateFeature(id, formData);
      toast.success('Feature updated');
      get().fetchFeatures();
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update feature');
      return false;
    }
  },

  deleteFeature: async (id) => {
    try {
      await geointApi.deleteFeature(id);
      toast.success('Feature deleted');
      get().fetchFeatures();
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete feature');
      return false;
    }
  },

  fetchAnnotations: async (featureId) => {
    set({ annotationsLoading: true });
    try {
      const { data } = await geointApi.listAnnotations(featureId);
      set({ annotations: Array.isArray(data) ? data : data.data || [], annotationsLoading: false });
    } catch {
      set({ annotationsLoading: false });
      toast.error('Failed to load annotations');
    }
  },

  createAnnotation: async (featureId, formData) => {
    try {
      await geointApi.createAnnotation(featureId, formData);
      toast.success('Annotation added');
      get().fetchAnnotations(featureId);
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add annotation');
      return false;
    }
  },

  deleteAnnotation: async (id) => {
    try {
      await geointApi.deleteAnnotation(id);
      toast.success('Annotation deleted');
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete annotation');
      return false;
    }
  },
}));
