import { create } from 'zustand';
import { taskingAssignmentsApi, taskingWorkflowsApi } from './api';

interface TaskingAssignment {
  id: string;
  reference_number: string;
  title: string;
  description: string;
  task_type: string;
  priority: string;
  status: string;
  assigned_to: string;
  assigned_by: string;
  due_date: string;
  created_at: string;
  updated_at: string;
}

interface TaskingWorkflow {
  id: string;
  reference_number: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface TaskingState {
  assignments: TaskingAssignment[];
  workflows: TaskingWorkflow[];
  selectedAssignment: TaskingAssignment | null;
  selectedWorkflow: TaskingWorkflow | null;
  assignmentsPagination: Pagination;
  workflowsPagination: Pagination;
  isLoading: boolean;
  error: string | null;

  fetchAssignments: (params?: Record<string, any>) => Promise<void>;
  fetchAssignment: (id: string) => Promise<void>;
  createAssignment: (data: Partial<TaskingAssignment>) => Promise<TaskingAssignment>;
  updateAssignment: (id: string, data: Partial<TaskingAssignment>) => Promise<void>;
  deleteAssignment: (id: string) => Promise<void>;

  fetchWorkflows: (params?: Record<string, any>) => Promise<void>;
  fetchWorkflow: (id: string) => Promise<void>;
  createWorkflow: (data: Partial<TaskingWorkflow>) => Promise<TaskingWorkflow>;
  updateWorkflow: (id: string, data: Partial<TaskingWorkflow>) => Promise<void>;
  deleteWorkflow: (id: string) => Promise<void>;

  clearSelected: () => void;
}

const defaultPagination: Pagination = { page: 1, limit: 10, total: 0, totalPages: 0 };

export const useTaskingStore = create<TaskingState>((set) => ({
  assignments: [],
  workflows: [],
  selectedAssignment: null,
  selectedWorkflow: null,
  assignmentsPagination: defaultPagination,
  workflowsPagination: defaultPagination,
  isLoading: false,
  error: null,

  fetchAssignments: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const res = await taskingAssignmentsApi.list(params);
      set({ assignments: res.data, assignmentsPagination: res.pagination, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to fetch assignments', isLoading: false });
    }
  },

  fetchAssignment: async (id) => {
    const data = await taskingAssignmentsApi.get(id);
    set({ selectedAssignment: data });
  },

  createAssignment: async (data) => {
    const res = await taskingAssignmentsApi.create(data);
    set((s) => ({ assignments: [res, ...s.assignments] }));
    return res;
  },

  updateAssignment: async (id, data) => {
    const res = await taskingAssignmentsApi.update(id, data);
    set((s) => ({
      assignments: s.assignments.map((a) => (a.id === id ? res : a)),
      selectedAssignment: s.selectedAssignment?.id === id ? res : s.selectedAssignment,
    }));
  },

  deleteAssignment: async (id) => {
    await taskingAssignmentsApi.delete(id);
    set((s) => ({ assignments: s.assignments.filter((a) => a.id !== id) }));
  },

  fetchWorkflows: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const res = await taskingWorkflowsApi.list(params);
      set({ workflows: res.data, workflowsPagination: res.pagination, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to fetch workflows', isLoading: false });
    }
  },

  fetchWorkflow: async (id) => {
    const data = await taskingWorkflowsApi.get(id);
    set({ selectedWorkflow: data });
  },

  createWorkflow: async (data) => {
    const res = await taskingWorkflowsApi.create(data);
    set((s) => ({ workflows: [res, ...s.workflows] }));
    return res;
  },

  updateWorkflow: async (id, data) => {
    const res = await taskingWorkflowsApi.update(id, data);
    set((s) => ({
      workflows: s.workflows.map((w) => (w.id === id ? res : w)),
      selectedWorkflow: s.selectedWorkflow?.id === id ? res : s.selectedWorkflow,
    }));
  },

  deleteWorkflow: async (id) => {
    await taskingWorkflowsApi.delete(id);
    set((s) => ({ workflows: s.workflows.filter((w) => w.id !== id) }));
  },

  clearSelected: () => set({ selectedAssignment: null, selectedWorkflow: null }),
}));
