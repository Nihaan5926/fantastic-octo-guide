import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useCaseStore } from '../store';
import { useDynamicTable } from '../../../hooks/useDynamicTable';
import { casesApi } from '../api';
import { exportToCSV, exportToJSON } from '../../../utils/export';
import DataTable from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import PageHeader from '../../../components/common/PageHeader';
import SearchBar from '../../../components/common/SearchBar';
import { FormInput, FormTextarea, FormSelect } from '../../../components/common/FormComponents';
import { StatusBadge, ClassificationBadge, PriorityBadge } from '../../../components/common/Badges';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { Pencil, Trash2, Download, ChevronDown, Trash, LayoutGrid } from 'lucide-react';

const statusOptions = [
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'PENDING_REVIEW', label: 'Pending Review' },
  { value: 'CLOSED', label: 'Closed' },
];

const classificationOptions = [
  { value: 'UNCLASSIFIED', label: 'Unclassified' },
  { value: 'CONFIDENTIAL', label: 'Confidential' },
  { value: 'SECRET', label: 'Secret' },
  { value: 'TOP_SECRET', label: 'Top Secret' },
];

const priorityOptions = [
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

const statusColorMap: Record<string, string> = {
  OPEN: 'blue', IN_PROGRESS: 'yellow', PENDING_REVIEW: 'purple', CLOSED: 'green',
};

interface CaseForm {
  reference_number: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  classification: string;
  lead_analyst_id: string;
  start_date: string;
  end_date: string;
}

const emptyForm: CaseForm = {
  reference_number: '', title: '', description: '', status: 'OPEN', priority: 'MEDIUM', classification: 'UNCLASSIFIED', lead_analyst_id: '', start_date: '', end_date: '',
};

export default function CasesList() {
  const navigate = useNavigate();
  const { items, pagination, isLoading, isSubmitting, fetchList, create, update, remove } = useCaseStore();
  const { tableColumns } = useDynamicTable('cases');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [classificationFilter, setClassificationFilter] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CaseForm>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
  const [bulkStatusValue, setBulkStatusValue] = useState('');
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
    fetchList({ page, search, status: statusFilter, priority: priorityFilter, classification: classificationFilter });
  }, [page, statusFilter, priorityFilter, classificationFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchList({ page: 1, search, status: statusFilter, priority: priorityFilter, classification: classificationFilter });
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
      reference_number: item.reference_number || '',
      title: item.title || '',
      description: item.description || '',
      status: item.status || 'OPEN',
      priority: item.priority || 'MEDIUM',
      classification: item.classification || 'UNCLASSIFIED',
      lead_analyst_id: item.lead_analyst_id || '',
      start_date: item.start_date ? item.start_date.slice(0, 10) : '',
      end_date: item.end_date ? item.end_date.slice(0, 10) : '',
    });
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await update(editingId, form);
        toast.success('Case updated');
      } else {
        await create(form);
        toast.success('Case created');
      }
      setFormOpen(false);
      fetchList({ page, search, status: statusFilter, priority: priorityFilter, classification: classificationFilter });
    } catch {
      toast.error('Operation failed');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await remove(deleteTarget.id);
      toast.success('Case deleted');
      setDeleteTarget(null);
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const { data } = await casesApi.list({ limit: 1000 });
      const allItems = data.data || data.items || [];
      exportToCSV(allItems, 'cases-export');
      toast.success(`Exported ${allItems.length} cases as CSV`);
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
      const { data } = await casesApi.list({ limit: 1000 });
      const allItems = data.data || data.items || [];
      exportToJSON(allItems, 'cases-export');
      toast.success(`Exported ${allItems.length} cases as JSON`);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
      setExportOpen(false);
    }
  };

  const handleBulkDelete = async () => {
    setBulkDeleteOpen(false);
    const count = selectedIds.length;
    try {
      const results = await Promise.allSettled(selectedIds.map((id) => casesApi.delete(id)));
      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed > 0) {
        toast.success(`${count - failed} deleted, ${failed} failed`);
      } else {
        toast.success(`${count} case(s) deleted`);
      }
      setSelectedIds([]);
      fetchList({ page, search, status: statusFilter, priority: priorityFilter, classification: classificationFilter });
    } catch {
      toast.error('Bulk delete failed');
    }
  };

  const handleBulkStatusChange = async () => {
    if (!bulkStatusValue) return;
    setBulkStatusOpen(false);
    const count = selectedIds.length;
    try {
      const results = await Promise.allSettled(
        selectedIds.map((id) => casesApi.update(id, { status: bulkStatusValue }))
      );
      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed > 0) {
        toast.success(`${count - failed} updated, ${failed} failed`);
      } else {
        toast.success(`${count} case(s) updated`);
      }
      setSelectedIds([]);
      setBulkStatusValue('');
      fetchList({ page, search, status: statusFilter, priority: priorityFilter, classification: classificationFilter });
    } catch {
      toast.error('Bulk update failed');
    }
  };

  const columns = [
    { key: 'reference_number', label: 'Ref #' },
    { key: 'title', label: 'Title' },
    {
      key: 'classification',
      label: 'Classification',
      render: (item: any) => <ClassificationBadge level={item.classification} />,
    },
    {
      key: 'status',
      label: 'Status',
      render: (item: any) => <StatusBadge label={item.status} color={statusColorMap[item.status] || 'gray'} />,
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (item: any) => <PriorityBadge level={item.priority} />,
    },
    { key: 'lead_analyst_id', label: 'Lead Analyst' },
    {
      key: 'actions',
      label: '',
      className: 'w-24',
      render: (item: any) => (
        <div className="flex items-center gap-1">
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
      <PageHeader title="Cases" subtitle="Manage case investigations" onCreate={openCreate} createLabel="New Case">
        <button onClick={() => navigate('/cases/board')} className="btn-secondary text-sm flex items-center gap-1" title="Kanban Board View">
          <LayoutGrid size={14} /> Board View
        </button>
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

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search cases..." className="flex-1" />
        <FormSelect label="" options={statusOptions} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} placeholder="All Statuses" className="w-40" />
        <FormSelect label="" options={priorityOptions} value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }} placeholder="All Priorities" className="w-40" />
        <FormSelect label="" options={classificationOptions} value={classificationFilter} onChange={(e) => { setClassificationFilter(e.target.value); setPage(1); }} placeholder="All Classifications" className="w-40" />
      </div>

      {selectedIds.length > 0 && (
        <div className="mb-4 p-3 bg-accent/10 border border-accent/30 rounded-xl flex items-center justify-between">
          <span className="text-sm text-text-primary">
            {selectedIds.length} case(s) selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setBulkStatusOpen(true)}
              className="btn-secondary text-xs py-1.5"
            >
              Change Status
            </button>
            <button
              onClick={() => setBulkDeleteOpen(true)}
              className="btn-danger text-xs py-1.5"
            >
              <Trash size={14} /> Delete Selected
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="text-xs text-text-muted hover:text-text-secondary px-2"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <DataTable
        columns={[...tableColumns, ...columns.filter(c => c.key === 'actions')]}
        data={items}
        pagination={pagination}
        isLoading={isLoading}
        emptyMessage="No cases found"
        onPageChange={setPage}
        onRowClick={(item) => navigate(`/cases/${item.id}`)}
        selectable
        selected={selectedIds}
        onSelectionChange={setSelectedIds}
      />

      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title={editingId ? 'Edit Case' : 'Create Case'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput label="Reference Number" value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} />
            <FormInput label="Lead Analyst ID" value={form.lead_analyst_id} onChange={(e) => setForm({ ...form, lead_analyst_id: e.target.value })} />
          </div>
          <FormInput label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <FormTextarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormSelect label="Classification" options={classificationOptions} value={form.classification} onChange={(e) => setForm({ ...form, classification: e.target.value })} />
            <FormSelect label="Status" options={statusOptions} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} />
            <FormSelect label="Priority" options={priorityOptions} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput label="Start Date" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            <FormInput label="End Date" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
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
        title="Delete Case"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        variant="danger"
        isLoading={isSubmitting}
      />

      <ConfirmDialog
        isOpen={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        title="Delete Selected Cases"
        message={`Are you sure you want to delete ${selectedIds.length} case(s)? This action cannot be undone.`}
        confirmLabel={`Delete ${selectedIds.length} Case(s)`}
        variant="danger"
      />

      <Modal isOpen={bulkStatusOpen} onClose={() => setBulkStatusOpen(false)} title={`Change Status for ${selectedIds.length} Case(s)`} size="sm">
        <div className="space-y-4">
          <FormSelect
            label="New Status"
            options={statusOptions}
            value={bulkStatusValue}
            onChange={(e) => setBulkStatusValue(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button type="button" onClick={() => setBulkStatusOpen(false)} className="btn-secondary">Cancel</button>
            <button
              type="button"
              onClick={handleBulkStatusChange}
              disabled={!bulkStatusValue}
              className="btn-primary"
            >
              Update {selectedIds.length} Case(s)
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}