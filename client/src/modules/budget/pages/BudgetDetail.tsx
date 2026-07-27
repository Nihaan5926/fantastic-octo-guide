import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import { budgetApi } from '../api';
import { StatusBadge } from '../../../components/common/Badges';
import DataTable from '../../../components/common/DataTable';
import { DetailSkeleton } from '../../../components/common/LoadingSkeleton';

const statusColorMap: Record<string, string> = {
  ACTIVE: 'green', PLANNED: 'blue', CLOSED: 'gray', ON_HOLD: 'yellow', CANCELLED: 'red',
};

const contractStatusColorMap: Record<string, string> = {
  ACTIVE: 'green', EXPIRED: 'yellow', TERMINATED: 'red', PENDING: 'blue',
};

export default function BudgetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [program, setProgram] = useState<any>(null);
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id) {
      setLoading(true);
      Promise.all([
        budgetApi.getProgram(id).then(({ data }: any) => setProgram(data.data || data)),
        budgetApi.listContracts({ limit: 100 }).then(({ data }: any) => {
          const allContracts = data.data || [];
          setContracts(allContracts.filter((c: any) => c.budget_id === id));
        }),
      ])
        .catch(() => toast.error('Failed to load program'))
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return <DetailSkeleton />;
  }
  if (!program) {
    return (
      <div className="card text-center py-16">
        <p className="text-text-muted">Program not found.</p>
        <button onClick={() => navigate('/budget')} className="btn-secondary mt-4">Back to Budget</button>
      </div>
    );
  }

  const formatCurrency = (val: number | null | undefined) =>
    val != null ? `$${val.toLocaleString()}` : '—';

  const contractColumns = [
    { key: 'reference_number', label: 'Ref #' },
    { key: 'vendor_name', label: 'Vendor' },
    { key: 'contract_type', label: 'Type' },
    {
      key: 'value',
      label: 'Value',
      render: (item: any) => <span className="text-sm">{formatCurrency(item.value)}</span>,
    },
    { key: 'start_date', label: 'Start' },
    { key: 'end_date', label: 'End' },
    {
      key: 'status',
      label: 'Status',
      render: (item: any) => <StatusBadge label={item.status || 'N/A'} color={contractStatusColorMap[item.status] || 'gray'} />,
    },
  ];

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="btn-ghost flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary">
        <ArrowLeft size={16} /> Back
      </button>
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">{program.program_name || program.reference_number}</h2>
          {program.status && <StatusBadge label={program.status} color={statusColorMap[program.status] || 'gray'} />}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Program Name</span>
            <p className="text-sm mt-0.5">{program.program_name || '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Fiscal Year</span>
            <p className="text-sm mt-0.5">{program.fiscal_year || '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Status</span>
            <p className="text-sm mt-0.5"><StatusBadge label={program.status || 'N/A'} color={statusColorMap[program.status] || 'gray'} /></p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Total Amount</span>
            <p className="text-sm mt-0.5 font-semibold">{formatCurrency(program.total_amount)}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Allocated</span>
            <p className="text-sm mt-0.5">{formatCurrency(program.allocated_amount)}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Spent</span>
            <p className="text-sm mt-0.5">{formatCurrency(program.spent_amount)}</p>
          </div>
        </div>
        {program.notes && (
          <div className="mt-6 pt-6 border-t border-border">
            <span className="text-xs text-text-muted uppercase tracking-wider">Notes</span>
            <p className="text-sm mt-1 whitespace-pre-wrap">{program.notes}</p>
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">Budget vs Actual</h3>
        {(() => {
          const allocated = program.allocated_amount || 0;
          const spent = program.spent_amount || 0;
          const maxVal = Math.max(allocated, spent, 1);
          const allocatedPct = Math.round((allocated / maxVal) * 100);
          const spentPct = Math.round((spent / maxVal) * 100);
          const spentRatio = allocated > 0 ? (spent / allocated) * 100 : 0;
          const barColor = spentRatio > 80 ? '#ef4444' : spentRatio >= 50 ? '#f59e0b' : '#22c55e';
          return (
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-text-muted">
                  <span>Allocated</span>
                  <span className="font-semibold text-text-primary">{formatCurrency(allocated)}</span>
                </div>
                <div className="w-full bg-bg-tertiary rounded-full h-6 overflow-hidden">
                  <div className="h-full bg-blue-500/60 rounded-full flex items-center justify-end pr-2 text-xs font-semibold text-white" style={{ width: `${allocatedPct}%` }}>
                    {allocatedPct > 8 ? `${allocatedPct}%` : ''}
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-text-muted">
                  <span>Spent</span>
                  <span className="font-semibold text-text-primary">{formatCurrency(spent)}</span>
                </div>
                <div className="w-full bg-bg-tertiary rounded-full h-6 overflow-hidden">
                  <div className="h-full rounded-full flex items-center justify-end pr-2 text-xs font-semibold text-white transition-all" style={{ width: `${spentPct}%`, backgroundColor: barColor }}>
                    {spentPct > 8 ? `${spentPct}%` : ''}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <span className="text-xs text-text-muted">Spent Percentage:</span>
                <div className="flex-1 h-3 bg-bg-tertiary rounded-full overflow-hidden max-w-xs">
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(spentRatio, 100)}%`, backgroundColor: barColor }} />
                </div>
                <span className="text-xs font-semibold" style={{ color: barColor }}>{spentRatio.toFixed(0)}%</span>
              </div>
              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border">
                <div className="text-center">
                  <div className="text-xs text-text-muted">Total Budget</div>
                  <div className="text-sm font-semibold">{formatCurrency(program.total_amount)}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-text-muted">Remaining</div>
                  <div className="text-sm font-semibold" style={{ color: allocated - spent >= 0 ? '#22c55e' : '#ef4444' }}>{formatCurrency(allocated - spent)}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-text-muted">Contracts</div>
                  <div className="text-sm font-semibold">{contracts.length}</div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">Associated Contracts ({contracts.length})</h3>
        <DataTable
          columns={contractColumns}
          data={contracts}
          pagination={{ page: 1, limit: contracts.length, total: contracts.length, totalPages: 1 }}
          isLoading={false}
          emptyMessage="No contracts associated"
        />
      </div>
    </div>
  );
}
