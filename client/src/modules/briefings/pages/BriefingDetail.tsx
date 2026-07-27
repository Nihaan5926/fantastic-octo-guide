import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, Trash2, Download, File, Paperclip } from 'lucide-react';
import { ClassificationBadge, StatusBadge } from '../../../components/common/Badges';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import Modal from '../../../components/common/Modal';
import { FormInput, FormSelect } from '../../../components/common/FormComponents';
import FileUpload from '../../../components/common/FileUpload';
import { useBriefingStore } from '../store';
import { briefingsApi } from '../api';

export default function BriefingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const store = useBriefingStore();
  const [distModalOpen, setDistModalOpen] = useState(false);
  const [distForm, setDistForm] = useState({ recipient: '', notes: '' });
  const [deleteDistId, setDeleteDistId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [attachModalOpen, setAttachModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteAttachId, setDeleteAttachId] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      store.fetchBriefing(id);
      store.fetchDistributions(id);
      fetchAttachments();
    }
  }, [id]);

  const fetchAttachments = async () => {
    if (!id) return;
    try {
      const { data } = await briefingsApi.listAttachments(id);
      setAttachments(data.data || []);
    } catch {}
  };

  const handleUploadAttachment = async () => {
    if (!id || !selectedFile) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', selectedFile);
      await briefingsApi.uploadAttachment(id, fd);
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
      await briefingsApi.deleteAttachment(id, deleteAttachId);
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
      const res = await fetch(`/api/briefings/${id}/attachments/${attachmentId}/download`, {
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
  const handleAddDistribution = async () => {
    if (!distForm.recipient) {
      toast.error('Recipient is required');
      return;
    }
    if (id) {
      await store.addDistribution(id, distForm);
      toast.success('Distribution added');
      setDistModalOpen(false);
      setDistForm({ recipient: '', notes: '' });
    }
  };

  const handleRemoveDistribution = async () => {
    if (deleteDistId && id) {
      await store.removeDistribution(id, deleteDistId);
      toast.success('Distribution removed');
      setDeleteDistId(null);
    }
  };

  const b = store.selectedBriefing;
  if (!b && !store.isLoading) {
    return (
      <div className="card text-center py-16">
        <p className="text-text-muted">Briefing not found</p>
        <button onClick={() => navigate('/briefings')} className="btn-secondary mt-4">Back to Briefings</button>
      </div>
    );
  }

  const statusColor: Record<string, string> = { DRAFT: 'gray', SCHEDULED: 'blue', PRESENTED: 'green', CANCELLED: 'red' };

  return (
    <div>
      <button onClick={() => navigate('/briefings')} className="flex items-center gap-2 text-text-secondary hover:text-text-primary mb-4 transition-colors">
        <ArrowLeft size={16} />
        <span className="text-sm">Back to Briefings</span>
      </button>

      {store.isLoading ? (
        <div className="card text-center py-16">
          <div className="animate-pulse text-text-muted">Loading...</div>
        </div>
      ) : b ? (
        <>
          <div className="card mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-xl font-bold">{b.title}</h1>
                  <ClassificationBadge level={b.classification} />
                  {b.status && <StatusBadge label={b.status} color={statusColor[b.status] || 'gray'} />}
                </div>
                <p className="text-sm text-text-muted">Ref: {b.reference_number}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-text-muted">Prepared By</span>
                <p className="font-medium">{b.prepared_by || '-'}</p>
              </div>
              <div>
                <span className="text-text-muted">Slides</span>
                <p className="font-medium">{b.slides_count || 0}</p>
              </div>
              <div>
                <span className="text-text-muted">Audience</span>
                <p className="font-medium">{b.audience ? JSON.stringify(b.audience) : '-'}</p>
              </div>
              <div>
                <span className="text-text-muted">Created</span>
                <p className="font-medium">{b.created_at ? new Date(b.created_at).toLocaleDateString() : '-'}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Distribution List</h2>
              <button onClick={() => setDistModalOpen(true)} className="btn-primary text-sm">
                <Plus size={14} /> Add Recipient
              </button>
            </div>

            {store.distributions.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-8">No distributions yet</p>
            ) : (
              <div className="space-y-2">
                {store.distributions.map((d: any) => (
                  <div key={d.id} className="flex items-center justify-between p-3 bg-bg-primary rounded-lg border border-border">
                    <div>
                      <p className="text-sm font-medium">{d.recipient}</p>
                      {d.notes && <p className="text-xs text-text-muted">{d.notes}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      {d.distribution_date && (
                        <span className="text-xs text-text-muted">{new Date(d.distribution_date).toLocaleDateString()}</span>
                      )}
                      <StatusBadge label={d.acknowledged ? 'Acknowledged' : 'Pending'} color={d.acknowledged ? 'green' : 'yellow'} />
                      <button onClick={() => setDeleteDistId(d.id)} className="p-1 rounded hover:bg-bg-hover text-accent-danger">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card mt-6">
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
                      <button
                        onClick={() => handleDownloadAttachment(att.id)}
                        className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-accent"
                        title="Download"
                      >
                        <Download size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteAttachId(att.id)}
                        className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-accent-danger"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}

      <Modal isOpen={distModalOpen} onClose={() => setDistModalOpen(false)} title="Add Recipient" size="sm">
        <div className="space-y-4">
          <FormInput label="Recipient" required value={distForm.recipient} onChange={(e) => setDistForm({ ...distForm, recipient: e.target.value })} />
          <FormInput label="Notes" value={distForm.notes} onChange={(e) => setDistForm({ ...distForm, notes: e.target.value })} />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setDistModalOpen(false)} className="btn-secondary">Cancel</button>
          <button onClick={handleAddDistribution} className="btn-primary">Add</button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteDistId}
        onClose={() => setDeleteDistId(null)}
        onConfirm={handleRemoveDistribution}
        title="Remove Recipient"
        message="Remove this recipient from the distribution list?"
        isLoading={false}
      />

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
