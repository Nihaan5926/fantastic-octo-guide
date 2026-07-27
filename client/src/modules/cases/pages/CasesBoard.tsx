import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useCaseStore } from '../store';
import { casesApi } from '../api';
import { PriorityBadge } from '../../../components/common/Badges';
import { LayoutGrid, List } from 'lucide-react';

const COLUMNS = [
  { key: 'OPEN', label: 'Open', color: 'border-blue-500/50 bg-blue-500/5' },
  { key: 'IN_PROGRESS', label: 'In Progress', color: 'border-yellow-500/50 bg-yellow-500/5' },
  { key: 'PENDING_REVIEW', label: 'Pending Review', color: 'border-purple-500/50 bg-purple-500/5' },
  { key: 'CLOSED', label: 'Closed', color: 'border-green-500/50 bg-green-500/5' },
];

const columnOrder: Record<string, number> = { OPEN: 0, IN_PROGRESS: 1, PENDING_REVIEW: 2, CLOSED: 3 };

interface CaseItem {
  id: string;
  reference_number: string;
  title: string;
  status: string;
  priority: string;
  classification: string;
  lead_analyst_id: string;
}

export default function CasesBoard() {
  const navigate = useNavigate();
  const [casesByStatus, setCasesByStatus] = useState<Record<string, CaseItem[]>>({});
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const { data } = await casesApi.list({ limit: 500 });
      const allCases: CaseItem[] = data.data || data.items || [];
      const grouped: Record<string, CaseItem[]> = {};
      for (const col of COLUMNS) {
        grouped[col.key] = allCases.filter((c) => c.status === col.key);
      }
      const other = allCases.filter((c) => !COLUMNS.find((col) => col.key === c.status));
      if (other.length > 0) {
        if (!grouped.OPEN) grouped.OPEN = [];
        grouped.OPEN.push(...other);
      }
      setCasesByStatus(grouped);
    } catch {
      toast.error('Failed to load cases');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleMove = async (caseId: string, newStatus: string) => {
    try {
      await casesApi.update(caseId, { status: newStatus });
      toast.success(`Case moved to ${newStatus.replace('_', ' ')}`);

      setCasesByStatus((prev) => {
        const updated = { ...prev };
        let movedCase: CaseItem | undefined;
        for (const key of Object.keys(updated)) {
          const idx = updated[key].findIndex((c) => c.id === caseId);
          if (idx >= 0) {
            movedCase = updated[key][idx];
            updated[key] = updated[key].filter((c) => c.id !== caseId);
          }
        }
        if (movedCase) {
          movedCase = { ...movedCase, status: newStatus };
          if (!updated[newStatus]) updated[newStatus] = [];
          updated[newStatus] = [movedCase, ...updated[newStatus]];
        }
        return updated;
      });
    } catch {
      toast.error('Failed to move case');
    }
  };

  const statusOptions = COLUMNS.map((c) => ({ value: c.key, label: c.label }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-text-muted">Loading board...</div>
      </div>
    );
  }

  const totalCases = Object.values(casesByStatus).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <LayoutGrid size={20} className="text-accent" />
          <h2 className="text-lg font-semibold">Kanban Board</h2>
          <span className="text-xs text-text-muted">({totalCases} cases)</span>
        </div>
        <button onClick={() => navigate('/cases')} className="btn-secondary text-sm flex items-center gap-1">
          <List size={14} /> List View
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4" style={{ minHeight: '60vh' }}>
        {COLUMNS.map((column) => {
          const cases = casesByStatus[column.key] || [];
          return (
            <div
              key={column.key}
              className={`card border-2 ${column.color} p-0 flex flex-col`}
            >
              <div className="p-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{column.label}</span>
                  <span className="badge bg-bg-tertiary text-text-secondary text-xs">{cases.length}</span>
                </div>
              </div>
              <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-20rem)]">
                {cases.length === 0 ? (
                  <div className="text-center py-8 text-text-muted text-xs">No cases</div>
                ) : (
                  cases.map((c) => (
                    <div
                      key={c.id}
                      className="card bg-bg-primary/80 border border-border p-3 cursor-pointer hover:border-accent/40 transition-colors group"
                      onClick={() => navigate(`/cases/${c.id}`)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-text-muted font-mono">{c.reference_number}</span>
                        <PriorityBadge level={c.priority} />
                      </div>
                      <p className="text-sm font-medium text-text-primary truncate mb-2">{c.title}</p>
                      {c.lead_analyst_id && (
                        <p className="text-xs text-text-muted truncate">{c.lead_analyst_id}</p>
                      )}
                      <div className="mt-2 pt-2 border-t border-border flex flex-wrap gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {COLUMNS.filter((col) => col.key !== c.status).map((col) => (
                          <button
                            key={col.key}
                            onClick={(e) => { e.stopPropagation(); handleMove(c.id, col.key); }}
                            className="text-xs px-2 py-0.5 rounded bg-bg-tertiary text-text-secondary hover:bg-accent hover:text-white transition-colors"
                          >
                            → {col.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
