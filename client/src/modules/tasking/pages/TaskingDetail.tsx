import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTaskingStore } from '../store';
import { StatusBadge, PriorityBadge } from '../../../components/common/Badges';

const statusColorMap: Record<string, string> = {
  PENDING: 'yellow', IN_PROGRESS: 'blue', COMPLETED: 'green', CANCELLED: 'red', ON_HOLD: 'gray',
};

export default function TaskingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedAssignment, fetchAssignment } = useTaskingStore();

  useEffect(() => { if (id) fetchAssignment(id); }, [id, fetchAssignment]);

  if (!selectedAssignment) {
    return (
      <div className="card text-center py-16">
        <p className="text-text-muted">Assignment not found.</p>
        <button onClick={() => navigate('/tasking')} className="btn-secondary mt-4">Back to Tasking</button>
      </div>
    );
  }

  const a = selectedAssignment;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="btn-ghost flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary">
        <ArrowLeft size={16} /> Back
      </button>
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">{a.reference_number || a.title}</h2>
          <div className="flex items-center gap-2">
            {a.priority && <PriorityBadge level={a.priority} />}
            {a.status && <StatusBadge label={a.status} color={statusColorMap[a.status] || 'gray'} />}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Reference Number</span>
            <p className="text-sm mt-0.5">{a.reference_number || '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Title</span>
            <p className="text-sm mt-0.5">{a.title || '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Task Type</span>
            <p className="text-sm mt-0.5">{a.task_type || '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Priority</span>
            <p className="text-sm mt-0.5">{a.priority ? <PriorityBadge level={a.priority} /> : '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Status</span>
            <p className="text-sm mt-0.5"><StatusBadge label={a.status || 'N/A'} color={statusColorMap[a.status] || 'gray'} /></p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Assigned To</span>
            <p className="text-sm mt-0.5">{a.assigned_to || '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Assigned By</span>
            <p className="text-sm mt-0.5">{a.assigned_by || '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Due Date</span>
            <p className="text-sm mt-0.5">{a.due_date ? new Date(a.due_date).toLocaleString() : '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Completed At</span>
            <p className="text-sm mt-0.5">{(a as any).completed_at ? new Date((a as any).completed_at).toLocaleString() : '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Created</span>
            <p className="text-sm mt-0.5">{a.created_at ? new Date(a.created_at).toLocaleString() : '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Updated</span>
            <p className="text-sm mt-0.5">{a.updated_at ? new Date(a.updated_at).toLocaleString() : '—'}</p>
          </div>
        </div>
        {a.description && (
          <div className="mt-6 pt-6 border-t border-border">
            <span className="text-xs text-text-muted uppercase tracking-wider">Description</span>
            <p className="text-sm mt-1 whitespace-pre-wrap">{a.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
