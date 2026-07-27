import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, Shield, Radio, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { sourcesApi } from '../api';
import PageHeader from '../../../components/common/PageHeader';
import { FormSelect } from '../../../components/common/FormComponents';

const RELIABILITY_LABELS: Record<string, string> = {
  A: 'Completely Reliable',
  B: 'Usually Reliable',
  C: 'Fairly Reliable',
  D: 'Not Usually Reliable',
  E: 'Unreliable',
  F: 'Cannot Be Judged',
};

const CREDIBILITY_LABELS: Record<number, string> = {
  1: 'Confirmed',
  2: 'Probably True',
  3: 'Possibly True',
  4: 'Doubtful',
  5: 'Improbable',
  6: 'Cannot Be Judged',
};

const RELIABILITY_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const CREDIBILITY_SCORES = [1, 2, 3, 4, 5, 6];

interface SourceCell {
  id: string;
  code_name: string;
  type: string;
  status: string;
  reliability_rating: string;
  reliability_letter: string;
  credibility_score: number;
  last_contact: string | null;
}

interface MatrixData {
  grouped: Record<string, any[]>;
  cells: SourceCell[];
  statistics: {
    total: number;
    active: number;
    inactive: number;
    by_type: Record<string, number>;
    by_status: Record<string, number>;
    avg_credibility: number;
  };
}

function getCellZone(letter: string, cred: number): 'green' | 'yellow' | 'red' {
  const ri = RELIABILITY_LETTERS.indexOf(letter);
  if (ri <= 1 && cred <= 2) return 'green';
  if (ri <= 1 && cred === 3) return 'yellow';
  if (ri === 2 && cred <= 3) return 'yellow';
  if (ri === 3 && cred <= 3 && cred >= 2) return 'yellow';
  if (ri >= 4) return 'red';
  if (cred >= 4) return 'red';
  return 'yellow';
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    HUMINT: '#3b82f6', OSINT: '#22c55e', SIGINT: '#f59e0b',
    GEOINT: '#8b5cf6', MASINT: '#ef4444', TECHINT: '#06b6d4',
  };
  return colors[type] || '#94a3b8';
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    ACTIVE: '#22c55e', INACTIVE: '#94a3b8', SUSPENDED: '#f59e0b', COMPROMISED: '#ef4444',
  };
  return colors[status] || '#94a3b8';
}

export default function ReliabilityMatrix() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<MatrixData | null>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [hoverCell, setHoverCell] = useState<{ row: number; col: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    sourcesApi.reliabilityMatrix().then(({ data: res }) => {
      if (!cancelled) {
        setData(res.data);
        setIsLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const filteredCells = useMemo(() => {
    if (!data) return [];
    return data.cells.filter((c) => {
      if (typeFilter && c.type !== typeFilter) return false;
      if (statusFilter && c.status !== statusFilter) return false;
      return true;
    });
  }, [data, typeFilter, statusFilter]);

  const cellsByPosition = useMemo(() => {
    const map: Record<string, SourceCell[]> = {};
    for (const c of filteredCells) {
      const key = `${c.reliability_letter}-${c.credibility_score}`;
      if (!map[key]) map[key] = [];
      map[key].push(c);
    }
    return map;
  }, [filteredCells]);

  const allTypes = useMemo(() => {
    if (!data) return [];
    return Object.keys(data.statistics.by_type).sort();
  }, [data]);

  const allStatuses = useMemo(() => {
    if (!data) return [];
    return Object.keys(data.statistics.by_status).sort();
  }, [data]);

  if (isLoading) {
    return (
      <div className="card text-center py-16">
        <Loader2 className="animate-spin mx-auto text-accent" size={32} />
        <p className="text-text-muted mt-3">Loading reliability matrix...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card text-center py-16">
        <AlertTriangle size={32} className="mx-auto text-red-400 mb-3" />
        <p className="text-text-muted">Failed to load reliability matrix</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Source Reliability Matrix"
        subtitle="Admiralty Code visualization — A-F reliability × 1-6 credibility"
      >
        <button
          onClick={() => navigate('/sources')}
          className="btn-secondary"
        >
          <ArrowLeft size={16} />
          Back to Sources
        </button>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card flex items-center gap-3">
          <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400"><Shield size={20} /></div>
          <div>
            <div className="text-2xl font-bold">{data.statistics.total}</div>
            <div className="text-sm text-text-muted">Total Sources</div>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="p-3 rounded-xl bg-green-500/20 text-green-400"><CheckCircle2 size={20} /></div>
          <div>
            <div className="text-2xl font-bold">{data.statistics.active}</div>
            <div className="text-sm text-text-muted">Active</div>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="p-3 rounded-xl bg-red-500/20 text-red-400"><XCircle size={20} /></div>
          <div>
            <div className="text-2xl font-bold">{data.statistics.inactive}</div>
            <div className="text-sm text-text-muted">Inactive</div>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400"><Radio size={20} /></div>
          <div>
            <div className="text-2xl font-bold">{data.statistics.avg_credibility}</div>
            <div className="text-sm text-text-muted">Avg Credibility</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <FormSelect
          label=""
          options={[
            { value: '', label: 'All Types' },
            ...allTypes.map((t) => ({ value: t, label: t })),
          ]}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="w-40"
        />
        <FormSelect
          label=""
          options={[
            { value: '', label: 'All Statuses' },
            ...allStatuses.map((s) => ({ value: s, label: s.replace(/_/g, ' ') })),
          ]}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-44"
        />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-text-secondary">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span>Reliable</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-yellow-500" />
          <span>Moderate</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span>Unreliable</span>
        </div>
      </div>

      {/* 6x6 Grid */}
      <div className="card overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Column headers: Credibility 1-6 */}
          <div className="grid grid-cols-[80px_repeat(6,1fr)] gap-px bg-border rounded-t-xl overflow-hidden">
            <div className="bg-bg-card p-2 text-xs text-text-muted text-center font-semibold">Rel ↓ / Cred →</div>
            {CREDIBILITY_SCORES.map((score) => (
              <div key={score} className="bg-bg-primary p-2 text-center">
                <div className="text-sm font-bold text-text-primary">{score}</div>
                <div className="text-[10px] text-text-muted truncate">{CREDIBILITY_LABELS[score]}</div>
              </div>
            ))}
          </div>

          {/* Rows: Reliability A-F */}
          {RELIABILITY_LETTERS.map((letter, rowIdx) => (
            <div key={letter} className="grid grid-cols-[80px_repeat(6,1fr)] gap-px bg-border">
              <div className="bg-bg-card p-3 flex items-center justify-center">
                <div>
                  <div className="text-lg font-bold text-text-primary text-center">{letter}</div>
                  <div className="text-[10px] text-text-muted text-center truncate">{RELIABILITY_LABELS[letter]}</div>
                </div>
              </div>
              {CREDIBILITY_SCORES.map((score) => {
                const key = `${letter}-${score}`;
                const sourcesInCell = cellsByPosition[key] || [];
                const zone = getCellZone(letter, score);
                const zoneBg = zone === 'green' ? 'bg-green-500/15' : zone === 'yellow' ? 'bg-yellow-500/15' : 'bg-red-500/15';
                const isHovered = hoverCell?.row === rowIdx && hoverCell?.col === score - 1;

                return (
                  <div
                    key={score}
                    className={`${zoneBg} p-2 min-h-[60px] relative cursor-pointer transition-colors hover:brightness-125`}
                    onMouseEnter={() => setHoverCell({ row: rowIdx, col: score - 1 })}
                    onMouseLeave={() => setHoverCell(null)}
                  >
                    <div className="flex flex-wrap gap-1">
                      {sourcesInCell.slice(0, 4).map((s) => (
                        <div
                          key={s.id}
                          className="relative group"
                        >
                          <div
                            className="w-3 h-3 rounded-full cursor-pointer hover:scale-150 transition-transform"
                            style={{ backgroundColor: getTypeColor(s.type) }}
                            onClick={(e) => { e.stopPropagation(); navigate(`/sources/${s.id}`); }}
                            title={`${s.code_name} - ${s.type}`}
                          />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-50 pointer-events-none">
                            <div className="bg-bg-card border border-border rounded-lg p-3 shadow-xl w-52">
                              <div className="text-sm font-bold text-text-primary">{s.code_name}</div>
                              <div className="text-xs text-text-secondary mt-1 space-y-0.5">
                                <div>Type: {s.type}</div>
                                <div>Status: {s.status}</div>
                                <div>Rating: {s.reliability_rating}</div>
                                <div>Last Contact: {formatDate(s.last_contact)}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {sourcesInCell.length > 4 && (
                        <div className="text-[10px] text-text-muted self-center ml-1">
                          +{sourcesInCell.length - 4}
                        </div>
                      )}
                    </div>
                    {sourcesInCell.length > 0 && (
                      <div className="absolute bottom-1 right-1 text-[10px] text-text-muted">
                        {sourcesInCell.length}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Source Type Distribution */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-3">Source Type Distribution</h2>
        <div className="flex flex-wrap gap-3">
          {Object.entries(data.statistics.by_type).map(([type, count]) => (
            <div key={type} className="flex items-center gap-2 bg-bg-primary rounded-lg px-3 py-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getTypeColor(type) }} />
              <span className="text-sm text-text-primary">{type}</span>
              <span className="text-sm font-bold text-text-secondary">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
