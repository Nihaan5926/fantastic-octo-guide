import React, { useEffect, useState, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useSourceStore } from '../store';
import { useDynamicTable } from '../../../hooks/useDynamicTable';
import { sourcesApi } from '../api';
import { exportToCSV, exportToJSON } from '../../../utils/export';
import DataTable from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import PageHeader from '../../../components/common/PageHeader';
import SearchBar from '../../../components/common/SearchBar';
import { FormInput, FormTextarea, FormSelect } from '../../../components/common/FormComponents';
import { StatusBadge, SourceTypeBadge } from '../../../components/common/Badges';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { Pencil, Trash2, Download, ChevronDown } from 'lucide-react';

const typeOptions = [
  { value: 'HUMINT', label: 'HUMINT' },
  { value: 'OSINT', label: 'OSINT' },
  { value: 'SIGINT', label: 'SIGINT' },
  { value: 'GEOINT', label: 'GEOINT' },
  { value: 'MASINT', label: 'MASINT' },
  { value: 'TECHINT', label: 'TECHINT' },
];

const statusOptions = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'COMPROMISED', label: 'Compromised' },
];

const reliabilityOptions = [
  { value: 'A', label: 'A - Reliable' },
  { value: 'B', label: 'B - Usually Reliable' },
  { value: 'C', label: 'C - Fairly Reliable' },
  { value: 'D', label: 'D - Not Usually Reliable' },
  { value: 'E', label: 'E - Unreliable' },
];

const statusColorMap: Record<string, string> = {
  ACTIVE: 'green', INACTIVE: 'gray', SUSPENDED: 'yellow', COMPROMISED: 'red',
};

interface SourceForm {
  code_name: string;
  type: string;
  reliability_rating: string;
  status: string;
  description: string;
  contact_info: string;
  handler_id: string;
}

const emptyForm: SourceForm = {
  code_name: '', type: 'HUMINT', reliability_rating: 'C', status: 'ACTIVE', description: '', contact_info: '{}', handler_id: '',
};

export default function SourcesList() {
  const { items, pagination, isLoading, isSubmitting, fetchList, create, update, remove } = useSourceStore();
  const { tableColumns } = useDynamicTable('sources');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SourceForm>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
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
    fetchList({ page, search, type: typeFilter, status: statusFilter });
  }, [page, typeFilter, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchList({ page: 1, search, type: typeFilter, status: statusFilter });
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
      code_name: item.code_name || '',
      type: item.type || 'HUMINT',
      reliability_rating: item.reliability_rating || 'C',
      status: item.status || 'ACTIVE',
      description: item.description || '',
      contact_info: typeof item.contact_info === 'object' ? JSON.stringify(item.contact_info) : (item.contact_info || '{}'),
      handler_id: item.handler_id || '',
    });
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let contactInfoParsed = {};
      try { contactInfoParsed = JSON.parse(form.contact_info); } catch {}
      const payload = { ...form, contact_info: contactInfoParsed };
      if (editingId) {
        await update(editingId, payload);
        toast.success('Source updated');
      } else {
        await create(payload);
        toast.success('Source created');
      }
      setFormOpen(false);
      fetchList({ page, search, type: typeFilter, status: statusFilter });
    } catch {
      toast.error('Operation failed');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await remove(deleteTarget.id);
      toast.success('Source deleted');
      setDeleteTarget(null);
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const { data } = await sourcesApi.list({ limit: 1000 });
      const allItems = data.data || data.items || [];
      exportToCSV(allItems, 'sources-export');
      toast.success(`Exported ${allItems.length} sources as CSV`);
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
      const { data } = await sourcesApi.list({ limit: 1000 });
      const allItems = data.data || data.items || [];
      exportToJSON(allItems, 'sources-export');
      toast.success(`Exported ${allItems.length} sources as JSON`);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
      setExportOpen(false);
    }
  };

  const columns = [
    { key: 'code_name', label: 'Code Name' },
    {
      key: 'type',
      label: 'Type',
      render: (item: any) => <SourceTypeBadge type={item.type} />,
    },
    { key: 'reliability_rating', label: 'Reliability' },
    {
      key: 'status',
      label: 'Status',
      render: (item: any) => <StatusBadge label={item.status} color={statusColorMap[item.status] || 'gray'} />,
    },
    { key: 'handler_id', label: 'Handler' },
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
      <PageHeader title="Sources" subtitle="Manage intelligence sources" onCreate={openCreate} createLabel="New Source">
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
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search sources..." className="flex-1" />
        <FormSelect label="" options={typeOptions} value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} placeholder="All Types" className="w-36" />
        <FormSelect label="" options={statusOptions} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} placeholder="All Statuses" className="w-40" />
      </div>

      <DataTable columns={[...tableColumns, ...columns.filter(c => c.key === 'actions')]} data={items} pagination={pagination} isLoading={isLoading} emptyMessage="No sources found" onPageChange={setPage} />

      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title={editingId ? 'Edit Source' : 'Create Source'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput label="Code Name" value={form.code_name} onChange={(e) => setForm({ ...form, code_name: e.target.value })} />
            <FormInput label="Handler ID" value={form.handler_id} onChange={(e) => setForm({ ...form, handler_id: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormSelect label="Type" options={typeOptions} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
            <FormSelect label="Reliability" options={reliabilityOptions} value={form.reliability_rating} onChange={(e) => setForm({ ...form, reliability_rating: e.target.value })} />
            <FormSelect label="Status" options={statusOptions} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} />
          </div>
          <FormTextarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
          <FormTextarea label="Contact Info (JSON)" value={form.contact_info} onChange={(e) => setForm({ ...form, contact_info: e.target.value })} rows={2} />
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
        title="Delete Source"
        message={`Are you sure you want to delete "${deleteTarget?.code_name}"? This action cannot be undone.`}
        variant="danger"
        isLoading={isSubmitting}
      />
    </div>
  );
}