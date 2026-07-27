import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useCaseStore } from '../store';
import { casesApi } from '../api';
import { evidenceApi } from '../../evidence/api';
import { taskingAssignmentsApi } from '../../tasking/api';
import PageHeader from '../../../components/common/PageHeader';
import { StatusBadge, ClassificationBadge, PriorityBadge } from '../../../components/common/Badges';
import { FormInput, FormSelect, FormTextarea } from '../../../components/common/FormComponents';
import DataTable from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import { ArrowLeft, Plus, X, UserPlus, Trash2, Link2, ListChecks, Download, File, Paperclip } from 'lucide-react';
import FileUpload from '../../../components/common/FileUpload';
import ConfirmDialog from '../../../components/common/ConfirmDialog';

const statusColorMap: Record<string, string> = {
  OPEN: 'blue', IN_PROGRESS: 'yellow', PENDING_REVIEW: 'purple', CLOSED: 'green',
};

const statusOptions = [
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'PENDING_REVIEW', label: 'Pending Review' },
  { value: 'CLOSED', label: 'Closed' },
];

const priorityOptions = [
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

const classificationOptions = [
  { value: 'UNCLASSIFIED', label: 'Unclassified' },
  { value: 'CONFIDENTIAL', label: 'Confidential' },
  { value: 'SECRET', label: 'Secret' },
  { value: 'TOP_SECRET', label: 'Top Secret' },
];

const roleOptions = [
  { value: 'LEAD', label: 'Lead' },
  { value: 'ANALYST', label: 'Analyst' },
  { value: 'OBSERVER', label: 'Observer' },
];

type Tab = 'details' | 'evidence' | 'timeline' | 'tasks' | 'attachments';

export default function CasesDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selected, isLoading, isSubmitting, fetchOne, update } = useCaseStore();

  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [evidence, setEvidence] = useState<any[]>([]);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [memberUserId, setMemberUserId] = useState('');
  const [memberRole, setMemberRole] = useState('ANALYST');
  const [memberLoading, setMemberLoading] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', description: '', status: '', priority: '', classification: '', start_date: '', end_date: '' });
  const [linkEvidenceOpen, setLinkEvidenceOpen] = useState(false);
  const [allEvidence, setAllEvidence] = useState<any[]>([]);
  const [allEvidenceLoading, setAllEvidenceLoading] = useState(false);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState('');
  const [linking, setLinking] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', assigned_to: '', priority: 'MEDIUM' });
  const [taskCreating, setTaskCreating] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [attachModalOpen, setAttachModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteAttachId, setDeleteAttachId] = useState<string | null>(null);

  useEffect(() => {
    if (id) fetchOne(id);
  }, [id]);

  const fetchEvidence = async () => {
    setEvidenceLoading(true);
    try {
      const { data } = await evidenceApi.list({ caseId: id });
      setEvidence(data.data || data.items || []);
    } catch { /* ignore */ } finally {
      setEvidenceLoading(false);
    }
  };

  const fetchTimeline = async () => {
    setTimelineLoading(true);
    try {
      const { data } = await casesApi.getTimeline(id!);
      setTimeline(data.data || []);
    } catch { /* ignore */ } finally {
      setTimelineLoading(false);
    }
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === 'evidence' && evidence.length === 0) fetchEvidence();
    if (tab === 'timeline' && timeline.length === 0) fetchTimeline();
    if (tab === 'tasks' && tasks.length === 0) fetchTasks();
    if (tab === 'attachments' && attachments.length === 0) fetchAttachments();
  };

  const fetchTasks = async () => {
    setTasksLoading(true);
    try {
      const result = await taskingAssignmentsApi.list({ related_entity_type: 'case', related_entity_id: id });
      setTasks(result.data || result.items || result || []);
    } catch { /* ignore */ } finally {
      setTasksLoading(false);
    }
  };

  const handleCreateTask = async () => {
    if (!taskForm.title.trim()) return;
    setTaskCreating(true);
    try {
      await taskingAssignmentsApi.create({
        ...taskForm,
        related_entity_type: 'case',
        related_entity_id: id,
      });
      toast.success('Task linked to case');
      setTaskModalOpen(false);
      setTaskForm({ title: '', description: '', assigned_to: '', priority: 'MEDIUM' });
      fetchTasks();
    } catch {
      toast.error('Failed to create task');
    } finally {
      setTaskCreating(false);
    }
  };

  const openLinkEvidence = async () => {
    setLinkEvidenceOpen(true);
    setAllEvidenceLoading(true);
    try {
      const { data } = await evidenceApi.list({});
      setAllEvidence(data.data || []);
    } catch {} finally {
      setAllEvidenceLoading(false);
    }
  };

  const handleLinkEvidence = async () => {
    if (!selectedEvidenceId) return;
    setLinking(true);
    try {
      await evidenceApi.update(selectedEvidenceId, { case_id: id });
      toast.success('Evidence linked to case');
      setLinkEvidenceOpen(false);
      setSelectedEvidenceId('');
      fetchEvidence();
    } catch {
      toast.error('Failed to link evidence');
    } finally {
      setLinking(false);
    }
  };

  const handleAddMember = async () => {
    if (!memberUserId.trim()) return;
    setMemberLoading(true);
    try {
      await casesApi.addMember(id!, { userId: memberUserId, role: memberRole });
      toast.success('Member added');
      setMemberUserId('');
      fetchOne(id!);
    } catch {
      toast.error('Failed to add member');
    } finally {
      setMemberLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      await casesApi.removeMember(id!, userId);
      toast.success('Member removed');
      fetchOne(id!);
    } catch {
      toast.error('Failed to remove member');
    }
  };

  const startEditing = () => {
    if (!selected) return;
    setEditForm({
      title: selected.title || '',
      description: selected.description || '',
      status: selected.status || 'OPEN',
      priority: selected.priority || 'MEDIUM',
      classification: selected.classification || 'UNCLASSIFIED',
      start_date: selected.start_date ? selected.start_date.slice(0, 10) : '',
      end_date: selected.end_date ? selected.end_date.slice(0, 10) : '',
    });
    setEditing(true);
  };

  const handleSave = async () => {
    try {
      await update(id!, editForm);
      toast.success('Case updated');
      setEditing(false);
      fetchOne(id!);
    } catch {
      toast.error('Failed to update');
    }
  };

  const fetchAttachments = async () => {
    setAttachmentsLoading(true);
    try {
      const { data } = await casesApi.listAttachments(id!);
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
      await casesApi.uploadAttachment(id, fd);
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
      await casesApi.deleteAttachment(id, deleteAttachId);
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
      const res = await fetch(`/api/cases/${id}/attachments/${attachmentId}/download`, {
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

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleString() : '—';

  if (isLoading && !selected) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-text-muted">Loading case...</div>
      </div>
    );
  }

  if (!selected) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-text-muted">Case not found</p>
        <button onClick={() => navigate('/cases')} className="btn-secondary">Back to Cases</button>
      </div>
    );
  }

  const members = selected.members || [];

  return (
    <div>
      <PageHeader title={selected.title} subtitle={`Ref: ${selected.reference_number}`}>
        <button onClick={() => navigate('/cases')} className="btn-secondary flex items-center gap-1">
          <ArrowLeft size={16} />
          Back
        </button>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <ClassificationBadge level={selected.classification} />
        <StatusBadge label={selected.status} color={statusColorMap[selected.status] || 'gray'} />
        <PriorityBadge level={selected.priority} />
      </div>

      <div className="flex items-center gap-1 mb-6 border-b border-border">
          {(['details', 'evidence', 'timeline', 'tasks', 'attachments'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-accent text-accent'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Case Information</h2>
                {!editing && (
                  <button onClick={startEditing} className="btn-secondary text-sm">Edit</button>
                )}
              </div>

              {editing ? (
                <div className="space-y-4">
                  <FormInput label="Title" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
                  <FormTextarea label="Description" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={4} />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FormSelect label="Status" options={statusOptions} value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} />
                    <FormSelect label="Priority" options={priorityOptions} value={editForm.priority} onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })} />
                    <FormSelect label="Classification" options={classificationOptions} value={editForm.classification} onChange={(e) => setEditForm({ ...editForm, classification: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormInput label="Start Date" type="date" value={editForm.start_date} onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })} />
                    <FormInput label="End Date" type="date" value={editForm.end_date} onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })} />
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-border">
                    <button onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
                    <button onClick={handleSave} disabled={isSubmitting} className="btn-primary">
                      {isSubmitting ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-text-muted text-xs uppercase tracking-wider">Description</dt>
                    <dd className="text-text-primary mt-1 whitespace-pre-wrap">{selected.description || 'No description'}</dd>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-text-muted text-xs uppercase tracking-wider">Start Date</dt>
                      <dd className="text-text-primary">{selected.start_date || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-text-muted text-xs uppercase tracking-wider">End Date</dt>
                      <dd className="text-text-primary">{selected.end_date || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-text-muted text-xs uppercase tracking-wider">Due Date</dt>
                      <dd className="text-text-primary">{selected.due_date || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-text-muted text-xs uppercase tracking-wider">Lead Analyst</dt>
                      <dd className="text-text-primary">{selected.lead_first || selected.lead_last ? `${selected.lead_first || ''} ${selected.lead_last || ''}`.trim() : selected.lead_analyst_id || '—'}</dd>
                    </div>
                  </div>
                </dl>
              )}
            </div>

            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Case Members ({members.length})</h2>
              <div className="space-y-2 mb-4">
                {members.length === 0 ? (
                  <p className="text-sm text-text-muted">No members assigned.</p>
                ) : (
                  members.map((m: any) => (
                    <div key={m.user_id || m.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center text-xs font-bold text-text-secondary">
                          {(m.first_name?.[0] || '')}{m.last_name?.[0] || ''}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-text-primary">{m.first_name} {m.last_name}</p>
                          <p className="text-xs text-text-muted">{m.email || m.user_id}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs badge border bg-bg-tertiary text-text-secondary">{m.role}</span>
                        <button
                          onClick={() => handleRemoveMember(m.user_id || m.id)}
                          className="p-1 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-red-400"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="flex items-end gap-3 p-3 border border-dashed border-border rounded-lg">
                <FormInput
                  label="User ID"
                  value={memberUserId}
                  onChange={(e) => setMemberUserId(e.target.value)}
                  placeholder="Enter user ID"
                  className="flex-1"
                />
                <FormSelect
                  label="Role"
                  options={roleOptions}
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value)}
                  className="w-32"
                />
                <button
                  onClick={handleAddMember}
                  disabled={memberLoading || !memberUserId.trim()}
                  className="btn-primary flex items-center gap-1"
                >
                  <UserPlus size={14} />
                  Add
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Metadata</h2>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-text-muted text-xs uppercase tracking-wider">Created</dt>
                  <dd className="text-text-primary">{formatDate(selected.created_at)}</dd>
                </div>
                <div>
                  <dt className="text-text-muted text-xs uppercase tracking-wider">Updated</dt>
                  <dd className="text-text-primary">{formatDate(selected.updated_at)}</dd>
                </div>
                {selected.tags && selected.tags.length > 0 && (
                  <div>
                    <dt className="text-text-muted text-xs uppercase tracking-wider mb-1">Tags</dt>
                    <dd className="flex flex-wrap gap-1">
                      {(Array.isArray(selected.tags) ? selected.tags : []).map((tag: string, i: number) => (
                        <span key={i} className="text-xs badge border bg-bg-tertiary text-text-secondary">{tag}</span>
                      ))}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'evidence' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Linked Evidence</h2>
            <button onClick={openLinkEvidence} className="btn-primary text-sm flex items-center gap-1">
              <Link2 size={14} /> Link Evidence
            </button>
          </div>
          <DataTable
          columns={[
            { key: 'title', label: 'Title' },
            { key: 'type', label: 'Type' },
            {
              key: 'classification',
              label: 'Classification',
              render: (item: any) => <ClassificationBadge level={item.classification} />,
            },
            {
              key: 'created_at',
              label: 'Uploaded',
              render: (item: any) => <span className="text-text-secondary text-xs">{formatDate(item.created_at)}</span>,
            },
          ]}
          data={evidence}
          isLoading={evidenceLoading}
          emptyMessage="No evidence items linked"
          />
        </div>
      )}
      {activeTab === 'timeline' && (
        <div className="space-y-4">
          {timelineLoading ? (
            <div className="card text-center py-12">
              <div className="animate-pulse text-text-muted">Loading timeline...</div>
            </div>
          ) : timeline.length === 0 ? (
            <div className="card text-center py-12 text-text-muted">No activity recorded yet.</div>
          ) : (
            timeline.map((item: any) => (
              <div key={item.id} className="card p-4 border-l-2 border-l-accent">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-accent">
                    {item.timeline_type === 'activity' ? 'Activity' : 'Comment'}
                  </span>
                  <span className="text-xs text-text-muted">{formatDate(item.created_at)}</span>
                </div>
                {item.timeline_type === 'activity' ? (
                  <>
                    <p className="text-sm font-medium text-text-primary">{item.action}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-text-muted">by {item.first_name} {item.last_name}</span>
                    </div>
                    {item.changes && Object.keys(item.changes).length > 0 && (
                      <pre className="mt-2 text-xs text-text-secondary bg-bg-tertiary rounded p-2 overflow-x-auto">
                        {JSON.stringify(item.changes, null, 2)}
                      </pre>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-text-muted">{item.first_name} {item.last_name}</span>
                    </div>
                    <p className="text-sm text-text-secondary">{item.content}</p>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Tasks</h2>
            <button onClick={() => setTaskModalOpen(true)} className="btn-primary text-sm flex items-center gap-1">
              <Plus size={14} /> Create Task
            </button>
          </div>
          {tasksLoading ? (
            <div className="card text-center py-12">
              <div className="animate-pulse text-text-muted">Loading tasks...</div>
            </div>
          ) : tasks.length === 0 ? (
            <div className="card text-center py-12">
              <ListChecks size={32} className="mx-auto mb-3 text-text-muted" />
              <p className="text-text-muted">No tasks assigned to this case.</p>
              <button onClick={() => setTaskModalOpen(true)} className="btn-primary mt-4 text-sm">Create First Task</button>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task: any) => (
                <div key={task.id} className="card flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-text-primary">{task.title}</span>
                      <StatusBadge label={task.status || 'PENDING'} color={task.status === 'COMPLETED' ? 'green' : task.status === 'IN_PROGRESS' ? 'blue' : 'yellow'} />
                      <PriorityBadge level={task.priority || 'MEDIUM'} />
                    </div>
                    {task.description && <p className="text-sm text-text-secondary">{task.description}</p>}
                    {task.assigned_to && <p className="text-xs text-text-muted mt-1">Assigned to: {task.assigned_to}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'attachments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Paperclip size={18} /> Attachments
            </h2>
            <button onClick={() => { setSelectedFile(null); setAttachModalOpen(true); }} className="btn-primary text-sm">
              <Plus size={14} /> Add File
            </button>
          </div>
          {attachmentsLoading ? (
            <div className="card text-center py-12">
              <div className="animate-pulse text-text-muted">Loading attachments...</div>
            </div>
          ) : attachments.length === 0 ? (
            <div className="card text-center py-12">
              <Paperclip size={32} className="mx-auto mb-3 text-text-muted" />
              <p className="text-text-muted">No attachments yet</p>
            </div>
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

      <Modal isOpen={taskModalOpen} onClose={() => setTaskModalOpen(false)} title="Create Task for Case" size="md">
        <div className="space-y-4">
          <FormInput label="Title" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} required />
          <FormTextarea label="Description" value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} rows={3} />
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Assigned To" value={taskForm.assigned_to} onChange={(e) => setTaskForm({ ...taskForm, assigned_to: e.target.value })} placeholder="User ID" />
            <FormSelect label="Priority" options={priorityOptions} value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button type="button" onClick={() => setTaskModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="button" onClick={handleCreateTask} disabled={taskCreating || !taskForm.title.trim()} className="btn-primary">
              {taskCreating ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={linkEvidenceOpen} onClose={() => setLinkEvidenceOpen(false)} title="Link Evidence to Case" size="md">
        {allEvidenceLoading ? (
          <div className="text-center py-8 text-text-muted animate-pulse">Loading evidence...</div>
        ) : (
          <div className="space-y-4">
            <FormSelect
              label="Select Evidence"
              options={allEvidence.map((e: any) => ({ value: e.id, label: `${e.title} (${e.type})` }))}
              value={selectedEvidenceId}
              onChange={(e) => setSelectedEvidenceId(e.target.value)}
              placeholder="Choose evidence..."
              required
            />
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <button onClick={() => setLinkEvidenceOpen(false)} className="btn-secondary" disabled={linking}>Cancel</button>
              <button onClick={handleLinkEvidence} className="btn-primary" disabled={linking || !selectedEvidenceId}>
                {linking ? 'Linking...' : 'Link'}
              </button>
            </div>
          </div>
        )}
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
