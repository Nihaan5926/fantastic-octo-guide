import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Pencil, Trash2, Plus, RefreshCw, Columns, X } from 'lucide-react';
import api from '../../../api/client';
import { useDynamicTable, ColumnInfo } from '../../../hooks/useDynamicTable';
import DynamicForm from '../../../components/common/DynamicForm';
import DataTable from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import PageHeader from '../../../components/common/PageHeader';
import ConfirmDialog from '../../../components/common/ConfirmDialog';

const TYPE_OPTIONS = [
  'uuid', 'varchar(255)', 'varchar(500)', 'text',
  'integer', 'bigint', 'numeric(15,2)', 'real', 'boolean',
  'date', 'time', 'timestamptz', 'timestamp', 'jsonb', 'json',
];

export default function DataManager() {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const [schemaOpen, setSchemaOpen] = useState(false);
  const [colDialogOpen, setColDialogOpen] = useState(false);
  const [colEditing, setColEditing] = useState<ColumnInfo | null>(null);
  const [colForm, setColForm] = useState({ column_name: '', data_type: 'varchar(255)', is_nullable: 'YES', default_value: '' });
  const [deleteCol, setDeleteCol] = useState<{ table: string; column: string } | null>(null);

  const { columns, buildFormPayload, itemToForm, emptyForm, tableColumns, reload: reloadSchema } = useDynamicTable(selectedTable);

  const allSchemaCols = columns.length; // simplified - full schema managed separately

  useEffect(() => {
    api.get('/admin/data/tables').then(({ data }: any) => setTables(data.data || []));
  }, []);

  const loadData = async () => {
    if (!selectedTable) return;
    setLoading(true);
    try {
      const { data: res } = await api.get(`/admin/data/${selectedTable}`, { params: { page, limit: 50 } });
      setItems(res.data || []);
      setPagination(res.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 });
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [selectedTable, page]);

  const handleCreate = () => {
    setForm(emptyForm());
    setEditingItem(null);
    setFormOpen(true);
  };

  const handleEdit = (item: any) => {
    setForm(itemToForm(item));
    setEditingItem(item);
    setFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = buildFormPayload(form);
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

  const openAddColumn = () => {
    setColEditing(null);
    setColForm({ column_name: '', data_type: 'varchar(255)', is_nullable: 'YES', default_value: '' });
    setColDialogOpen(true);
  };

  const openEditColumn = (colName: string, dataType: string, nullable: string, defaultVal: string | null) => {
    setColEditing({ column_name: colName, data_type: dataType || 'varchar(255)', is_nullable: nullable, column_default: defaultVal });
    setColForm({ column_name: colName, data_type: dataType || 'varchar(255)', is_nullable: nullable || 'YES', default_value: defaultVal || '' });
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
      reloadSchema();
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
      reloadSchema();
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Drop failed');
    }
  };

  // Fetch schema info for display
  const [schemaInfo, setSchemaInfo] = useState<ColumnInfo[]>([]);
  const loadSchemaInfo = async () => {
    if (!selectedTable) return;
    try {
      const { data } = await api.get(`/admin/data/${selectedTable}/schema`);
      setSchemaInfo(data.data || []);
    } catch {}
  };
  useEffect(() => { loadSchemaInfo(); }, [selectedTable]);

  return (
    <div className="space-y-6">
      <PageHeader title="Data Manager" subtitle="Full CRUD on all tables, columns, and schema" />
      <div className="flex items-center gap-4 flex-wrap">
        <select value={selectedTable} onChange={(e) => { setSelectedTable(e.target.value); setPage(1); }} className="input w-64">
          <option value="">Select table...</option>
          {tables.map(t => (<option key={t} value={t}>{t}</option>))}
        </select>
        {selectedTable && (
          <>
            <button onClick={handleCreate} className="btn-primary"><Plus size={14} /> New Entry</button>
            <button onClick={() => setSchemaOpen(!schemaOpen)} className="btn-secondary"><Columns size={14} /> Schema</button>
            <button onClick={loadData} className="btn-secondary" disabled={loading}><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></button>
            <span className="text-sm text-text-muted">{schemaInfo.length} cols · {pagination.total} rows</span>
          </>
        )}
      </div>

      {selectedTable && schemaOpen && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2"><Columns size={14} /> Schema — {selectedTable}</h3>
            <button onClick={openAddColumn} className="btn-primary text-xs"><Plus size={12} /> Add Column</button>
          </div>
          <div className="space-y-1.5">
            {schemaInfo.map((c: ColumnInfo) => (
              <div key={c.column_name} className="flex items-center justify-between p-2 rounded bg-bg-tertiary group">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{c.column_name}</span>
                  <span className="text-[10px] text-text-muted">{c.data_type}</span>
                  {c.is_nullable === 'YES' ? <span className="text-[9px] text-text-muted">nullable</span> : <span className="text-[9px] text-red-400">NOT NULL</span>}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                  <button onClick={() => openEditColumn(c.column_name, c.data_type, c.is_nullable, c.column_default)} className="btn-ghost p-0.5"><Pencil size={12} /></button>
                  <button onClick={() => setDeleteCol({ table: selectedTable, column: c.column_name })} className="btn-ghost p-0.5 text-red-400"><X size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedTable && (
        <DataTable
          columns={[...tableColumns, { key: 'actions', label: 'Actions', render: (item: any) => (<div className="flex gap-1"><button onClick={() => handleEdit(item)} className="btn-ghost p-1"><Pencil size={13} /></button><button onClick={() => setDeleteTarget(item)} className="btn-ghost p-1 text-red-400"><Trash2 size={13} /></button></div>) }]}
          data={items}
          pagination={pagination}
          isLoading={loading}
          emptyMessage="No entries"
          onPageChange={setPage}
        />
      )}

      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title={`${editingItem ? 'Edit' : 'Create'} — ${selectedTable}`} size="xl">
        <form onSubmit={handleSave} className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          <DynamicForm columns={columns} form={form} onChange={(field, value) => setForm({ ...form, [field]: value })} />
          <div className="flex justify-end gap-3 pt-4 border-t border-border sticky bottom-0 bg-bg-card py-3">
            <button type="button" onClick={() => setFormOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={colDialogOpen} onClose={() => setColDialogOpen(false)} title={colEditing ? `Edit Column — ${colEditing.column_name}` : 'Add Column'} size="md">
        <form onSubmit={handleColumnSave} className="space-y-4">
          <div><label className="text-xs font-medium text-text-secondary mb-1 block">Column Name</label><input className="input w-full" value={colForm.column_name} onChange={(e) => setColForm({ ...colForm, column_name: e.target.value })} disabled={!!colEditing} required /></div>
          <div><label className="text-xs font-medium text-text-secondary mb-1 block">Data Type</label><select className="input w-full" value={colForm.data_type} onChange={(e) => setColForm({ ...colForm, data_type: e.target.value })}>{TYPE_OPTIONS.map(t => (<option key={t} value={t}>{t}</option>))}</select></div>
          <div><label className="text-xs font-medium text-text-secondary mb-1 block">Nullable</label><select className="input w-full" value={colForm.is_nullable} onChange={(e) => setColForm({ ...colForm, is_nullable: e.target.value })}><option value="YES">YES (nullable)</option><option value="NO">NO (not null)</option></select></div>
          <div><label className="text-xs font-medium text-text-secondary mb-1 block">Default Value (SQL, optional)</label><input className="input w-full" value={colForm.default_value} onChange={(e) => setColForm({ ...colForm, default_value: e.target.value })} placeholder="e.g. '{}' or now()" /></div>
          <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setColDialogOpen(false)} className="btn-secondary">Cancel</button><button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : colEditing ? 'Update Column' : 'Add Column'}</button></div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Entry" message="Permanently delete this entry?" variant="danger" />
      <ConfirmDialog isOpen={!!deleteCol} onClose={() => setDeleteCol(null)} onConfirm={handleColumnDelete} title="Drop Column" message={`Permanently drop column "${deleteCol?.column}"? All data will be lost.`} variant="danger" />
    </div>
  );
}
