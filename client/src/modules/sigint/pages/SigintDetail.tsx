import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import { sigintApi } from '../api';
import { StatusBadge, ClassificationBadge } from '../../../components/common/Badges';
import { DetailSkeleton } from '../../../components/common/LoadingSkeleton';

const statusColorMap: Record<string, string> = {
  ACTIVE: 'green', PENDING: 'yellow', COMPLETED: 'blue', ARCHIVED: 'gray', ANALYZED: 'purple',
};

export default function SigintDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [intercept, setIntercept] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id) {
      setLoading(true);
      sigintApi.getIntercept(id)
        .then(({ data }: any) => setIntercept(data.data || data))
        .catch(() => toast.error('Failed to load intercept'))
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return <DetailSkeleton />;
  }
  if (!intercept) {
    return (
      <div className="card text-center py-16">
        <p className="text-text-muted">Intercept not found.</p>
        <button onClick={() => navigate('/sigint')} className="btn-secondary mt-4">Back to SIGINT</button>
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
          <h2 className="text-xl font-bold">{intercept.reference_number || intercept.title}</h2>
          <div className="flex items-center gap-2">
            {intercept.classification && <ClassificationBadge level={intercept.classification} />}
            {intercept.status && <StatusBadge label={intercept.status} color={statusColorMap[intercept.status] || 'gray'} />}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Reference Number</span>
            <p className="text-sm mt-0.5">{intercept.reference_number || '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Title</span>
            <p className="text-sm mt-0.5">{intercept.title || '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Signal Type</span>
            <p className="text-sm mt-0.5">{intercept.signal_type || '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Frequency</span>
            <p className="text-sm mt-0.5">{intercept.frequency != null ? `${intercept.frequency}` : '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Modulation</span>
            <p className="text-sm mt-0.5">{intercept.modulation || '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Location</span>
            <p className="text-sm mt-0.5">{intercept.location || '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Collection Date</span>
            <p className="text-sm mt-0.5">{intercept.collection_date ? new Date(intercept.collection_date).toLocaleString() : '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Classification</span>
            <p className="text-sm mt-0.5">{intercept.classification ? <ClassificationBadge level={intercept.classification} /> : '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Status</span>
            <p className="text-sm mt-0.5"><StatusBadge label={intercept.status || 'N/A'} color={statusColorMap[intercept.status] || 'gray'} /></p>
          </div>
        </div>
        {intercept.content && (
          <div className="mt-6 pt-6 border-t border-border">
            <span className="text-xs text-text-muted uppercase tracking-wider">Content</span>
            <pre className="text-sm mt-1 bg-bg-tertiary rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">{intercept.content}</pre>
          </div>
        )}
        {intercept.metadata && (
          <div className="mt-6 pt-6 border-t border-border">
            <span className="text-xs text-text-muted uppercase tracking-wider">Metadata</span>
            <pre className="text-sm mt-1 bg-bg-tertiary rounded-lg p-3 overflow-x-auto">
              {typeof intercept.metadata === 'object' ? JSON.stringify(intercept.metadata, null, 2) : intercept.metadata}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
