import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { orgChartApi } from '../api';
import { StatusBadge } from '../../../components/common/Badges';
import DataTable from '../../../components/common/DataTable';
import { DetailSkeleton } from '../../../components/common/LoadingSkeleton';
import type { OrgUnit, PersonnelAssignment } from '../store';

export default function OrgUnitDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [unit, setUnit] = useState<OrgUnit | null>(null);
  const [assignments, setAssignments] = useState<PersonnelAssignment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id) {
      setLoading(true);
      Promise.all([
        orgChartApi.getUnit(id).then(({ data }: any) => setUnit(data.data || data)),
        orgChartApi.listAssignments({ org_unit_id: id, limit: 100 }).then(({ data }: any) => setAssignments(data.data || [])),
      ])
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading && !unit) {
    return <DetailSkeleton />;
  }
  if (!unit) {
    return (
      <div className="card text-center py-16">
        <p className="text-text-muted">Unit not found.</p>
        <button onClick={() => navigate('/org-chart')} className="btn-secondary mt-4">Back to Org Chart</button>
      </div>
    );
  }

  const assignmentColumns = [
    { key: 'user_id', label: 'User ID' },
    { key: 'position_title', label: 'Position' },
    {
      key: 'is_primary',
      label: 'Primary',
      render: (item: any) => item.is_primary ? <StatusBadge label="Primary" color="green" /> : <span className="text-text-muted text-sm">—</span>,
    },
    { key: 'start_date', label: 'Start Date' },
    { key: 'end_date', label: 'End Date' },
  ];

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="btn-ghost flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary">
        <ArrowLeft size={16} /> Back
      </button>
      <div className="card">
        <div className="mb-6">
          <h2 className="text-xl font-bold">{unit.name}</h2>
          <p className="text-sm text-text-muted mt-1">{unit.unit_type}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Name</span>
            <p className="text-sm mt-0.5">{unit.name || '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Unit Type</span>
            <p className="text-sm mt-0.5">{unit.unit_type || '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Parent Unit</span>
            <p className="text-sm mt-0.5">{unit.parent_id || 'None (Top Level)'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Commander</span>
            <p className="text-sm mt-0.5">{unit.commander_id || '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Location</span>
            <p className="text-sm mt-0.5">{unit.location || '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Established</span>
            <p className="text-sm mt-0.5">{unit.established_date ? new Date(unit.established_date).toLocaleDateString() : '—'}</p>
          </div>
        </div>
        {unit.description && (
          <div className="mt-6 pt-6 border-t border-border">
            <span className="text-xs text-text-muted uppercase tracking-wider">Description</span>
            <p className="text-sm mt-1 whitespace-pre-wrap">{unit.description}</p>
          </div>
        )}
      </div>

      {unit.children && unit.children.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">Child Units ({unit.children.length})</h3>
          <div className="space-y-2">
            {unit.children.map((child) => (
              <div key={child.id} className="flex items-center justify-between p-3 rounded-lg bg-bg-tertiary">
                <div>
                  <p className="text-sm font-medium">{child.name}</p>
                  <p className="text-xs text-text-muted">{child.unit_type || '—'}</p>
                </div>
                <button onClick={() => navigate(`/org-chart/${child.id}`)} className="text-sm text-accent hover:underline">View</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">Assigned Personnel ({assignments.length})</h3>
        <DataTable
          columns={assignmentColumns}
          data={assignments}
          pagination={{ page: 1, limit: assignments.length, total: assignments.length, totalPages: 1 }}
          isLoading={loading}
          emptyMessage="No personnel assigned"
        />
      </div>
    </div>
  );
}
