import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import { budgetApi } from '../api';
import { StatusBadge } from '../../../components/common/Badges';
import DataTable from '../../../components/common/DataTable';

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
    return <div className="card text-center py-16"><div className="animate-pulse text-text-muted">Loading...</div></div>;
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
