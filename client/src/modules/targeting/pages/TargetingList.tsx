import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Edit, Trash2, Eye, MapPin, Download, ChevronDown } from 'lucide-react';
import { exportToCSV, exportToJSON } from '../../../utils/export';
import { targetPackagesApi } from '../api';
import DataTable from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import PageHeader from '../../../components/common/PageHeader';
import SearchBar from '../../../components/common/SearchBar';
import { FormInput, FormTextarea, FormSelect } from '../../../components/common/FormComponents';
import { StatusBadge, ClassificationBadge, PriorityBadge } from '../../../components/common/Badges';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { useTargetStore } from '../store';

const statusOptions = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'IN_REVIEW', label: 'In Review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'EXECUTED', label: 'Executed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const classificationOptions = [
  { value: 'UNCLASSIFIED', label: 'Unclassified' },
  { value: 'CONFIDENTIAL', label: 'Confidential' },
  { value: 'SECRET', label: 'Secret' },
  { value: 'TOP_SECRET', label: 'Top Secret' },
];

const priorityOptions = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

const emptyPackage = {
  reference_number: '',
  title: '',
  objective: '',
  status: 'DRAFT',
  classification: 'UNCLASSIFIED',
  priority: 'MEDIUM',
  target_name: '',
  location: '',
  cde_estimate: '',
};

export default function TargetingList() {
  const navigate = useNavigate();
  const {
    packages, packagesPagination, isLoading,
    fetchPackages, createPackage, updatePackage, deletePackage,
  } = useTargetStore();

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyPackage);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
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
    fetchPackages({ search, limit: 10 });
  }, [search]);

  const handleCreate = () => {
    setEditing(null);
    setForm(emptyPackage);
    setIsModalOpen(true);
  };

  const handleEdit = (item: any) => {
    setEditing(item);
    setForm({
      reference_number: item.reference_number || '',
      title: item.title || '',
      objective: item.objective || '',
      status: item.status || 'DRAFT',
      classification: item.classification || 'UNCLASSIFIED',
      priority: item.priority || 'MEDIUM',
      target_name: item.target_name || '',
      location: item.location || '',
      cde_estimate: item.cde_estimate != null ? String(item.cde_estimate) : '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        cde_estimate: form.cde_estimate ? Number(form.cde_estimate) : null,
      };
      if (editing) {
        await updatePackage(editing.id, payload);
        toast.success('Target package updated');
      } else {
        await createPackage(payload);
        toast.success('Target package created');
      }
      setIsModalOpen(false);
      fetchPackages({ search, page: packagesPagination.page, limit: 10 });
    } catch {
      toast.error('Failed to save target package');
    } finally {
      setSaving(false);
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const data = await targetPackagesApi.list({ limit: 1000 });
      const allItems = data.data || data.items || [];
      exportToCSV(allItems, 'targeting-export');
      toast.success(`Exported ${allItems.length} packages as CSV`);
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
      const data = await targetPackagesApi.list({ limit: 1000 });
      const allItems = data.data || data.items || [];
      exportToJSON(allItems, 'targeting-export');
      toast.success(`Exported ${allItems.length} packages as JSON`);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
      setExportOpen(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deletePackage(deleteTarget.id);
      toast.success('Target package deleted');
      setDeleteTarget(null);
      fetchPackages({ search, page: packagesPagination.page, limit: 10 });
    } catch {
      toast.error('Failed to delete target package');
    }
  };

  const columns = [
    { key: 'reference_number', label: 'Ref #', className: 'font-mono text-xs' },
    { key: 'title', label: 'Package Title', className: 'font-medium' },
    { key: 'target_name', label: 'Target', className: 'font-medium' },
    {
      key: 'status',
      label: 'Status',
      render: (item: any) => <StatusBadge label={item.status} color={item.status === 'APPROVED' ? 'blue' : item.status === 'EXECUTED' ? 'green' : item.status === 'CANCELLED' ? 'red' : item.status === 'IN_REVIEW' ? 'purple' : 'yellow'} />,
    },
    {
      key: 'classification',
      label: 'Class',
      render: (item: any) => <ClassificationBadge level={item.classification} />,
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (item: any) => <PriorityBadge level={item.priority} />,
    },
    {
      key: 'location',
      label: 'Location',
      render: (item: any) => (
        <span className="flex items-center gap-1 text-text-secondary text-xs">
          <MapPin size={12} /> {item.location || '—'}
        </span>
      ),
    },
    {
      key: 'cde_estimate',
      label: 'CDE Est.',
      render: (item: any) => (
        <span className="text-xs">{item.cde_estimate != null ? item.cde_estimate : '—'}</span>
      ),
    },
    {
      key: 'actions',
      label: '',
      className: 'w-24',
      render: (item: any) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/targeting/${item.id}`); }}
            className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-accent transition-colors"
            title="View details"
          >
            <Eye size={15} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleEdit(item); }}
            className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-accent transition-colors"
            title="Edit"
          >
            <Edit size={15} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(item); }}
            className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-red-400 transition-colors"
            title="Delete"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Targeting"
        subtitle="Manage target packages and nominations"
        onCreate={handleCreate}
        createLabel="New Target Package"
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
      <SearchBar value={search} onChange={(v) => { setSearch(v); fetchPackages({ search: v, page: 1, limit: 10 }); }} placeholder="Search target packages..." />
      <DataTable
        columns={columns}
        data={packages}
        pagination={packagesPagination.totalPages > 0 ? packagesPagination : undefined}
        isLoading={isLoading}
        emptyMessage="No target packages found"
        onPageChange={(n) => fetchPackages({ search, page: n, limit: 10 })}
        onRowClick={(item) => navigate(`/targeting/${item.id}`)}
      />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editing ? 'Edit Target Package' : 'New Target Package'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Reference Number" value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} required />
            <FormSelect label="Status" options={statusOptions} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} required />
          </div>
          <FormInput label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <div className="grid grid-cols-2 gap-4">
            <FormSelect label="Classification" options={classificationOptions} value={form.classification} onChange={(e) => setForm({ ...form, classification: e.target.value })} required />
            <FormSelect label="Priority" options={priorityOptions} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} required />
          </div>
          <FormTextarea label="Objective" value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} required />
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Target Name" value={form.target_name} onChange={(e) => setForm({ ...form, target_name: e.target.value })} required />
            <FormInput label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          <FormInput label="CDE Estimate" type="number" value={form.cde_estimate} onChange={(e) => setForm({ ...form, cde_estimate: e.target.value })} />
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary" disabled={saving}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update Package' : 'Create Package'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Target Package"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        variant="danger"
      />
    </div>
  );
}
