import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import { archiveApi } from '../api';
import { StatusBadge, ClassificationBadge } from '../../../components/common/Badges';
import { DetailSkeleton } from '../../../components/common/LoadingSkeleton';

const statusColorMap: Record<string, string> = {
  ACTIVE: 'green', ARCHIVED: 'blue', PENDING_DESTRUCTION: 'yellow', DESTROYED: 'red',
};

export default function ArchiveDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id) {
      setLoading(true);
      archiveApi.getRecord(id)
        .then(({ data }: any) => setRecord(data.data || data))
        .catch(() => toast.error('Failed to load record'))
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return <DetailSkeleton />;
  }
  if (!record) {
    return (
      <div className="card text-center py-16">
        <p className="text-text-muted">Record not found.</p>
        <button onClick={() => navigate('/archive')} className="btn-secondary mt-4">Back to Archive</button>
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
          <h2 className="text-xl font-bold">{record.reference_number || record.title}</h2>
          <div className="flex items-center gap-2">
            {record.classification && <ClassificationBadge level={record.classification} />}
            {record.status && <StatusBadge label={record.status} color={statusColorMap[record.status] || 'gray'} />}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Reference Number</span>
            <p className="text-sm mt-0.5">{record.reference_number || '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Title</span>
            <p className="text-sm mt-0.5">{record.title || '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Entity Type</span>
            <p className="text-sm mt-0.5">{record.entity_type || '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Classification</span>
            <p className="text-sm mt-0.5">{record.classification ? <ClassificationBadge level={record.classification} /> : '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Retention Period</span>
            <p className="text-sm mt-0.5">{record.retention_period_days != null ? `${record.retention_period_days} days` : '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Status</span>
            <p className="text-sm mt-0.5"><StatusBadge label={record.status || 'N/A'} color={statusColorMap[record.status] || 'gray'} /></p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Review Date</span>
            <p className="text-sm mt-0.5">{record.review_date ? new Date(record.review_date).toLocaleDateString() : '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Destruction Date</span>
            <p className="text-sm mt-0.5">{record.destruction_date ? new Date(record.destruction_date).toLocaleDateString() : '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Created</span>
            <p className="text-sm mt-0.5">{record.created_at ? new Date(record.created_at).toLocaleString() : '—'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
