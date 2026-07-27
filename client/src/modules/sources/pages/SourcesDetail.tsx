import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useSourceStore } from '../store';
import { sourcesApi } from '../api';
import PageHeader from '../../../components/common/PageHeader';
import { StatusBadge, SourceTypeBadge } from '../../../components/common/Badges';
import { DetailSkeleton } from '../../../components/common/LoadingSkeleton';
import { FormInput, FormTextarea, FormSelect } from '../../../components/common/FormComponents';
import Modal from '../../../components/common/Modal';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import FileUpload from '../../../components/common/FileUpload';
import { ArrowLeft, Plus, Trash2, Download, File, Paperclip, Edit } from 'lucide-react';

const typeOptions = [
  { value: 'HUMINT', label: 'HUMINT' },
  { value: 'OSINT', label: 'OSINT' },
  { value: 'SIGINT', label: 'SIGINT' },
  { value: 'GEOINT', label: 'GEOINT' },
  { value: 'MASINT', label: 'MASINT' },
  { value: 'TECHINT', label: 'TECHINT' },
];

const statusOptions = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'COMPROMISED', label: 'Compromised' },
];

const reliabilityOptions = [
  { value: 'A', label: 'A - Reliable' },
  { value: 'B', label: 'B - Usually Reliable' },
  { value: 'C', label: 'C - Fairly Reliable' },
  { value: 'D', label: 'D - Not Usually Reliable' },
  { value: 'E', label: 'E - Unreliable' },
];

const statusColorMap: Record<string, string> = {
  ACTIVE: 'green', INACTIVE: 'gray', SUSPENDED: 'yellow', COMPROMISED: 'red',
};

export default function SourcesDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selected, isLoading, isSubmitting, fetchOne, update } = useSourceStore();

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    code_name: '', type: 'HUMINT', reliability_rating: 'C', status: 'ACTIVE',
    description: '', contact_info: '', handler_id: '',
  });

  const [attachments, setAttachments] = useState<any[]>([]);
  const [attachModalOpen, setAttachModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteAttachId, setDeleteAttachId] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchOne(id);
      fetchAttachments();
    }
  }, [id]);

  const fetchAttachments = async () => {
    if (!id) return;
    try {
      const { data } = await sourcesApi.listAttachments(id);
      setAttachments(data.data || []);
    } catch {}
  };

  const handleUploadAttachment = async () => {
    if (!id || !selectedFile) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', selectedFile);
      await sourcesApi.uploadAttachment(id, fd);
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
      await sourcesApi.deleteAttachment(id, deleteAttachId);
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
      const res = await fetch(`/api/sources/${id}/attachments/${attachmentId}/download`, {
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

  const startEditing = () => {
    if (!selected) return;
    setEditForm({
      code_name: selected.code_name || '',
      type: selected.type || 'HUMINT',
      reliability_rating: selected.reliability_rating || 'C',
      status: selected.status || 'ACTIVE',
      description: selected.description || '',
      contact_info: typeof selected.contact_info === 'object'
        ? JSON.stringify(selected.contact_info)
        : (selected.contact_info || '{}'),
      handler_id: selected.handler_id || '',
    });
    setEditing(true);
  };

  const handleSave = async () => {
    try {
      let contactInfoParsed = {};
      try { contactInfoParsed = JSON.parse(editForm.contact_info); } catch {}
      const payload = { ...editForm, contact_info: contactInfoParsed };
      await update(id!, payload);
      toast.success('Source updated');
      setEditing(false);
      fetchOne(id!);
    } catch {
      toast.error('Failed to update');
    }
  };

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleString() : '—';

  if (isLoading && !selected) {
    return <DetailSkeleton />;
  }

  if (!selected) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-text-muted">Source not found</p>
        <button onClick={() => navigate('/sources')} className="btn-secondary">Back to Sources</button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={selected.code_name} subtitle={selected.type}>
        <button onClick={() => navigate('/sources')} className="btn-secondary flex items-center gap-1">
          <ArrowLeft size={16} />
          Back
        </button>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <SourceTypeBadge type={selected.type} />
        <StatusBadge label={selected.status} color={statusColorMap[selected.status] || 'gray'} />
        <span className="text-sm text-text-muted">Reliability: {selected.reliability_rating}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Source Information</h2>
              {!editing && (
                <button onClick={startEditing} className="btn-secondary text-sm flex items-center gap-1">
                  <Edit size={14} /> Edit
                </button>
              )}
            </div>

            {editing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormInput label="Code Name" value={editForm.code_name} onChange={(e) => setEditForm({ ...editForm, code_name: e.target.value })} required />
                  <FormInput label="Handler ID" value={editForm.handler_id} onChange={(e) => setEditForm({ ...editForm, handler_id: e.target.value })} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormSelect label="Type" options={typeOptions} value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value })} />
                  <FormSelect label="Reliability" options={reliabilityOptions} value={editForm.reliability_rating} onChange={(e) => setEditForm({ ...editForm, reliability_rating: e.target.value })} />
                  <FormSelect label="Status" options={statusOptions} value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} />
                </div>
                <FormTextarea label="Description" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={3} />
                <FormTextarea label="Contact Info (JSON)" value={editForm.contact_info} onChange={(e) => setEditForm({ ...editForm, contact_info: e.target.value })} rows={2} />
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
                    <dt className="text-text-muted text-xs uppercase tracking-wider">Handler ID</dt>
                    <dd className="text-text-primary">{selected.handler_id || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-text-muted text-xs uppercase tracking-wider">Contact Info</dt>
                    <dd className="text-text-primary">
                      <pre className="text-xs mt-1 bg-bg-tertiary rounded p-2 overflow-x-auto">
                        {typeof selected.contact_info === 'object'
                          ? JSON.stringify(selected.contact_info, null, 2)
                          : selected.contact_info || '—'}
                      </pre>
                    </dd>
                  </div>
                </div>
              </dl>
            )}
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
            </dl>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Paperclip size={18} /> Attachments
          </h2>
          <button onClick={() => { setSelectedFile(null); setAttachModalOpen(true); }} className="btn-primary text-sm">
            <Plus size={14} /> Add File
          </button>
        </div>
        {attachments.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-8">No attachments yet</p>
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
