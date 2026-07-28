import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Pencil, Trash2, Plus, RefreshCw, Info, Columns, X } from 'lucide-react';
import api from '../../../api/client';
import DataTable from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import PageHeader from '../../../components/common/PageHeader';
import ConfirmDialog from '../../../components/common/ConfirmDialog';

const TYPE_OPTIONS = [
  'uuid', 'varchar(255)', 'varchar(500)', 'text',
  'integer', 'bigint', 'numeric(15,2)', 'real', 'boolean',
  'date', 'time', 'timestamptz', 'timestamp',
  'jsonb', 'json',
];

const TYPE_COLORS: Record<string, string> = {
  uuid: 'bg-purple-500/20 text-purple-400',
  'character varying': 'bg-blue-500/20 text-blue-400',
  varchar: 'bg-blue-500/20 text-blue-400',
  text: 'bg-green-500/20 text-green-400',
  integer: 'bg-amber-500/20 text-amber-400',
  bigint: 'bg-amber-500/20 text-amber-400',
  numeric: 'bg-amber-500/20 text-amber-400',
  real: 'bg-amber-500/20 text-amber-400',
  boolean: 'bg-cyan-500/20 text-cyan-400',
  jsonb: 'bg-pink-500/20 text-pink-400',
  json: 'bg-pink-500/20 text-pink-400',
  date: 'bg-teal-500/20 text-teal-400',
  time: 'bg-teal-500/20 text-teal-400',
  'timestamp with time zone': 'bg-teal-500/20 text-teal-400',
  'timestamp without time zone': 'bg-teal-500/20 text-teal-400',
};

function typeBadge(t: string) {
  const short = t.replace('character varying', 'varchar').replace('timestamp with time zone', 'timestamptz').replace('timestamp without time zone', 'timestamp');
  const color = TYPE_COLORS[t] || 'bg-gray-500/20 text-gray-400';
  return <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap ${color}`}>{short}</span>;
}

export default function DataManager() {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [allColumns, setAllColumns] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  // Schema management state
  const [schemaOpen, setSchemaOpen] = useState(false);
  const [colDialogOpen, setColDialogOpen] = useState(false);
  const [colEditing, setColEditing] = useState<any>(null);
  const [colForm, setColForm] = useState({ column_name: '', data_type: 'varchar(255)', is_nullable: 'YES', default_value: '' });
  const [deleteCol, setDeleteCol] = useState<{ table: string; column: string } | null>(null);

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
      await loadSchema();
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }, [selectedTable, page]);

  const loadSchema = async () => {
    if (!selectedTable) return;
    const { data: schema } = await api.get(`/admin/data/${selectedTable}/schema`);
    setAllColumns(schema.data || []);
  };

  useEffect(() => { loadData(); }, [loadData]);

  const editableColumns = allColumns.filter((c: any) => c.column_name !== 'id' && c.column_name !== 'created_at' && c.column_name !== 'updated_at');

  const tableColumns = allColumns.map(c => ({
    key: c.column_name,
    label: `${c.column_name} (${(c.data_type || '').replace('character varying', 'varchar').replace('timestamp with time zone', 'timestamptz')})`,
    render: (item: any) => {
      const val = item[c.column_name];
      if (val === null || val === undefined) return <span className="text-text-muted italic text-xs">—</span>;
      if (typeof val === 'object') return <span className="text-xs font-mono text-text-secondary">{JSON.stringify(val).slice(0, 50)}</span>;
      const s = String(val);
      if (s.length > 50) return <span title={s} className="text-xs">{s.slice(0, 50)}...</span>;
      return <span className="text-xs">{s}</span>;
    },
  }));

  const handleCreate = () => {
    const empty: Record<string, string> = {};
    editableColumns.forEach((c: any) => { empty[c.column_name] = ''; });
    setForm(empty);
    setEditingItem(null);
    setFormOpen(true);
  };

  const handleEdit = (item: any) => {
    const f: Record<string, string> = {};
    editableColumns.forEach((c: any) => {
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
      editableColumns.forEach((c: any) => {
        let v: any = form[c.column_name];
        if (v === '') v = null;
        else if (c.data_type === 'jsonb' || c.data_type === 'json') {
          try { v = JSON.parse(v); } catch { v = {}; }
        } else if (c.data_type === 'integer' || c.data_type === 'bigint' || c.data_type === 'smallint') {
          v = v === null ? null : parseInt(v, 10);
        } else if (c.data_type === 'numeric' || c.data_type === 'decimal' || c.data_type === 'real' || c.data_type === 'double precision') {
          v = v === null ? null : parseFloat(v);
        } else if (c.data_type === 'boolean') {
          v = v === 'true' || v === true || v === '1';
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

  // ── Schema operations ──

  const openAddColumn = () => {
    setColEditing(null);
    setColForm({ column_name: '', data_type: 'varchar(255)', is_nullable: 'YES', default_value: '' });
    setColDialogOpen(true);
  };

  const openEditColumn = (col: any) => {
    setColEditing(col);
    setColForm({
      column_name: col.column_name,
      data_type: col.data_type || 'varchar(255)',
      is_nullable: col.is_nullable || 'YES',
      default_value: col.column_default || '',
    });
    setColDialogOpen(true);
  };

  const handleColumnSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        column_name: colForm.column_name,
        data_type: colForm.data_type,
        is_nullable: colForm.is_nullable,
        default_value: colForm.default_value || undefined,
      };
      if (colEditing) {
        await api.put(`/admin/schema/${selectedTable}/column/${colEditing.column_name}`, payload);
        toast.success('Column updated');
      } else {
        await api.post(`/admin/schema/${selectedTable}/column`, payload);
        toast.success('Column added');
      }
      setColDialogOpen(false);
      loadSchema();
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Schema change failed');
    } finally { setSaving(false); }
  };

  const handleColumnDelete = async () => {
    if (!deleteCol) return;
    try {
      await api.delete(`/admin/schema/${deleteCol.table}/column/${deleteCol.column}`);
      toast.success(`Column ${deleteCol.column} dropped`);
      setDeleteCol(null);
      loadSchema();
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Drop failed');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Data Manager" subtitle="Full CRUD on all tables, columns, and schema" />
      <div className="flex items-center gap-4 flex-wrap">
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
            <button onClick={() => setSchemaOpen(!schemaOpen)} className="btn-secondary">
              <Columns size={14} /> Schema
            </button>
            <button onClick={loadData} className="btn-secondary" disabled={loading}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <span className="text-sm text-text-muted">{allColumns.length} cols · {pagination.total} rows</span>
          </>
        )}
      </div>

      {/* Schema Manager */}
      {selectedTable && schemaOpen && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Columns size={14} /> Schema — {selectedTable}
            </h3>
            <button onClick={openAddColumn} className="btn-primary text-xs"><Plus size={12} /> Add Column</button>
          </div>
          <div className="space-y-1.5">
            {allColumns.map((c: any) => (
              <div key={c.column_name} className="flex items-center justify-between p-2 rounded bg-bg-tertiary group">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{c.column_name}</span>
                  {typeBadge(c.data_type)}
                  {c.is_nullable === 'YES' ? <span className="text-[9px] text-text-muted">nullable</span> : <span className="text-[9px] text-red-400">NOT NULL</span>}
                  {c.column_default && <span className="text-[9px] text-text-muted">default: {c.column_default}</span>}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEditColumn(c)} className="btn-ghost p-0.5" title="Edit column"><Pencil size={12} /></button>
                  <button onClick={() => setDeleteCol({ table: selectedTable, column: c.column_name })} className="btn-ghost p-0.5 text-red-400" title="Drop column"><X size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data Table */}
      {selectedTable && (
        <DataTable
          columns={[
            ...tableColumns,
            {
              key: 'actions', label: 'Actions',
              render: (item: any) => (
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(item)} className="btn-ghost p-1"><Pencil size={13} /></button>
                  <button onClick={() => setDeleteTarget(item)} className="btn-ghost p-1 text-red-400"><Trash2 size={13} /></button>
                </div>
              ),
            },
          ]}
          data={items}
          pagination={pagination}
          isLoading={loading}
          emptyMessage="No entries in this table"
          onPageChange={setPage}
        />
      )}

      {/* Data Entry/Rows Modal */}
      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title={`${editingItem ? 'Edit' : 'Create'} — ${selectedTable}`} size="xl">
        <form onSubmit={handleSave} className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          {editableColumns.map((c: any) => (
            <div key={c.column_name}>
              <div className="flex items-center gap-1.5 mb-1">
                <label className="text-xs font-medium text-text-primary">{c.column_name}</label>
                {typeBadge(c.data_type)}
                {c.is_nullable === 'YES' ? <span className="text-[9px] text-text-muted">optional</span> : <span className="text-[9px] text-red-400">required</span>}
              </div>
              {c.data_type === 'text' || c.data_type === 'jsonb' || c.data_type === 'json' ? (
                <textarea className="input min-h-[60px] w-full text-sm" value={form[c.column_name] || ''} onChange={(e) => setForm({ ...form, [c.column_name]: e.target.value })} rows={3} />
              ) : c.data_type === 'boolean' ? (
                <select className="input w-full" value={form[c.column_name] || ''} onChange={(e) => setForm({ ...form, [c.column_name]: e.target.value })}>
                  <option value="">— null —</option>
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              ) : (
                <input className="input w-full text-sm" type={c.data_type === 'date' ? 'date' : c.data_type === 'time' ? 'time' : c.data_type?.includes('timestamp') ? 'datetime-local' : 'text'} value={form[c.column_name] || ''} onChange={(e) => setForm({ ...form, [c.column_name]: e.target.value })} />
              )}
            </div>
          ))}
          <div className="flex justify-end gap-3 pt-4 border-t border-border sticky bottom-0 bg-bg-card py-3">
            <button type="button" onClick={() => setFormOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </Modal>

      {/* Schema Column Add/Edit Modal */}
      <Modal isOpen={colDialogOpen} onClose={() => setColDialogOpen(false)} title={colEditing ? `Edit Column — ${colEditing.column_name}` : 'Add Column'} size="md">
        <form onSubmit={handleColumnSave} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">Column Name</label>
            <input className="input w-full" value={colForm.column_name} onChange={(e) => setColForm({ ...colForm, column_name: e.target.value })} disabled={!!colEditing} required />
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">Data Type</label>
            <select className="input w-full" value={colForm.data_type} onChange={(e) => setColForm({ ...colForm, data_type: e.target.value })}>
              {TYPE_OPTIONS.map(t => (<option key={t} value={t}>{t}</option>))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">Nullable</label>
            <select className="input w-full" value={colForm.is_nullable} onChange={(e) => setColForm({ ...colForm, is_nullable: e.target.value })}>
              <option value="YES">YES (nullable)</option>
              <option value="NO">NO (not null)</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">Default Value (SQL, optional)</label>
            <input className="input w-full" value={colForm.default_value} onChange={(e) => setColForm({ ...colForm, default_value: e.target.value })} placeholder="e.g. '{}' or now()" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setColDialogOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : colEditing ? 'Update Column' : 'Add Column'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Entry" message="Permanently delete this entry?" variant="danger" />
      <ConfirmDialog isOpen={!!deleteCol} onClose={() => setDeleteCol(null)} onConfirm={handleColumnDelete} title="Drop Column" message={`Permanently drop column "${deleteCol?.column}" from ${deleteCol?.table}? All data in this column will be lost.`} variant="danger" />
    </div>
  );
}
