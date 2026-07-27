import React, { useEffect, useState } from 'react';
import { Edit, Trash2 } from 'lucide-react';
import { useSigintStore } from '../store';
import PageHeader from '../../../components/common/PageHeader';
import SearchBar from '../../../components/common/SearchBar';
import DataTable from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { FormInput, FormSelect, FormTextarea } from '../../../components/common/FormComponents';
import { StatusBadge } from '../../../components/common/Badges';

const TABS = [
  { key: 'intercepts' as const, label: 'Intercepts' },
  { key: 'emitters' as const, label: 'Emitters' },
];

const STATUSES = [
  { value: 'ACTIVE', label: 'ACTIVE' },
  { value: 'ARCHIVED', label: 'ARCHIVED' },
  { value: 'PENDING', label: 'PENDING' },
  { value: 'COMPLETED', label: 'COMPLETED' },
];

interface InterceptForm {
  reference_number: string;
  title: string;
  signal_type: string;
  frequency: string;
  modulation: string;
  content: string;
  location: string;
  collection_date: string;
  status: string;
}

interface EmitterForm {
  name: string;
  emitter_type: string;
  frequency_range: string;
  location: string;
  confidence: string;
  status: string;
}

const emptyIntercept: InterceptForm = { reference_number: '', title: '', signal_type: '', frequency: '', modulation: '', content: '', location: '', collection_date: '', status: 'ACTIVE' };
const emptyEmitter: EmitterForm = { name: '', emitter_type: '', frequency_range: '', location: '', confidence: '', status: 'ACTIVE' };

function getStatusColor(status: string) {
  const map: Record<string, string> = { ACTIVE: 'green', ARCHIVED: 'gray', PENDING: 'yellow', COMPLETED: 'blue' };
  return map[status] || 'gray';
}

export default function SigintList() {
  const {
    activeTab, setActiveTab,
    intercepts, interceptsPagination, interceptsLoading, interceptsError, interceptSearch, setInterceptSearch,
    emitters, emittersPagination, emittersLoading, emittersError, emitterSearch, setEmitterSearch,
    fetchIntercepts, createIntercept, updateIntercept, deleteIntercept,
    fetchEmitters, createEmitter, updateEmitter, deleteEmitter,
  } = useSigintStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [interceptForm, setInterceptForm] = useState<InterceptForm>(emptyIntercept);
  const [emitterForm, setEmitterForm] = useState<EmitterForm>(emptyEmitter);
  const [saving, setSaving] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchIntercepts();
    fetchEmitters();
  }, []);

  const handleTabPageChange = (page: number) => {
    if (activeTab === 'intercepts') fetchIntercepts({ page, limit: interceptsPagination.limit });
    else fetchEmitters({ page, limit: emittersPagination.limit });
  };

  const currentPagination = activeTab === 'intercepts' ? interceptsPagination : emittersPagination;

  const openCreate = () => {
    setEditingId(null);
    if (activeTab === 'intercepts') setInterceptForm(emptyIntercept);
    else setEmitterForm(emptyEmitter);
    setModalOpen(true);
  };

  const openEdit = (item: any) => {
    setEditingId(item.id);
    if (activeTab === 'intercepts') {
      setInterceptForm({
        reference_number: item.reference_number || '',
        title: item.title || '',
        signal_type: item.signal_type || '',
        frequency: item.frequency || '',
        modulation: item.modulation || '',
        content: item.content || '',
        location: typeof item.location === 'object' ? JSON.stringify(item.location) : (item.location || ''),
        collection_date: item.collection_date ? item.collection_date.slice(0, 10) : '',
        status: item.status || 'ACTIVE',
      });
    } else {
      setEmitterForm({
        name: item.name || '',
        emitter_type: item.emitter_type || '',
        frequency_range: typeof item.frequency_range === 'object' ? JSON.stringify(item.frequency_range) : (item.frequency_range || ''),
        location: typeof item.location === 'object' ? JSON.stringify(item.location) : (item.location || ''),
        confidence: item.confidence || '',
        status: item.status || 'ACTIVE',
      });
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    let ok: boolean;
    if (activeTab === 'intercepts') {
      if (!interceptForm.title.trim()) { setSaving(false); return; }
      const payload = { ...interceptForm, location: (() => { try { return JSON.parse(interceptForm.location); } catch { return interceptForm.location; } })() };
      ok = editingId ? await updateIntercept(editingId, payload) : await createIntercept(payload);
    } else {
      if (!emitterForm.name.trim()) { setSaving(false); return; }
      const payload = { ...emitterForm, frequency_range: (() => { try { return JSON.parse(emitterForm.frequency_range); } catch { return emitterForm.frequency_range; } })(), location: (() => { try { return JSON.parse(emitterForm.location); } catch { return emitterForm.location; } })() };
      ok = editingId ? await updateEmitter(editingId, payload) : await createEmitter(payload);
    }
    setSaving(false);
    if (ok) setModalOpen(false);
  };

  const openDeleteConfirm = (id: string) => { setDeleteTargetId(id); setConfirmOpen(true); };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    setDeleting(true);
    if (activeTab === 'intercepts') await deleteIntercept(deleteTargetId);
    else await deleteEmitter(deleteTargetId);
    setDeleting(false);
    setConfirmOpen(false);
    setDeleteTargetId(null);
  };

  const interceptColumns = [
    { key: 'reference_number', label: 'Ref #' },
    { key: 'title', label: 'Title', sortable: true },
    { key: 'signal_type', label: 'Signal Type' },
    { key: 'frequency', label: 'Frequency' },
    { key: 'modulation', label: 'Modulation' },
    { key: 'collection_date', label: 'Collection Date', render: (item: any) => item.collection_date ? new Date(item.collection_date).toLocaleDateString() : '-' },
    { key: 'status', label: 'Status', render: (item: any) => <StatusBadge label={item.status} color={getStatusColor(item.status)} /> },
    { key: 'actions', label: '', className: 'w-20', render: (item: any) => (
      <div className="flex items-center gap-1">
        <button onClick={(e) => { e.stopPropagation(); openEdit(item); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary"><Edit size={15} /></button>
        <button onClick={(e) => { e.stopPropagation(); openDeleteConfirm(item.id); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-accent-danger"><Trash2 size={15} /></button>
      </div>
    )},
  ];

  const emitterColumns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'emitter_type', label: 'Type' },
    { key: 'confidence', label: 'Confidence' },
    { key: 'status', label: 'Status', render: (item: any) => <StatusBadge label={item.status} color={getStatusColor(item.status)} /> },
    { key: 'actions', label: '', className: 'w-20', render: (item: any) => (
      <div className="flex items-center gap-1">
        <button onClick={(e) => { e.stopPropagation(); openEdit(item); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary"><Edit size={15} /></button>
        <button onClick={(e) => { e.stopPropagation(); openDeleteConfirm(item.id); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-accent-danger"><Trash2 size={15} /></button>
      </div>
    )},
  ];

  const currentData = activeTab === 'intercepts' ? intercepts : emitters;
  const isLoading = activeTab === 'intercepts' ? interceptsLoading : emittersLoading;
  const currentError = activeTab === 'intercepts' ? interceptsError : emittersError;
  const currentColumns = activeTab === 'intercepts' ? interceptColumns : emitterColumns;

  return (
    <div>
      <PageHeader title="SIGINT" subtitle="Signals Intelligence" onCreate={openCreate} createLabel={activeTab === 'intercepts' ? 'New Intercept' : 'New Emitter'} />

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-bg-tertiary rounded-lg p-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.key ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab.label}
              {tab.key === 'intercepts' && ` (${interceptsPagination.total})`}
              {tab.key === 'emitters' && ` (${emittersPagination.total})`}
            </button>
          ))}
        </div>
        <SearchBar
          value={activeTab === 'intercepts' ? interceptSearch : emitterSearch}
          onChange={activeTab === 'intercepts' ? setInterceptSearch : setEmitterSearch}
          placeholder={`Search ${activeTab}...`}
          className="max-w-xs"
        />
      </div>

      {currentError && <div className="card border-red-500/30 bg-red-500/10 text-red-400 text-sm p-4 mb-4">{currentError}</div>}

      <DataTable columns={currentColumns} data={currentData} isLoading={isLoading} pagination={currentPagination} onPageChange={handleTabPageChange} emptyMessage={`No ${activeTab} found`} />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? `Edit ${activeTab === 'intercepts' ? 'Intercept' : 'Emitter'}` : `Create ${activeTab === 'intercepts' ? 'Intercept' : 'Emitter'}`} size="lg">
        {activeTab === 'intercepts' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Reference Number" value={interceptForm.reference_number} onChange={(e) => setInterceptForm({ ...interceptForm, reference_number: e.target.value })} />
              <FormInput label="Title" required value={interceptForm.title} onChange={(e) => setInterceptForm({ ...interceptForm, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <FormInput label="Signal Type" value={interceptForm.signal_type} onChange={(e) => setInterceptForm({ ...interceptForm, signal_type: e.target.value })} />
              <FormInput label="Frequency" value={interceptForm.frequency} onChange={(e) => setInterceptForm({ ...interceptForm, frequency: e.target.value })} />
              <FormInput label="Modulation" value={interceptForm.modulation} onChange={(e) => setInterceptForm({ ...interceptForm, modulation: e.target.value })} />
            </div>
            <FormInput label="Collection Date" type="date" value={interceptForm.collection_date} onChange={(e) => setInterceptForm({ ...interceptForm, collection_date: e.target.value })} />
            <FormTextarea label="Content" value={interceptForm.content} onChange={(e) => setInterceptForm({ ...interceptForm, content: e.target.value })} />
            <FormInput label="Location (JSON)" value={interceptForm.location} onChange={(e) => setInterceptForm({ ...interceptForm, location: e.target.value })} />
            <FormSelect label="Status" options={STATUSES} value={interceptForm.status} onChange={(e) => setInterceptForm({ ...interceptForm, status: e.target.value })} />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Name" required value={emitterForm.name} onChange={(e) => setEmitterForm({ ...emitterForm, name: e.target.value })} />
              <FormInput label="Emitter Type" value={emitterForm.emitter_type} onChange={(e) => setEmitterForm({ ...emitterForm, emitter_type: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Confidence" value={emitterForm.confidence} onChange={(e) => setEmitterForm({ ...emitterForm, confidence: e.target.value })} />
              <FormSelect label="Status" options={STATUSES} value={emitterForm.status} onChange={(e) => setEmitterForm({ ...emitterForm, status: e.target.value })} />
            </div>
            <FormInput label="Frequency Range (JSON)" value={emitterForm.frequency_range} onChange={(e) => setEmitterForm({ ...emitterForm, frequency_range: e.target.value })} placeholder='{"min": 100, "max": 500, "unit": "MHz"}' />
            <FormInput label="Location (JSON)" value={emitterForm.location} onChange={(e) => setEmitterForm({ ...emitterForm, location: e.target.value })} placeholder='{"lat": 35.68, "lng": 139.76}' />
          </div>
        )}
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving || (activeTab === 'intercepts' ? !interceptForm.title.trim() : !emitterForm.name.trim())} className="btn-primary">
            {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={handleDelete} title="Delete Record" message="Are you sure you want to delete this record? This action cannot be undone." confirmLabel="Delete" variant="danger" isLoading={deleting} />
    </div>
  );
}
