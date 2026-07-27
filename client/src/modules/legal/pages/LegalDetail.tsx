import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import { legalApi } from '../api';
import { StatusBadge, PriorityBadge } from '../../../components/common/Badges';
import { DetailSkeleton } from '../../../components/common/LoadingSkeleton';

const statusColorMap: Record<string, string> = {
  PENDING: 'yellow', IN_REVIEW: 'blue', APPROVED: 'green', REJECTED: 'red', CLOSED: 'gray',
};

export default function LegalDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [review, setReview] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id) {
      setLoading(true);
      legalApi.getReview(id)
        .then(({ data }: any) => setReview(data.data || data))
        .catch(() => toast.error('Failed to load review'))
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return <DetailSkeleton />;
  }
  if (!review) {
    return (
      <div className="card text-center py-16">
        <p className="text-text-muted">Review not found.</p>
        <button onClick={() => navigate('/legal')} className="btn-secondary mt-4">Back to Legal</button>
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
          <h2 className="text-xl font-bold">{review.reference_number || review.title}</h2>
          <div className="flex items-center gap-2">
            {review.priority && <PriorityBadge level={review.priority} />}
            {review.status && <StatusBadge label={review.status} color={statusColorMap[review.status] || 'gray'} />}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Reference Number</span>
            <p className="text-sm mt-0.5">{review.reference_number || '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Title</span>
            <p className="text-sm mt-0.5">{review.title || '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Entity Type</span>
            <p className="text-sm mt-0.5">{review.entity_type || '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Status</span>
            <p className="text-sm mt-0.5"><StatusBadge label={review.status || 'N/A'} color={statusColorMap[review.status] || 'gray'} /></p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Priority</span>
            <p className="text-sm mt-0.5">{review.priority ? <PriorityBadge level={review.priority} /> : '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Due Date</span>
            <p className="text-sm mt-0.5">{review.due_date ? new Date(review.due_date).toLocaleString() : '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Assigned To</span>
            <p className="text-sm mt-0.5">{review.assigned_to || '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Created</span>
            <p className="text-sm mt-0.5">{review.created_at ? new Date(review.created_at).toLocaleString() : '—'}</p>
          </div>
        </div>
        {review.legal_opinion && (
          <div className="mt-6 pt-6 border-t border-border">
            <span className="text-xs text-text-muted uppercase tracking-wider">Legal Opinion</span>
            <p className="text-sm mt-1 whitespace-pre-wrap">{review.legal_opinion}</p>
          </div>
        )}
        {review.findings && (
          <div className="mt-6 pt-6 border-t border-border">
            <span className="text-xs text-text-muted uppercase tracking-wider">Findings</span>
            <pre className="text-sm mt-1 bg-bg-tertiary rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
              {typeof review.findings === 'object' ? JSON.stringify(review.findings, null, 2) : review.findings}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
