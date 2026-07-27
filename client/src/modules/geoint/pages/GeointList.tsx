import React, { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Edit, Trash2, Eye, Download, ChevronDown } from 'lucide-react';
import { geointApi } from '../api';
import { exportToCSV, exportToJSON } from '../../../utils/export';
import { useGeointStore } from '../store';
import PageHeader from '../../../components/common/PageHeader';
import SearchBar from '../../../components/common/SearchBar';
import DataTable from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { FormInput, FormSelect, FormTextarea } from '../../../components/common/FormComponents';
import { ClassificationBadge } from '../../../components/common/Badges';

const FEATURE_TYPES = [
  { value: 'POINT', label: 'Point' },
  { value: 'POLYGON', label: 'Polygon' },
  { value: 'LINESTRING', label: 'LineString' },
];

const CLASSIFICATIONS = [
  { value: 'UNCLASSIFIED', label: 'UNCLASSIFIED' },
  { value: 'CONFIDENTIAL', label: 'CONFIDENTIAL' },
  { value: 'SECRET', label: 'SECRET' },
  { value: 'TOP_SECRET', label: 'TOP SECRET' },
];

interface FeatureForm {
  title: string;
  feature_type: string;
  coordinates: string;
  classification: string;
  description: string;
  imagery_reference: string;
  collection_date: string;
}

const emptyForm: FeatureForm = {
  title: '',
  feature_type: 'POINT',
  coordinates: '',
  classification: 'CONFIDENTIAL',
  description: '',
  imagery_reference: '',
  collection_date: '',
};

export default function GeointList() {
  const navigate = useNavigate();
  const {
    features, featuresPagination, featuresLoading, featuresError,
    featureSearch, setFeatureSearch,
    fetchFeatures, createFeature, updateFeature, deleteFeature,
  } = useGeointStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FeatureForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
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
    fetchFeatures();
  }, []);

  const handlePageChange = (page: number) => {
    fetchFeatures({ page, limit: featuresPagination.limit });
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (item: any) => {
    setEditingId(item.id);
    setForm({
      title: item.title || '',
      feature_type: item.feature_type || 'POINT',
      coordinates: typeof item.coordinates === 'object' ? JSON.stringify(item.coordinates) : (item.coordinates || ''),
      classification: item.classification || 'CONFIDENTIAL',
      description: item.description || '',
      imagery_reference: item.imagery_reference || '',
      collection_date: item.collection_date ? item.collection_date.slice(0, 10) : '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const payload = {
      ...form,
      coordinates: (() => { try { return JSON.parse(form.coordinates); } catch { return form.coordinates; } })(),
    };
    const ok = editingId ? await updateFeature(editingId, payload) : await createFeature(payload);
    setSaving(false);
    if (ok) {
      setModalOpen(false);
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const { data } = await geointApi.listFeatures({ limit: 1000 });
      const allItems = data.data || data.items || [];
      exportToCSV(allItems, 'geoint-features-export');
      toast.success(`Exported ${allItems.length} features as CSV`);
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
      const { data } = await geointApi.listFeatures({ limit: 1000 });
      const allItems = data.data || data.items || [];
      exportToJSON(allItems, 'geoint-features-export');
      toast.success(`Exported ${allItems.length} features as JSON`);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
      setExportOpen(false);
    }
  };

  const openDeleteConfirm = (id: string) => {
    setDeleteTargetId(id);
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    setDeleting(true);
    await deleteFeature(deleteTargetId);
    setDeleting(false);
    setConfirmOpen(false);
    setDeleteTargetId(null);
  };

  const columns = [
    { key: 'title', label: 'Title', sortable: true },
    {
      key: 'feature_type',
      label: 'Type',
      render: (item: any) => (
        <span className="badge bg-blue-500/20 text-blue-400 border-blue-500/30">{item.feature_type}</span>
      ),
    },
    {
      key: 'classification',
      label: 'Classification',
      render: (item: any) => <ClassificationBadge level={item.classification} />,
    },
    { key: 'imagery_reference', label: 'Imagery Ref' },
    {
      key: 'collection_date',
      label: 'Collection Date',
      render: (item: any) => item.collection_date ? new Date(item.collection_date).toLocaleDateString() : '-',
    },
    {
      key: 'actions',
      label: 'Actions',
      className: 'w-28',
      render: (item: any) => (
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); navigate(`/geoint/${item.id}`); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary" title="View">
            <Eye size={15} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); openEdit(item); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary" title="Edit">
            <Edit size={15} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); openDeleteConfirm(item.id); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-accent-danger" title="Delete">
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="GEOINT" subtitle="Geospatial Intelligence" onCreate={openCreate} createLabel="New Feature">
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

      <div className="mb-4">
        <SearchBar value={featureSearch} onChange={setFeatureSearch} placeholder="Search features..." className="max-w-xs" />
      </div>

      {featuresError && (
        <div className="card border-red-500/30 bg-red-500/10 text-red-400 text-sm p-4 mb-4">{featuresError}</div>
      )}

      <DataTable
        columns={columns}
        data={features}
        isLoading={featuresLoading}
        pagination={featuresPagination}
        onPageChange={handlePageChange}
        emptyMessage="No geospatial features found"
      />

      {/* Create/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Feature' : 'Create Feature'} size="lg">
        <div className="space-y-4">
          <FormInput label="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <FormSelect
              label="Feature Type"
              required
              options={FEATURE_TYPES}
              value={form.feature_type}
              onChange={(e) => setForm({ ...form, feature_type: e.target.value })}
            />
            <FormSelect
              label="Classification"
              required
              options={CLASSIFICATIONS}
              value={form.classification}
              onChange={(e) => setForm({ ...form, classification: e.target.value })}
            />
          </div>
          <FormInput label="Imagery Reference" value={form.imagery_reference} onChange={(e) => setForm({ ...form, imagery_reference: e.target.value })} />
          <FormInput label="Collection Date" type="date" value={form.collection_date} onChange={(e) => setForm({ ...form, collection_date: e.target.value })} />
          <FormTextarea label="Coordinates (JSON)" value={form.coordinates} onChange={(e) => setForm({ ...form, coordinates: e.target.value })} placeholder='{"lat": 38.8977, "lng": -77.0365}' />
          <FormTextarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.title.trim()} className="btn-primary">
            {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete Feature"
        message="Are you sure you want to delete this feature? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleting}
      />
    </div>
  );
}
