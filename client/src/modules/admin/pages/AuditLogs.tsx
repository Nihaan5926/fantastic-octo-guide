import React, { useEffect, useState } from 'react';
import { RefreshCw, Filter } from 'lucide-react';
import DataTable from '../../../components/common/DataTable';
import PageHeader from '../../../components/common/PageHeader';
import { FormInput, FormSelect } from '../../../components/common/FormComponents';
import { useAdminStore } from '../store';

export default function AuditLogs() {
  const { auditLogs, auditLogsPagination, isLoading, fetchAuditLogs, fetchStats, stats } = useAdminStore();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ action: '', entityType: '', startDate: '', endDate: '' });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { fetchAuditLogs({ page }); fetchStats(); }, [page]);

  const handleFilter = () => { fetchAuditLogs({ page: 1, ...filters }); };

  const columns = [
    { key: 'action', label: 'Action', render: (l: any) => <span className="font-medium text-sm">{l.action}</span> },
    { key: 'user', label: 'User', render: (l: any) => l.user_email ? <span className="text-xs">{l.user_email}</span> : <span className="text-xs text-text-muted">System</span> },
    { key: 'entity_type', label: 'Entity', render: (l: any) => l.entity_type ? <span className="badge bg-bg-tertiary text-text-secondary text-[10px]">{l.entity_type}</span> : <span className="text-text-muted">—</span> },
    { key: 'changes', label: 'Details', render: (l: any) => <span className="text-xs text-text-muted font-mono truncate max-w-[200px] block">{typeof l.changes === 'string' ? l.changes.substring(0, 60) : JSON.stringify(l.changes).substring(0, 60)}</span> },
    { key: 'ip_address', label: 'IP', render: (l: any) => <span className="text-xs text-text-muted font-mono">{l.ip_address || '—'}</span> },
    { key: 'created_at', label: 'Time', render: (l: any) => <span className="text-xs">{new Date(l.created_at).toLocaleString()}</span> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Logs" subtitle={`${stats.auditLogs} total entries tracked`}>
        <button onClick={() => { fetchAuditLogs({ page }); fetchStats(); }} className="btn-secondary"><RefreshCw size={16} /> Refresh</button>
      </PageHeader>

      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setShowFilters(!showFilters)} className="btn-secondary text-sm"><Filter size={14} /> {showFilters ? 'Hide Filters' : 'Filter'}</button>
          {showFilters && <button onClick={handleFilter} className="btn-primary text-sm">Apply</button>}
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <FormInput label="Action" value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })} placeholder="e.g. report:created" />
            <FormInput label="Entity Type" value={filters.entityType} onChange={(e) => setFilters({ ...filters, entityType: e.target.value })} placeholder="e.g. report" />
            <FormInput label="Start Date" type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} />
            <FormInput label="End Date" type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} />
          </div>
        )}
      </div>

      <DataTable columns={columns} data={auditLogs} pagination={auditLogsPagination} isLoading={isLoading} onPageChange={(p) => setPage(p)} emptyMessage="No audit log entries found" />
    </div>
  );
}
