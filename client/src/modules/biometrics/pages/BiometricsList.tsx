import React, { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { Edit, Trash2, Download, ChevronDown } from 'lucide-react';
import { useBiometricsStore } from '../store';
import { biometricsApi } from '../api';
import { exportToCSV, exportToJSON } from '../../../utils/export';
import PageHeader from '../../../components/common/PageHeader';
import SearchBar from '../../../components/common/SearchBar';
import DataTable from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { FormInput, FormSelect, FormTextarea } from '../../../components/common/FormComponents';
import { StatusBadge, ClassificationBadge } from '../../../components/common/Badges';

const TABS = [
  { key: 'records' as const, label: 'Records' },
  { key: 'watchlists' as const, label: 'Watchlists' },
  { key: 'encounters' as const, label: 'Encounters' },
];

const BIOMETRIC_TYPES = [
  { value: 'FACIAL', label: 'FACIAL' },
  { value: 'FINGERPRINT', label: 'FINGERPRINT' },
  { value: 'DNA', label: 'DNA' },
  { value: 'VOICE', label: 'VOICE' },
  { value: 'IRIS', label: 'IRIS' },
];

const CLASSIFICATIONS = [
  { value: 'UNCLASSIFIED', label: 'UNCLASSIFIED' },
  { value: 'CONFIDENTIAL', label: 'CONFIDENTIAL' },
  { value: 'SECRET', label: 'SECRET' },
  { value: 'TOP_SECRET', label: 'TOP SECRET' },
];

interface RecordForm {
  subject_name: string; biometric_type: string; record_data: string;
  confidence_score: string; classification: string;
}
interface WatchlistForm {
  list_name: string; description: string; status: string;
}
interface EncounterForm {
  subject_name: string; encounter_type: string; location: string;
  encounter_date: string; matched_record_id: string; matched_watchlist_id: string; status: string;
}

const emptyRecord: RecordForm = { subject_name: '', biometric_type: 'FACIAL', record_data: '', confidence_score: '', classification: 'CONFIDENTIAL' };
const emptyWatchlist: WatchlistForm = { list_name: '', description: '', status: 'ACTIVE' };
const emptyEncounter: EncounterForm = { subject_name: '', encounter_type: '', location: '', encounter_date: '', matched_record_id: '', matched_watchlist_id: '', status: 'ACTIVE' };

function getTypeColor(t: string) {
  const m: Record<string, string> = { FACIAL: 'blue', FINGERPRINT: 'green', DNA: 'purple', VOICE: 'yellow', IRIS: 'red' };
  return m[t] || 'gray';
}

function getStatusColor(s: string) {
  const m: Record<string, string> = { ACTIVE: 'green', INACTIVE: 'gray', ARCHIVED: 'gray', PENDING: 'yellow', MATCHED: 'red', REVIEWED: 'blue' };
  return m[s] || 'gray';
}

export default function BiometricsList() {
  const store = useBiometricsStore();
  const {
    activeTab, setActiveTab,
    records, recordsPagination, recordsLoading, recordsError, recordSearch, setRecordSearch,
    watchlists, watchlistsPagination, watchlistsLoading, watchlistsError, watchlistSearch, setWatchlistSearch,
    encounters, encountersPagination, encountersLoading, encountersError, encounterSearch, setEncounterSearch,
    fetchRecords, createRecord, updateRecord, deleteRecord,
    fetchWatchlists, createWatchlist, updateWatchlist, deleteWatchlist,
    fetchEncounters, createEncounter, updateEncounter, deleteEncounter,
  } = store;

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [recForm, setRecForm] = useState<RecordForm>(emptyRecord);
  const [wlForm, setWlForm] = useState<WatchlistForm>(emptyWatchlist);
  const [encForm, setEncForm] = useState<EncounterForm>(emptyEncounter);
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
    fetchRecords();
    fetchWatchlists();
    fetchEncounters();
  }, []);

  const tabPagination = activeTab === 'records' ? recordsPagination : activeTab === 'watchlists' ? watchlistsPagination : encountersPagination;

  const handleTabPageChange = (page: number) => {
    const p = { page, limit: tabPagination.limit };
    if (activeTab === 'records') fetchRecords(p);
    else if (activeTab === 'watchlists') fetchWatchlists(p);
    else fetchEncounters(p);
  };

  const openCreate = () => {
    setEditingId(null);
    if (activeTab === 'records') setRecForm(emptyRecord);
    else if (activeTab === 'watchlists') setWlForm(emptyWatchlist);
    else setEncForm(emptyEncounter);
    setModalOpen(true);
  };

  const openEdit = (item: any) => {
    setEditingId(item.id);
    if (activeTab === 'records') {
      setRecForm({
        subject_name: item.subject_name || '',
        biometric_type: item.biometric_type || 'FACIAL',
        record_data: typeof item.record_data === 'object' ? JSON.stringify(item.record_data) : (item.record_data || ''),
        confidence_score: item.confidence_score !== undefined ? String(item.confidence_score) : '',
        classification: item.classification || 'CONFIDENTIAL',
      });
    } else if (activeTab === 'watchlists') {
      setWlForm({
        list_name: item.list_name || '',
        description: item.description || '',
        status: item.status || 'ACTIVE',
      });
    } else {
      setEncForm({
        subject_name: item.subject_name || '',
        encounter_type: item.encounter_type || '',
        location: item.location || '',
        encounter_date: item.encounter_date ? item.encounter_date.slice(0, 10) : '',
        matched_record_id: item.matched_record_id || '',
        matched_watchlist_id: item.matched_watchlist_id || '',
        status: item.status || 'ACTIVE',
      });
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    let ok: boolean;
    if (activeTab === 'records') {
      if (!recForm.subject_name.trim()) { setSaving(false); return; }
      const payload = { ...recForm, confidence_score: parseFloat(recForm.confidence_score) || 0, record_data: (() => { try { return JSON.parse(recForm.record_data); } catch { return recForm.record_data; } })() };
      ok = editingId ? await updateRecord(editingId, payload) : await createRecord(payload);
    } else if (activeTab === 'watchlists') {
      if (!wlForm.list_name.trim()) { setSaving(false); return; }
      ok = editingId ? await updateWatchlist(editingId, wlForm) : await createWatchlist(wlForm);
    } else {
      if (!encForm.subject_name.trim()) { setSaving(false); return; }
      ok = editingId ? await updateEncounter(editingId, encForm) : await createEncounter(encForm);
    }
    setSaving(false);
    if (ok) setModalOpen(false);
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      let result;
      let label: string;
      if (activeTab === 'records') {
        result = await biometricsApi.listRecords({ limit: 1000 });
        label = 'records';
      } else if (activeTab === 'watchlists') {
        result = await biometricsApi.listWatchlists({ limit: 1000 });
        label = 'watchlists';
      } else {
        result = await biometricsApi.listEncounters({ limit: 1000 });
        label = 'encounters';
      }
      const { data } = result;
      const allItems = data.data || data.items || [];
      exportToCSV(allItems, `biometrics-${label}-export`);
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
      let result;
      let label: string;
      if (activeTab === 'records') {
        result = await biometricsApi.listRecords({ limit: 1000 });
        label = 'records';
      } else if (activeTab === 'watchlists') {
        result = await biometricsApi.listWatchlists({ limit: 1000 });
        label = 'watchlists';
      } else {
        result = await biometricsApi.listEncounters({ limit: 1000 });
        label = 'encounters';
      }
      const { data } = result;
      const allItems = data.data || data.items || [];
      exportToJSON(allItems, `biometrics-${label}-export`);
      toast.success(`Exported ${allItems.length} ${label} as JSON`);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
      setExportOpen(false);
    }
  };

  const openDeleteConfirm = (id: string) => { setDeleteTargetId(id); setConfirmOpen(true); };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    setDeleting(true);
    if (activeTab === 'records') await deleteRecord(deleteTargetId);
    else if (activeTab === 'watchlists') await deleteWatchlist(deleteTargetId);
    else await deleteEncounter(deleteTargetId);
    setDeleting(false);
    setConfirmOpen(false);
    setDeleteTargetId(null);
  };

  const recordColumns = [
    { key: 'subject_name', label: 'Subject', sortable: true },
    { key: 'biometric_type', label: 'Type', render: (it: any) => <StatusBadge label={it.biometric_type} color={getTypeColor(it.biometric_type)} /> },
    { key: 'confidence_score', label: 'Confidence', render: (it: any) => `${Math.round((it.confidence_score || 0) * 100)}%` },
    { key: 'classification', label: 'Class', render: (it: any) => <ClassificationBadge level={it.classification} /> },
    { key: 'actions', label: '', className: 'w-20', render: (it: any) => (
      <div className="flex items-center gap-1">
        <button onClick={(e) => { e.stopPropagation(); openEdit(it); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary"><Edit size={15} /></button>
        <button onClick={(e) => { e.stopPropagation(); openDeleteConfirm(it.id); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-accent-danger"><Trash2 size={15} /></button>
      </div>
    )},
  ];

  const watchlistColumns = [
    { key: 'list_name', label: 'Name', sortable: true },
    { key: 'description', label: 'Description', render: (it: any) => it.description ? (it.description.length > 80 ? it.description.slice(0, 80) + '...' : it.description) : '-' },
    { key: 'status', label: 'Status', render: (it: any) => <StatusBadge label={it.status} color={getStatusColor(it.status)} /> },
    { key: 'actions', label: '', className: 'w-20', render: (it: any) => (
      <div className="flex items-center gap-1">
        <button onClick={(e) => { e.stopPropagation(); openEdit(it); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary"><Edit size={15} /></button>
        <button onClick={(e) => { e.stopPropagation(); openDeleteConfirm(it.id); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-accent-danger"><Trash2 size={15} /></button>
      </div>
    )},
  ];

  const encounterColumns = [
    { key: 'subject_name', label: 'Subject', sortable: true },
    { key: 'encounter_type', label: 'Type' },
    { key: 'location', label: 'Location' },
    { key: 'encounter_date', label: 'Date', render: (it: any) => it.encounter_date ? new Date(it.encounter_date).toLocaleDateString() : '-' },
    { key: 'status', label: 'Status', render: (it: any) => <StatusBadge label={it.status} color={getStatusColor(it.status)} /> },
    { key: 'actions', label: '', className: 'w-20', render: (it: any) => (
      <div className="flex items-center gap-1">
        <button onClick={(e) => { e.stopPropagation(); openEdit(it); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary"><Edit size={15} /></button>
        <button onClick={(e) => { e.stopPropagation(); openDeleteConfirm(it.id); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-accent-danger"><Trash2 size={15} /></button>
      </div>
    )},
  ];

  const tabData = activeTab === 'records' ? records : activeTab === 'watchlists' ? watchlists : encounters;
  const tabLoading = activeTab === 'records' ? recordsLoading : activeTab === 'watchlists' ? watchlistsLoading : encountersLoading;
  const tabError = activeTab === 'records' ? recordsError : activeTab === 'watchlists' ? watchlistsError : encountersError;
  const tabColumns = activeTab === 'records' ? recordColumns : activeTab === 'watchlists' ? watchlistColumns : encounterColumns;
  const tabSearch = activeTab === 'records' ? recordSearch : activeTab === 'watchlists' ? watchlistSearch : encounterSearch;
  const setTabSearch = activeTab === 'records' ? setRecordSearch : activeTab === 'watchlists' ? setWatchlistSearch : setEncounterSearch;
  const createLabel = activeTab === 'records' ? 'New Record' : activeTab === 'watchlists' ? 'New Watchlist' : 'New Encounter';
  const modalTitle = editingId
    ? `Edit ${activeTab === 'records' ? 'Record' : activeTab === 'watchlists' ? 'Watchlist' : 'Encounter'}`
    : `Create ${activeTab === 'records' ? 'Record' : activeTab === 'watchlists' ? 'Watchlist' : 'Encounter'}`;

  return (
    <div>
      <PageHeader title="Biometrics" subtitle="Biometric Intelligence" onCreate={openCreate} createLabel={createLabel}>
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

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-bg-tertiary rounded-lg p-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === tab.key ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary'}`}
            >
              {tab.label}
              {tab.key === 'records' && ` (${recordsPagination.total})`}
              {tab.key === 'watchlists' && ` (${watchlistsPagination.total})`}
              {tab.key === 'encounters' && ` (${encountersPagination.total})`}
            </button>
          ))}
        </div>
        <SearchBar value={tabSearch} onChange={setTabSearch} placeholder={`Search ${activeTab}...`} className="max-w-xs" />
      </div>

      {tabError && <div className="card border-red-500/30 bg-red-500/10 text-red-400 text-sm p-4 mb-4">{tabError}</div>}

      <DataTable columns={tabColumns} data={tabData} isLoading={tabLoading} pagination={tabPagination} onPageChange={handleTabPageChange} emptyMessage={`No ${activeTab} found`} />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle} size="lg">
        {activeTab === 'records' ? (
          <div className="space-y-4">
            <FormInput label="Subject Name" required value={recForm.subject_name} onChange={(e) => setRecForm({ ...recForm, subject_name: e.target.value })} />
            <div className="grid grid-cols-3 gap-4">
              <FormSelect label="Biometric Type" options={BIOMETRIC_TYPES} value={recForm.biometric_type} onChange={(e) => setRecForm({ ...recForm, biometric_type: e.target.value })} />
              <FormInput label="Confidence Score" type="number" step="0.01" min="0" max="1" value={recForm.confidence_score} onChange={(e) => setRecForm({ ...recForm, confidence_score: e.target.value })} />
              <FormSelect label="Classification" options={CLASSIFICATIONS} value={recForm.classification} onChange={(e) => setRecForm({ ...recForm, classification: e.target.value })} />
            </div>
            <FormTextarea label="Record Data (JSON)" value={recForm.record_data} onChange={(e) => setRecForm({ ...recForm, record_data: e.target.value })} placeholder='{"template_id": "abc123", "source": "database"}' />
          </div>
        ) : activeTab === 'watchlists' ? (
          <div className="space-y-4">
            <FormInput label="List Name" required value={wlForm.list_name} onChange={(e) => setWlForm({ ...wlForm, list_name: e.target.value })} />
            <FormSelect label="Status" options={[{ value: 'ACTIVE', label: 'ACTIVE' }, { value: 'INACTIVE', label: 'INACTIVE' }, { value: 'ARCHIVED', label: 'ARCHIVED' }]} value={wlForm.status} onChange={(e) => setWlForm({ ...wlForm, status: e.target.value })} />
            <FormTextarea label="Description" value={wlForm.description} onChange={(e) => setWlForm({ ...wlForm, description: e.target.value })} />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Subject Name" required value={encForm.subject_name} onChange={(e) => setEncForm({ ...encForm, subject_name: e.target.value })} />
              <FormInput label="Encounter Type" value={encForm.encounter_type} onChange={(e) => setEncForm({ ...encForm, encounter_type: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <FormInput label="Location" value={encForm.location} onChange={(e) => setEncForm({ ...encForm, location: e.target.value })} />
              <FormInput label="Encounter Date" type="date" value={encForm.encounter_date} onChange={(e) => setEncForm({ ...encForm, encounter_date: e.target.value })} />
              <FormSelect
                label="Status"
                options={[{ value: 'ACTIVE', label: 'ACTIVE' }, { value: 'PENDING', label: 'PENDING' }, { value: 'MATCHED', label: 'MATCHED' }, { value: 'REVIEWED', label: 'REVIEWED' }]}
                value={encForm.status}
                onChange={(e) => setEncForm({ ...encForm, status: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Matched Record ID" value={encForm.matched_record_id} onChange={(e) => setEncForm({ ...encForm, matched_record_id: e.target.value })} />
              <FormInput label="Matched Watchlist ID" value={encForm.matched_watchlist_id} onChange={(e) => setEncForm({ ...encForm, matched_watchlist_id: e.target.value })} />
            </div>
          </div>
        )}
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || (activeTab === 'records' ? !recForm.subject_name.trim() : activeTab === 'watchlists' ? !wlForm.list_name.trim() : !encForm.subject_name.trim())}
            className="btn-primary"
          >
            {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={handleDelete} title="Delete Record" message="Are you sure you want to delete this record? This action cannot be undone." confirmLabel="Delete" variant="danger" isLoading={deleting} />
    </div>
  );
}
