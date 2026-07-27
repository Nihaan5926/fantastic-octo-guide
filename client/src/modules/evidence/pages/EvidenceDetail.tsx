import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useEvidenceStore } from '../store';
import { evidenceApi } from '../api';
import PageHeader from '../../../components/common/PageHeader';
import { StatusBadge, ClassificationBadge } from '../../../components/common/Badges';
import { ArrowLeft, Download, Clock, User as UserIcon, File, Calendar, Shield, Tag, HardDrive, Play, Image, FileText, Video, FileArchive, Database, Hash, Upload, Ruler } from 'lucide-react';

const typeColorMap: Record<string, string> = {
  DOCUMENT: 'blue', IMAGE: 'purple', VIDEO: 'red', AUDIO: 'yellow', OTHER: 'gray',
};

interface CustodyEntry {
  action: string;
  timestamp: string;
  user_id?: string;
  user?: string;
}

function parseCustodyChain(chain: any): CustodyEntry[] {
  try {
    if (Array.isArray(chain)) return chain;
    if (typeof chain === 'string') {
      const parsed = JSON.parse(chain);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch { /* ignore */ }
  return [];
}

function parseMetadata(meta: any): Record<string, any> {
  try {
    if (meta && typeof meta === 'object' && !Array.isArray(meta)) return meta;
    if (typeof meta === 'string') {
      const parsed = JSON.parse(meta);
      return typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    }
  } catch { /* ignore */ }
  return {};
}

function getFileTypeIcon(mimeType: string | null, className?: string) {
  const cls = className || 'w-10 h-10';
  if (!mimeType) return <File className={cls} />;
  if (mimeType.startsWith('image/')) return <Image className={cls} />;
  if (mimeType.startsWith('video/')) return <Video className={cls} />;
  if (mimeType === 'application/pdf') return <FileText className={cls} />;
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar') || mimeType.includes('gzip')) return <FileArchive className={cls} />;
  if (mimeType.includes('json') || mimeType.includes('xml') || mimeType.includes('csv') || mimeType.includes('sql')) return <Database className={cls} />;
  if (mimeType.startsWith('text/') || mimeType.includes('document') || mimeType.includes('word') || mimeType.includes('excel') || mimeType.includes('powerpoint')) return <FileText className={cls} />;
  return <File className={cls} />;
}

function getPreviewable(mimeType: string | null): boolean {
  if (!mimeType) return false;
  if (mimeType.startsWith('image/')) return true;
  if (mimeType === 'application/pdf') return true;
  if (mimeType.startsWith('text/')) return true;
  if (mimeType.startsWith('video/')) return true;
  if (mimeType.startsWith('audio/')) return true;
  return false;
}

function formatSize(bytes: number): string {
  if (bytes > 1048576) return `${(bytes / 1048576).toFixed(2)} MB`;
  if (bytes > 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

export default function EvidenceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selected, isLoading, fetchOne } = useEvidenceStore();
  const [previewLoaded, setPreviewLoaded] = useState(false);

  useEffect(() => {
    if (id) {
      fetchOne(id);
      evidenceApi.addCustody(id, 'VIEWED').catch(() => {});
    }
  }, [id]);

  const handleDownload = async () => {
    if (!id) return;
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/evidence/${id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) { toast.error('Download failed'); return; }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const disposition = response.headers.get('content-disposition');
      let filename = selected?.title || selected?.file_path || 'evidence-file';
      if (disposition) {
        const match = disposition.match(/filename="?(.+?)"?$/);
        if (match) filename = match[1];
      }
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      evidenceApi.addCustody(id, 'DOWNLOADED').catch(() => {});
    } catch {
      toast.error('Download failed');
    }
  };

  const handlePreview = () => {
    if (!id) return;
    window.open(`/api/evidence/${id}/preview`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="card text-center py-16">
        <div className="animate-pulse text-text-muted">Loading...</div>
      </div>
    );
  }

  if (!selected) {
    return (
      <div className="card text-center py-16">
        <p className="text-text-muted">Evidence not found.</p>
        <button onClick={() => navigate('/evidence')} className="btn-secondary mt-4">Back to Evidence</button>
      </div>
    );
  }

  const custodyChain = parseCustodyChain(selected.chain_of_custody);
  const metadata = parseMetadata(selected.metadata);
  const fileSizeFormatted = selected.file_size != null ? formatSize(selected.file_size) : null;
  const hasDimensions = metadata.dimensions?.width && metadata.dimensions?.height;
  const isImage = selected.mime_type?.startsWith('image/');

  return (
    <div>
      <PageHeader title={selected.title || 'Evidence Detail'} subtitle={`ID: ${selected.id}`}>
        <div className="flex items-center gap-2">
          {selected.file_path && getPreviewable(selected.mime_type) && (
            <button onClick={handlePreview} className="btn-secondary flex items-center gap-2">
              <Play size={16} /> Preview
            </button>
          )}
          <button onClick={() => navigate('/evidence')} className="btn-secondary flex items-center gap-2">
            <ArrowLeft size={16} /> Back
          </button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-1 space-y-4">
          {selected.file_path && (
            <div className="card">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center">
                  {getFileTypeIcon(selected.mime_type, 'w-7 h-7 text-accent')}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{selected.file_path}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {fileSizeFormatted && (
                      <span className="text-xs text-text-muted">{fileSizeFormatted}</span>
                    )}
                    {selected.mime_type && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-tertiary text-text-secondary font-mono">
                        {selected.mime_type}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {isImage && selected.file_path && (
                <img
                  src={`/api/evidence/${selected.id}/preview`}
                  alt={selected.title}
                  className={`w-full rounded-lg mb-3 bg-bg-tertiary ${previewLoaded ? '' : 'hidden'}`}
                  onLoad={() => setPreviewLoaded(true)}
                  onError={() => { /* ignore */ }}
                />
              )}
              {isImage && !previewLoaded && (
                <div className="w-full h-40 rounded-lg bg-bg-tertiary flex items-center justify-center mb-3">
                  <Image size={24} className="text-text-muted" />
                </div>
              )}
              <div className="flex gap-2">
                {selected.file_path && (
                  <button onClick={handleDownload} className="btn-primary flex-1 flex items-center justify-center gap-2">
                    <Download size={16} /> Download
                  </button>
                )}
                {selected.file_path && getPreviewable(selected.mime_type) && (
                  <button onClick={handlePreview} className="btn-secondary flex items-center justify-center gap-2">
                    <Play size={16} />
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="card">
            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">Details</h3>
            <div className="space-y-3">
              <div>
                <span className="text-xs text-text-muted">Title</span>
                <p className="text-sm mt-0.5 font-medium">{selected.title || '—'}</p>
              </div>
              <div className="flex items-center gap-3">
                <div>
                  <span className="text-xs text-text-muted">Type</span>
                  <div className="mt-0.5">
                    <StatusBadge label={selected.type || 'OTHER'} color={typeColorMap[selected.type] || 'gray'} />
                  </div>
                </div>
                <div>
                  <span className="text-xs text-text-muted">Classification</span>
                  <div className="mt-0.5">
                    <ClassificationBadge level={selected.classification || 'UNCLASSIFIED'} />
                  </div>
                </div>
              </div>
              {selected.description && (
                <div>
                  <span className="text-xs text-text-muted">Description</span>
                  <p className="text-sm mt-0.5 text-text-secondary">{selected.description}</p>
                </div>
              )}
              {selected.case_id && (
                <div className="flex items-center gap-2">
                  <File size={14} className="text-text-muted" />
                  <span className="text-xs text-text-muted">Case: <span className="text-text-primary font-mono">{selected.case_id}</span></span>
                </div>
              )}
              {selected.report_id && (
                <div className="flex items-center gap-2">
                  <File size={14} className="text-text-muted" />
                  <span className="text-xs text-text-muted">Report: <span className="text-text-primary font-mono">{selected.report_id}</span></span>
                </div>
              )}
            </div>
          </div>

          {(selected.mime_type || fileSizeFormatted || hasDimensions || Object.keys(metadata).length > 0) && (
            <div className="card">
              <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">Metadata</h3>
              <div className="space-y-2.5">
                {selected.mime_type && (
                  <div className="flex items-center gap-2">
                    <Tag size={13} className="text-text-muted" />
                    <span className="text-xs text-text-muted">{selected.mime_type}</span>
                  </div>
                )}
                {fileSizeFormatted && (
                  <div className="flex items-center gap-2">
                    <HardDrive size={13} className="text-text-muted" />
                    <span className="text-xs text-text-muted">{fileSizeFormatted}</span>
                  </div>
                )}
                {hasDimensions && (
                  <div className="flex items-center gap-2">
                    <Ruler size={13} className="text-text-muted" />
                    <span className="text-xs text-text-muted">{metadata.dimensions.width} x {metadata.dimensions.height} px</span>
                  </div>
                )}
                {metadata.originalName && (
                  <div className="flex items-center gap-2">
                    <File size={13} className="text-text-muted" />
                    <span className="text-xs text-text-muted truncate">{metadata.originalName}</span>
                  </div>
                )}
                {metadata.uploadedAt && (
                  <div className="flex items-center gap-2">
                    <Upload size={13} className="text-text-muted" />
                    <span className="text-xs text-text-muted">Uploaded {new Date(metadata.uploadedAt).toLocaleString()}</span>
                  </div>
                )}
                {Object.entries(metadata).filter(([k]) => !['originalName', 'size', 'mimeType', 'dimensions', 'uploadedAt'].includes(k)).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    <Hash size={13} className="text-text-muted" />
                    <span className="text-xs text-text-muted">{key}: {String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card">
            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">Dates</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-text-muted" />
                <div>
                  <span className="text-xs text-text-muted">Created</span>
                  <p className="text-xs text-text-primary">{selected.created_at ? new Date(selected.created_at).toLocaleString() : '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-text-muted" />
                <div>
                  <span className="text-xs text-text-muted">Updated</span>
                  <p className="text-xs text-text-primary">{selected.updated_at ? new Date(selected.updated_at).toLocaleString() : '—'}</p>
                </div>
              </div>
            </div>
          </div>

          {(selected.uploader_first || selected.uploader_last) && (
            <div className="card">
              <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">Uploaded By</h3>
              <div className="flex items-center gap-2">
                <UserIcon size={14} className="text-text-muted" />
                <span className="text-sm text-text-primary">
                  {[selected.uploader_first, selected.uploader_last].filter(Boolean).join(' ') || 'Unknown'}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={16} className="text-text-muted" />
              <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Chain of Custody</h3>
              {custodyChain.length > 0 && (
                <span className="text-xs text-text-muted ml-2">({custodyChain.length} entries)</span>
              )}
            </div>
            {custodyChain.length === 0 ? (
              <div className="text-center py-8">
                <Shield size={32} className="mx-auto text-text-muted mb-2 opacity-40" />
                <p className="text-sm text-text-muted">No custody records available</p>
              </div>
            ) : (
              <div className="relative pl-1">
                {custodyChain.map((entry: CustodyEntry, idx: number) => (
                  <div key={idx} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full border-2 mt-1.5 ${
                        idx === custodyChain.length - 1
                          ? 'border-accent bg-accent/20'
                          : 'border-text-muted bg-bg-card'
                      }`} />
                      {idx < custodyChain.length - 1 && <div className="w-0.5 flex-1 bg-border min-h-[20px]" />}
                    </div>
                    <div className="pb-6">
                      <div className="bg-bg-tertiary/40 rounded-lg px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                            entry.action === 'UPLOADED'
                              ? 'bg-blue-500/20 text-blue-400'
                              : entry.action === 'VIEWED'
                                ? 'bg-purple-500/20 text-purple-400'
                                : entry.action === 'DOWNLOADED'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-slate-500/20 text-slate-400'
                          }`}>
                            {entry.action}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1.5">
                          <span className="text-xs text-text-muted flex items-center gap-1">
                            <UserIcon size={11} /> {entry.user_id || entry.user || 'Unknown'}
                          </span>
                          <span className="text-xs text-text-muted flex items-center gap-1">
                            <Clock size={11} /> {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
