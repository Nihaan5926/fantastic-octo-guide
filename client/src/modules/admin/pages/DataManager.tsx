import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Pencil, Trash2, Plus, RefreshCw, ChevronDown } from 'lucide-react';
import api from '../../../api/client';
import DataTable from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import PageHeader from '../../../components/common/PageHeader';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { FormInput, FormTextarea } from '../../../components/common/FormComponents';

export default function DataManager() {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [columns, setColumns] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  useEffect(() => {
    api.get('/admin/data/tables').then(({ data }: any) => setTables(data.data || []));
  }, []);

  const loadData = useCallback(async () => {
    if (!selectedTable) return;
    setLoading(true);
    try {
      const { data: res } = await api.get(`/admin/data/${selectedTable}`, { params: { page, limit: 50 } });
      setItems(res.data || []);
      setPagination(res.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 });

      const { data: schema } = await api.get(`/admin/data/${selectedTable}/schema`);
      const cols = (schema.data || [])
        .filter((c: any) => c.column_name !== 'id' && c.column_name !== 'created_at' && c.column_name !== 'updated_at');
      setColumns(cols);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }, [selectedTable, page]);

  useEffect(() => { loadData(); }, [loadData]);

  const tableColumns = columns.map(c => ({
    key: c.column_name,
    label: c.column_name,
    render: (item: any) => {
      const val = item[c.column_name];
      if (val === null || val === undefined) return <span className="text-text-muted italic">null</span>;
      if (typeof val === 'object') return <span className="text-xs font-mono">{JSON.stringify(val).slice(0, 60)}</span>;
      const s = String(val);
      if (s.length > 40) return <span title={s}>{s.slice(0, 40)}...</span>;
      return s;
    },
  }));

  const handleCreate = () => {
    const empty: Record<string, string> = {};
    columns.forEach(c => { empty[c.column_name] = ''; });
    setForm(empty);
    setEditingItem(null);
    setFormOpen(true);
  };

  const handleEdit = (item: any) => {
    const f: Record<string, string> = {};
    columns.forEach(c => {
      const v = item[c.column_name];
      f[c.column_name] = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
    });
    setForm(f);
    setEditingItem(item);
    setFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, any> = {};
      columns.forEach(c => {
        let v: any = form[c.column_name];
        if (v === '') v = null;
        else if (c.data_type === 'jsonb' || c.data_type === 'json') {
          try { v = JSON.parse(v); } catch { v = {}; }
        } else if (c.data_type === 'integer' || c.data_type === 'bigint' || c.data_type === 'numeric') {
          v = v === null ? null : Number(v);
        } else if (c.data_type === 'boolean') {
          v = v === 'true' || v === true;
        }
        payload[c.column_name] = v;
      });

      if (editingItem) {
        await api.put(`/admin/data/${selectedTable}/${editingItem.id}`, payload);
        toast.success('Updated');
      } else {
        await api.post(`/admin/data/${selectedTable}`, payload);
        toast.success('Created');
      }
      setFormOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Save failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/admin/data/${selectedTable}/${deleteTarget.id}`);
      toast.success('Deleted');
      setDeleteTarget(null);
      loadData();
    } catch { toast.error('Delete failed'); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Data Manager" subtitle="Full CRUD access to all module data" />
      <div className="flex items-center gap-4">
        <select
          value={selectedTable}
          onChange={(e) => { setSelectedTable(e.target.value); setPage(1); }}
          className="input w-64"
        >
          <option value="">Select table...</option>
          {tables.map(t => (<option key={t} value={t}>{t}</option>))}
        </select>
        {selectedTable && (
          <>
            <button onClick={handleCreate} className="btn-primary"><Plus size={14} /> New Entry</button>
            <button onClick={loadData} className="btn-secondary" disabled={loading}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </>
        )}
      </div>

      {selectedTable && (
        <DataTable
          columns={[
            ...tableColumns,
            {
              key: 'actions', label: 'Actions',
              render: (item: any) => (
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(item)} className="btn-ghost p-1"><Pencil size={14} /></button>
                  <button onClick={() => setDeleteTarget(item)} className="btn-ghost p-1 text-red-400"><Trash2 size={14} /></button>
                </div>
              ),
            },
          ]}
          data={items}
          pagination={pagination}
          isLoading={loading}
          emptyMessage="No entries"
          onPageChange={setPage}
        />
      )}

      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title={editingItem ? 'Edit Entry' : 'Create Entry'} size="lg">
        <form onSubmit={handleSave} className="space-y-3 max-h-[70vh] overflow-y-auto">
          {columns.filter(c => c.column_name !== 'id').map(c => (
            c.data_type === 'text' || c.data_type === 'jsonb' || c.data_type === 'json' ? (
              <FormTextarea
                key={c.column_name}
                label={c.column_name}
                value={form[c.column_name] || ''}
                onChange={(e) => setForm({ ...form, [c.column_name]: e.target.value })}
                rows={2}
              />
            ) : (
              <FormInput
                key={c.column_name}
                label={c.column_name}
                value={form[c.column_name] || ''}
                onChange={(e) => setForm({ ...form, [c.column_name]: e.target.value })}
              />
            )
          ))}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button type="button" onClick={() => setFormOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Entry"
        message="Permanently delete this entry?"
        variant="danger"
      />
    </div>
  );
}
