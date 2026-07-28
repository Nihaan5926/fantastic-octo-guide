import React, { useEffect, useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { Pencil, Trash2, Plus, Download, ChevronDown } from 'lucide-react';
import api from '../../api/client';
import { useDynamicTable } from '../../hooks/useDynamicTable';
import DynamicForm from './DynamicForm';
import DataTable from './DataTable';
import Modal from './Modal';
import PageHeader from './PageHeader';
import SearchBar from './SearchBar';
import ConfirmDialog from './ConfirmDialog';
import { exportToCSV, exportToJSON } from '../../utils/export';

interface GenericCrudPageProps {
  tableName: string;
  title: string;
  subtitle?: string;
  searchPlaceholder?: string;
  apiBase: string;
}

export default function GenericCrudPage({ tableName, title, subtitle, searchPlaceholder, apiBase }: GenericCrudPageProps) {
  const { columns, buildFormPayload, itemToForm, emptyForm, tableColumns, loading: schemaLoading } = useDynamicTable(tableName);

  const [items, setItems] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(apiBase, { params: { search, page, limit: 20 } });
      setItems(data.data || data.items || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [apiBase, search, page]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const handleCreate = () => {
    setEditingItem(null);
    setForm(emptyForm());
    setFormOpen(true);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setForm(itemToForm(item));
    setFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = buildFormPayload(form);
      if (editingItem) {
        await api.put(`${apiBase}/${editingItem.id}`, payload);
        toast.success('Updated');
      } else {
        await api.post(apiBase, payload);
        toast.success('Created');
      }
      setFormOpen(false);
      fetchList();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Save failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`${apiBase}/${deleteTarget.id}`);
      toast.success('Deleted');
      setDeleteTarget(null);
      fetchList();
    } catch { toast.error('Delete failed'); }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const { data } = await api.get(apiBase, { params: { limit: 1000 } });
      const all = data.data || data.items || [];
      exportToCSV(all, `${tableName}-export`);
      toast.success(`Exported ${all.length} records as CSV`);
    } catch { toast.error('Export failed'); }
    finally { setExporting(false); setExportOpen(false); }
  };

  const handleExportJSON = async () => {
    setExporting(true);
    try {
      const { data } = await api.get(apiBase, { params: { limit: 1000 } });
      const all = data.data || data.items || [];
      exportToJSON(all, `${tableName}-export`);
      toast.success(`Exported ${all.length} records as JSON`);
    } catch { toast.error('Export failed'); }
    finally { setExporting(false); setExportOpen(false); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title={title} subtitle={subtitle} onCreate={handleCreate} createLabel="Add" isLoading={loading}>
        <div className="relative" ref={exportRef}>
          <button onClick={() => setExportOpen(!exportOpen)} disabled={exporting} className="btn-secondary">
            {exporting ? <span className="animate-pulse">Exporting...</span> : <><Download size={16} /> Export <ChevronDown size={14} /></>}
          </button>
          {exportOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-bg-card border border-border rounded-xl shadow-xl z-50 py-1">
              <button onClick={handleExportCSV} className="w-full text-left px-4 py-2.5 text-sm hover:bg-bg-hover flex items-center gap-2"><Download size={14} /> CSV</button>
              <button onClick={handleExportJSON} className="w-full text-left px-4 py-2.5 text-sm hover:bg-bg-hover flex items-center gap-2"><Download size={14} /> JSON</button>
            </div>
          )}
        </div>
      </PageHeader>

      <div className="flex items-center gap-4">
        <div className="flex-1"><SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder={searchPlaceholder || 'Search...'} /></div>
      </div>

      <DataTable
        columns={[...tableColumns, { key: 'actions', label: '', render: (item: any) => (
          <div className="flex gap-1">
            <button onClick={(e) => { e.stopPropagation(); handleEdit(item); }} className="btn-ghost p-1"><Pencil size={13} /></button>
            <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(item); }} className="btn-ghost p-1 text-red-400"><Trash2 size={13} /></button>
          </div>
        )}]}
        data={items}
        pagination={pagination}
        isLoading={loading || schemaLoading}
        emptyMessage="No entries"
        onPageChange={setPage}
      />

      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title={`${editingItem ? 'Edit' : 'Create'} — ${title}`} size="xl">
        <form onSubmit={handleSave} className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          <DynamicForm columns={columns} form={form} onChange={(field, value) => setForm({ ...form, [field]: value })} />
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button type="button" onClick={() => setFormOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Entry" message="Permanently delete this entry?" variant="danger" />
    </div>
  );
}
