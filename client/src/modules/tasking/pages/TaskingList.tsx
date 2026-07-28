import React, { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { Edit, Trash2, Calendar, User, Download, ChevronDown } from 'lucide-react';
import { exportToCSV, exportToJSON } from '../../../utils/export';
import { taskingAssignmentsApi } from '../api';
import { useDynamicTable } from '../../../hooks/useDynamicTable';
import DataTable from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import PageHeader from '../../../components/common/PageHeader';
import SearchBar from '../../../components/common/SearchBar';
import { FormInput, FormTextarea, FormSelect } from '../../../components/common/FormComponents';
import { StatusBadge, PriorityBadge } from '../../../components/common/Badges';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { useTaskingStore } from '../store';

const statusOptions = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const taskTypeOptions = [
  { value: 'COLLECTION', label: 'Collection' },
  { value: 'ANALYSIS', label: 'Analysis' },
  { value: 'PRODUCTION', label: 'Production' },
  { value: 'DISSEMINATION', label: 'Dissemination' },
  { value: 'COORDINATION', label: 'Coordination' },
  { value: 'LOGISTICS', label: 'Logistics' },
  { value: 'OTHER', label: 'Other' },
];

const priorityOptions = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

const emptyAssignment = {
  reference_number: '', title: '', description: '', task_type: 'COLLECTION',
  priority: 'MEDIUM', status: 'PENDING', assigned_to: '', assigned_by: '', due_date: '',
};

export default function TaskingList() {
  const {
    assignments, assignmentsPagination, isLoading,
    fetchAssignments, createAssignment, updateAssignment, deleteAssignment,
  } = useTaskingStore();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyAssignment);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    fetchAssignments({ search, limit: 10 });
  }, [search]);

  const handleCreate = () => {
    setEditing(null);
    setForm(emptyAssignment);
    setModalOpen(true);
  };

  const handleEdit = (item: any) => {
    setEditing(item);
    setForm({
      reference_number: item.reference_number || '',
      title: item.title || '',
      description: item.description || '',
      task_type: item.task_type || 'COLLECTION',
      priority: item.priority || 'MEDIUM',
      status: item.status || 'PENDING',
      assigned_to: item.assigned_to || '',
      assigned_by: item.assigned_by || '',
      due_date: item.due_date ? item.due_date.split('T')[0] : '',
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await updateAssignment(editing.id, form);
        toast.success('Assignment updated');
      } else {
        await createAssignment(form);
        toast.success('Assignment created');
      }
      setModalOpen(false);
      fetchAssignments({ search, page: assignmentsPagination.page, limit: 10 });
    } catch {
      toast.error('Failed to save assignment');
    } finally { setSaving(false); }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const data = await taskingAssignmentsApi.list({ limit: 1000 });
      const allItems = data.data || data.items || [];
      exportToCSV(allItems, 'tasking-assignments-export');
      toast.success(`Exported ${allItems.length} assignments as CSV`);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
      setExportOpen(false);
    }
  };

  const handleExportJSON = async () => {
    setExporting(true);
    try {
      const data = await taskingAssignmentsApi.list({ limit: 1000 });
      const allItems = data.data || data.items || [];
      exportToJSON(allItems, 'tasking-assignments-export');
      toast.success(`Exported ${allItems.length} assignments as JSON`);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
      setExportOpen(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteAssignment(deleteTarget.id);
      toast.success('Assignment deleted');
      setDeleteTarget(null);
      fetchAssignments({ search, page: assignmentsPagination.page, limit: 10 });
    } catch {
      toast.error('Failed to delete assignment');
    }
  };

  const columns = [
    { key: 'reference_number', label: 'Ref #', className: 'font-mono text-xs' },
    { key: 'title', label: 'Title', className: 'font-medium' },
    {
      key: 'task_type', label: 'Type',
      render: (item: any) => <StatusBadge label={item.task_type} color={item.task_type === 'COLLECTION' ? 'green' : item.task_type === 'ANALYSIS' ? 'blue' : item.task_type === 'PRODUCTION' ? 'purple' : 'gray'} />,
    },
    {
      key: 'priority', label: 'Priority', render: (item: any) => <PriorityBadge level={item.priority} />,
    },
    {
      key: 'status',
      label: 'Status',
      render: (item: any) => <StatusBadge label={item.status} color={item.status === 'COMPLETED' ? 'green' : item.status === 'IN_PROGRESS' ? 'blue' : item.status === 'CANCELLED' ? 'red' : item.status === 'ASSIGNED' ? 'purple' : 'yellow'} />,
    },
    {
      key: 'assigned_to', label: 'Assigned To',
      render: (item: any) => (
        <span className="flex items-center gap-1 text-text-secondary text-xs">
          <User size={12} /> {item.assigned_to || '—'}
        </span>
      ),
    },
    {
      key: 'due_date', label: 'Due Date',
      render: (item: any) => (
        <span className="flex items-center gap-1 text-text-secondary text-xs">
          <Calendar size={12} /> {item.due_date ? item.due_date.split('T')[0] : '—'}
        </span>
      ),
    },
    {
      key: 'actions', label: '', className: 'w-20',
      render: (item: any) => (
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); handleEdit(item); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-accent"><Edit size={15} /></button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(item); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-red-400"><Trash2 size={15} /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasking"
        subtitle="Manage tasking assignments and workflows"
        onCreate={handleCreate}
        createLabel="New Assignment"
      >
        <div className="relative" ref={exportRef}>
          <button
            onClick={() => setExportOpen(!exportOpen)}
            disabled={exporting}
            className="btn-secondary"
          >
            {exporting ? (
              <span className="flex items-center gap-1">
                <span className="animate-pulse">Exporting...</span>
              </span>
            ) : (
              <>
                <Download size={16} />
                Export
                <ChevronDown size={14} />
              </>
            )}
          </button>
          {exportOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-bg-card border border-border rounded-xl shadow-xl z-50 py-1">
              <button
                onClick={handleExportCSV}
                className="w-full text-left px-4 py-2.5 text-sm text-text-primary hover:bg-bg-hover transition-colors flex items-center gap-2"
              >
                <Download size={14} /> Export CSV
              </button>
              <button
                onClick={handleExportJSON}
                className="w-full text-left px-4 py-2.5 text-sm text-text-primary hover:bg-bg-hover transition-colors flex items-center gap-2"
              >
                <Download size={14} /> Export JSON
              </button>
            </div>
          )}
        </div>
      </PageHeader>
      <SearchBar value={search} onChange={(v) => { setSearch(v); fetchAssignments({ search: v, page: 1, limit: 10 }); }} placeholder="Search assignments..." />
      <DataTable
        columns={columns}
        data={assignments}
        pagination={assignmentsPagination.totalPages > 0 ? assignmentsPagination : undefined}
        isLoading={isLoading}
        emptyMessage="No assignments found"
        onPageChange={(n) => fetchAssignments({ search, page: n, limit: 10 })}
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Assignment' : 'New Assignment'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Reference Number" value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} />
            <FormSelect label="Status" options={statusOptions} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} />
          </div>
          <FormInput label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <FormSelect label="Task Type" options={taskTypeOptions} value={form.task_type} onChange={(e) => setForm({ ...form, task_type: e.target.value })} />
            <FormSelect label="Priority" options={priorityOptions} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} />
          </div>
          <FormTextarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="grid grid-cols-3 gap-4">
            <FormInput label="Assigned To" value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} />
            <FormInput label="Assigned By" value={form.assigned_by} onChange={(e) => setForm({ ...form, assigned_by: e.target.value })} />
            <FormInput label="Due Date" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary" disabled={saving}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Assignment"
        message={`Are you sure you want to delete "${deleteTarget?.title}"?`}
        variant="danger"
      />
    </div>
  );
}