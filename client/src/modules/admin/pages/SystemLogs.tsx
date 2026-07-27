import React, { useEffect, useState, useRef } from 'react';
import { RefreshCw, Trash2, Download, AlertTriangle } from 'lucide-react';
import PageHeader from '../../../components/common/PageHeader';
import api from '../../../api/client';

interface LogEntry {
  line: string;
  level: 'info' | 'warn' | 'error';
}

export default function SystemLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<any>(null);

  const fetchLogs = async () => {
    try {
      const { data } = await api.get('/admin/logs');
      const lines: string[] = data.lines || [];
      setLogs(lines.map((line: string) => ({
        line,
        level: line.includes('[ERROR]') ? 'error' : line.includes('[WARN]') ? 'warn' : 'info',
      })));
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchLogs, 5000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  const handleClear = async () => {
    try {
      await api.delete('/admin/logs');
      setLogs([]);
    } catch {
      // silent
    }
  };

  const handleDownload = () => {
    const text = logs.map((l) => l.line).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system-logs-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const levelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-400';
      case 'warn': return 'text-yellow-400';
      default: return 'text-text-secondary';
    }
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      <PageHeader title="System Logs" subtitle="Live server log output">
        <button onClick={fetchLogs} disabled={isLoading} className="btn-secondary">
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </PageHeader>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="rounded border-border"
          />
          Auto-refresh (5s)
        </label>
        <div className="flex-1" />
        <button onClick={handleDownload} className="btn-secondary text-sm">
          <Download size={14} />
          Download
        </button>
        <button onClick={handleClear} className="btn-secondary text-sm text-accent-danger">
          <Trash2 size={14} />
          Clear
        </button>
      </div>

      <div
        ref={containerRef}
        className="card flex-1 overflow-y-auto font-mono text-xs leading-relaxed p-4 bg-[#0a0f1a] min-h-[500px]"
      >
        {isLoading ? (
          <div className="text-text-muted text-center py-8">Loading logs...</div>
        ) : logs.length === 0 ? (
          <div className="text-text-muted text-center py-8 flex flex-col items-center gap-2">
            <AlertTriangle size={24} />
            No log entries
          </div>
        ) : (
          logs.map((entry, i) => (
            <div key={i} className={`${levelColor(entry.level)} whitespace-pre-wrap break-all`}>
              <span className="text-text-muted select-none mr-2">{String(i + 1).padStart(5, ' ')}</span>
              {entry.line}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
