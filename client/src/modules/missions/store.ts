import { create } from 'zustand';
import { missionPlansApi, missionBriefsApi, missionDebriefsApi } from './api';

interface MissionPlan { id: string; reference_number: string; title: string; status: string; classification: string; priority: string; objective: string; location: string; start_date: string; end_date: string; commander_id: string; conops?: any; assets?: any[]; created_at: string; updated_at: string; }
interface MissionBrief { id: string; title: string; content: any; version: number; created_at: string; }
interface MissionDebrief { id: string; title: string; summary: string; findings: any; created_at: string; }

interface MissionStore {
  plans: MissionPlan[];
  selectedPlan: MissionPlan | null;
  plansPagination: { page: number; limit: number; total: number; totalPages: number };
  briefs: MissionBrief[];
  debriefs: MissionDebrief[];
  isLoading: boolean;
  error: string | null;
  search: string;

  fetchPlans: (params?: any) => Promise<void>;
  fetchPlan: (id: string) => Promise<void>;
  createPlan: (data: any) => Promise<void>;
  updatePlan: (id: string, data: any) => Promise<void>;
  deletePlan: (id: string) => Promise<void>;
  setSelectedPlan: (plan: MissionPlan | null) => void;
  setSearch: (s: string) => void;

  fetchBriefs: (planId: string) => Promise<void>;
  createBrief: (planId: string, data: any) => Promise<void>;
  updateBrief: (planId: string, id: string, data: any) => Promise<void>;
  deleteBrief: (planId: string, id: string) => Promise<void>;
  fetchDebriefs: (planId: string) => Promise<void>;
  createDebrief: (planId: string, data: any) => Promise<void>;
  updateDebrief: (planId: string, id: string, data: any) => Promise<void>;
  deleteDebrief: (planId: string, id: string) => Promise<void>;
}

export const useMissionStore = create<MissionStore>((set, get) => ({
  plans: [],
  selectedPlan: null,
  plansPagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
  briefs: [],
  debriefs: [],
  isLoading: false,
  error: null,
  search: '',

  fetchPlans: async (params = {}) => {
    set({ isLoading: true });
    try {
      const data = await missionPlansApi.list({ ...params, search: get().search });
      set({ plans: data.data, plansPagination: data.pagination, isLoading: false });
    } catch (e: any) { set({ error: e.message, isLoading: false }); }
  },
  fetchPlan: async (id) => {
    try { const data = await missionPlansApi.get(id); set({ selectedPlan: data }); } catch { set({ error: 'Operation failed' }); }
  },
  createPlan: async (data) => {
    await missionPlansApi.create(data);
    await get().fetchPlans();
  },
  updatePlan: async (id, data) => {
    await missionPlansApi.update(id, data);
    await get().fetchPlans();
  },
  deletePlan: async (id) => {
    await missionPlansApi.delete(id);
    set((s) => ({ plans: s.plans.filter((p) => p.id !== id) }));
  },
  setSelectedPlan: (plan) => set({ selectedPlan: plan }),
  setSearch: (s) => set({ search: s }),

  fetchBriefs: async (planId) => {
    try { const data = await missionBriefsApi.list(planId); set({ briefs: data.data }); } catch { set({ error: 'Operation failed' }); }
  },
  createBrief: async (planId, data) => {
    await missionBriefsApi.create(planId, data);
    await get().fetchBriefs(planId);
  },
  updateBrief: async (planId, id, data) => {
    await missionBriefsApi.update(planId, id, data);
    await get().fetchBriefs(planId);
  },
  deleteBrief: async (planId, id) => {
    await missionBriefsApi.delete(planId, id);
    set((s) => ({ briefs: s.briefs.filter((b) => b.id !== id) }));
  },
  fetchDebriefs: async (planId) => {
    try { const data = await missionDebriefsApi.list(planId); set({ debriefs: data.data }); } catch { set({ error: 'Operation failed' }); }
  },
  createDebrief: async (planId, data) => {
    await missionDebriefsApi.create(planId, data);
    await get().fetchDebriefs(planId);
  },
  updateDebrief: async (planId, id, data) => {
    await missionDebriefsApi.update(planId, id, data);
    await get().fetchDebriefs(planId);
  },
  deleteDebrief: async (planId, id) => {
    await missionDebriefsApi.delete(planId, id);
    set((s) => ({ debriefs: s.debriefs.filter((d) => d.id !== id) }));
  },
}));
