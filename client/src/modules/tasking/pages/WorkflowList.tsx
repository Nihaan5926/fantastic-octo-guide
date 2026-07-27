import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Edit, Trash2, GitBranch } from 'lucide-react';
import DataTable from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import PageHeader from '../../../components/common/PageHeader';
import SearchBar from '../../../components/common/SearchBar';
import { FormInput, FormTextarea, FormSelect } from '../../../components/common/FormComponents';
import { StatusBadge, PriorityBadge } from '../../../components/common/Badges';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { useTaskingStore } from '../store';

const statusOptions = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const priorityOptions = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

const emptyWorkflow = {
  reference_number: '', title: '', description: '', status: 'DRAFT', priority: 'MEDIUM',
};

export default function WorkflowList() {
  const {
    workflows, workflowsPagination, isLoading,
    fetchWorkflows, createWorkflow, updateWorkflow, deleteWorkflow,
  } = useTaskingStore();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyWorkflow);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  useEffect(() => {
    fetchWorkflows({ search, limit: 10 });
  }, [search]);

  const handleCreate = () => {
    setEditing(null);
    setForm(emptyWorkflow);
    setModalOpen(true);
  };

  const handleEdit = (item: any) => {
    setEditing(item);
    setForm({
      reference_number: item.reference_number || '',
      title: item.title || '',
      description: item.description || '',
      status: item.status || 'DRAFT',
      priority: item.priority || 'MEDIUM',
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await updateWorkflow(editing.id, form);
        toast.success('Workflow updated');
      } else {
        await createWorkflow(form);
        toast.success('Workflow created');
      }
      setModalOpen(false);
      fetchWorkflows({ search, page: workflowsPagination.page, limit: 10 });
    } catch {
      toast.error('Failed to save workflow');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteWorkflow(deleteTarget.id);
      toast.success('Workflow deleted');
      setDeleteTarget(null);
      fetchWorkflows({ search, page: workflowsPagination.page, limit: 10 });
    } catch {
      toast.error('Failed to delete workflow');
    }
  };

  const columns = [
    { key: 'reference_number', label: 'Ref #', className: 'font-mono text-xs' },
    { key: 'title', label: 'Title', className: 'font-medium' },
    {
      key: 'status',
      label: 'Status',
      render: (item: any) => <StatusBadge label={item.status} color={item.status === 'ACTIVE' ? 'green' : item.status === 'COMPLETED' ? 'blue' : item.status === 'CANCELLED' ? 'red' : item.status === 'PAUSED' ? 'yellow' : 'gray'} />,
    },
    {
      key: 'priority', label: 'Priority', render: (item: any) => <PriorityBadge level={item.priority} />,
    },
    { key: 'description', label: 'Description', render: (item: any) => <span className="text-text-secondary text-xs line-clamp-1">{item.description || '—'}</span> },
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
        title="Workflows"
        subtitle="Manage tasking workflow definitions"
        onCreate={handleCreate}
        createLabel="New Workflow"
      />
      <SearchBar value={search} onChange={(v) => { setSearch(v); fetchWorkflows({ search: v, page: 1, limit: 10 }); }} placeholder="Search workflows..." />
      <DataTable
        columns={columns}
        data={workflows}
        pagination={workflowsPagination.totalPages > 0 ? workflowsPagination : undefined}
        isLoading={isLoading}
        emptyMessage="No workflows found"
        onPageChange={(n) => fetchWorkflows({ search, page: n, limit: 10 })}
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Workflow' : 'New Workflow'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Reference Number" value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} required />
            <FormSelect label="Status" options={statusOptions} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} required />
          </div>
          <FormInput label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <FormSelect label="Priority" options={priorityOptions} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} required />
          <FormTextarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
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
        title="Delete Workflow"
        message={`Are you sure you want to delete "${deleteTarget?.title}"?`}
        variant="danger"
      />
    </div>
  );
}
