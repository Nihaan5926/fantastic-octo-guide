import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useOSINTStore } from '../store';
import DataTable from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import PageHeader from '../../../components/common/PageHeader';
import SearchBar from '../../../components/common/SearchBar';
import { FormInput, FormTextarea, FormSelect } from '../../../components/common/FormComponents';
import { StatusBadge } from '../../../components/common/Badges';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { Pencil, Trash2, Play, Eye } from 'lucide-react';

const sourceTypeOptions = [
  { value: 'SOCIAL_MEDIA', label: 'Social Media' },
  { value: 'NEWS', label: 'News' },
  { value: 'PUBLIC_RECORDS', label: 'Public Records' },
  { value: 'ACADEMIC', label: 'Academic' },
  { value: 'DARK_WEB', label: 'Dark Web' },
  { value: 'FORUMS', label: 'Forums' },
];

const scheduleOptions = [
  { value: 'ONCE', label: 'Once' },
  { value: 'HOURLY', label: 'Hourly' },
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
];

const statusOptions = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'RUNNING', label: 'Running' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'PAUSED', label: 'Paused' },
];

const statusColorMap: Record<string, string> = {
  PENDING: 'gray', RUNNING: 'blue', COMPLETED: 'green', FAILED: 'red', PAUSED: 'yellow',
};

interface TaskForm {
  title: string;
  query: string;
  source_types: string;
  schedule: string;
  status: string;
}

const emptyForm: TaskForm = {
  title: '', query: '', source_types: 'SOCIAL_MEDIA', schedule: 'ONCE', status: 'PENDING',
};

export default function TaskList() {
  const { items, pagination, isLoading, isSubmitting, fetchList, create, update, remove, run } = useOSINTStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TaskForm>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  useEffect(() => {
    fetchList({ page, search, status: statusFilter });
  }, [page, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchList({ page: 1, search, status: statusFilter });
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (item: any) => {
    setEditingId(item.id);
    setForm({
      title: item.title || '',
      query: item.query || '',
      source_types: Array.isArray(item.source_types) ? item.source_types[0] : (item.source_types || 'SOCIAL_MEDIA'),
      schedule: item.schedule || 'ONCE',
      status: item.status || 'PENDING',
    });
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...form, source_types: [form.source_types] };
      if (editingId) {
        await update(editingId, payload);
        toast.success('Task updated');
      } else {
        await create(payload);
        toast.success('Task created');
      }
      setFormOpen(false);
      fetchList({ page, search, status: statusFilter });
    } catch {
      toast.error('Operation failed');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await remove(deleteTarget.id);
      toast.success('Task deleted');
      setDeleteTarget(null);
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleRun = async (id: string) => {
    try {
      await run(id);
      toast.success('Task started');
      fetchList({ page, search, status: statusFilter });
    } catch {
      toast.error('Run failed');
    }
  };

  const columns = [
    { key: 'title', label: 'Title' },
    { key: 'query', label: 'Query' },
    { key: 'schedule', label: 'Schedule' },
    {
      key: 'status',
      label: 'Status',
      render: (item: any) => <StatusBadge label={item.status} color={statusColorMap[item.status] || 'gray'} />,
    },
    {
      key: 'actions',
      label: '',
      className: 'w-32',
      render: (item: any) => (
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); navigate(`/osint/tasks/${item.id}`); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-text-primary" title="View">
            <Eye size={14} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); handleRun(item.id); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-green-400" title="Run">
            <Play size={14} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); openEdit(item); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-text-primary">
            <Pencil size={14} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(item); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-red-400">
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="OSINT Tasks" subtitle="Manage open-source intelligence collection tasks" onCreate={openCreate} createLabel="New Task" />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search tasks..." className="flex-1" />
        <FormSelect label="" options={statusOptions} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} placeholder="All Statuses" className="w-40" />
      </div>

      <DataTable columns={columns} data={items} pagination={pagination} isLoading={isLoading} emptyMessage="No OSINT tasks found" onPageChange={setPage} onRowClick={(item) => navigate(`/osint/tasks/${item.id}`)} />

      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title={editingId ? 'Edit Task' : 'Create Task'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <FormTextarea label="Query" value={form.query} onChange={(e) => setForm({ ...form, query: e.target.value })} rows={2} required />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormSelect label="Source Type" options={sourceTypeOptions} value={form.source_types} onChange={(e) => setForm({ ...form, source_types: e.target.value })} required />
            <FormSelect label="Schedule" options={scheduleOptions} value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} required />
            <FormSelect label="Status" options={statusOptions} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} required />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button type="button" onClick={() => setFormOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Task"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        variant="danger"
        isLoading={isSubmitting}
      />
    </div>
  );
}
