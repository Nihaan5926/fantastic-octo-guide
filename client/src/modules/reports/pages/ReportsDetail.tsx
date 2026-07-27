import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useReportStore } from '../store';
import { reportsApi } from '../api';
import PageHeader from '../../../components/common/PageHeader';
import { StatusBadge, ClassificationBadge } from '../../../components/common/Badges';
import { FormTextarea } from '../../../components/common/FormComponents';
import Modal from '../../../components/common/Modal';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import FileUpload from '../../../components/common/FileUpload';
import { ArrowLeft, Send, Printer, Share2, Plus, Trash2, Download, File, Paperclip } from 'lucide-react';

const STATUS_FLOW = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'DISSEMINATED'];

const statusColorMap: Record<string, string> = {
  DRAFT: 'gray', IN_REVIEW: 'blue', APPROVED: 'yellow', DISSEMINATED: 'green',
};

export default function ReportsDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selected, isLoading, isSubmitting, fetchOne, update } = useReportStore();
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [attachModalOpen, setAttachModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteAttachId, setDeleteAttachId] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchOne(id);
      fetchComments();
      fetchAttachments();
    }
  }, [id]);

  const fetchComments = async () => {
    try {
      const { data } = await reportsApi.getComments(id!);
      setComments(data.data || data || []);
    } catch { /* ignore */ }
  };

  const fetchAttachments = async () => {
    if (!id) return;
    try {
      const { data } = await reportsApi.listAttachments(id);
      setAttachments(data.data || []);
    } catch {}
  };

  const handleUploadAttachment = async () => {
    if (!id || !selectedFile) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', selectedFile);
      await reportsApi.uploadAttachment(id, fd);
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
      await reportsApi.deleteAttachment(id, deleteAttachId);
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
      const res = await fetch(`/api/reports/${id}/attachments/${attachmentId}/download`, {
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

  const currentIdx = STATUS_FLOW.indexOf(selected?.status);
  const nextStatus = currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentIdx + 1] : null;

  const handlePrintPDF = () => {
    const title = selected?.title || selected?.reference_number;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>${title}</title>
      <style>
        body { font-family: sans-serif; padding: 40px; color: #111; max-width: 800px; margin: auto; }
        h1 { font-size: 24px; margin-bottom: 4px; }
        .meta { color: #666; font-size: 12px; margin-bottom: 20px; }
        .box { border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-bottom: 16px; }
        .box h2 { font-size: 14px; color: #888; text-transform: uppercase; margin: 0 0 8px; }
        .badge { display:inline-block; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
        .summary { white-space: pre-wrap; font-size: 14px; line-height: 1.6; }
        pre { font-size: 12px; background: #f5f5f5; padding: 12px; border-radius: 6px; overflow-x: auto; }
      </style></head><body>
      <h1>${selected.reference_number}: ${title}</h1>
      <div class="meta">
        <span class="badge" style="background:#e5e7eb;color:#374151;">${selected.classification || ''}</span>
        <span class="badge" style="margin-left:6px;background:#dbeafe;color:#1e40af;">${selected.status || ''}</span>
        <span class="badge" style="margin-left:6px;background:#fef3c7;color:#92400e;">${selected.priority || ''}</span>
        <span style="margin-left:12px;">Created: ${formatDate(selected.created_at)}</span>
      </div>
      ${selected.summary ? `<div class="box"><h2>Summary</h2><div class="summary">${selected.summary}</div></div>` : ''}
      ${selected.content ? `<div class="box"><h2>Content</h2><pre>${JSON.stringify(selected.content, null, 2)}</pre></div>` : ''}
      </body></html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
    toast.success('Print dialog opened');
  };

  const handleShare = () => {
    const url = `${window.location.origin}/reports/${id}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Report URL copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy URL');
    });
  };

  const handleStatusChange = async () => {
    if (!nextStatus) return;
    try {
      await update(id!, { status: nextStatus });
      toast.success(`Status advanced to ${nextStatus}`);
      fetchOne(id!);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setCommentLoading(true);
    try {
      await reportsApi.addComment(id!, { content: commentText });
      toast.success('Comment added');
      setCommentText('');
      fetchComments();
    } catch {
      toast.error('Failed to add comment');
    } finally {
      setCommentLoading(false);
    }
  };

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleString() : '—';

  const threadedComments = React.useMemo(() => {
    const top = comments.filter((c: any) => !c.parent_id);
    const replies = comments.filter((c: any) => c.parent_id);
    return top.map((c: any) => ({
      ...c,
      replies: replies.filter((r: any) => r.parent_id === c.id),
    }));
  }, [comments]);

  if (isLoading && !selected) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-text-muted">Loading report...</div>
      </div>
    );
  }

  if (!selected) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-text-muted">Report not found</p>
        <button onClick={() => navigate('/reports')} className="btn-secondary">Back to Reports</button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={selected.title || selected.reference_number}
        subtitle={`Ref: ${selected.reference_number}`}
      >
        <div className="flex items-center gap-2">
          <button onClick={handlePrintPDF} className="btn-secondary flex items-center gap-1" title="Print PDF">
            <Printer size={14} />
          </button>
          <button onClick={handleShare} className="btn-secondary flex items-center gap-1" title="Share URL">
            <Share2 size={14} />
          </button>
          <button onClick={() => navigate('/reports')} className="btn-secondary flex items-center gap-1">
            <ArrowLeft size={16} />
            Back
          </button>
        </div>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <ClassificationBadge level={selected.classification} />
        <StatusBadge label={selected.status} color={statusColorMap[selected.status] || 'gray'} />
        {selected.priority && <StatusBadge label={selected.priority} color={selected.priority === 'CRITICAL' ? 'red' : selected.priority === 'HIGH' ? 'yellow' : 'blue'} />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Workflow</h2>
            <div className="flex items-center">
              {STATUS_FLOW.map((status, idx) => {
                const isCompleted = currentIdx > idx;
                const isCurrent = currentIdx === idx;
                const isPending = currentIdx < idx;
                return (
                  <React.Fragment key={status}>
                    <div className="flex flex-col items-center flex-1">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                          isCompleted
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : isCurrent
                            ? 'bg-accent border-accent text-white'
                            : 'bg-bg-tertiary border-border text-text-muted'
                        }`}
                      >
                        {isCompleted ? '✓' : idx + 1}
                      </div>
                      <span className={`text-xs mt-1 ${isCurrent ? 'text-text-primary font-semibold' : 'text-text-muted'}`}>
                        {status.replace('_', ' ')}
                      </span>
                    </div>
                    {idx < STATUS_FLOW.length - 1 && (
                      <div className={`h-0.5 flex-1 -mt-4 ${isCompleted ? 'bg-emerald-500' : 'bg-border'}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
            {nextStatus && (
              <div className="mt-4 flex justify-end">
                <button onClick={handleStatusChange} disabled={isSubmitting} className="btn-primary text-sm">
                  {isSubmitting ? 'Updating...' : `Advance to ${nextStatus.replace('_', ' ')}`}
                </button>
              </div>
            )}
          </div>

          {selected.summary && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-2">Summary</h2>
              <p className="text-sm text-text-secondary whitespace-pre-wrap">{selected.summary}</p>
            </div>
          )}

          <div className="card">
            <h2 className="text-lg font-semibold mb-2">Content</h2>
            <pre className="text-xs text-text-secondary bg-bg-tertiary rounded-lg p-4 overflow-auto max-h-96">
              {JSON.stringify(selected.content, null, 2)}
            </pre>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Details</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-text-muted text-xs uppercase tracking-wider">Author</dt>
                <dd className="text-text-primary">{selected.author_first || selected.author_last ? `${selected.author_first || ''} ${selected.author_last || ''}`.trim() : selected.author_id || '—'}</dd>
              </div>
              <div>
                <dt className="text-text-muted text-xs uppercase tracking-wider">Created</dt>
                <dd className="text-text-primary">{formatDate(selected.created_at)}</dd>
              </div>
              <div>
                <dt className="text-text-muted text-xs uppercase tracking-wider">Updated</dt>
                <dd className="text-text-primary">{formatDate(selected.updated_at)}</dd>
              </div>
              {selected.published_at && (
                <div>
                  <dt className="text-text-muted text-xs uppercase tracking-wider">Published</dt>
                  <dd className="text-text-primary">{formatDate(selected.published_at)}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Comments ({comments.length})</h2>
            <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
              {threadedComments.length === 0 ? (
                <p className="text-sm text-text-muted">No comments yet.</p>
              ) : (
                threadedComments.map((comment: any) => (
                  <div key={comment.id} className="border border-border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-text-primary">
                        {comment.first_name} {comment.last_name}
                      </span>
                      <span className="text-xs text-text-muted">{formatDate(comment.created_at)}</span>
                    </div>
                    <p className="text-sm text-text-secondary">{comment.content}</p>
                    {comment.replies.length > 0 && (
                      <div className="mt-2 ml-3 space-y-2 border-l-2 border-border pl-3">
                        {comment.replies.map((reply: any) => (
                          <div key={reply.id}>
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-xs font-semibold text-text-primary">
                                {reply.first_name} {reply.last_name}
                              </span>
                              <span className="text-xs text-text-muted">{formatDate(reply.created_at)}</span>
                            </div>
                            <p className="text-sm text-text-secondary">{reply.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            <div className="flex items-start gap-2">
              <FormTextarea
                label=""
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                rows={2}
                className="flex-1"
              />
              <button
                onClick={handleAddComment}
                disabled={commentLoading || !commentText.trim()}
                className="btn-primary mt-1"
              >
                <Send size={14} />
              </button>
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
        </div>
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
