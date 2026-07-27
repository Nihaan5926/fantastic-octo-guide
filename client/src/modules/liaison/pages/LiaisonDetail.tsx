import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import { liaisonApi } from '../api';
import { StatusBadge, ClassificationBadge } from '../../../components/common/Badges';
import DataTable from '../../../components/common/DataTable';

const statusColorMap: Record<string, string> = {
  ACTIVE: 'green', INACTIVE: 'gray', SUSPENDED: 'yellow', TERMINATED: 'red',
};

const trustColorMap: Record<string, string> = {
  HIGH: 'green', MEDIUM: 'yellow', LOW: 'red', UNKNOWN: 'gray',
};

export default function LiaisonDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [partner, setPartner] = useState<any>(null);
  const [contactLogs, setContactLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id) {
      setLoading(true);
      Promise.all([
        liaisonApi.getPartner(id).then(({ data }: any) => setPartner(data.data || data)),
        liaisonApi.listContactLogs(id, { limit: 100 }).then(({ data }: any) => setContactLogs(data.data || [])),
      ])
        .catch(() => toast.error('Failed to load partner'))
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return <div className="card text-center py-16"><div className="animate-pulse text-text-muted">Loading...</div></div>;
  }
  if (!partner) {
    return (
      <div className="card text-center py-16">
        <p className="text-text-muted">Partner not found.</p>
        <button onClick={() => navigate('/liaison')} className="btn-secondary mt-4">Back to Liaison</button>
      </div>
    );
  }

  const logColumns = [
    { key: 'contact_date', label: 'Date' },
    { key: 'summary', label: 'Summary' },
    {
      key: 'follow_up_required',
      label: 'Follow Up',
      render: (item: any) => item.follow_up_required ? <StatusBadge label="Required" color="yellow" /> : <span className="text-text-muted text-sm">No</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (item: any) => <StatusBadge label={item.status || 'N/A'} color={statusColorMap[item.status] || 'gray'} />,
    },
  ];

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="btn-ghost flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary">
        <ArrowLeft size={16} /> Back
      </button>
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">{partner.name}</h2>
          <div className="flex items-center gap-2">
            {partner.classification && <ClassificationBadge level={partner.classification} />}
            {partner.status && <StatusBadge label={partner.status} color={statusColorMap[partner.status] || 'gray'} />}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Name</span>
            <p className="text-sm mt-0.5">{partner.name || '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Organization</span>
            <p className="text-sm mt-0.5">{partner.organization || '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Type</span>
            <p className="text-sm mt-0.5">{partner.type || partner.classification || '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Status</span>
            <p className="text-sm mt-0.5"><StatusBadge label={partner.status || 'N/A'} color={statusColorMap[partner.status] || 'gray'} /></p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Trust Level</span>
            <p className="text-sm mt-0.5">{partner.trust_level ? <StatusBadge label={partner.trust_level} color={trustColorMap[partner.trust_level] || 'gray'} /> : '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Created</span>
            <p className="text-sm mt-0.5">{partner.created_at ? new Date(partner.created_at).toLocaleString() : '—'}</p>
          </div>
        </div>
        {partner.point_of_contact && (
          <div className="mt-6 pt-6 border-t border-border">
            <span className="text-xs text-text-muted uppercase tracking-wider">Point of Contact</span>
            <pre className="text-sm mt-1 bg-bg-tertiary rounded-lg p-3 overflow-x-auto">
              {typeof partner.point_of_contact === 'object' ? JSON.stringify(partner.point_of_contact, null, 2) : partner.point_of_contact}
            </pre>
          </div>
        )}
        {partner.contact_info && (
          <div className="mt-6 pt-6 border-t border-border">
            <span className="text-xs text-text-muted uppercase tracking-wider">Contact Info</span>
            <pre className="text-sm mt-1 bg-bg-tertiary rounded-lg p-3 overflow-x-auto">
              {typeof partner.contact_info === 'object' ? JSON.stringify(partner.contact_info, null, 2) : partner.contact_info}
            </pre>
          </div>
        )}
        {partner.notes && (
          <div className="mt-6 pt-6 border-t border-border">
            <span className="text-xs text-text-muted uppercase tracking-wider">Notes</span>
            <p className="text-sm mt-1 whitespace-pre-wrap">{partner.notes}</p>
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">Contact Logs ({contactLogs.length})</h3>
        <DataTable
          columns={logColumns}
          data={contactLogs}
          pagination={{ page: 1, limit: contactLogs.length, total: contactLogs.length, totalPages: 1 }}
          isLoading={false}
          emptyMessage="No contact logs"
        />
      </div>
    </div>
  );
}
