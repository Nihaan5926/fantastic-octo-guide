import { create } from 'zustand';
import { targetPackagesApi, targetNominationsApi } from './api';

interface TargetPackage { id: string; reference_number: string; title: string; objective: string; status: string; classification: string; priority: string; target_name: string; location: string; cde_estimate: string; assessment?: any; created_at: string; }
interface TargetNomination { id: string; title: string; justification: string; status: string; classification: string; created_at: string; }

interface TargetStore {
  packages: TargetPackage[];
  selectedPackage: TargetPackage | null;
  packagesPagination: any;
  nominations: TargetNomination[];
  isLoading: boolean;
  error: string | null;
  search: string;

  fetchPackages: (params?: any) => Promise<void>;
  fetchPackage: (id: string) => Promise<void>;
  createPackage: (data: any) => Promise<void>;
  updatePackage: (id: string, data: any) => Promise<void>;
  deletePackage: (id: string) => Promise<void>;
  setSelectedPackage: (pkg: TargetPackage | null) => void;
  setSearch: (s: string) => void;

  fetchNominations: (packageId: string) => Promise<void>;
  createNomination: (packageId: string, data: any) => Promise<void>;
  updateNomination: (id: string, data: any) => Promise<void>;
  deleteNomination: (id: string) => Promise<void>;
  clearSelected: () => void;
}

export const useTargetStore = create<TargetStore>((set, get) => ({
  packages: [],
  selectedPackage: null,
  packagesPagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
  nominations: [],
  isLoading: false,
  error: null,
  search: '',

  fetchPackages: async (params = {}) => {
    set({ isLoading: true });
    try { const d = await targetPackagesApi.list({ ...params, search: get().search }); set({ packages: d.data, packagesPagination: d.pagination, isLoading: false }); }
    catch (e: any) { set({ error: e.message, isLoading: false }); }
  },
  fetchPackage: async (id) => { try { const d = await targetPackagesApi.get(id); set({ selectedPackage: d }); } catch {} },
  createPackage: async (data) => { await targetPackagesApi.create(data); await get().fetchPackages(); },
  updatePackage: async (id, data) => { await targetPackagesApi.update(id, data); await get().fetchPackages(); },
  deletePackage: async (id) => { await targetPackagesApi.delete(id); set((s) => ({ packages: s.packages.filter((p) => p.id !== id) })); },
  setSelectedPackage: (pkg) => set({ selectedPackage: pkg }),
  setSearch: (s) => set({ search: s }),

  fetchNominations: async (packageId) => {
    set({ isLoading: true });
    try { const d = await targetNominationsApi.list(packageId); set({ nominations: d.data, isLoading: false }); }
    catch { set({ isLoading: false }); }
  },
  createNomination: async (packageId, data) => {
    await targetNominationsApi.create(packageId, data);
    await get().fetchNominations(packageId);
  },
  updateNomination: async (id, data) => {
    await targetNominationsApi.update(id, data);
  },
  deleteNomination: async (id) => {
    await targetNominationsApi.delete(id);
  },
  clearSelected: () => set({ selectedPackage: null, nominations: [] }),
}));
