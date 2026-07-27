import React, { useEffect, useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { Pencil, Trash2, Plus, Clock, FileText, AlertCircle, AlertTriangle, RefreshCw, Download, ChevronDown } from 'lucide-react';
import { exportToCSV, exportToJSON } from '../../../utils/export';
import { watchCenterApi } from '../api';
import PageHeader from '../../../components/common/PageHeader';
import DataTable from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { FormInput, FormTextarea, FormSelect } from '../../../components/common/FormComponents';
import { StatusBadge, ClassificationBadge } from '../../../components/common/Badges';
import { useWatchCenterStore, ShiftSchedule, WatchLog, SITREP } from '../store';

type Tab = 'shifts' | 'logs' | 'sitreps';

const SEVERITY_OPTIONS = [
  { value: 'INFO', label: 'Info' },
  { value: 'WARNING', label: 'Warning' },
  { value: 'CRITICAL', label: 'Critical' },
];

const LOG_TYPE_OPTIONS = [
  { value: 'ENTRY', label: 'Entry' },
  { value: 'EVENT', label: 'Event' },
  { value: 'INCIDENT', label: 'Incident' },
  { value: 'HANDOVER', label: 'Handover' },
];

const CLASSIFICATION_OPTIONS = [
  { value: 'UNCLASSIFIED', label: 'UNCLASSIFIED' },
  { value: 'CONFIDENTIAL', label: 'CONFIDENTIAL' },
  { value: 'SECRET', label: 'SECRET' },
  { value: 'TOP_SECRET', label: 'TOP SECRET' },
];

const SITREP_STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'DISSEMINATED', label: 'Disseminated' },
];

const emptyShift: Partial<ShiftSchedule> = {
  shift_name: '',
  start_time: '',
  end_time: '',
  assigned_users: [],
  supervisor_id: '',
  notes: '',
};

const emptyLog: Partial<WatchLog> = {
  shift_id: '',
  log_entry: '',
  log_type: 'ENTRY',
  severity: 'INFO',
  logged_by: '',
  logged_at: '',
  actions_taken: '',
};

const emptySITREP: Partial<SITREP> = {
  reference_number: '',
  period_start: '',
  period_end: '',
  classification: 'UNCLASSIFIED',
  content: {},
  status: 'DRAFT',
  created_by: '',
  approved_by: '',
};

export default function WatchCenter() {
  const {
    shifts, logs, sitreps,
    shiftsPagination, logsPagination, sitrepsPagination, isLoading,
    fetchShifts, fetchLogs, fetchSITREPs,
    createShift, updateShift, deleteShift,
    createLog, updateLog, deleteLog,
    createSITREP, updateSITREP, deleteSITREP,
  } = useWatchCenterStore();

  const [tab, setTab] = useState<Tab>('shifts');

  const toggleTab = (t: Tab) => {
    setTab(t);
    if (t === 'shifts') fetchShifts({ page: shiftPage, limit: 20 });
    if (t === 'logs') fetchLogs({ page: logPage, limit: 20 });
    if (t === 'sitreps') fetchSITREPs({ page: sitrepPage, limit: 20 });
  };

  const [shiftPage, setShiftPage] = useState(1);
  const [logPage, setLogPage] = useState(1);
  const [sitrepPage, setSitrepPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [shiftForm, setShiftForm] = useState<Partial<ShiftSchedule>>(emptyShift);
  const [logForm, setLogForm] = useState<Partial<WatchLog>>(emptyLog);
  const [sitrepForm, setSitrepForm] = useState<Partial<SITREP>>(emptySITREP);
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

  const highAlerts = logs.filter((l: WatchLog) => l.severity === 'CRITICAL' || l.severity === 'WARNING');
  const activeSITREPs = sitreps.filter((s: SITREP) => s.status === 'SUBMITTED' || s.status === 'DRAFT');
  const pendingLogs = logs.filter((l: WatchLog) => l.log_type === 'INCIDENT');
  const alertCount = highAlerts.length;

  const todayStr = new Date().toISOString().slice(0, 10);
  const todaySITREPs = sitreps.filter((s: SITREP) => {
    const d = s.created_at || s.period_start;
    return d ? d.slice(0, 10) === todayStr : false;
  });
  const unacknowledgedLogs = logs.filter((l: WatchLog) => l.severity === 'CRITICAL');

  const refreshAll = useCallback(() => {
    fetchShifts({ page: shiftPage, limit: 20 });
    fetchLogs({ page: logPage, limit: 20 });
    fetchSITREPs({ page: sitrepPage, limit: 20 });
  }, [fetchShifts, fetchLogs, fetchSITREPs, shiftPage, logPage, sitrepPage]);

  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, 60000);
    return () => clearInterval(interval);
  }, [refreshAll]);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      let result;
      let label: string;
      if (tab === 'shifts') {
        result = await watchCenterApi.listShifts({ limit: 1000 });
        label = 'shifts';
      } else if (tab === 'logs') {
        result = await watchCenterApi.listLogs({ limit: 1000 });
        label = 'logs';
      } else {
        result = await watchCenterApi.listSITREPs({ limit: 1000 });
        label = 'sitreps';
      }
      const { data } = result;
      const allItems = data.data || data.items || [];
      exportToCSV(allItems, `watch-center-${label}-export`);
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
      if (tab === 'shifts') {
        result = await watchCenterApi.listShifts({ limit: 1000 });
        label = 'shifts';
      } else if (tab === 'logs') {
        result = await watchCenterApi.listLogs({ limit: 1000 });
        label = 'logs';
      } else {
        result = await watchCenterApi.listSITREPs({ limit: 1000 });
        label = 'sitreps';
      }
      const { data } = result;
      const allItems = data.data || data.items || [];
      exportToJSON(allItems, `watch-center-${label}-export`);
      toast.success(`Exported ${allItems.length} ${label} as JSON`);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
      setExportOpen(false);
    }
  };

  const handleCreate = () => {
    setEditingId(null);
    if (tab === 'shifts') setShiftForm(emptyShift);
    else if (tab === 'logs') setLogForm(emptyLog);
    else setSitrepForm(emptySITREP);
    setModalOpen(true);
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    if (tab === 'shifts') {
      setShiftForm({
        shift_name: item.shift_name || '',
        start_time: item.start_time || '',
        end_time: item.end_time || '',
        assigned_users: item.assigned_users || [],
        supervisor_id: item.supervisor_id || '',
        notes: item.notes || '',
      });
    } else if (tab === 'logs') {
      setLogForm({
        shift_id: item.shift_id || '',
        log_entry: item.log_entry || '',
        log_type: item.log_type || 'ENTRY',
        severity: item.severity || 'INFO',
        logged_by: item.logged_by || '',
        logged_at: item.logged_at || '',
        actions_taken: item.actions_taken || '',
      });
    } else {
      setSitrepForm({
        reference_number: item.reference_number || '',
        period_start: item.period_start || '',
        period_end: item.period_end || '',
        classification: item.classification || 'UNCLASSIFIED',
        content: item.content || {},
        status: item.status || 'DRAFT',
        created_by: item.created_by || '',
        approved_by: item.approved_by || '',
      });
    }
    setModalOpen(true);
  };

  const handleQuickCreate = (type: Tab) => {
    setTab(type);
    setTimeout(() => {
      setEditingId(null);
      if (type === 'shifts') setShiftForm(emptyShift);
      else if (type === 'logs') setLogForm({ ...emptyLog, log_type: 'INCIDENT' });
      else setSitrepForm(emptySITREP);
      setModalOpen(true);
    }, 0);
  };

  const handleAcknowledgeAlerts = () => {
    toast.success(`${alertCount} alert(s) acknowledged`);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = tab === 'shifts' ? {
        ...shiftForm,
        assigned_users: typeof shiftForm.assigned_users === 'string'
          ? (shiftForm.assigned_users as string).split(',').map((s) => s.trim()).filter(Boolean)
          : shiftForm.assigned_users,
      } : tab === 'logs' ? logForm : {
        ...sitrepForm,
        content: typeof sitrepForm.content === 'string'
          ? JSON.parse(sitrepForm.content as string)
          : sitrepForm.content,
      };

      if (tab === 'shifts') {
        if (editingId) { await updateShift(editingId, payload); toast.success('Shift updated'); }
        else { await createShift(payload); toast.success('Shift created'); }
      } else if (tab === 'logs') {
        if (editingId) { await updateLog(editingId, payload); toast.success('Log updated'); }
        else { await createLog(payload); toast.success('Log created'); }
      } else {
        if (editingId) { await updateSITREP(editingId, payload); toast.success('SITREP updated'); }
        else { await createSITREP(payload); toast.success('SITREP created'); }
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
      if (tab === 'shifts') await deleteShift(deleteTarget.id);
      else if (tab === 'logs') await deleteLog(deleteTarget.id);
      else await deleteSITREP(deleteTarget.id);
      toast.success('Deleted');
      setDeleteTarget(null);
    } catch {
      toast.error('Delete failed');
    }
  };

  const shiftColumns = [
    { key: 'shift_name', label: 'Shift Name' },
    { key: 'start_time', label: 'Start Time' },
    { key: 'end_time', label: 'End Time' },
    { key: 'supervisor_id', label: 'Supervisor' },
    {
      key: 'actions', label: 'Actions',
      render: (item: ShiftSchedule) => (
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); handleEdit(item); }} className="btn-ghost p-1.5"><Pencil size={14} /></button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(item); }} className="btn-ghost p-1.5 text-accent-danger"><Trash2 size={14} /></button>
        </div>
      ),
    },
  ];

  const logColumns = [
    { key: 'logged_at', label: 'Timestamp' },
    { key: 'log_type', label: 'Type' },
    {
      key: 'severity', label: 'Severity',
      render: (item: WatchLog) => {
        const colors: Record<string, string> = { INFO: 'blue', WARNING: 'yellow', CRITICAL: 'red' };
        return <StatusBadge label={item.severity} color={colors[item.severity] || 'gray'} />;
      },
    },
    { key: 'log_entry', label: 'Entry', className: 'max-w-xs truncate' },
    { key: 'logged_by', label: 'Logged By' },
    {
      key: 'actions', label: 'Actions',
      render: (item: WatchLog) => (
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); handleEdit(item); }} className="btn-ghost p-1.5"><Pencil size={14} /></button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(item); }} className="btn-ghost p-1.5 text-accent-danger"><Trash2 size={14} /></button>
        </div>
      ),
    },
  ];

  const sitrepColumns = [
    { key: 'reference_number', label: 'Reference #' },
    { key: 'period_start', label: 'Period Start' },
    { key: 'period_end', label: 'Period End' },
    {
      key: 'classification', label: 'Classification',
      render: (item: SITREP) => <ClassificationBadge level={item.classification} />,
    },
    {
      key: 'status', label: 'Status',
      render: (item: SITREP) => {
        const colors: Record<string, string> = { DRAFT: 'gray', SUBMITTED: 'blue', APPROVED: 'green', DISSEMINATED: 'purple' };
        return <StatusBadge label={item.status} color={colors[item.status] || 'gray'} />;
      },
    },
    { key: 'created_by', label: 'Created By' },
    {
      key: 'actions', label: 'Actions',
      render: (item: SITREP) => (
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); handleEdit(item); }} className="btn-ghost p-1.5"><Pencil size={14} /></button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(item); }} className="btn-ghost p-1.5 text-accent-danger"><Trash2 size={14} /></button>
        </div>
      ),
    },
  ];

  const currentData = tab === 'shifts' ? shifts : tab === 'logs' ? logs : sitreps;
  const currentColumns = tab === 'shifts' ? shiftColumns : tab === 'logs' ? logColumns : sitrepColumns;
  const currentPagination = tab === 'shifts' ? shiftsPagination : tab === 'logs' ? logsPagination : sitrepsPagination;
  const currentPageSetter = tab === 'shifts' ? setShiftPage : tab === 'logs' ? setLogPage : setSitrepPage;
  const currentCreateLabel = tab === 'shifts' ? 'Add Shift' : tab === 'logs' ? 'Add Log Entry' : 'Add SITREP';
  const deleteLabel = tab === 'shifts' ? (deleteTarget as ShiftSchedule)?.shift_name
    : tab === 'logs' ? `${(deleteTarget as WatchLog)?.log_entry?.slice(0, 40)}`
    : (deleteTarget as SITREP)?.reference_number;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Watch Center" subtitle="Manage shift schedules, watch logs, and situational reports">
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
        <button onClick={refreshAll} className="btn-ghost flex items-center gap-1" title="Refresh data">
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {highAlerts.length > 0 && (
        <div className={`p-4 rounded-xl border flex items-center justify-between ${alertCount > 2 ? 'bg-red-500/10 border-red-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
          <div className="flex items-center gap-3">
            {highAlerts.some(a => a.severity === 'CRITICAL') ? (
              <AlertTriangle size={20} className="text-red-400" />
            ) : (
              <AlertTriangle size={20} className="text-amber-400" />
            )}
            <div className="flex flex-col">
              <span className="font-semibold text-sm text-text-primary">
                {unacknowledgedLogs.length} critical, {highAlerts.filter(a => a.severity === 'WARNING').length} warning alert{alertCount !== 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                {unacknowledgedLogs.length > 0 && <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 font-semibold">HIGH</span>}
                {highAlerts.filter(a => a.severity === 'WARNING').length > 0 && <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold">MEDIUM</span>}
                {logs.filter(l => l.severity === 'INFO').length > 0 && <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 font-semibold">ROUTINE</span>}
              </div>
            </div>
          </div>
          <button onClick={handleAcknowledgeAlerts} className="btn-secondary text-xs">Acknowledge All</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card border-l-4 border-l-red-500">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle size={20} className="text-red-400" />
            <span className="text-sm font-semibold text-text-primary">Active Alerts</span>
          </div>
          <span className="text-3xl font-bold text-red-400">{alertCount}</span>
          <span className="text-xs text-text-muted ml-2">{alertCount === 0 ? 'all clear' : 'needs attention'}</span>
        </div>
        <div className="card border-l-4 border-l-red-500">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle size={20} className="text-red-400" />
            <span className="text-sm font-semibold text-text-primary">Unacknowledged</span>
          </div>
          <span className="text-3xl font-bold text-red-400">{unacknowledgedLogs.length}</span>
          <span className="text-xs text-text-muted ml-2">critical logs</span>
        </div>
        <div className="card border-l-4 border-l-blue-500">
          <div className="flex items-center gap-3 mb-2">
            <FileText size={20} className="text-blue-400" />
            <span className="text-sm font-semibold text-text-primary">Today's SITREPs</span>
          </div>
          <span className="text-3xl font-bold text-blue-400">{todaySITREPs.length}</span>
          <span className="text-xs text-text-muted ml-2">reports today</span>
        </div>
        <div className="card border-l-4 border-l-amber-500">
          <div className="flex items-center gap-3 mb-2">
            <Clock size={20} className="text-amber-400" />
            <span className="text-sm font-semibold text-text-primary">Pending Logs</span>
          </div>
          <span className="text-3xl font-bold text-amber-400">{pendingLogs.length}</span>
          <span className="text-xs text-text-muted ml-2">awaiting review</span>
        </div>
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => handleQuickCreate('sitreps')} className="btn-secondary flex items-center gap-2">
            <AlertCircle size={14} /> New SITREP
          </button>
          <button onClick={() => handleQuickCreate('logs')} className="btn-secondary flex items-center gap-2">
            <FileText size={14} /> Log Incident
          </button>
          <button onClick={handleAcknowledgeAlerts} className="btn-secondary flex items-center gap-2">
            <AlertTriangle size={14} /> Acknowledge Alerts
          </button>
          <button onClick={() => { setTab('shifts'); handleCreate(); }} className="btn-secondary flex items-center gap-2">
            <Clock size={14} /> Schedule Shift
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 bg-bg-card border border-border rounded-xl p-1 w-fit">
        {([
          ['shifts', 'Shifts', Clock],
          ['logs', 'Logs', FileText],
          ['sitreps', 'SITREPs', AlertCircle],
        ] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => toggleTab(key as Tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === key ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      <div className="flex justify-end">
        <button onClick={handleCreate} className="btn-primary">
          <Plus size={16} /> {currentCreateLabel}
        </button>
      </div>

      <DataTable
        columns={currentColumns}
        data={currentData}
        pagination={currentPagination}
        isLoading={isLoading}
        emptyMessage={`No ${tab} found`}
        onPageChange={currentPageSetter}
        onRowClick={(item) => handleEdit(item)}
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? `Edit ${tab.slice(0, -1)}` : `Create ${tab.slice(0, -1)}`} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          {tab === 'shifts' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput label="Shift Name" value={shiftForm.shift_name || ''} onChange={(e) => setShiftForm((f: any) => ({ ...f, shift_name: e.target.value }))} required />
                <FormInput label="Supervisor ID" value={shiftForm.supervisor_id || ''} onChange={(e) => setShiftForm((f: any) => ({ ...f, supervisor_id: e.target.value }))} />
                <FormInput label="Start Time" type="datetime-local" value={shiftForm.start_time || ''} onChange={(e) => setShiftForm((f: any) => ({ ...f, start_time: e.target.value }))} />
                <FormInput label="End Time" type="datetime-local" value={shiftForm.end_time || ''} onChange={(e) => setShiftForm((f: any) => ({ ...f, end_time: e.target.value }))} />
              </div>
              <FormInput
                label="Assigned Users (comma-separated IDs)"
                value={Array.isArray(shiftForm.assigned_users) ? (shiftForm.assigned_users as string[]).join(', ') : (shiftForm.assigned_users || '')}
                onChange={(e) => setShiftForm((f: any) => ({ ...f, assigned_users: e.target.value }))}
              />
              <FormTextarea label="Notes" value={shiftForm.notes || ''} onChange={(e) => setShiftForm((f: any) => ({ ...f, notes: e.target.value }))} />
            </>
          )}
          {tab === 'logs' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput label="Shift ID" value={logForm.shift_id || ''} onChange={(e) => setLogForm((f: any) => ({ ...f, shift_id: e.target.value }))} />
                <FormSelect label="Log Type" value={logForm.log_type || 'ENTRY'} options={LOG_TYPE_OPTIONS} onChange={(e) => setLogForm((f: any) => ({ ...f, log_type: e.target.value }))} />
                <FormSelect label="Severity" value={logForm.severity || 'INFO'} options={SEVERITY_OPTIONS} onChange={(e) => setLogForm((f: any) => ({ ...f, severity: e.target.value }))} />
                <FormInput label="Logged By" value={logForm.logged_by || ''} onChange={(e) => setLogForm((f: any) => ({ ...f, logged_by: e.target.value }))} />
                <FormInput label="Logged At" type="datetime-local" value={logForm.logged_at || ''} onChange={(e) => setLogForm((f: any) => ({ ...f, logged_at: e.target.value }))} />
              </div>
              <FormTextarea label="Log Entry" value={logForm.log_entry || ''} onChange={(e) => setLogForm((f: any) => ({ ...f, log_entry: e.target.value }))} required />
              <FormTextarea label="Actions Taken" value={logForm.actions_taken || ''} onChange={(e) => setLogForm((f: any) => ({ ...f, actions_taken: e.target.value }))} />
            </>
          )}
          {tab === 'sitreps' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput label="Reference Number (auto-generated)" value={sitrepForm.reference_number || ''} onChange={(e) => setSitrepForm((f: any) => ({ ...f, reference_number: e.target.value }))} placeholder="Auto-generated" />
                <FormSelect label="Classification" value={sitrepForm.classification || 'UNCLASSIFIED'} options={CLASSIFICATION_OPTIONS} onChange={(e) => setSitrepForm((f: any) => ({ ...f, classification: e.target.value }))} />
                <FormSelect label="Status" value={sitrepForm.status || 'DRAFT'} options={SITREP_STATUS_OPTIONS} onChange={(e) => setSitrepForm((f: any) => ({ ...f, status: e.target.value }))} />
                <FormInput label="Created By" value={sitrepForm.created_by || ''} onChange={(e) => setSitrepForm((f: any) => ({ ...f, created_by: e.target.value }))} />
                <FormInput label="Period Start" type="datetime-local" value={sitrepForm.period_start || ''} onChange={(e) => setSitrepForm((f: any) => ({ ...f, period_start: e.target.value }))} />
                <FormInput label="Period End" type="datetime-local" value={sitrepForm.period_end || ''} onChange={(e) => setSitrepForm((f: any) => ({ ...f, period_end: e.target.value }))} />
                <FormInput label="Approved By" value={sitrepForm.approved_by || ''} onChange={(e) => setSitrepForm((f: any) => ({ ...f, approved_by: e.target.value }))} />
              </div>
              <FormTextarea
                label="Content (JSON)"
                value={typeof sitrepForm.content === 'string' ? sitrepForm.content : JSON.stringify(sitrepForm.content || {}, null, 2)}
                onChange={(e) => setSitrepForm((f: any) => ({ ...f, content: e.target.value }))}
                rows={8}
              />
            </>
          )}
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
        title={`Delete ${tab.slice(0, -1)}`}
        message={`Are you sure you want to delete ${deleteLabel}? This action cannot be undone.`}
        variant="danger"
      />
    </div>
  );
}
