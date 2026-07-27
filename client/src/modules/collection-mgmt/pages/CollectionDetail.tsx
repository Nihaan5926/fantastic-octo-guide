import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useCollectionStore } from '../store';
import { collectionAssetsApi } from '../api';
import { StatusBadge, PriorityBadge } from '../../../components/common/Badges';
import DataTable from '../../../components/common/DataTable';

const statusColorMap: Record<string, string> = {
  ACTIVE: 'green', PENDING: 'yellow', COMPLETED: 'blue', CANCELLED: 'red', INACTIVE: 'gray',
};

const assetStatusColorMap: Record<string, string> = {
  OPERATIONAL: 'green', MAINTENANCE: 'yellow', OFFLINE: 'red', DECOMMISSIONED: 'gray',
};

export default function CollectionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedRequirement, fetchRequirement } = useCollectionStore();
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id) {
      fetchRequirement(id);
      setLoading(true);
      collectionAssetsApi.list({ limit: 100 })
        .then((res) => setAssets(res.data || []))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [id, fetchRequirement]);

  if (!selectedRequirement) {
    return (
      <div className="card text-center py-16">
        <p className="text-text-muted">Requirement not found.</p>
        <button onClick={() => navigate('/collection')} className="btn-secondary mt-4">Back to Collection</button>
      </div>
    );
  }

  const assetColumns = [
    { key: 'name', label: 'Name' },
    {
      key: 'asset_type',
      label: 'Type',
      render: (item: any) => <span className="text-sm">{item.asset_type || item.type || '—'}</span>,
    },
    { key: 'platform', label: 'Platform' },
    { key: 'capability', label: 'Capability' },
    {
      key: 'status',
      label: 'Status',
      render: (item: any) => <StatusBadge label={item.status || 'N/A'} color={assetStatusColorMap[item.status] || 'gray'} />,
    },
    { key: 'location', label: 'Location' },
  ];

  const r = selectedRequirement;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="btn-ghost flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary">
        <ArrowLeft size={16} /> Back
      </button>
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">{r.reference_number || r.title}</h2>
          <div className="flex items-center gap-2">
            {r.priority && <PriorityBadge level={r.priority} />}
            {r.status && <StatusBadge label={r.status} color={statusColorMap[r.status] || 'gray'} />}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Reference Number</span>
            <p className="text-sm mt-0.5">{r.reference_number || '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Title</span>
            <p className="text-sm mt-0.5">{r.title || '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Priority</span>
            <p className="text-sm mt-0.5">{r.priority ? <PriorityBadge level={r.priority} /> : '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Discipline</span>
            <p className="text-sm mt-0.5">{r.intelligence_discipline || '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Status</span>
            <p className="text-sm mt-0.5"><StatusBadge label={r.status || 'N/A'} color={statusColorMap[r.status] || 'gray'} /></p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Requester</span>
            <p className="text-sm mt-0.5">{r.requester_id || '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Created</span>
            <p className="text-sm mt-0.5">{r.created_at ? new Date(r.created_at).toLocaleString() : '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Updated</span>
            <p className="text-sm mt-0.5">{r.updated_at ? new Date(r.updated_at).toLocaleString() : '—'}</p>
          </div>
        </div>
        {r.description && (
          <div className="mt-6 pt-6 border-t border-border">
            <span className="text-xs text-text-muted uppercase tracking-wider">Description</span>
            <p className="text-sm mt-1 whitespace-pre-wrap">{r.description}</p>
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">Associated Assets ({assets.length})</h3>
        <DataTable
          columns={assetColumns}
          data={assets}
          pagination={{ page: 1, limit: assets.length, total: assets.length, totalPages: 1 }}
          isLoading={loading}
          emptyMessage="No assets associated"
        />
      </div>
    </div>
  );
}
