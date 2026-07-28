import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useThreatStore } from '../store';
import { useDynamicTable } from '../../../hooks/useDynamicTable';
import { threatsApi } from '../api';
import { exportToCSV, exportToJSON } from '../../../utils/export';
import DataTable from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import PageHeader from '../../../components/common/PageHeader';
import SearchBar from '../../../components/common/SearchBar';
import { FormInput, FormTextarea, FormSelect } from '../../../components/common/FormComponents';
import { StatusBadge } from '../../../components/common/Badges';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import BulkImport from '../../../components/common/BulkImport';
import { Pencil, Trash2, Eye, Download, ChevronDown, ShieldAlert, Upload } from 'lucide-react';
import type { Column } from '../../../components/common/BulkImport';

const statusOptions = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'DEFUNCT', label: 'Defunct' },
  { value: 'MONITORED', label: 'Monitored' },
];

const sophisticationOptions = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'ADVANCED', label: 'Advanced' },
  { value: 'NATION_STATE', label: 'Nation State' },
];

const statusColorMap: Record<string, string> = {
  ACTIVE: 'red', INACTIVE: 'gray', DEFUNCT: 'purple', MONITORED: 'yellow',
};

const sophisticationColorMap: Record<string, string> = {
  LOW: 'gray', MEDIUM: 'blue', HIGH: 'yellow', ADVANCED: 'red', NATION_STATE: 'purple',
};

interface ActorForm {
  name: string;
  aliases: string;
  description: string;
  motivation: string;
  sophistication: string;
  status: string;
}

const emptyForm: ActorForm = {
  name: '', aliases: '', description: '', motivation: '', sophistication: 'MEDIUM', status: 'ACTIVE',
};

export default function ActorList() {
  const { actors, pagination, isLoading, isSubmitting, fetchActors, createActor, updateActor, removeActor } = useThreatStore();
  const { tableColumns } = useDynamicTable('threat_actors');
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ActorForm>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const [importOpen, setImportOpen] = useState(false);

  const actorColumns: Column[] = [
    { key: 'name', label: 'Name', required: true },
    { key: 'description', label: 'Description' },
    { key: 'motivation', label: 'Motivation' },
    { key: 'aliases', label: 'Aliases' },
    { key: 'sophistication', label: 'Sophistication' },
    { key: 'status', label: 'Status' },
  ];

  const handleImportActors = async (rows: Record<string, any>[]) => {
    const actors = rows.map((row) => ({
      ...row,
      aliases: row.aliases ? row.aliases.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
    }));
    await threatsApi.importBulk({ actors });
    fetchActors({ page: 1, search, status: statusFilter });
  };

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
    fetchActors({ page, search, status: statusFilter });
  }, [page, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchActors({ page: 1, search, status: statusFilter });
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
      name: item.name || '',
      aliases: Array.isArray(item.aliases) ? item.aliases.join(', ') : (item.aliases || ''),
      description: item.description || '',
      motivation: item.motivation || '',
      sophistication: item.sophistication || 'MEDIUM',
      status: item.status || 'ACTIVE',
    });
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        aliases: form.aliases ? form.aliases.split(',').map((s) => s.trim()).filter(Boolean) : [],
      };
      if (editingId) {
        await updateActor(editingId, payload);
        toast.success('Actor updated');
      } else {
        await createActor(payload);
        toast.success('Actor created');
      }
      setFormOpen(false);
      fetchActors({ page, search, status: statusFilter });
    } catch {
      toast.error('Operation failed');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await removeActor(deleteTarget.id);
      toast.success('Actor deleted');
      setDeleteTarget(null);
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const { data } = await threatsApi.listActors({ limit: 1000 });
      const allItems = data.data || data.items || [];
      exportToCSV(allItems, 'threat-actors-export');
      toast.success(`Exported ${allItems.length} threat actors as CSV`);
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
      const { data } = await threatsApi.listActors({ limit: 1000 });
      const allItems = data.data || data.items || [];
      exportToJSON(allItems, 'threat-actors-export');
      toast.success(`Exported ${allItems.length} threat actors as JSON`);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
      setExportOpen(false);
    }
  };

  const columns = [
    { key: 'name', label: 'Name' },
    {
      key: 'sophistication',
      label: 'Sophistication',
      render: (item: any) => <StatusBadge label={item.sophistication} color={sophisticationColorMap[item.sophistication] || 'gray'} />,
    },
    {
      key: 'status',
      label: 'Status',
      render: (item: any) => <StatusBadge label={item.status} color={statusColorMap[item.status] || 'gray'} />,
    },
    { key: 'motivation', label: 'Motivation' },
    {
      key: 'indicators_count',
      label: 'Indicators',
      render: (item: any) => {
        const count = item.indicator_count ?? item.indicators_count ?? item._count?.indicators ?? 0;
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${count > 0 ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/25' : 'bg-bg-tertiary text-text-muted'}`}>
            <ShieldAlert size={12} />
            {count}
          </span>
        );
      },
    },
    {
      key: 'actions',
      label: '',
      className: 'w-24',
      render: (item: any) => (
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); navigate(`/threats/actors/${item.id}`); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-text-primary" title="View">
            <Eye size={14} />
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
      <PageHeader title="Threat Actors" subtitle="Manage threat actors" onCreate={openCreate} createLabel="New Actor">
        <div className="relative" ref={exportRef}>
          <button onClick={() => setImportOpen(true)} className="btn-secondary flex items-center gap-2 text-sm mr-2">
            <Upload size={16} /> Import
          </button>
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
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search actors..." className="flex-1" />
        <FormSelect label="" options={statusOptions} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} placeholder="All Statuses" className="w-40" />
      </div>

      <DataTable columns={[...tableColumns, ...columns.filter(c => c.key === 'actions')]} data={actors} pagination={pagination} isLoading={isLoading} emptyMessage="No threat actors found" onPageChange={setPage} onRowClick={(item) => navigate(`/threats/actors/${item.id}`)} />

      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title={editingId ? 'Edit Actor' : 'Create Actor'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <FormInput label="Aliases (comma-separated)" value={form.aliases} onChange={(e) => setForm({ ...form, aliases: e.target.value })} />
          <FormTextarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
          <FormInput label="Motivation" value={form.motivation} onChange={(e) => setForm({ ...form, motivation: e.target.value })} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormSelect label="Sophistication" options={sophisticationOptions} value={form.sophistication} onChange={(e) => setForm({ ...form, sophistication: e.target.value })} required />
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
        title="Delete Actor"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        variant="danger"
        isLoading={isSubmitting}
      />

      <BulkImport
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        entityType="actor"
        columns={actorColumns}
        onImport={handleImportActors}
        title="Import Threat Actors"
      />
    </div>
  );
}