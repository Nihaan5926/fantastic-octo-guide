import React, { useEffect, useState } from 'react';
import { Activity, Database, Server, Cpu, Clock, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { CardSkeleton } from '../../../components/common/LoadingSkeleton';
import api from '../../../api/client';

interface HealthData {
  db: string;
  uptime: number;
  memory: { heapUsed: number; heapTotal: number; rss: number };
  modules: number;
}

export default function SystemHealth() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchHealth = async () => {
    setIsLoading(true);
    setError('');
    try {
      const { data } = await api.get('/admin/health');
      setHealth(data);
    } catch {
      setError('Failed to fetch health data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchHealth(); }, []);

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const parts: string[] = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    return parts.join(' ') || '<1m';
  };

  const dbStatus = health?.db === 'connected';
  const memoryPercent = health ? Math.round((health.memory.heapUsed / health.memory.heapTotal) * 100) : 0;
  const memoryHealthy = memoryPercent < 80;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">System Health</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card text-center py-16">
        <AlertTriangle size={32} className="mx-auto mb-3 text-accent-danger" />
        <p className="text-text-muted">{error}</p>
        <button onClick={fetchHealth} className="btn-primary mt-4">Retry</button>
      </div>
    );
  }

  const cards = [
    {
      label: 'Database',
      value: health!.db.toUpperCase(),
      icon: <Database size={20} />,
      status: dbStatus,
      color: dbStatus ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400',
    },
    {
      label: 'API Uptime',
      value: formatUptime(health!.uptime),
      icon: <Clock size={20} />,
      status: true,
      color: 'bg-blue-500/20 text-blue-400',
    },
    {
      label: 'Memory',
      value: `${health!.memory.heapUsed}MB / ${health!.memory.heapTotal}MB`,
      sub: `RSS: ${health!.memory.rss}MB`,
      icon: <Cpu size={20} />,
      status: memoryHealthy,
      color: memoryHealthy ? 'bg-purple-500/20 text-purple-400' : 'bg-red-500/20 text-red-400',
      extra: `${memoryPercent}%`,
    },
    {
      label: 'Loaded Modules',
      value: String(health!.modules),
      icon: <Server size={20} />,
      status: health!.modules > 0,
      color: 'bg-emerald-500/20 text-emerald-400',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">System Health</h1>
          <p className="text-sm text-text-muted mt-1">Platform operational status and resource monitoring</p>
        </div>
        <button onClick={fetchHealth} className="btn-secondary" disabled={isLoading}>
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <div key={i} className="card">
            <div className="flex items-start justify-between mb-3">
              <div className={`p-3 rounded-xl ${card.color}`}>
                {card.icon}
              </div>
              <div className="flex items-center gap-1.5">
                {card.status ? (
                  <CheckCircle size={16} className="text-green-400" />
                ) : (
                  <AlertTriangle size={16} className="text-red-400" />
                )}
                <span className={`text-xs font-medium ${card.status ? 'text-green-400' : 'text-red-400'}`}>
                  {card.status ? 'Healthy' : 'Issue'}
                </span>
              </div>
            </div>
            <div className="text-2xl font-bold">{card.value}</div>
            <div className="text-sm text-text-secondary">{card.label}</div>
            {card.sub && <div className="text-xs text-text-muted mt-1">{card.sub}</div>}
            {card.extra && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                  <span>Memory usage</span>
                  <span>{card.extra}</span>
                </div>
                <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${memoryHealthy ? 'bg-accent' : 'bg-accent-danger'}`}
                    style={{ width: `${memoryPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Activity size={18} />
          System Status
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-sm text-text-secondary">Database Connection</span>
            <span className={`badge ${dbStatus ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {dbStatus ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-sm text-text-secondary">Heap Memory Used</span>
            <span className="text-sm font-medium">{health!.memory.heapUsed} MB</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-sm text-text-secondary">Heap Memory Total</span>
            <span className="text-sm font-medium">{health!.memory.heapTotal} MB</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-sm text-text-secondary">RSS Memory</span>
            <span className="text-sm font-medium">{health!.memory.rss} MB</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-sm text-text-secondary">Process Uptime</span>
            <span className="text-sm font-medium">{formatUptime(health!.uptime)}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-text-secondary">Registered Modules</span>
            <span className="text-sm font-medium">{health!.modules}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
