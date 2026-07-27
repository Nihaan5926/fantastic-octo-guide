import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, FileText, ClipboardCheck, CheckCircle, Clock, Circle, AlertTriangle, Edit, Trash2, Download, File, Paperclip } from 'lucide-react';
import FileUpload from '../../../components/common/FileUpload';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { missionPlansApi } from '../api';
import Modal from '../../../components/common/Modal';
import { FormInput, FormTextarea, FormSelect } from '../../../components/common/FormComponents';
import { StatusBadge, ClassificationBadge, PriorityBadge } from '../../../components/common/Badges';
import { CardSkeleton } from '../../../components/common/LoadingSkeleton';
import { useMissionStore } from '../store';

const statusOptions = [
  { value: 'PLANNING', label: 'Planning' }, { value: 'ACTIVE', label: 'Active' },
  { value: 'IN_PROGRESS', label: 'In Progress' }, { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];
const classificationOptions = [
  { value: 'UNCLASSIFIED', label: 'Unclassified' }, { value: 'CONFIDENTIAL', label: 'Confidential' },
  { value: 'SECRET', label: 'Secret' }, { value: 'TOP_SECRET', label: 'Top Secret' },
];
const priorityOptions = [
  { value: 'LOW', label: 'Low' }, { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' }, { value: 'CRITICAL', label: 'Critical' },
];

type TabKey = 'info' | 'briefs' | 'debriefs' | 'attachments';

const phases = [
  { key: 'PLANNING', label: 'Planning', step: 0 },
  { key: 'APPROVED', label: 'Approved', step: 1 },
  { key: 'IN_PROGRESS', label: 'In Progress', step: 2 },
  { key: 'COMPLETED', label: 'Completed', step: 3 },
];

function getPhaseStep(status: string): number {
  const found = phases.find((p) => p.key === status);
  return found ? found.step : -1;
}

function getRiskLevel(priority: string): { label: string; color: string; percent: number } {
  switch (priority) {
    case 'CRITICAL': return { label: 'Critical', color: '#ef4444', percent: 100 };
    case 'HIGH': return { label: 'High', color: '#f59e0b', percent: 75 };
    case 'MEDIUM': return { label: 'Medium', color: '#3b82f6', percent: 50 };
    case 'LOW': return { label: 'Low', color: '#22c55e', percent: 25 };
    default: return { label: 'None', color: '#64748b', percent: 0 };
  }
}

export default function MissionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedPlan, briefs, debriefs, isLoading, fetchPlan, updatePlan, fetchBriefs, createBrief, updateBrief, deleteBrief, fetchDebriefs, createDebrief, updateDebrief, deleteDebrief } = useMissionStore();
  const [activeTab, setActiveTab] = useState<TabKey>('info');
  const [editPlanOpen, setEditPlanOpen] = useState(false);
  const [editPlanForm, setEditPlanForm] = useState<any>({});
  const [briefModalOpen, setBriefModalOpen] = useState(false);
  const [briefForm, setBriefForm] = useState({ title: '', content: '{"sections":[]}' });
  const [debriefModalOpen, setDebriefModalOpen] = useState(false);
  const [debriefForm, setDebriefForm] = useState({ title: '', summary: '', findings: '{"strengths":[],"weaknesses":[]}' });
  const [editBriefModalOpen, setEditBriefModalOpen] = useState(false);
  const [editBriefForm, setEditBriefForm] = useState<any>({});
  const [editBriefId, setEditBriefId] = useState<string | null>(null);
  const [editDebriefModalOpen, setEditDebriefModalOpen] = useState(false);
  const [editDebriefForm, setEditDebriefForm] = useState<any>({});
  const [editDebriefId, setEditDebriefId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [attachModalOpen, setAttachModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteAttachId, setDeleteAttachId] = useState<string | null>(null);

  useEffect(() => {
    if (id) { fetchPlan(id); fetchBriefs(id); fetchDebriefs(id); }
  }, [id]);

  useEffect(() => {
    if (selectedPlan) setEditPlanForm({ ...selectedPlan });
  }, [selectedPlan]);

  const fetchAttachments = async () => {
    setAttachmentsLoading(true);
    try {
      const { data } = await missionPlansApi.listAttachments(id!);
      setAttachments(data.data || []);
    } catch { } finally {
      setAttachmentsLoading(false);
    }
  };

  const handleUploadAttachment = async () => {
    if (!id || !selectedFile) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', selectedFile);
      await missionPlansApi.uploadAttachment(id, fd);
      toast.success('Attachment uploaded');
      setAttachModalOpen(false);
      setSelectedFile(null);
      fetchAttachments();
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAttachment = async () => {
    if (!id || !deleteAttachId) return;
    try {
      await missionPlansApi.deleteAttachment(id, deleteAttachId);
      toast.success('Attachment removed');
      setDeleteAttachId(null);
      fetchAttachments();
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleDownloadAttachment = async (attachmentId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/missions/plans/${id}/attachments/${attachmentId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { toast.error('Download failed'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const disposition = res.headers.get('content-disposition');
      if (disposition) {
        const match = disposition.match(/filename="?(.+?)"?$/);
        if (match) a.download = match[1];
      }
      a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Download failed'); }
  };

  const handleUpdatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try { await updatePlan(id, editPlanForm); setEditPlanOpen(false); toast.success('Plan updated'); fetchPlan(id); } catch { toast.error('Failed'); }
  };

  const handleCreateBrief = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try { await createBrief(id, { ...briefForm, version: 1 }); setBriefModalOpen(false); setBriefForm({ title: '', content: '{"sections":[]}' }); toast.success('Brief added'); } catch { toast.error('Failed'); }
  };

  const handleCreateDebrief = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try { await createDebrief(id, debriefForm); setDebriefModalOpen(false); setDebriefForm({ title: '', summary: '', findings: '{"strengths":[],"weaknesses":[]}' }); toast.success('Debrief added'); } catch { toast.error('Failed'); }
  };

  const handleEditBrief = (brief: any) => {
    setEditBriefId(brief.id);
    setEditBriefForm({ ...brief });
    setEditBriefModalOpen(true);
  };

  const handleUpdateBrief = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !editBriefId) return;
    try { await updateBrief(id, editBriefId, editBriefForm); setEditBriefModalOpen(false); toast.success('Brief updated'); } catch { toast.error('Failed'); }
  };

  const handleDeleteBrief = async (briefId: string) => {
    if (!id) return;
    if (!window.confirm('Delete this brief?')) return;
    try { await deleteBrief(id, briefId); toast.success('Brief deleted'); } catch { toast.error('Failed'); }
  };

  const handleEditDebrief = (debrief: any) => {
    setEditDebriefId(debrief.id);
    setEditDebriefForm({ ...debrief });
    setEditDebriefModalOpen(true);
  };

  const handleUpdateDebrief = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !editDebriefId) return;
    try { await updateDebrief(id, editDebriefId, editDebriefForm); setEditDebriefModalOpen(false); toast.success('Debrief updated'); } catch { toast.error('Failed'); }
  };

  const handleDeleteDebrief = async (debriefId: string) => {
    if (!id) return;
    if (!window.confirm('Delete this debrief?')) return;
    try { await deleteDebrief(id, debriefId); toast.success('Debrief deleted'); } catch { toast.error('Failed'); }
  };

  const currentStep = getPhaseStep(selectedPlan?.status || '');
  const risk = getRiskLevel(selectedPlan?.priority || '');
  const conops = selectedPlan?.conops ? (typeof selectedPlan.conops === 'string' ? JSON.parse(selectedPlan.conops) : selectedPlan.conops) : null;
  const assets = Array.isArray(selectedPlan?.assets) ? selectedPlan.assets : [];
  const startDate = selectedPlan?.start_date ? selectedPlan.start_date.substring(0, 10) : '—';
  const endDate = selectedPlan?.end_date ? selectedPlan.end_date.substring(0, 10) : '—';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/missions')} className="btn-ghost"><ArrowLeft size={16} /> Back</button>
        <h1 className="text-2xl font-bold">
          {selectedPlan?.reference_number}: {selectedPlan?.title || 'Mission Detail'}
        </h1>
        <StatusBadge label={selectedPlan?.status || ''} color={selectedPlan?.status === 'IN_PROGRESS' ? 'blue' : selectedPlan?.status === 'COMPLETED' ? 'green' : selectedPlan?.status === 'CANCELLED' ? 'red' : 'yellow'} />
        <ClassificationBadge level={selectedPlan?.classification || ''} />
        <PriorityBadge level={selectedPlan?.priority || ''} />
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-4">Phase Timeline</h3>
        <div className="flex items-center justify-between relative">
          <div className="absolute top-4 left-0 right-0 h-0.5 bg-bg-tertiary" />
          <div className="absolute top-4 left-0 h-0.5 bg-accent transition-all duration-500" style={{ width: `${currentStep >= 0 ? (currentStep / (phases.length - 1)) * 100 : 0}%` }} />
          {phases.map((phase, idx) => {
            const isCompleted = idx < currentStep;
            const isCurrent = idx === currentStep;
            const isFuture = idx > currentStep;
            return (
              <div key={phase.key} className="relative flex flex-col items-center z-10">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                  isCompleted ? 'bg-accent border-accent text-white' : isCurrent ? 'bg-accent/20 border-accent text-accent' : 'bg-bg-card border-border text-text-muted'
                }`}>
                  {isCompleted ? <CheckCircle size={14} /> : isCurrent ? <Clock size={14} /> : <Circle size={14} />}
                </div>
                <span className={`text-xs mt-2 font-medium ${isFuture ? 'text-text-muted' : 'text-text-primary'}`}>{phase.label}</span>
                {isCurrent && selectedPlan?.start_date && (
                  <span className="text-xs text-text-muted mt-0.5">{startDate}</span>
                )}
                {isCompleted && selectedPlan?.start_date && phase.key === 'COMPLETED' && (
                  <span className="text-xs text-text-muted mt-0.5">{endDate}</span>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex justify-between text-xs text-text-muted">
          <span>Started: {startDate}</span>
          <span>Target End: {endDate}</span>
        </div>
      </div>

      <div className="flex gap-2 border-b border-border">
        {(['info','briefs','debriefs','attachments'] as TabKey[]).map((t) => (
          <button key={t} onClick={() => { setActiveTab(t); if (t === 'attachments' && attachments.length === 0) fetchAttachments(); }} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === t ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'}`}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>

      {activeTab === 'info' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Plan Details</h2>
              <button onClick={() => setEditPlanOpen(true)} className="btn-ghost text-accent"><Plus size={14} /> Edit</button>
            </div>
            {selectedPlan && (
              <div className="space-y-3 text-sm">
                <div><span className="text-text-muted">Objective:</span> <span className="text-text-primary">{selectedPlan.objective}</span></div>
                <div><span className="text-text-muted">Location:</span> <span className="text-text-primary">{selectedPlan.location}</span></div>
                <div><span className="text-text-muted">Dates:</span> <span className="text-text-primary">{startDate} to {endDate}</span></div>
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle size={18} className="text-accent-danger" />
              Risk Assessment
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-muted">Risk Level derived from Priority</span>
                <span className="font-semibold" style={{ color: risk.color }}>{risk.label}</span>
              </div>
              <div className="w-full bg-bg-tertiary rounded-full h-3">
                <div
                  className="rounded-full h-3 transition-all duration-700"
                  style={{ width: `${risk.percent}%`, backgroundColor: risk.color }}
                />
              </div>
              <div className="flex justify-between text-xs text-text-muted">
                <span>Low</span><span>Medium</span><span>High</span><span>Critical</span>
              </div>
            </div>
          </div>

          {conops && (
            <div className="card lg:col-span-2">
              <h2 className="text-lg font-semibold mb-4">CONOPS</h2>
              <div className="space-y-4">
                {conops.objective && (
                  <div className="p-3 bg-bg-primary rounded-lg border border-border">
                    <h4 className="text-sm font-semibold text-text-muted uppercase mb-1">Mission Objective</h4>
                    <p className="text-sm text-text-primary">{conops.objective}</p>
                  </div>
                )}
                {conops.concept && (
                  <div className="p-3 bg-bg-primary rounded-lg border border-border">
                    <h4 className="text-sm font-semibold text-text-muted uppercase mb-1">Concept of Operations</h4>
                    <p className="text-sm text-text-primary">{conops.concept}</p>
                  </div>
                )}
                {conops.execution && (
                  <div className="p-3 bg-bg-primary rounded-lg border border-border">
                    <h4 className="text-sm font-semibold text-text-muted uppercase mb-1">Execution Plan</h4>
                    <p className="text-sm text-text-primary whitespace-pre-wrap">{conops.execution}</p>
                  </div>
                )}
                {conops.sustainment && (
                  <div className="p-3 bg-bg-primary rounded-lg border border-border">
                    <h4 className="text-sm font-semibold text-text-muted uppercase mb-1">Sustainment</h4>
                    <p className="text-sm text-text-primary">{conops.sustainment}</p>
                  </div>
                )}
                {conops.COAs && Array.isArray(conops.COAs) && (
                  <div className="p-3 bg-bg-primary rounded-lg border border-border">
                    <h4 className="text-sm font-semibold text-text-muted uppercase mb-2">Courses of Action (COAs)</h4>
                    <div className="space-y-2">
                      {conops.COAs.map((coa: any, i: number) => (
                        <div key={i} className="p-2 bg-bg-card rounded border border-border text-sm">
                          <span className="font-medium">{coa.name || `COA ${i + 1}`}:</span>
                          <span className="text-text-secondary ml-1">{coa.description || coa.detail || ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {!conops.objective && !conops.concept && !conops.execution && typeof conops === 'object' && (
                  <pre className="text-xs text-text-secondary bg-bg-primary p-3 rounded-lg overflow-auto">{JSON.stringify(conops, null, 2)}</pre>
                )}
              </div>
            </div>
          )}

          {conops?.ROE && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Rules of Engagement (ROE)</h2>
              <div className="space-y-3">
                {conops.ROE.use_of_force && (
                  <div className="p-3 bg-bg-primary rounded-lg border border-border">
                    <h4 className="text-sm font-semibold text-text-muted uppercase mb-1">Use of Force</h4>
                    <p className="text-sm text-text-primary">{conops.ROE.use_of_force}</p>
                  </div>
                )}
                {conops.ROE.escalation && (
                  <div className="p-3 bg-bg-primary rounded-lg border border-border">
                    <h4 className="text-sm font-semibold text-text-muted uppercase mb-1">Escalation of Force</h4>
                    <p className="text-sm text-text-primary">{conops.ROE.escalation}</p>
                  </div>
                )}
                {conops.ROE.self_defense !== undefined && (
                  <div className="p-3 bg-bg-primary rounded-lg border border-border">
                    <h4 className="text-sm font-semibold text-text-muted uppercase mb-1">Self-Defense</h4>
                    <StatusBadge label={conops.ROE.self_defense ? 'Authorized' : 'Not Authorized'} color={conops.ROE.self_defense ? 'green' : 'red'} />
                  </div>
                )}
                {conops.ROE.restrictions && Array.isArray(conops.ROE.restrictions) && (
                  <div className="p-3 bg-bg-primary rounded-lg border border-border">
                    <h4 className="text-sm font-semibold text-text-muted uppercase mb-2">Restrictions</h4>
                    <ul className="list-disc list-inside text-sm text-text-secondary space-y-1">
                      {conops.ROE.restrictions.map((r: string, i: number) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                )}
                {conops.ROE.notes && (
                  <div className="p-3 bg-bg-primary rounded-lg border border-border">
                    <h4 className="text-sm font-semibold text-text-muted uppercase mb-1">Notes</h4>
                    <p className="text-sm text-text-secondary">{conops.ROE.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Asset Assignment</h2>
            {assets.length === 0 ? (
              <p className="text-text-muted text-sm text-center py-6">No assets assigned</p>
            ) : (
              <div className="space-y-2">
                {assets.map((asset: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-bg-primary rounded-lg border border-border">
                    <div className="w-2 h-2 rounded-full bg-accent" />
                    <div className="flex-1">
                      <span className="text-sm font-medium">{typeof asset === 'string' ? asset : asset.name || asset.type || `Asset ${i + 1}`}</span>
                      {typeof asset === 'object' && asset.quantity && <span className="text-xs text-text-muted ml-2">x{asset.quantity}</span>}
                    </div>
                    {typeof asset === 'object' && asset.status && (
                      <StatusBadge label={asset.status} color={asset.status === 'AVAILABLE' ? 'green' : asset.status === 'IN_USE' ? 'blue' : 'gray'} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'briefs' && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Mission Briefs</h2>
            <button onClick={() => setBriefModalOpen(true)} className="btn-primary"><Plus size={14} /> Add Brief</button>
          </div>
          {briefs.length === 0 ? (
            <p className="text-text-muted text-sm text-center py-8">No briefs yet</p>
          ) : (
            <div className="space-y-3">
              {briefs.map((b: any) => (
                <div key={b.id} className="p-4 bg-bg-primary rounded-lg border border-border">
                  <div className="flex justify-between">
                    <span className="font-medium">{b.title}</span>
                    <span className="text-xs text-text-muted">v{b.version} · {new Date(b.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => handleEditBrief(b)} className="btn-ghost text-xs"><Edit size={12} /> Edit</button>
                    <button onClick={() => handleDeleteBrief(b.id)} className="btn-ghost text-xs text-red-400"><Trash2 size={12} /> Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'debriefs' && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Mission Debriefs</h2>
            <button onClick={() => setDebriefModalOpen(true)} className="btn-primary"><Plus size={14} /> Add Debrief</button>
          </div>
          {debriefs.length === 0 ? (
            <p className="text-text-muted text-sm text-center py-8">No debriefs yet</p>
          ) : (
            <div className="space-y-3">
              {debriefs.map((d: any) => (
                <div key={d.id} className="p-4 bg-bg-primary rounded-lg border border-border">
                  <div className="flex justify-between">
                    <span className="font-medium">{d.title}</span>
                    <span className="text-xs text-text-muted">{new Date(d.created_at).toLocaleDateString()}</span>
                  </div>
                  {d.summary && <p className="text-sm text-text-secondary mt-1">{d.summary}</p>}
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => handleEditDebrief(d)} className="btn-ghost text-xs"><Edit size={12} /> Edit</button>
                    <button onClick={() => handleDeleteDebrief(d.id)} className="btn-ghost text-xs text-red-400"><Trash2 size={12} /> Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'attachments' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Paperclip size={18} /> Attachments
            </h2>
            <button onClick={() => { setSelectedFile(null); setAttachModalOpen(true); }} className="btn-primary text-sm">
              <Plus size={14} /> Add File
            </button>
          </div>
          {attachmentsLoading ? (
            <CardSkeleton />
          ) : attachments.length === 0 ? (
            <p className="text-text-muted text-sm text-center py-8">No attachments yet</p>
          ) : (
            <div className="space-y-2">
              {attachments.map((att: any) => (
                <div key={att.id} className="flex items-center justify-between p-3 bg-bg-primary rounded-lg border border-border">
                  <div className="flex items-center gap-3 min-w-0">
                    <File size={16} className="text-text-muted shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{att.original_name}</p>
                      <p className="text-xs text-text-muted">
                        {att.mime_type} {att.size ? `· ${att.size > 1048576 ? `${(att.size / 1048576).toFixed(1)} MB` : `${(att.size / 1024).toFixed(1)} KB`}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => handleDownloadAttachment(att.id)} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-accent" title="Download">
                      <Download size={14} />
                    </button>
                    <button onClick={() => setDeleteAttachId(att.id)} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-accent-danger" title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal isOpen={editPlanOpen} onClose={() => setEditPlanOpen(false)} title="Edit Mission Plan">
        <form onSubmit={handleUpdatePlan} className="space-y-4">
          <FormInput label="Title" value={editPlanForm.title || ''} onChange={(e) => setEditPlanForm({ ...editPlanForm, title: e.target.value })} required />
          <FormTextarea label="Objective" value={editPlanForm.objective || ''} onChange={(e) => setEditPlanForm({ ...editPlanForm, objective: e.target.value })} rows={3} />
          <div className="grid grid-cols-2 gap-3">
            <FormSelect label="Status" options={statusOptions} value={editPlanForm.status || ''} onChange={(e) => setEditPlanForm({ ...editPlanForm, status: e.target.value })} />
            <FormSelect label="Priority" options={priorityOptions} value={editPlanForm.priority || ''} onChange={(e) => setEditPlanForm({ ...editPlanForm, priority: e.target.value })} />
          </div>
          <FormSelect label="Classification" options={classificationOptions} value={editPlanForm.classification || ''} onChange={(e) => setEditPlanForm({ ...editPlanForm, classification: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Start Date" type="date" value={(editPlanForm.start_date || '').substring(0,10)} onChange={(e) => setEditPlanForm({ ...editPlanForm, start_date: e.target.value })} />
            <FormInput label="End Date" type="date" value={(editPlanForm.end_date || '').substring(0,10)} onChange={(e) => setEditPlanForm({ ...editPlanForm, end_date: e.target.value })} />
          </div>
          <FormInput label="Location" value={editPlanForm.location || ''} onChange={(e) => setEditPlanForm({ ...editPlanForm, location: e.target.value })} />
          <button type="submit" className="btn-primary">Save Changes</button>
        </form>
      </Modal>

      <Modal isOpen={briefModalOpen} onClose={() => setBriefModalOpen(false)} title="Add Mission Brief">
        <form onSubmit={handleCreateBrief} className="space-y-4">
          <FormInput label="Title" value={briefForm.title} onChange={(e) => setBriefForm({ ...briefForm, title: e.target.value })} required />
          <FormTextarea label="Content (JSON)" value={briefForm.content} onChange={(e) => setBriefForm({ ...briefForm, content: e.target.value })} rows={4} />
          <button type="submit" className="btn-primary">Create Brief</button>
        </form>
      </Modal>

      <Modal isOpen={debriefModalOpen} onClose={() => setDebriefModalOpen(false)} title="Add Mission Debrief">
        <form onSubmit={handleCreateDebrief} className="space-y-4">
          <FormInput label="Title" value={debriefForm.title} onChange={(e) => setDebriefForm({ ...debriefForm, title: e.target.value })} required />
          <FormTextarea label="Summary" value={debriefForm.summary} onChange={(e) => setDebriefForm({ ...debriefForm, summary: e.target.value })} rows={3} />
          <FormTextarea label="Findings (JSON)" value={debriefForm.findings} onChange={(e) => setDebriefForm({ ...debriefForm, findings: e.target.value })} rows={3} />
          <button type="submit" className="btn-primary">Create Debrief</button>
        </form>
      </Modal>

      <Modal isOpen={editBriefModalOpen} onClose={() => setEditBriefModalOpen(false)} title="Edit Brief">
        <form onSubmit={handleUpdateBrief} className="space-y-4">
          <FormInput label="Title" value={editBriefForm.title || ''} onChange={(e) => setEditBriefForm({ ...editBriefForm, title: e.target.value })} required />
          <FormTextarea label="Content (JSON)" value={editBriefForm.content || ''} onChange={(e) => setEditBriefForm({ ...editBriefForm, content: e.target.value })} rows={4} />
          <FormInput label="Version" type="number" value={editBriefForm.version || 1} onChange={(e) => setEditBriefForm({ ...editBriefForm, version: parseInt(e.target.value) || 1 })} />
          <button type="submit" className="btn-primary">Save Changes</button>
        </form>
      </Modal>

      <Modal isOpen={editDebriefModalOpen} onClose={() => setEditDebriefModalOpen(false)} title="Edit Debrief">
        <form onSubmit={handleUpdateDebrief} className="space-y-4">
          <FormInput label="Title" value={editDebriefForm.title || ''} onChange={(e) => setEditDebriefForm({ ...editDebriefForm, title: e.target.value })} required />
          <FormTextarea label="Summary" value={editDebriefForm.summary || ''} onChange={(e) => setEditDebriefForm({ ...editDebriefForm, summary: e.target.value })} rows={3} />
          <FormTextarea label="Findings (JSON)" value={editDebriefForm.findings || ''} onChange={(e) => setEditDebriefForm({ ...editDebriefForm, findings: e.target.value })} rows={3} />
          <button type="submit" className="btn-primary">Save Changes</button>
        </form>
      </Modal>

      <Modal isOpen={attachModalOpen} onClose={() => setAttachModalOpen(false)} title="Add Attachment" size="sm">
        <div className="space-y-4">
          <FileUpload
            selectedFile={selectedFile}
            onChange={setSelectedFile}
            isUploading={uploading}
            disabled={uploading}
          />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setAttachModalOpen(false)} className="btn-secondary">Cancel</button>
          <button onClick={handleUploadAttachment} disabled={!selectedFile || uploading} className="btn-primary">
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteAttachId}
        onClose={() => setDeleteAttachId(null)}
        onConfirm={handleDeleteAttachment}
        title="Delete Attachment"
        message="Are you sure you want to delete this attachment? This action cannot be undone."
        isLoading={false}
      />
    </div>
  );
}
