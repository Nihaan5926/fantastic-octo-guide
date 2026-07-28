import React, { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { Edit, Trash2, Radio, Globe, MapPin, Download, ChevronDown, Star, AlertTriangle } from 'lucide-react';
import { exportToCSV, exportToJSON } from '../../../utils/export';
import { collectionRequirementsApi, collectionAssetsApi, collectionPirsApi, collectionGapsApi } from '../api';
import { useDynamicTable } from '../../../hooks/useDynamicTable';
import DataTable from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import PageHeader from '../../../components/common/PageHeader';
import SearchBar from '../../../components/common/SearchBar';
import { FormInput, FormTextarea, FormSelect } from '../../../components/common/FormComponents';
import { StatusBadge, PriorityBadge } from '../../../components/common/Badges';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { useCollectionStore } from '../store';

const statusOptions = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const disciplineOptions = [
  { value: 'HUMINT', label: 'HUMINT' },
  { value: 'OSINT', label: 'OSINT' },
  { value: 'SIGINT', label: 'SIGINT' },
  { value: 'GEOINT', label: 'GEOINT' },
  { value: 'MASINT', label: 'MASINT' },
  { value: 'TECHINT', label: 'TECHINT' },
];

const priorityOptions = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

const assetTypeOptions = [
  { value: 'SATELLITE', label: 'Satellite' },
  { value: 'DRONE', label: 'Drone' },
  { value: 'AIRCRAFT', label: 'Aircraft' },
  { value: 'MARITIME', label: 'Maritime' },
  { value: 'GROUND', label: 'Ground' },
  { value: 'CYBER', label: 'Cyber' },
  { value: 'HUMAN', label: 'Human' },
];

const assetStatusOptions = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'STANDBY', label: 'Standby' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'OFFLINE', label: 'Offline' },
  { value: 'DECOMMISSIONED', label: 'Decommissioned' },
];

const emptyRequirement = { reference_number: '', title: '', description: '', priority: 'MEDIUM', intelligence_discipline: 'OSINT', status: 'ACTIVE', requester_id: '' };
const emptyAsset = { name: '', asset_type: 'SATELLITE', platform: '', capability: '', status: 'ACTIVE', location: '' };

type TabKey = 'requirements' | 'assets' | 'pirs';

export default function CollectionList() {
  const {
    requirements, assets, requirementsPagination, assetsPagination, isLoading,
    fetchRequirements, createRequirement, updateRequirement, deleteRequirement,
    fetchAssets, createAsset, updateAsset, deleteAsset,
  } = useCollectionStore();

  const [activeTab, setActiveTab] = useState<TabKey>('requirements');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [reqModal, setReqModal] = useState(false);
  const [reqForm, setReqForm] = useState(emptyRequirement);
  const [editingReq, setEditingReq] = useState<any>(null);

  const [assetModal, setAssetModal] = useState(false);
  const [assetForm, setAssetForm] = useState(emptyAsset);
  const [editingAsset, setEditingAsset] = useState<any>(null);

  const [deleteTarget, setDeleteTarget] = useState<{ type: string; item: any } | null>(null);
  const [saving, setSaving] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // PIR state
  const [pirs, setPirs] = useState<any[]>([]);
  const [pirsLoading, setPirsLoading] = useState(false);
  const [pirModal, setPirModal] = useState(false);
  const [pirForm, setPirForm] = useState({ title: '', priority: 'MEDIUM', description: '', requirement_id: '' });
  const [promoteReq, setPromoteReq] = useState<any>(null);
  const [gaps, setGaps] = useState<any[]>([]);
  const [gapsLoading, setGapsLoading] = useState(false);
  const [gapsVisible, setGapsVisible] = useState(false);

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
    if (activeTab === 'requirements') fetchRequirements({ search, page, limit: 10 });
    else if (activeTab === 'assets') fetchAssets({ search, page, limit: 10 });
    else if (activeTab === 'pirs') fetchPirs();
  }, [activeTab, search, page]);

  const fetchPirs = async () => {
    setPirsLoading(true);
    try {
      const data = await collectionPirsApi.list({ page, limit: 50 });
      setPirs(data.data || []);
    } catch { /* ignore */ }
    finally { setPirsLoading(false); }
  };

  const fetchGaps = async () => {
    setGapsLoading(true);
    try {
      const data = await collectionGapsApi.list();
      setGaps(data.data || []);
      setGapsVisible(true);
    } catch { /* ignore */ }
    finally { setGapsLoading(false); }
  };

  const handleReqSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingReq) {
        await updateRequirement(editingReq.id, reqForm);
        toast.success('Requirement updated');
      } else {
        await createRequirement(reqForm);
        toast.success('Requirement created');
      }
      setReqModal(false);
      fetchRequirements({ search, page, limit: 10 });
    } catch {
      toast.error('Failed to save requirement');
    } finally { setSaving(false); }
  };

  const handleAssetSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingAsset) {
        await updateAsset(editingAsset.id, assetForm);
        toast.success('Asset updated');
      } else {
        await createAsset(assetForm);
        toast.success('Asset created');
      }
      setAssetModal(false);
      fetchAssets({ search, page, limit: 10 });
    } catch {
      toast.error('Failed to save asset');
    } finally { setSaving(false); }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const isReq = activeTab === 'requirements';
      const data = isReq
        ? await collectionRequirementsApi.list({ limit: 1000 })
        : await collectionAssetsApi.list({ limit: 1000 });
      const allItems = data.data || data.items || [];
      const label = isReq ? 'requirements' : 'assets';
      exportToCSV(allItems, `collection-${label}-export`);
      toast.success(`Exported ${allItems.length} ${label} as CSV`);
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
      const isReq = activeTab === 'requirements';
      const data = isReq
        ? await collectionRequirementsApi.list({ limit: 1000 })
        : await collectionAssetsApi.list({ limit: 1000 });
      const allItems = data.data || data.items || [];
      const label = isReq ? 'requirements' : 'assets';
      exportToJSON(allItems, `collection-${label}-export`);
      toast.success(`Exported ${allItems.length} ${label} as JSON`);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
      setExportOpen(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      if (deleteTarget.type === 'requirement') {
        await deleteRequirement(deleteTarget.item.id);
        fetchRequirements({ search, page, limit: 10 });
      } else {
        await deleteAsset(deleteTarget.item.id);
        fetchAssets({ search, page, limit: 10 });
      }
      toast.success('Deleted');
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete');
    } finally { setSaving(false); }
  };

  const openReqModal = (item?: any) => {
    if (item) {
      setEditingReq(item);
      setReqForm({ reference_number: item.reference_number || '', title: item.title || '', description: item.description || '', priority: item.priority || 'MEDIUM', intelligence_discipline: item.intelligence_discipline || 'OSINT', status: item.status || 'ACTIVE', requester_id: item.requester_id || '' });
    } else {
      setEditingReq(null);
      setReqForm(emptyRequirement);
    }
    setReqModal(true);
  };

  const openAssetModal = (item?: any) => {
    if (item) {
      setEditingAsset(item);
      setAssetForm({ name: item.name || '', asset_type: item.asset_type || 'SATELLITE', platform: item.platform || '', capability: item.capability || '', status: item.status || 'ACTIVE', location: item.location || '' });
    } else {
      setEditingAsset(null);
      setAssetForm(emptyAsset);
    }
    setAssetModal(true);
  };

  const handlePromoteToPir = (req: any) => {
    setPromoteReq(req);
    setPirForm({ title: req.title || '', priority: req.priority || 'MEDIUM', description: req.description || '', requirement_id: req.id });
    setPirModal(true);
  };

  const handlePirSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pirForm.title.trim() || !pirForm.requirement_id) {
      toast.error('Title and linked requirement are required');
      return;
    }
    setSaving(true);
    try {
      await collectionPirsApi.create(pirForm);
      toast.success('PIR created');
      setPirModal(false);
      fetchPirs();
    } catch {
      toast.error('Failed to create PIR');
    } finally { setSaving(false); }
  };

  const handlePirDelete = async (pirId: string) => {
    setSaving(true);
    try {
      await collectionPirsApi.delete(pirId);
      toast.success('PIR deleted');
      fetchPirs();
    } catch {
      toast.error('Failed to delete PIR');
    } finally { setSaving(false); }
  };

  const reqColumns = [
    { key: 'reference_number', label: 'Ref #', className: 'font-mono text-xs' },
    { key: 'title', label: 'Title', className: 'font-medium' },
    {
      key: 'intelligence_discipline',
      label: 'Discipline',
      render: (item: any) => (
        <StatusBadge
          label={item.intelligence_discipline}
          color={item.intelligence_discipline === 'HUMINT' ? 'purple' : item.intelligence_discipline === 'OSINT' ? 'blue' : item.intelligence_discipline === 'SIGINT' ? 'yellow' : item.intelligence_discipline === 'GEOINT' ? 'green' : 'red'}
        />
      ),
    },
    {
      key: 'priority', label: 'Priority', render: (item: any) => <PriorityBadge level={item.priority} />,
    },
    {
      key: 'status',
      label: 'Status',
      render: (item: any) => <StatusBadge label={item.status} color={item.status === 'ACTIVE' ? 'green' : item.status === 'COMPLETED' ? 'blue' : item.status === 'CANCELLED' ? 'red' : 'yellow'} />,
    },
    {
      key: 'description', label: 'Description',
      render: (item: any) => <span className="text-text-secondary text-xs line-clamp-1">{item.description || '—'}</span>,
    },
    {
      key: 'actions', label: '', className: 'w-20',
      render: (item: any) => (
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); handlePromoteToPir(item); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-amber-400" title="Promote to PIR">
            <Star size={15} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); openReqModal(item); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-accent"><Edit size={15} /></button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'requirement', item }); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-red-400"><Trash2 size={15} /></button>
        </div>
      ),
    },
  ];

  const assetColumns = [
    { key: 'name', label: 'Name', className: 'font-medium' },
    {
      key: 'asset_type', label: 'Type',
      render: (item: any) => <StatusBadge label={item.asset_type} color={item.asset_type === 'SATELLITE' ? 'blue' : item.asset_type === 'DRONE' ? 'green' : item.asset_type === 'CYBER' ? 'purple' : 'gray'} />,
    },
    { key: 'platform', label: 'Platform' },
    { key: 'capability', label: 'Capability', render: (item: any) => <span className="text-text-secondary text-xs">{item.capability || '—'}</span> },
    {
      key: 'status',
      label: 'Status',
      render: (item: any) => <StatusBadge label={item.status} color={item.status === 'ACTIVE' ? 'green' : item.status === 'STANDBY' ? 'yellow' : item.status === 'MAINTENANCE' ? 'blue' : 'red'} />,
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
      key: 'actions', label: '', className: 'w-20',
      render: (item: any) => (
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); openAssetModal(item); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-accent"><Edit size={15} /></button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'asset', item }); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-red-400"><Trash2 size={15} /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Collection Management"
        subtitle="Manage intelligence collection requirements and assets"
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
      <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search..." />

      <div className="flex gap-1 border-b border-border">
        {([
          { key: 'requirements' as TabKey, label: `Requirements (${requirements.length})`, icon: <Radio size={15} /> },
          { key: 'assets' as TabKey, label: `Assets (${assets.length})`, icon: <Globe size={15} /> },
          { key: 'pirs' as TabKey, label: `PIRs (${pirs.length})`, icon: <Star size={15} /> },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setPage(1); }}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
        <button
          onClick={() => activeTab === 'requirements' ? openReqModal() : activeTab === 'assets' ? openAssetModal() : null}
          className="ml-auto btn-primary text-sm mb-1"
        >
          {activeTab === 'requirements' ? 'New Requirement' : activeTab === 'assets' ? 'New Asset' : ''}
        </button>
      </div>

      {activeTab === 'requirements' && (
        <DataTable
          columns={reqColumns}
          data={requirements}
          pagination={requirementsPagination.totalPages > 0 ? { ...requirementsPagination, page } : undefined}
          isLoading={isLoading}
          emptyMessage="No collection requirements found"
          onPageChange={setPage}
        />
      )}

      {activeTab === 'assets' && (
        <DataTable
          columns={assetColumns}
          data={assets}
          pagination={assetsPagination.totalPages > 0 ? { ...assetsPagination, page } : undefined}
          isLoading={isLoading}
          emptyMessage="No collection assets found"
          onPageChange={setPage}
        />
      )}

      {/* PIRs Tab */}
      {activeTab === 'pirs' && (
        <div className="space-y-6">
          {/* Coverage Gaps Alert */}
          <div className="card border-amber-500/30 bg-amber-500/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-400" />
                <div>
                  <h3 className="text-sm font-semibold text-amber-300">Coverage Gaps</h3>
                  <p className="text-xs text-text-muted">
                    Requirements without paired collection assets
                    {gaps.length > 0 && <span className="text-amber-400 ml-1">({gaps.length} gaps found)</span>}
                  </p>
                </div>
              </div>
              <button
                onClick={gapsVisible ? () => setGapsVisible(false) : fetchGaps}
                disabled={gapsLoading}
                className="btn-secondary text-xs"
              >
                {gapsLoading ? 'Checking...' : gapsVisible ? 'Hide Gaps' : 'Check Gaps'}
              </button>
            </div>
            {gapsVisible && (
              <div className="mt-3">
                {gaps.length === 0 ? (
                  <p className="text-xs text-emerald-400">All requirements have coverage.</p>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {gaps.map((gap: any) => (
                      <div key={gap.id} className="flex items-center justify-between px-3 py-1.5 bg-bg-tertiary rounded border border-border text-xs">
                        <div>
                          <span className="font-mono text-text-muted mr-2">{gap.reference_number}</span>
                          <span className="text-text-primary">{gap.title}</span>
                        </div>
                        <StatusBadge label={gap.intelligence_discipline || 'N/A'} color="red" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4">
              <Star size={16} className="text-amber-400" />
              <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Priority Intelligence Requirements</h3>
            </div>
            {pirsLoading ? (
              <div className="text-center py-8 text-text-muted animate-pulse">Loading PIRs...</div>
            ) : pirs.length === 0 ? (
              <div className="card text-center py-12 text-text-muted">
                <Star size={32} className="mx-auto mb-3 opacity-40" />
                <p>No PIRs defined</p>
                <p className="text-xs mt-1">Promote a requirement to a PIR from the Requirements tab</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pirs.map((pir: any) => (
                  <div key={pir.id} className="card flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-text-muted">{pir.reference_number}</span>
                        <span className="font-medium">{pir.title}</span>
                        <PriorityBadge level={pir.priority} />
                        <StatusBadge label={pir.status || 'ACTIVE'} color={pir.status === 'ACTIVE' ? 'green' : 'gray'} />
                      </div>
                      {pir.description && (
                        <p className="text-sm text-text-secondary mb-1">{pir.description}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-text-muted">
                        <span>Linked to: {pir.requirement_ref || pir.requirement_title || pir.requirement_id}</span>
                        {pir.requester_first && <span>by {pir.requester_first} {pir.requester_last}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => handlePirDelete(pir.id)}
                      className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Requirement Modal */}
      <Modal isOpen={reqModal} onClose={() => setReqModal(false)} title={editingReq ? 'Edit Requirement' : 'New Requirement'} size="lg">
        <form onSubmit={handleReqSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Reference Number" value={reqForm.reference_number} onChange={(e) => setReqForm({ ...reqForm, reference_number: e.target.value })} required />
            <FormSelect label="Status" options={statusOptions} value={reqForm.status} onChange={(e) => setReqForm({ ...reqForm, status: e.target.value })} required />
          </div>
          <FormInput label="Title" value={reqForm.title} onChange={(e) => setReqForm({ ...reqForm, title: e.target.value })} required />
          <div className="grid grid-cols-2 gap-4">
            <FormSelect label="Discipline" options={disciplineOptions} value={reqForm.intelligence_discipline} onChange={(e) => setReqForm({ ...reqForm, intelligence_discipline: e.target.value })} required />
            <FormSelect label="Priority" options={priorityOptions} value={reqForm.priority} onChange={(e) => setReqForm({ ...reqForm, priority: e.target.value })} required />
          </div>
          <FormTextarea label="Description" value={reqForm.description} onChange={(e) => setReqForm({ ...reqForm, description: e.target.value })} required />
          <FormInput label="Requester ID" value={reqForm.requester_id} onChange={(e) => setReqForm({ ...reqForm, requester_id: e.target.value })} />
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button type="button" onClick={() => setReqModal(false)} className="btn-secondary" disabled={saving}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : editingReq ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>

      {/* Asset Modal */}
      <Modal isOpen={assetModal} onClose={() => setAssetModal(false)} title={editingAsset ? 'Edit Asset' : 'New Asset'} size="lg">
        <form onSubmit={handleAssetSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Name" value={assetForm.name} onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })} required />
            <FormSelect label="Asset Type" options={assetTypeOptions} value={assetForm.asset_type} onChange={(e) => setAssetForm({ ...assetForm, asset_type: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Platform" value={assetForm.platform} onChange={(e) => setAssetForm({ ...assetForm, platform: e.target.value })} />
            <FormSelect label="Status" options={assetStatusOptions} value={assetForm.status} onChange={(e) => setAssetForm({ ...assetForm, status: e.target.value })} required />
          </div>
          <FormInput label="Capability" value={assetForm.capability} onChange={(e) => setAssetForm({ ...assetForm, capability: e.target.value })} />
          <FormInput label="Location" value={assetForm.location} onChange={(e) => setAssetForm({ ...assetForm, location: e.target.value })} />
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button type="button" onClick={() => setAssetModal(false)} className="btn-secondary" disabled={saving}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : editingAsset ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`Delete ${deleteTarget?.type === 'requirement' ? 'Requirement' : 'Asset'}`}
        message={`Are you sure you want to delete "${deleteTarget?.item?.title || deleteTarget?.item?.name}"?`}
        variant="danger"
      />

      {/* PIR Modal */}
      <Modal isOpen={pirModal} onClose={() => setPirModal(false)} title="Create Priority Intelligence Requirement" size="lg">
        <form onSubmit={handlePirSave} className="space-y-4">
          {promoteReq && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <p className="text-xs text-amber-400 font-medium uppercase tracking-wider mb-1">Promoting From Requirement</p>
              <p className="text-sm text-amber-200">{promoteReq.reference_number}: {promoteReq.title}</p>
            </div>
          )}
          <FormInput label="Title" value={pirForm.title} onChange={(e) => setPirForm({ ...pirForm, title: e.target.value })} required />
          <div className="grid grid-cols-2 gap-4">
            <FormSelect label="Priority" options={priorityOptions} value={pirForm.priority} onChange={(e) => setPirForm({ ...pirForm, priority: e.target.value })} required />
            <FormInput label="Linked Requirement ID" value={pirForm.requirement_id} onChange={(e) => setPirForm({ ...pirForm, requirement_id: e.target.value })} required />
          </div>
          <FormTextarea label="Description" value={pirForm.description} onChange={(e) => setPirForm({ ...pirForm, description: e.target.value })} />
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button type="button" onClick={() => setPirModal(false)} className="btn-secondary" disabled={saving}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Creating...' : 'Create PIR'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}