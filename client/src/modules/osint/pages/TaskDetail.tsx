import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useOSINTStore } from '../store';
import { osintApi } from '../api';
import DataTable from '../../../components/common/DataTable';
import PageHeader from '../../../components/common/PageHeader';
import { StatusBadge } from '../../../components/common/Badges';
import { DetailSkeleton } from '../../../components/common/LoadingSkeleton';
import { Play, ArrowLeft, Download, ExternalLink, BarChart3, Globe, Calendar, Database, Loader2, Clock } from 'lucide-react';

const statusColorMap: Record<string, string> = {
  PENDING: 'gray', RUNNING: 'blue', COMPLETED: 'green', FAILED: 'red', PAUSED: 'yellow',
};

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selected, results, resultsPagination, isLoading, isSubmitting, fetchOne, fetchResults, run } = useOSINTStore();
  const scheduleOptions = [
    { value: 'MANUAL', label: 'Manual' },
    { value: 'HOURLY', label: 'Hourly' },
    { value: 'EVERY_6_HOURS', label: 'Every 6 Hours' },
    { value: 'DAILY', label: 'Daily' },
    { value: 'WEEKLY', label: 'Weekly' },
  ];

  const [currentSchedule, setCurrentSchedule] = useState('MANUAL');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);

  const handleScheduleSave = async () => {
    if (!id) return;
    setScheduleSaving(true);
    try {
      await osintApi.schedule(id, currentSchedule, scheduleEnabled);
      toast.success('Schedule updated');
      fetchOne(id);
    } catch {
      toast.error('Failed to update schedule');
    } finally {
      setScheduleSaving(false);
    }
  };

  const nextRunText = useMemo(() => {
    const meta = selected?.metadata;
    const metadata = typeof meta === 'string' ? JSON.parse(meta || '{}') : (meta || {});
    const schedule = metadata.schedule;
    const enabled = metadata.scheduleEnabled !== false;
    const nextRun = metadata.next_run_at;
    if (!schedule || schedule === 'MANUAL' || !enabled) return 'Not scheduled';
    if (nextRun) return new Date(nextRun).toLocaleString();
    return 'Pending';
  }, [selected]);

  const [runLoading, setRunLoading] = useState(false);
  const [resultsPage, setResultsPage] = useState(1);

  useEffect(() => {
    if (id) fetchOne(id);
  }, [id]);

  useEffect(() => {
    if (selected?.metadata) {
      const meta = typeof selected.metadata === 'string' ? JSON.parse(selected.metadata) : selected.metadata;
      setCurrentSchedule(meta.schedule || 'MANUAL');
      setScheduleEnabled(meta.scheduleEnabled !== false);
    }
  }, [selected]);

  useEffect(() => {
    if (id) fetchResults(id, { page: resultsPage, limit: 9999 });
  }, [id, resultsPage]);

  const handleRun = async () => {
    if (!id) return;
    setRunLoading(true);
    try {
      await run(id);
      toast.success('Task started');
      fetchOne(id);
    } catch {
      toast.error('Run failed');
    } finally {
      setRunLoading(false);
    }
  };

  const stats = useMemo(() => {
    const allResults = results || [];
    const sourceTypes = new Set(allResults.map((r: any) => r.source_type).filter(Boolean));
    let minDate: string | null = null;
    let maxDate: string | null = null;
    allResults.forEach((r: any) => {
      const d = r.captured_at || r.created_at;
      if (d) {
        if (!minDate || d < minDate) minDate = d;
        if (!maxDate || d > maxDate) maxDate = d;
      }
    });

    const sourceTypeCounts: Record<string, number> = {};
    allResults.forEach((r: any) => {
      const st = r.source_type || 'Unknown';
      sourceTypeCounts[st] = (sourceTypeCounts[st] || 0) + 1;
    });
    const maxCount = Math.max(1, ...Object.values(sourceTypeCounts));

    return { totalCount: allResults.length, sourceCount: sourceTypes.size, minDate, maxDate, sourceTypeCounts, maxCount };
  }, [results]);

  const handleExportCSV = () => {
    const allResults = results || [];
    if (allResults.length === 0) { toast.error('No results to export'); return; }
    const headers = ['title', 'url', 'source_type', 'relevance_score', 'captured_at'];
    const csvRows = [headers.map((h) => `"${h}"`).join(',')];
    allResults.forEach((r: any) => {
      csvRows.push(headers.map((h) => `"${String(r[h] || '').replace(/"/g, '""')}"`).join(','));
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `osint-results-${id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  const resultColumns = [
    {
      key: 'title',
      label: 'Title',
      render: (item: any) => <span className="text-sm">{item.title || '—'}</span>,
    },
    {
      key: 'url',
      label: 'URL',
      render: (item: any) => item.url ? (
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline text-sm flex items-center gap-1">
          <ExternalLink size={12} /> Open
        </a>
      ) : <span className="text-text-muted text-sm">—</span>,
    },
    { key: 'source_type', label: 'Source Type' },
    {
      key: 'relevance_score',
      label: 'Relevance',
      render: (item: any) => item.relevance_score != null ? (
        <div className="flex items-center gap-1.5">
          <div className="w-16 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full" style={{ width: `${(item.relevance_score / 100) * 100}%` }} />
          </div>
          <span className="text-xs text-text-muted">{item.relevance_score}</span>
        </div>
      ) : <span className="text-text-muted text-sm">—</span>,
    },
    { key: 'captured_at', label: 'Collected At' },
  ];

  const urlList = useMemo(() => {
    return (results || []).filter((r: any) => r.url);
  }, [results]);

  if (isLoading && !selected) {
    return <DetailSkeleton />;
  }

  if (!selected) {
    return (
      <div className="card text-center py-16">
        <p className="text-text-muted">Task not found.</p>
        <button onClick={() => navigate('/osint/tasks')} className="btn-secondary mt-4">Back to Tasks</button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={selected?.title || 'Task Detail'} subtitle="View task details and results">
        <button onClick={() => navigate('/osint/tasks')} className="btn-secondary flex items-center gap-2">
          <ArrowLeft size={16} /> Back to Tasks
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-accent/20 text-accent"><Database size={20} /></div>
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wider">Total Results</p>
            <p className="text-xl font-bold">{stats.totalCount}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-purple-500/20 text-purple-400"><Globe size={20} /></div>
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wider">Sources Found</p>
            <p className="text-xl font-bold">{stats.sourceCount}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-400"><Calendar size={20} /></div>
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wider">From</p>
            <p className="text-sm font-semibold">{stats.minDate ? new Date(stats.minDate).toLocaleDateString() : '—'}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-400"><Calendar size={20} /></div>
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wider">To</p>
            <p className="text-sm font-semibold">{stats.maxDate ? new Date(stats.maxDate).toLocaleDateString() : '—'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="card">
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Task Info</h3>
          <div className="space-y-3">
            <div>
              <span className="text-xs text-text-muted">Status</span>
              <div className="mt-1">
                <StatusBadge label={selected?.status || 'N/A'} color={statusColorMap[selected?.status] || 'gray'} />
              </div>
            </div>
            <div>
              <span className="text-xs text-text-muted">Query</span>
              <p className="text-sm mt-0.5">{selected?.query || '—'}</p>
            </div>
            <div>
              <span className="text-xs text-text-muted">Source Types</span>
              <p className="text-sm mt-0.5">
                {Array.isArray(selected?.source_types) ? selected.source_types.join(', ') : (selected?.source_types || '—')}
              </p>
            </div>
            <div>
              <span className="text-xs text-text-muted">Schedule</span>
              <div className="flex items-center gap-2 mt-1">
                <select
                  value={currentSchedule}
                  onChange={(e) => setCurrentSchedule(e.target.value)}
                  className="bg-bg-tertiary border border-border rounded-lg px-2 py-1 text-sm text-text-primary"
                >
                  {scheduleOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <label className="flex items-center gap-1.5 text-xs text-text-muted cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={scheduleEnabled}
                    onChange={(e) => setScheduleEnabled(e.target.checked)}
                    className="rounded border-border"
                  />
                  Enable
                </label>
                <button
                  onClick={handleScheduleSave}
                  disabled={scheduleSaving}
                  className="btn-primary text-xs py-1 px-2"
                >
                  {scheduleSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
            <div>
              <span className="text-xs text-text-muted">Next Run</span>
              <p className="text-sm mt-0.5 text-accent flex items-center gap-1">
                <Clock size={12} /> {nextRunText}
              </p>
            </div>
          </div>
          <button onClick={handleRun} disabled={runLoading || selected?.status === 'RUNNING'} className="btn-primary mt-4 w-full flex items-center justify-center gap-2">
            {runLoading ? <><Loader2 size={16} className="animate-spin" /> Starting...</> : <><Play size={16} /> Run Now</>}
          </button>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {Object.keys(stats.sourceTypeCounts).length > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 size={16} className="text-text-muted" />
                <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Results by Source Type</h3>
              </div>
              <div className="space-y-2">
                {Object.entries(stats.sourceTypeCounts).map(([sourceType, count]) => (
                  <div key={sourceType} className="flex items-center gap-2">
                    <span className="text-xs text-text-secondary w-24 truncate">{sourceType}</span>
                    <div className="flex-1 h-5 bg-bg-tertiary rounded overflow-hidden">
                      <div
                        className="h-full bg-accent rounded transition-all duration-500"
                        style={{ width: `${(count / stats.maxCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-text-muted w-8 text-right">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {urlList.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ExternalLink size={16} className="text-text-muted" />
                  <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Collected URLs</h3>
                </div>
                <span className="text-xs text-text-muted">{urlList.length} links</span>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {urlList.map((r: any) => (
                  <a
                    key={r.id}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-bg-hover text-sm text-accent truncate"
                  >
                    <ExternalLink size={12} className="shrink-0" />
                    <span className="truncate">{r.title || r.url}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Results</h3>
              <button onClick={handleExportCSV} className="btn-secondary text-xs flex items-center gap-1.5 py-1 px-2.5">
                <Download size={13} /> Export CSV
              </button>
            </div>
            <DataTable
              columns={resultColumns}
              data={results}
              pagination={resultsPagination}
              isLoading={isLoading}
              emptyMessage="No results yet. Run the task to collect data."
              onPageChange={setResultsPage}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
