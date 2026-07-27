import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Award, BookOpen, Shield, Clock, Download, Trash2, File, Paperclip, Plus } from 'lucide-react';
import { usePersonnelStore, PersonnelRecord } from '../store';
import { personnelApi } from '../api';
import { StatusBadge, ClassificationBadge } from '../../../components/common/Badges';
import PageHeader from '../../../components/common/PageHeader';
import FileUpload from '../../../components/common/FileUpload';
import Modal from '../../../components/common/Modal';
import ConfirmDialog from '../../../components/common/ConfirmDialog';

interface SkillRadarProps {
  skills: string[];
  size?: number;
}

function SkillRadar({ skills, size = 200 }: SkillRadarProps) {
  const labels = skills.slice(0, 6);
  const count = labels.length;
  if (count === 0) return <p className="text-text-muted text-sm text-center py-4">No skills recorded</p>;

  const center = size / 2;
  const radius = center - 30;
  const levels = [0.2, 0.4, 0.6, 0.8, 1.0];

  const getPoint = (index: number, level: number) => {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
    return {
      x: center + radius * level * Math.cos(angle),
      y: center + radius * level * Math.sin(angle),
    };
  };

  const getLabelPoint = (index: number) => {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
    const lr = radius + 25;
    return {
      x: center + lr * Math.cos(angle),
      y: center + lr * Math.sin(angle),
    };
  };

  return (
    <div className="flex justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {levels.map((level) => {
          const points = Array.from({ length: count }, (_, i) => {
            const pt = getPoint(i, level);
            return `${pt.x},${pt.y}`;
          }).join(' ');
          return (
            <polygon
              key={level}
              points={points}
              fill="none"
              stroke="var(--border-color, #334155)"
              strokeWidth="1"
            />
          );
        })}
        {Array.from({ length: count }, (_, i) => {
          const pt = getPoint(i, 1);
          return <line key={`axis-${i}`} x1={center} y1={center} x2={pt.x} y2={pt.y} stroke="var(--border-color, #334155)" strokeWidth="0.5" />;
        })}
        {Array.from({ length: count }, (_, i) => {
          const pt = getPoint(i, 0.75);
          return `${pt.x},${pt.y}`;
        }).join(' ').length > 0 && (
          <polygon
            points={Array.from({ length: count }, (_, i) => {
              const pt = getPoint(i, 0.75);
              return `${pt.x},${pt.y}`;
            }).join(' ')}
            fill="rgba(59, 130, 246, 0.15)"
            stroke="#3b82f6"
            strokeWidth="2"
          />
        )}
        {labels.map((label, i) => {
          const lp = getLabelPoint(i);
          return (
            <text
              key={label}
              x={lp.x}
              y={lp.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="currentColor"
              className="text-xs"
              style={{ fontSize: '10px', fill: '#94a3b8' }}
            >
              {label.length > 14 ? label.slice(0, 14) + '...' : label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

export default function PersonnelDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selected, isLoading, fetchOne, setSelected } = usePersonnelStore();
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false);
  const [enrollmentError, setEnrollmentError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [attachModalOpen, setAttachModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteAttachId, setDeleteAttachId] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchOne(id);
    }
    return () => { setSelected(null); };
  }, [id]);

  useEffect(() => {
    if (selected?.user_id) {
      setEnrollmentsLoading(true);
      setEnrollmentError(null);
      import('../../training/api')
        .then(({ trainingApi }) => trainingApi.listEnrollments({ user_id: selected.user_id, limit: 50 }))
        .then(({ data }: any) => {
          setEnrollments(data.data || data || []);
          setEnrollmentsLoading(false);
        })
        .catch((err: any) => {
          setEnrollmentError(err.message || 'Failed to load training history');
          setEnrollmentsLoading(false);
        });
    }
  }, [selected?.user_id]);

  useEffect(() => {
    if (id) fetchAttachments();
  }, [id]);

  const fetchAttachments = async () => {
    if (!id) return;
    try {
      const { data } = await personnelApi.listAttachments(id);
      setAttachments(data.data || []);
    } catch {}
  };

  const handleUploadAttachment = async () => {
    if (!id || !selectedFile) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', selectedFile);
      await personnelApi.uploadAttachment(id, fd);
      toast.success('Document uploaded');
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
      await personnelApi.deleteAttachment(id, deleteAttachId);
      toast.success('Document removed');
      setDeleteAttachId(null);
      fetchAttachments();
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleDownloadAttachment = async (attachmentId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/personnel/${id}/attachments/${attachmentId}/download`, {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  if (!selected && !isLoading) {
    return (
      <div className="card text-center py-16">
        <p className="text-text-muted">Personnel record not found.</p>
        <button onClick={() => navigate('/personnel')} className="btn-ghost mt-4">Back to Personnel List</button>
      </div>
    );
  }

  if (!selected) return null;

  const skills: string[] = Array.isArray(selected.skills) ? selected.skills : [];
  const certifications: string[] = Array.isArray(selected.certifications) ? selected.certifications : [];
  const languages: string[] = Array.isArray(selected.languages) ? selected.languages : [];
  const specialAccesses: string[] = Array.isArray(selected.special_accesses) ? selected.special_accesses : [];

  const getClearanceExpiry = (): { days: number; status: string; color: string } => {
    if (!selected.clearance_expiry) return { days: Infinity, status: 'No expiry', color: 'gray' };
    const now = new Date();
    const expiry = new Date(selected.clearance_expiry);
    const diff = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { days: diff, status: 'EXPIRED', color: 'red' };
    if (diff <= 30) return { days: diff, status: 'EXPIRING SOON', color: 'yellow' };
    if (diff <= 90) return { days: diff, status: 'Active', color: 'blue' };
    return { days: diff, status: 'Active', color: 'green' };
  };

  const clearanceExpiry = getClearanceExpiry();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/personnel')} className="btn-ghost"><ArrowLeft size={16} /> Back</button>
        <h1 className="text-2xl font-bold">{selected.user_id}</h1>
        <ClassificationBadge level={selected.clearance_level || 'UNCLASSIFIED'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-1">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Shield size={18} /> Profile</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-text-muted">Position</span>
              <span className="text-text-primary font-medium">{selected.position_title || '—'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-text-muted">Nationality</span>
              <span className="text-text-primary font-medium">{selected.nationality || '—'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-text-muted">Date of Birth</span>
              <span className="text-text-primary font-medium">{selected.date_of_birth ? new Date(selected.date_of_birth).toLocaleDateString() : '—'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-text-muted">Clearance Level</span>
              <ClassificationBadge level={selected.clearance_level || 'UNCLASSIFIED'} />
            </div>
            <div className="py-2">
              <div className="flex justify-between mb-2">
                <span className="text-text-muted">Clearance Expiry</span>
                <StatusBadge label={clearanceExpiry.status} color={clearanceExpiry.color} />
              </div>
              {selected.clearance_expiry && clearanceExpiry.days !== Infinity && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">{new Date(selected.clearance_expiry).toLocaleDateString()}</span>
                    <span className={clearanceExpiry.days < 0 ? 'text-red-400' : clearanceExpiry.days <= 30 ? 'text-amber-400' : 'text-text-secondary'}>
                      {clearanceExpiry.days < 0 ? `${Math.abs(clearanceExpiry.days)} days ago` : `${clearanceExpiry.days} days remaining`}
                    </span>
                  </div>
                  <div className="w-full bg-bg-tertiary rounded-full h-2">
                    <div
                      className="rounded-full h-2 transition-all"
                      style={{
                        width: `${Math.min(100, Math.max(0, ((365 - Math.max(0, clearanceExpiry.days)) / 365) * 100))}%`,
                        backgroundColor: clearanceExpiry.days < 0 ? '#ef4444' : clearanceExpiry.days <= 30 ? '#f59e0b' : '#22c55e',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="card lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Award size={18} /> Skills Matrix</h2>
          <SkillRadar skills={skills} size={240} />
          {skills.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {skills.map((skill) => (
                <span key={skill} className="px-3 py-1 bg-accent/10 text-accent border border-accent/30 rounded-full text-xs font-medium">
                  {skill}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><BookOpen size={18} /> Languages</h2>
          {languages.length === 0 ? (
            <p className="text-text-muted text-sm">No languages recorded</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {languages.map((lang) => (
                <span key={lang} className="px-3 py-1 bg-bg-primary border border-border rounded-lg text-sm text-text-primary">
                  {lang}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Certifications</h2>
          {certifications.length === 0 ? (
            <p className="text-text-muted text-sm">No certifications recorded</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {certifications.map((cert) => (
                <span key={cert} className="px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/30 rounded-lg text-sm">
                  {cert}
                </span>
              ))}
            </div>
          )}
        </div>

        {specialAccesses.length > 0 && (
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Special Accesses</h2>
            <div className="flex flex-wrap gap-2">
              {specialAccesses.map((sa) => (
                <span key={sa} className="px-3 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/30 rounded-lg text-sm">
                  {sa}
                </span>
              ))}
            </div>
          </div>
        )}

        {selected.notes && (
          <div className="card lg:col-span-2">
            <h2 className="text-lg font-semibold mb-2">Notes</h2>
            <p className="text-sm text-text-secondary whitespace-pre-wrap">{selected.notes}</p>
          </div>
        )}
      </div>

      <div className="card mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Paperclip size={18} /> Documents
          </h2>
          <button onClick={() => { setSelectedFile(null); setAttachModalOpen(true); }} className="btn-primary text-sm">
            <Plus size={14} /> Add Document
          </button>
        </div>

        {attachments.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-8">No documents uploaded</p>
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

      <div className="card mt-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><BookOpen size={18} /> Training History</h2>
        {enrollmentsLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent" />
          </div>
        )}
        {enrollmentError && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400 mb-4">{enrollmentError}</div>
        )}
        {!enrollmentsLoading && !enrollmentError && enrollments.length === 0 && (
          <p className="text-text-muted text-sm text-center py-8">No training history found</p>
        )}
        {!enrollmentsLoading && enrollments.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-text-muted">
                  <th className="py-2 px-3 font-medium">Course ID</th>
                  <th className="py-2 px-3 font-medium">Status</th>
                  <th className="py-2 px-3 font-medium">Enrolled Date</th>
                  <th className="py-2 px-3 font-medium">Completed Date</th>
                  <th className="py-2 px-3 font-medium">Score</th>
                  <th className="py-2 px-3 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((enr: any) => {
                  const statusColors: Record<string, string> = { ENROLLED: 'blue', IN_PROGRESS: 'yellow', COMPLETED: 'green', FAILED: 'red', WITHDRAWN: 'gray' };
                  return (
                    <tr key={enr.id} className="border-b border-border/50 hover:bg-bg-hover">
                      <td className="py-2 px-3 font-mono text-xs">{enr.course_id}</td>
                      <td className="py-2 px-3"><StatusBadge label={enr.status} color={statusColors[enr.status] || 'gray'} /></td>
                      <td className="py-2 px-3 text-text-secondary">{enr.enrolled_date ? new Date(enr.enrolled_date).toLocaleDateString() : '—'}</td>
                      <td className="py-2 px-3 text-text-secondary">{enr.completed_date ? new Date(enr.completed_date).toLocaleDateString() : '—'}</td>
                      <td className="py-2 px-3">{enr.score != null ? enr.score : '—'}</td>
                      <td className="py-2 px-3 text-text-secondary max-w-xs truncate">{enr.notes || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={attachModalOpen} onClose={() => setAttachModalOpen(false)} title="Upload Document" size="sm">
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
        title="Delete Document"
        message="Are you sure you want to delete this document? This action cannot be undone."
        isLoading={false}
      />
    </div>
  );
}
