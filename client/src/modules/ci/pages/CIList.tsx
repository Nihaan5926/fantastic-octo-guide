import React, { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { Edit, Trash2, Download, ChevronDown } from 'lucide-react';
import { useCIStore } from '../store';
import { ciApi } from '../api';
import { exportToCSV, exportToJSON } from '../../../utils/export';
import PageHeader from '../../../components/common/PageHeader';
import SearchBar from '../../../components/common/SearchBar';
import DataTable from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { FormInput, FormSelect, FormTextarea } from '../../../components/common/FormComponents';
import { StatusBadge, ClassificationBadge, PriorityBadge } from '../../../components/common/Badges';

const TABS = [
  { key: 'investigations' as const, label: 'Investigations' },
  { key: 'foreign_agents' as const, label: 'Foreign Agents' },
  { key: 'insider_threats' as const, label: 'Insider Threats' },
];

const PRIORITIES = [
  { value: 'LOW', label: 'LOW' },
  { value: 'MEDIUM', label: 'MEDIUM' },
  { value: 'HIGH', label: 'HIGH' },
  { value: 'CRITICAL', label: 'CRITICAL' },
];

const CASE_STATUSES = [
  { value: 'OPEN', label: 'OPEN' },
  { value: 'IN_PROGRESS', label: 'IN PROGRESS' },
  { value: 'PENDING', label: 'PENDING' },
  { value: 'CLOSED', label: 'CLOSED' },
  { value: 'COLD', label: 'COLD' },
];

const CLASSIFICATIONS = [
  { value: 'UNCLASSIFIED', label: 'UNCLASSIFIED' },
  { value: 'CONFIDENTIAL', label: 'CONFIDENTIAL' },
  { value: 'SECRET', label: 'SECRET' },
  { value: 'TOP_SECRET', label: 'TOP SECRET' },
];

const THREAT_LEVELS = [
  { value: 'LOW', label: 'LOW' },
  { value: 'MEDIUM', label: 'MEDIUM' },
  { value: 'HIGH', label: 'HIGH' },
  { value: 'CRITICAL', label: 'CRITICAL' },
];

interface InvestigationForm {
  reference_number: string; title: string; case_status: string; priority: string;
  classification: string; description: string; lead_investigator: string; opened_date: string;
}
interface ForeignAgentForm {
  name: string; nationality: string; agency: string; threat_level: string;
  status: string; last_known_location: string; description: string;
}
interface InsiderThreatForm {
  subject_name: string; department: string; threat_type: string;
  risk_level: string; status: string; indicators: string; reported_date: string; classification: string;
}

const emptyInv: InvestigationForm = { reference_number: '', title: '', case_status: 'OPEN', priority: 'MEDIUM', classification: 'CONFIDENTIAL', description: '', lead_investigator: '', opened_date: '' };
const emptyFA: ForeignAgentForm = { name: '', nationality: '', agency: '', threat_level: 'MEDIUM', status: 'ACTIVE', last_known_location: '', description: '' };
const emptyIT: InsiderThreatForm = { subject_name: '', department: '', threat_type: '', risk_level: 'MEDIUM', status: 'ACTIVE', indicators: '', reported_date: '', classification: 'CONFIDENTIAL' };

function getStatusColor(s: string) {
  const m: Record<string, string> = { OPEN: 'blue', IN_PROGRESS: 'yellow', PENDING: 'purple', CLOSED: 'green', COLD: 'gray', ACTIVE: 'green', INACTIVE: 'gray', UNDER_INVESTIGATION: 'yellow' };
  return m[s] || 'gray';
}

function getThreatColor(l: string) {
  const m: Record<string, string> = { LOW: 'green', MEDIUM: 'yellow', HIGH: 'red', CRITICAL: 'red' };
  return m[l] || 'gray';
}

export default function CIList() {
  const store = useCIStore();
  const {
    activeTab, setActiveTab,
    investigations, investigationsPagination, investigationsLoading, investigationsError, investigationSearch, setInvestigationSearch,
    foreignAgents, foreignAgentsPagination, foreignAgentsLoading, foreignAgentsError, foreignAgentSearch, setForeignAgentSearch,
    insiderThreats, insiderThreatsPagination, insiderThreatsLoading, insiderThreatsError, insiderThreatSearch, setInsiderThreatSearch,
    fetchInvestigations, createInvestigation, updateInvestigation, deleteInvestigation,
    fetchForeignAgents, createForeignAgent, updateForeignAgent, deleteForeignAgent,
    fetchInsiderThreats, createInsiderThreat, updateInsiderThreat, deleteInsiderThreat,
  } = store;

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [invForm, setInvForm] = useState<InvestigationForm>(emptyInv);
  const [faForm, setFaForm] = useState<ForeignAgentForm>(emptyFA);
  const [itForm, setItForm] = useState<InsiderThreatForm>(emptyIT);
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
    fetchInvestigations();
    fetchForeignAgents();
    fetchInsiderThreats();
  }, []);

  const tabPagination = activeTab === 'investigations' ? investigationsPagination : activeTab === 'foreign_agents' ? foreignAgentsPagination : insiderThreatsPagination;

  const handleTabPageChange = (page: number) => {
    const p = { page, limit: tabPagination.limit };
    if (activeTab === 'investigations') fetchInvestigations(p);
    else if (activeTab === 'foreign_agents') fetchForeignAgents(p);
    else fetchInsiderThreats(p);
  };

  const openCreate = () => {
    setEditingId(null);
    if (activeTab === 'investigations') setInvForm(emptyInv);
    else if (activeTab === 'foreign_agents') setFaForm(emptyFA);
    else setItForm(emptyIT);
    setModalOpen(true);
  };

  const openEdit = (item: any) => {
    setEditingId(item.id);
    if (activeTab === 'investigations') {
      setInvForm({
        reference_number: item.reference_number || '', title: item.title || '',
        case_status: item.case_status || 'OPEN', priority: item.priority || 'MEDIUM',
        classification: item.classification || 'CONFIDENTIAL', description: item.description || '',
        lead_investigator: item.lead_investigator || '',
        opened_date: item.opened_date ? item.opened_date.slice(0, 10) : '',
      });
    } else if (activeTab === 'foreign_agents') {
      setFaForm({
        name: item.name || '', nationality: item.nationality || '',
        agency: item.agency || '', threat_level: item.threat_level || 'MEDIUM',
        status: item.status || 'ACTIVE', last_known_location: item.last_known_location || '',
        description: item.description || '',
      });
    } else {
      setItForm({
        subject_name: item.subject_name || '', department: item.department || '',
        threat_type: item.threat_type || '', risk_level: item.risk_level || 'MEDIUM',
        status: item.status || 'ACTIVE', indicators: item.indicators || '',
        reported_date: item.reported_date ? item.reported_date.slice(0, 10) : '',
        classification: item.classification || 'CONFIDENTIAL',
      });
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    let ok: boolean;
    if (activeTab === 'investigations') {
      if (!invForm.title.trim()) { setSaving(false); return; }
      ok = editingId ? await updateInvestigation(editingId, invForm) : await createInvestigation(invForm);
    } else if (activeTab === 'foreign_agents') {
      if (!faForm.name.trim()) { setSaving(false); return; }
      ok = editingId ? await updateForeignAgent(editingId, faForm) : await createForeignAgent(faForm);
    } else {
      if (!itForm.subject_name.trim()) { setSaving(false); return; }
      ok = editingId ? await updateInsiderThreat(editingId, itForm) : await createInsiderThreat(itForm);
    }
    setSaving(false);
    if (ok) setModalOpen(false);
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      let result;
      let label: string;
      if (activeTab === 'investigations') {
        result = await ciApi.listInvestigations({ limit: 1000 });
        label = 'investigations';
      } else if (activeTab === 'foreign_agents') {
        result = await ciApi.listForeignAgents({ limit: 1000 });
        label = 'foreign-agents';
      } else {
        result = await ciApi.listInsiderThreats({ limit: 1000 });
        label = 'insider-threats';
      }
      const { data } = result;
      const allItems = data.data || data.items || [];
      exportToCSV(allItems, `ci-${label}-export`);
      toast.success(`Exported ${allItems.length} ${label.replace(/_/g, ' ')} as CSV`);
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
      if (activeTab === 'investigations') {
        result = await ciApi.listInvestigations({ limit: 1000 });
        label = 'investigations';
      } else if (activeTab === 'foreign_agents') {
        result = await ciApi.listForeignAgents({ limit: 1000 });
        label = 'foreign-agents';
      } else {
        result = await ciApi.listInsiderThreats({ limit: 1000 });
        label = 'insider-threats';
      }
      const { data } = result;
      const allItems = data.data || data.items || [];
      exportToJSON(allItems, `ci-${label}-export`);
      toast.success(`Exported ${allItems.length} ${label.replace(/_/g, ' ')} as JSON`);
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
    if (activeTab === 'investigations') await deleteInvestigation(deleteTargetId);
    else if (activeTab === 'foreign_agents') await deleteForeignAgent(deleteTargetId);
    else await deleteInsiderThreat(deleteTargetId);
    setDeleting(false);
    setConfirmOpen(false);
    setDeleteTargetId(null);
  };

  const investigationColumns = [
    { key: 'reference_number', label: 'Ref #' },
    { key: 'title', label: 'Title', sortable: true },
    { key: 'case_status', label: 'Status', render: (it: any) => <StatusBadge label={it.case_status} color={getStatusColor(it.case_status)} /> },
    { key: 'priority', label: 'Priority', render: (it: any) => <PriorityBadge level={it.priority} /> },
    { key: 'classification', label: 'Classification', render: (it: any) => <ClassificationBadge level={it.classification} /> },
    { key: 'lead_investigator', label: 'Lead' },
    { key: 'actions', label: '', className: 'w-20', render: (it: any) => (
      <div className="flex items-center gap-1">
        <button onClick={(e) => { e.stopPropagation(); openEdit(it); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary"><Edit size={15} /></button>
        <button onClick={(e) => { e.stopPropagation(); openDeleteConfirm(it.id); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-accent-danger"><Trash2 size={15} /></button>
      </div>
    )},
  ];

  const foreignAgentColumns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'nationality', label: 'Nationality' },
    { key: 'agency', label: 'Agency' },
    { key: 'threat_level', label: 'Threat Level', render: (it: any) => <StatusBadge label={it.threat_level} color={getThreatColor(it.threat_level)} /> },
    { key: 'status', label: 'Status', render: (it: any) => <StatusBadge label={it.status} color={getStatusColor(it.status)} /> },
    { key: 'actions', label: '', className: 'w-20', render: (it: any) => (
      <div className="flex items-center gap-1">
        <button onClick={(e) => { e.stopPropagation(); openEdit(it); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary"><Edit size={15} /></button>
        <button onClick={(e) => { e.stopPropagation(); openDeleteConfirm(it.id); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-accent-danger"><Trash2 size={15} /></button>
      </div>
    )},
  ];

  const insiderThreatColumns = [
    { key: 'subject_name', label: 'Subject', sortable: true },
    { key: 'department', label: 'Department' },
    { key: 'threat_type', label: 'Type' },
    { key: 'risk_level', label: 'Risk', render: (it: any) => <StatusBadge label={it.risk_level} color={getThreatColor(it.risk_level)} /> },
    { key: 'status', label: 'Status', render: (it: any) => <StatusBadge label={it.status} color={getStatusColor(it.status)} /> },
    { key: 'classification', label: 'Class', render: (it: any) => <ClassificationBadge level={it.classification} /> },
    { key: 'actions', label: '', className: 'w-20', render: (it: any) => (
      <div className="flex items-center gap-1">
        <button onClick={(e) => { e.stopPropagation(); openEdit(it); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary"><Edit size={15} /></button>
        <button onClick={(e) => { e.stopPropagation(); openDeleteConfirm(it.id); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-accent-danger"><Trash2 size={15} /></button>
      </div>
    )},
  ];

  const tabData = activeTab === 'investigations' ? investigations : activeTab === 'foreign_agents' ? foreignAgents : insiderThreats;
  const tabLoading = activeTab === 'investigations' ? investigationsLoading : activeTab === 'foreign_agents' ? foreignAgentsLoading : insiderThreatsLoading;
  const tabError = activeTab === 'investigations' ? investigationsError : activeTab === 'foreign_agents' ? foreignAgentsError : insiderThreatsError;
  const tabColumns = activeTab === 'investigations' ? investigationColumns : activeTab === 'foreign_agents' ? foreignAgentColumns : insiderThreatColumns;
  const tabSearch = activeTab === 'investigations' ? investigationSearch : activeTab === 'foreign_agents' ? foreignAgentSearch : insiderThreatSearch;
  const setTabSearch = activeTab === 'investigations' ? setInvestigationSearch : activeTab === 'foreign_agents' ? setForeignAgentSearch : setInsiderThreatSearch;
  const createLabel = activeTab === 'investigations' ? 'New Investigation' : activeTab === 'foreign_agents' ? 'New Foreign Agent' : 'New Insider Threat';

  const modalTitle = editingId
    ? `Edit ${activeTab === 'investigations' ? 'Investigation' : activeTab === 'foreign_agents' ? 'Foreign Agent' : 'Insider Threat'}`
    : `Create ${activeTab === 'investigations' ? 'Investigation' : activeTab === 'foreign_agents' ? 'Foreign Agent' : 'Insider Threat'}`;

  return (
    <div>
      <PageHeader title="CI" subtitle="Counterintelligence" onCreate={openCreate} createLabel={createLabel}>
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
              {tab.key === 'investigations' && ` (${investigationsPagination.total})`}
              {tab.key === 'foreign_agents' && ` (${foreignAgentsPagination.total})`}
              {tab.key === 'insider_threats' && ` (${insiderThreatsPagination.total})`}
            </button>
          ))}
        </div>
        <SearchBar value={tabSearch} onChange={setTabSearch} placeholder={`Search ${activeTab.replace(/_/g, ' ')}...`} className="max-w-xs" />
      </div>

      {tabError && <div className="card border-red-500/30 bg-red-500/10 text-red-400 text-sm p-4 mb-4">{tabError}</div>}

      <DataTable columns={tabColumns} data={tabData} isLoading={tabLoading} pagination={tabPagination} onPageChange={handleTabPageChange} emptyMessage={`No ${activeTab.replace(/_/g, ' ')} found`} />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle} size="lg">
        {activeTab === 'investigations' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Reference Number" value={invForm.reference_number} onChange={(e) => setInvForm({ ...invForm, reference_number: e.target.value })} />
              <FormInput label="Title"  value={invForm.title} onChange={(e) => setInvForm({ ...invForm, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <FormSelect label="Status" options={CASE_STATUSES} value={invForm.case_status} onChange={(e) => setInvForm({ ...invForm, case_status: e.target.value })} />
              <FormSelect label="Priority" options={PRIORITIES} value={invForm.priority} onChange={(e) => setInvForm({ ...invForm, priority: e.target.value })} />
              <FormSelect label="Classification" options={CLASSIFICATIONS} value={invForm.classification} onChange={(e) => setInvForm({ ...invForm, classification: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Lead Investigator" value={invForm.lead_investigator} onChange={(e) => setInvForm({ ...invForm, lead_investigator: e.target.value })} />
              <FormInput label="Opened Date" type="date" value={invForm.opened_date} onChange={(e) => setInvForm({ ...invForm, opened_date: e.target.value })} />
            </div>
            <FormTextarea label="Description" value={invForm.description} onChange={(e) => setInvForm({ ...invForm, description: e.target.value })} />
          </div>
        ) : activeTab === 'foreign_agents' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Name"  value={faForm.name} onChange={(e) => setFaForm({ ...faForm, name: e.target.value })} />
              <FormInput label="Nationality" value={faForm.nationality} onChange={(e) => setFaForm({ ...faForm, nationality: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Agency" value={faForm.agency} onChange={(e) => setFaForm({ ...faForm, agency: e.target.value })} />
              <FormSelect label="Threat Level" options={THREAT_LEVELS} value={faForm.threat_level} onChange={(e) => setFaForm({ ...faForm, threat_level: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormSelect label="Status" options={[{ value: 'ACTIVE', label: 'ACTIVE' }, { value: 'INACTIVE', label: 'INACTIVE' }, { value: 'DETAINED', label: 'DETAINED' }]} value={faForm.status} onChange={(e) => setFaForm({ ...faForm, status: e.target.value })} />
              <FormInput label="Last Known Location" value={faForm.last_known_location} onChange={(e) => setFaForm({ ...faForm, last_known_location: e.target.value })} />
            </div>
            <FormTextarea label="Description" value={faForm.description} onChange={(e) => setFaForm({ ...faForm, description: e.target.value })} />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Subject Name"  value={itForm.subject_name} onChange={(e) => setItForm({ ...itForm, subject_name: e.target.value })} />
              <FormInput label="Department" value={itForm.department} onChange={(e) => setItForm({ ...itForm, department: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Threat Type" value={itForm.threat_type} onChange={(e) => setItForm({ ...itForm, threat_type: e.target.value })} />
              <FormSelect label="Risk Level" options={THREAT_LEVELS} value={itForm.risk_level} onChange={(e) => setItForm({ ...itForm, risk_level: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <FormSelect label="Status" options={[{ value: 'ACTIVE', label: 'ACTIVE' }, { value: 'MONITORING', label: 'MONITORING' }, { value: 'RESOLVED', label: 'RESOLVED' }]} value={itForm.status} onChange={(e) => setItForm({ ...itForm, status: e.target.value })} />
              <FormSelect label="Classification" options={CLASSIFICATIONS} value={itForm.classification} onChange={(e) => setItForm({ ...itForm, classification: e.target.value })} />
              <FormInput label="Reported Date" type="date" value={itForm.reported_date} onChange={(e) => setItForm({ ...itForm, reported_date: e.target.value })} />
            </div>
            <FormTextarea label="Indicators" value={itForm.indicators} onChange={(e) => setItForm({ ...itForm, indicators: e.target.value })} />
          </div>
        )}
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || (activeTab === 'investigations' ? !invForm.title.trim() : activeTab === 'foreign_agents' ? !faForm.name.trim() : !itForm.subject_name.trim())}
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
