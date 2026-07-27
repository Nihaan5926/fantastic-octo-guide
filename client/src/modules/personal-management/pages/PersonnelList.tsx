import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Pencil, Trash2, Download, ChevronDown } from 'lucide-react';
import PageHeader from '../../../components/common/PageHeader';
import SearchBar from '../../../components/common/SearchBar';
import DataTable from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { FormInput, FormTextarea, FormSelect } from '../../../components/common/FormComponents';
import { ClassificationBadge } from '../../../components/common/Badges';
import { usePersonnelStore, PersonnelRecord } from '../store';
import { personnelApi } from '../api';
import { exportToCSV, exportToJSON } from '../../../utils/export';

const CLEARANCE_OPTIONS = [
  { value: 'UNCLASSIFIED', label: 'UNCLASSIFIED' },
  { value: 'CONFIDENTIAL', label: 'CONFIDENTIAL' },
  { value: 'SECRET', label: 'SECRET' },
  { value: 'TOP_SECRET', label: 'TOP SECRET' },
];

const emptyForm: Partial<PersonnelRecord> = {
  user_id: '',
  date_of_birth: '',
  nationality: '',
  position_title: '',
  clearance_level: 'UNCLASSIFIED',
  clearance_expiry: '',
  special_accesses: [],
  languages: [],
  skills: [],
  certifications: [],
  notes: '',
};

export default function PersonnelList() {
  const navigate = useNavigate();
  const {
    items, pagination, isLoading,
    fetchList, create, update, remove, setSelected, selected,
  } = usePersonnelStore();

  const [search, setSearch] = useState('');
  const [clearanceFilter, setClearanceFilter] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PersonnelRecord | null>(null);
  const [form, setForm] = useState<Partial<PersonnelRecord>>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
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

  const load = useCallback(() => {
    fetchList({ search, clearance_level: clearanceFilter || undefined, page, limit: 20 });
  }, [fetchList, search, clearanceFilter, page]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const handleEdit = (record: PersonnelRecord) => {
    setEditingId(record.id);
    setForm({
      user_id: record.user_id || '',
      date_of_birth: record.date_of_birth || '',
      nationality: record.nationality || '',
      position_title: record.position_title || '',
      clearance_level: record.clearance_level || 'UNCLASSIFIED',
      clearance_expiry: record.clearance_expiry || '',
      special_accesses: record.special_accesses || [],
      languages: record.languages || [],
      skills: record.skills || [],
      certifications: record.certifications || [],
      notes: record.notes || '',
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        ...form,
        special_accesses: typeof form.special_accesses === 'string'
          ? (form.special_accesses as string).split(',').map((s: string) => s.trim()).filter(Boolean)
          : form.special_accesses,
        languages: typeof form.languages === 'string'
          ? (form.languages as string).split(',').map((s: string) => s.trim()).filter(Boolean)
          : form.languages,
        skills: typeof form.skills === 'string'
          ? (form.skills as string).split(',').map((s: string) => s.trim()).filter(Boolean)
          : form.skills,
        certifications: typeof form.certifications === 'string'
          ? (form.certifications as string).split(',').map((s: string) => s.trim()).filter(Boolean)
          : form.certifications,
      };
      if (editingId) {
        await update(editingId, payload);
        toast.success('Personnel record updated');
      } else {
        await create(payload);
        toast.success('Personnel record created');
      }
      setModalOpen(false);
    } catch {
      toast.error('Operation failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await remove(deleteTarget.id);
      toast.success('Personnel record deleted');
      setDeleteTarget(null);
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const { data } = await personnelApi.list({ limit: 1000 });
      const allItems = data.data || data.items || [];
      exportToCSV(allItems, 'personnel-export');
      toast.success(`Exported ${allItems.length} records as CSV`);
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
      const { data } = await personnelApi.list({ limit: 1000 });
      const allItems = data.data || data.items || [];
      exportToJSON(allItems, 'personnel-export');
      toast.success(`Exported ${allItems.length} records as JSON`);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
      setExportOpen(false);
    }
  };

  const setField = (field: string, value: any) => setForm((f) => ({ ...f, [field]: value }));

  const columns = [
    { key: 'user_id', label: 'User ID' },
    { key: 'position_title', label: 'Position' },
    { key: 'nationality', label: 'Nationality' },
    {
      key: 'clearance_level',
      label: 'Clearance',
      render: (item: PersonnelRecord) => <ClassificationBadge level={item.clearance_level} />,
    },
    { key: 'clearance_expiry', label: 'Clearance Expiry' },
    {
      key: 'actions',
      label: 'Actions',
      render: (item: PersonnelRecord) => (
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); handleEdit(item); }} className="btn-ghost p-1.5">
            <Pencil size={14} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(item); }} className="btn-ghost p-1.5 text-accent-danger">
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Personnel Management"
        subtitle="Manage personnel records, clearances, and skills"
        onCreate={handleCreate}
        createLabel="Add Record"
        isLoading={isLoading}
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
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} placeholder="Search personnel..." />
        </div>
        <select
          value={clearanceFilter}
          onChange={(e) => { setClearanceFilter(e.target.value); setPage(1); }}
          className="input-field w-48"
        >
          <option value="">All Clearances</option>
          {CLEARANCE_OPTIONS.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>
      <DataTable
        columns={columns}
        data={items}
        pagination={pagination}
        isLoading={isLoading}
        emptyMessage="No personnel records found"
        onPageChange={setPage}
        onRowClick={(item) => navigate(`/personnel/${item.id}`)}
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Record' : 'Add Record'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput label="User ID" value={form.user_id || ''} onChange={(e) => setField('user_id', e.target.value)} required />
            <FormInput label="Date of Birth" type="date" value={form.date_of_birth || ''} onChange={(e) => setField('date_of_birth', e.target.value)} />
            <FormInput label="Nationality" value={form.nationality || ''} onChange={(e) => setField('nationality', e.target.value)} />
            <FormInput label="Position Title" value={form.position_title || ''} onChange={(e) => setField('position_title', e.target.value)} />
            <FormSelect label="Clearance Level" value={form.clearance_level || 'UNCLASSIFIED'} options={CLEARANCE_OPTIONS} onChange={(e) => setField('clearance_level', e.target.value)} />
            <FormInput label="Clearance Expiry" type="date" value={form.clearance_expiry || ''} onChange={(e) => setField('clearance_expiry', e.target.value)} />
          </div>
          <FormInput
            label="Special Accesses (comma-separated)"
            value={Array.isArray(form.special_accesses) ? (form.special_accesses as string[]).join(', ') : (form.special_accesses || '')}
            onChange={(e) => setField('special_accesses', e.target.value)}
          />
          <FormInput
            label="Languages (comma-separated)"
            value={Array.isArray(form.languages) ? (form.languages as string[]).join(', ') : (form.languages || '')}
            onChange={(e) => setField('languages', e.target.value)}
          />
          <FormInput
            label="Skills (comma-separated)"
            value={Array.isArray(form.skills) ? (form.skills as string[]).join(', ') : (form.skills || '')}
            onChange={(e) => setField('skills', e.target.value)}
          />
          <FormInput
            label="Certifications (comma-separated)"
            value={Array.isArray(form.certifications) ? (form.certifications as string[]).join(', ') : (form.certifications || '')}
            onChange={(e) => setField('certifications', e.target.value)}
          />
          <FormTextarea label="Notes" value={form.notes || ''} onChange={(e) => setField('notes', e.target.value)} />
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSaving} className="btn-primary">
              {isSaving ? 'Saving...' : editingId ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Personnel Record"
        message={`Are you sure you want to delete the record for "${deleteTarget?.user_id}"? This action cannot be undone.`}
        variant="danger"
      />
    </div>
  );
}
