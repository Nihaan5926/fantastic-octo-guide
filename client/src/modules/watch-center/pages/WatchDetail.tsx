import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import { watchCenterApi } from '../api';
import { StatusBadge, ClassificationBadge } from '../../../components/common/Badges';

const statusColorMap: Record<string, string> = {
  DRAFT: 'yellow', SUBMITTED: 'blue', APPROVED: 'green', REJECTED: 'red',
};

export default function WatchDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sitreps, setSitreps] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id) {
      setLoading(true);
      watchCenterApi.getSITREP(id)
        .then(({ data }: any) => setSitreps(data.data || data))
        .catch(() => toast.error('Failed to load SITREP'))
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return <div className="card text-center py-16"><div className="animate-pulse text-text-muted">Loading...</div></div>;
  }
  if (!sitreps) {
    return (
      <div className="card text-center py-16">
        <p className="text-text-muted">SITREP not found.</p>
        <button onClick={() => navigate('/watch-center')} className="btn-secondary mt-4">Back to Watch Center</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="btn-ghost flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary">
        <ArrowLeft size={16} /> Back
      </button>
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">{sitreps.reference_number || 'SITREP'}</h2>
          <div className="flex items-center gap-2">
            {sitreps.classification && <ClassificationBadge level={sitreps.classification} />}
            {sitreps.status && <StatusBadge label={sitreps.status} color={statusColorMap[sitreps.status] || 'gray'} />}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Reference Number</span>
            <p className="text-sm mt-0.5">{sitreps.reference_number || '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Period Start</span>
            <p className="text-sm mt-0.5">{sitreps.period_start ? new Date(sitreps.period_start).toLocaleString() : '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Period End</span>
            <p className="text-sm mt-0.5">{sitreps.period_end ? new Date(sitreps.period_end).toLocaleString() : '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Classification</span>
            <p className="text-sm mt-0.5">{sitreps.classification ? <ClassificationBadge level={sitreps.classification} /> : '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Status</span>
            <p className="text-sm mt-0.5"><StatusBadge label={sitreps.status || 'N/A'} color={statusColorMap[sitreps.status] || 'gray'} /></p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Created By</span>
            <p className="text-sm mt-0.5">{sitreps.created_by || '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Approved By</span>
            <p className="text-sm mt-0.5">{sitreps.approved_by || '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Created</span>
            <p className="text-sm mt-0.5">{sitreps.created_at ? new Date(sitreps.created_at).toLocaleString() : '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Updated</span>
            <p className="text-sm mt-0.5">{sitreps.updated_at ? new Date(sitreps.updated_at).toLocaleString() : '—'}</p>
          </div>
        </div>
        {sitreps.content && (
          <div className="mt-6 pt-6 border-t border-border">
            <span className="text-xs text-text-muted uppercase tracking-wider">Content</span>
            <pre className="text-sm mt-1 bg-bg-tertiary rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
              {typeof sitreps.content === 'object' ? JSON.stringify(sitreps.content, null, 2) : sitreps.content}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
