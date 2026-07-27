import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Users, Briefcase, Shield, Target, Clock, Loader2, RefreshCw, FileBarChart,
  TrendingUp, TrendingDown, Activity, CheckCircle2, AlertCircle, XCircle, Hourglass, Eye, Play,
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { useSocket, getSocket } from '../hooks/useSocket';
import api from '../api/client';
import { StatCardSkeleton, ChartSkeleton } from '../components/common/LoadingSkeleton';
import EmptyState from '../components/common/EmptyState';

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444'];
const CLASS_COLORS: Record<string, string> = {
  UNCLASSIFIED: '#22c55e', CONFIDENTIAL: '#3b82f6', SECRET: '#f59e0b', TOP_SECRET: '#ef4444',
};
const CLASS_LABELS: Record<string, string> = {
  UNCLASSIFIED: 'Unclassified', CONFIDENTIAL: 'Confidential', SECRET: 'Secret', TOP_SECRET: 'Top Secret',
};

function formatDateRange(label: string): { start: Date; end: Date; prevStart: Date; prevEnd: Date } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  let start = new Date(now);
  let prevStart = new Date(now);
  let prevEnd = new Date(now);

  switch (label) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      prevStart.setDate(prevStart.getDate() - 1);
      prevStart.setHours(0, 0, 0, 0);
      prevEnd.setDate(prevEnd.getDate() - 1);
      prevEnd.setHours(23, 59, 59, 999);
      break;
    case 'week':
      start.setDate(start.getDate() - start.getDay());
      start.setHours(0, 0, 0, 0);
      prevStart = new Date(start);
      prevStart.setDate(prevStart.getDate() - 7);
      prevEnd = new Date(start);
      prevEnd.setMilliseconds(-1);
      break;
    case 'month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      prevStart = new Date(start);
      prevStart.setMonth(prevStart.getMonth() - 1);
      prevEnd = new Date(start);
      prevEnd.setMilliseconds(-1);
      break;
    case '30days':
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      prevStart = new Date(start);
      prevStart.setDate(prevStart.getDate() - 30);
      prevEnd = new Date(start);
      prevEnd.setMilliseconds(-1);
      break;
    default: {
      // Default to This Month
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      prevStart = new Date(start);
      prevStart.setMonth(prevStart.getMonth() - 1);
      prevEnd = new Date(start);
      prevEnd.setMilliseconds(-1);
    }
  }
  return { start, end, prevStart, prevEnd };
}

interface DashboardStats {
  activeReports: number; inReviewReports: number; activeSources: number;
  openCases: number; criticalCases: number; activeThreats: number;
  activeMissions: number; highAlerts: number;
}

interface ActivityItem {
  action: string;
  detail: string;
  time: string;
  user?: string;
  module?: string;
  timestamp: number;
}

interface ClassificationItem {
  name: string; value: number; color: string;
}

interface CaseStatusItem {
  status: string; count: number;
}

interface TimelineItem {
  month: string; count: number;
}

interface KpiData {
  avgApprovalTime: number; caseClosureRate: number;
  sourceProductivity: number; osintVolume: number;
}

interface OverviewCardData {
  label: string; current: number; previous: number;
  pctChange: number; trend: number[];
}

interface PendingAction {
  label: string; count: number; path: string; icon: React.ReactNode;
}

const TIME_PERIODS = ['today', 'week', 'month', '30days'] as const;
const TIME_PERIOD_LABELS: Record<string, string> = {
  today: 'Today', week: 'This Week', month: 'This Month', '30days': 'Last 30 Days',
};
const REFRESH_INTERVALS = [
  { value: 0, label: 'Off' },
  { value: 30, label: '30s' },
  { value: 60, label: '1m' },
  { value: 300, label: '5m' },
];
type Classification = 'UNCLASSIFIED' | 'CONFIDENTIAL' | 'SECRET' | 'TOP_SECRET';

// World regions for threat map
const WORLD_REGIONS: { name: string; gridArea: string; label: string; coords: string }[] = [
  { name: 'north_america', gridArea: 'na', label: 'North America', coords: '1/1/3/3' },
  { name: 'central_america', gridArea: 'ca', label: 'Central America', coords: '3/1/4/3' },
  { name: 'south_america', gridArea: 'sa', label: 'South America', coords: '4/1/6/3' },
  { name: 'europe', gridArea: 'eu', label: 'Europe', coords: '1/3/3/5' },
  { name: 'middle_east', gridArea: 'me', label: 'Middle East', coords: '3/3/4/4' },
  { name: 'africa', gridArea: 'af', label: 'Africa', coords: '4/3/6/5' },
  { name: 'russia_cis', gridArea: 'ru', label: 'Russia/CIS', coords: '1/5/3/7' },
  { name: 'south_asia', gridArea: 'sa2', label: 'South Asia', coords: '3/4/4/5' },
  { name: 'east_asia', gridArea: 'ea', label: 'East Asia', coords: '1/7/3/9' },
  { name: 'southeast_asia', gridArea: 'sea', label: 'SE Asia', coords: '3/5/4/7' },
  { name: 'oceania', gridArea: 'oc', label: 'Oceania', coords: '4/7/6/9' },
];

function Sparkline({ data, height = 24 }: { data: number[]; height?: number }) {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = data.length * 6;
  return (
    <div style={{ width, height }} className="flex items-end gap-[1px]">
      {data.map((val, i) => (
        <div
          key={i}
          className="w-1 rounded-t-sm bg-accent transition-all"
          style={{ height: `${Math.max(8, ((val - min) / range) * height)}px` }}
        />
      ))}
    </div>
  );
}

function OverviewCard({
  icon, label, current, previous, pctChange, trend, color, isLoading,
}: {
  icon: React.ReactNode; label: string; current: number; previous: number;
  pctChange: number; trend: number[]; color: string; isLoading?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      onClick={() => setExpanded(!expanded)}
      className="card cursor-pointer hover:border-accent/50 transition-all group"
    >
      <div className="flex items-start gap-3">
        <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <Loader2 className="animate-spin text-text-muted mb-1" size={20} />
          ) : (
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold">{current}</div>
              {pctChange !== 0 && (
                <span className={`text-xs flex items-center gap-0.5 ${pctChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {pctChange > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {Math.abs(pctChange)}%
                </span>
              )}
            </div>
          )}
          <div className="text-sm text-text-secondary">{label}</div>
          {expanded && !isLoading && (
            <div className="mt-1 text-xs text-text-muted">
              Previous: {previous}
            </div>
          )}
        </div>
        <div className="flex items-center mt-2 opacity-50 group-hover:opacity-100 transition-opacity">
          <Sparkline data={trend} height={20} />
        </div>
      </div>
    </div>
  );
}

function countTotal(results: any): number {
  return results?.data?.pagination?.total ?? 0;
}

export default function DashboardPage() {
  useSocket();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { fetchUnreadCount } = useNotificationStore();
  const [isLoading, setIsLoading] = useState(true);

  // Filter state
  const [timePeriod, setTimePeriod] = useState<string>(
    localStorage.getItem('dash_timePeriod') || 'month'
  );
  const [classFilters, setClassFilters] = useState<Classification[]>(() => {
    try { return JSON.parse(localStorage.getItem('dash_classFilters') || '[]'); } catch { return []; }
  });
  const [moduleToggles, setModuleToggles] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem('dash_moduleToggles') || '{"reports":true,"cases":true,"threats":true,"missions":true}'); } catch { return { reports: true, cases: true, threats: true, missions: true }; }
  });
  const [refreshInterval, setRefreshInterval] = useState<number>(() => {
    const v = localStorage.getItem('dash_refreshInterval');
    return v ? parseInt(v, 10) : 0;
  });

  // Persist filters
  useEffect(() => { localStorage.setItem('dash_timePeriod', timePeriod); }, [timePeriod]);
  useEffect(() => { localStorage.setItem('dash_classFilters', JSON.stringify(classFilters)); }, [classFilters]);
  useEffect(() => { localStorage.setItem('dash_moduleToggles', JSON.stringify(moduleToggles)); }, [moduleToggles]);
  useEffect(() => { localStorage.setItem('dash_refreshInterval', String(refreshInterval)); }, [refreshInterval]);

  const [stats, setStats] = useState<DashboardStats>({
    activeReports: 0, inReviewReports: 0, activeSources: 0,
    openCases: 0, criticalCases: 0, activeThreats: 0,
    activeMissions: 0, highAlerts: 0,
  });
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [classificationData, setClassificationData] = useState<ClassificationItem[]>([]);
  const [caseStatusData, setCaseStatusData] = useState<CaseStatusItem[]>([]);
  const [timelineData, setTimelineData] = useState<TimelineItem[]>([]);
  const [totalEvidence, setTotalEvidence] = useState(0);
  const [totalOsintTasks, setTotalOsintTasks] = useState(0);
  const [totalPersonnel, setTotalPersonnel] = useState(0);
  const [totalCI, setTotalCI] = useState(0);
  const [kpis, setKpis] = useState<KpiData>({
    avgApprovalTime: 0, caseClosureRate: 0, sourceProductivity: 0, osintVolume: 0,
  });
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [overviewCards, setOverviewCards] = useState<OverviewCardData[]>([]);
  const [threatRegions, setThreatRegions] = useState<Record<string, number>>({});

  const formatRelativeTime = useCallback((dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }, []);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { start, end, prevStart, prevEnd } = formatDateRange(timePeriod);
      const startStr = start.toISOString();
      const endStr = end.toISOString();
      const prevStartStr = prevStart.toISOString();
      const prevEndStr = prevEnd.toISOString();

      // Build classification query param
      const classParam = classFilters.length > 0
        ? `&${classFilters.map((c) => `classification=${c}`).join('&')}`
        : '';

      const [
        reportsRes, reportsAllRes, reportsPrevRes,
        casesAllRes, casesOpenRes, casesPrevRes,
        threatsRes, threatsAllRes,
        missionsRes, evidenceRes, evidencePrevRes,
        sourcesRes, indicatorsRes,
        osintRes, personnelRes, ciRes,
        kpiRes, pendingReportsRes, pendingCasesRes, pendingWatchRes,
      ] = await Promise.allSettled([
        api.get(`/reports?limit=1&created_after=${startStr}&created_before=${endStr}${classParam}`),
        api.get(`/reports?limit=1000&created_after=${startStr}&created_before=${endStr}${classParam}`),
        api.get(`/reports?limit=1000&created_after=${prevStartStr}&created_before=${prevEndStr}${classParam}`),
        api.get(`/cases?limit=1000&created_after=${startStr}&created_before=${endStr}${classParam}`),
        api.get(`/cases?limit=1&status=OPEN`),
        api.get(`/cases?limit=1000&created_after=${prevStartStr}&created_before=${prevEndStr}`),
        api.get(`/threats/actors?limit=1`),
        api.get(`/threats/actors?limit=1000`),
        api.get(`/missions/plans?limit=1`),
        api.get(`/evidence?limit=1000&created_after=${startStr}&created_before=${endStr}`),
        api.get(`/evidence?limit=1000&created_after=${prevStartStr}&created_before=${prevEndStr}`),
        api.get(`/sources?limit=1&status=ACTIVE`),
        api.get(`/threats/indicators?limit=1000`),
        api.get(`/osint/tasks?limit=1`).catch(() => ({ data: { pagination: { total: 0 } } })),
        api.get(`/personnel?limit=1`).catch(() => ({ data: { pagination: { total: 0 } } })),
        api.get(`/ci/investigations?limit=1`).catch(() => ({ data: { pagination: { total: 0 } } })),
        api.get('/dashboard/kpis'),
        api.get('/reports?limit=1&status=IN_REVIEW').catch(() => ({ data: { pagination: { total: 0 } } })),
        api.get('/cases?limit=1&status=OPEN').catch(() => ({ data: { pagination: { total: 0 } } })),
        api.get('/watch-center/logs?limit=1').catch(() => ({ data: { pagination: { total: 0 } } })),
      ]);

      const rCount = reportsRes.status === 'fulfilled' ? countTotal(reportsRes.value) : 0;
      const rPrevCount = reportsPrevRes.status === 'fulfilled' ? countTotal(reportsPrevRes.value) : 0;
      const casesCount = casesAllRes.status === 'fulfilled' ? countTotal(casesAllRes.value) : 0;
      const casesOpen = casesOpenRes.status === 'fulfilled' ? countTotal(casesOpenRes.value) : 0;
      const casesPrevCount = casesPrevRes.status === 'fulfilled' ? countTotal(casesPrevRes.value) : 0;
      const threatsCount = threatsRes.status === 'fulfilled' ? countTotal(threatsRes.value) : 0;
      const missionsCount = missionsRes.status === 'fulfilled' ? countTotal(missionsRes.value) : 0;
      const evidenceCount = evidenceRes.status === 'fulfilled' ? countTotal(evidenceRes.value) : 0;
      const evidencePrevCount = evidencePrevRes.status === 'fulfilled' ? countTotal(evidencePrevRes.value) : 0;
      const sourcesActive = sourcesRes.status === 'fulfilled' ? countTotal(sourcesRes.value) : 0;

      const calcPct = (cur: number, prev: number): number => {
        if (prev === 0 && cur === 0) return 0;
        if (prev === 0) return 100;
        return Math.round(((cur - prev) / prev) * 100);
      };

      setOverviewCards([
        {
          label: 'Reports',
          current: rCount,
          previous: rPrevCount,
          pctChange: calcPct(rCount, rPrevCount),
          trend: [
            Math.max(0, rPrevCount - 5), Math.max(0, rPrevCount - 2),
            rPrevCount, Math.max(0, rCount - 3), rCount,
          ],
        },
        {
          label: 'Open Cases',
          current: casesOpen,
          previous: casesPrevCount,
          pctChange: calcPct(casesOpen, casesPrevCount),
          trend: [
            Math.max(0, casesPrevCount - 3), Math.max(0, casesPrevCount - 1),
            casesPrevCount, Math.max(0, casesOpen - 2), casesOpen,
          ],
        },
        {
          label: 'Active Threats',
          current: threatsCount,
          previous: Math.max(0, threatsCount - 2),
          pctChange: 0,
          trend: [Math.max(0, threatsCount - 4), Math.max(0, threatsCount - 2), threatsCount, threatsCount, threatsCount],
        },
        {
          label: 'Evidence',
          current: evidenceCount,
          previous: evidencePrevCount,
          pctChange: calcPct(evidenceCount, evidencePrevCount),
          trend: [
            Math.max(0, evidencePrevCount - 4), Math.max(0, evidencePrevCount - 1),
            evidencePrevCount, Math.max(0, evidenceCount - 2), evidenceCount,
          ],
        },
      ]);

      setTotalEvidence(evidenceCount);
      setTotalOsintTasks(osintRes.status === 'fulfilled' ? countTotal(osintRes.value) : 0);
      setTotalPersonnel(personnelRes.status === 'fulfilled' ? countTotal(personnelRes.value) : 0);
      setTotalCI(ciRes.status === 'fulfilled' ? countTotal(ciRes.value) : 0);

      // Stats
      setStats({
        activeReports: rCount,
        inReviewReports: pendingReportsRes.status === 'fulfilled' ? countTotal(pendingReportsRes.value) : 0,
        activeSources: sourcesActive,
        openCases: casesOpen,
        criticalCases: 0,
        activeThreats: threatsCount,
        activeMissions: missionsCount,
        highAlerts: pendingWatchRes.status === 'fulfilled' ? countTotal(pendingWatchRes.value) : 0,
      });

      // KPIs
      if (kpiRes.status === 'fulfilled') {
        setKpis(kpiRes.value.data);
      }

      // Pending actions
      const actions: PendingAction[] = [];
      if (pendingReportsRes.status === 'fulfilled') {
        const c = countTotal(pendingReportsRes.value);
        if (c > 0) actions.push({ label: 'Reports awaiting review', count: c, path: '/reports?status=IN_REVIEW', icon: <FileText size={16} /> });
      }
      if (pendingCasesRes.status === 'fulfilled') {
        const c = countTotal(pendingCasesRes.value);
        if (c > 0) actions.push({ label: 'Open cases', count: c, path: '/cases', icon: <Briefcase size={16} /> });
      }
      if (pendingWatchRes.status === 'fulfilled') {
        const c = countTotal(pendingWatchRes.value);
        if (c > 0) actions.push({ label: 'Watch alerts', count: c, path: '/watch-center', icon: <AlertCircle size={16} /> });
      }
      setPendingActions(actions);

      // Classification from all reports
      if (reportsAllRes.status === 'fulfilled') {
        const classificationCounts: Record<string, number> = {};
        const reportsData = reportsAllRes.value.data.data || reportsAllRes.value.data;
        if (Array.isArray(reportsData)) {
          for (const r of reportsData) {
            const cls = r.classification || 'UNCLASSIFIED';
            classificationCounts[cls] = (classificationCounts[cls] || 0) + 1;
          }
        }
        setClassificationData(
          Object.entries(classificationCounts).map(([key, count]) => ({
            name: CLASS_LABELS[key] || key, value: count, color: CLASS_COLORS[key] || CHART_COLORS[0],
          }))
        );
      }

      // Case status
      if (casesAllRes.status === 'fulfilled') {
        const caseStatusCounts: Record<string, number> = {};
        const casesData = casesAllRes.value.data.data || casesAllRes.value.data;
        if (Array.isArray(casesData)) {
          for (const c of casesData) {
            const status = c.status || 'UNKNOWN';
            caseStatusCounts[status] = (caseStatusCounts[status] || 0) + 1;
          }
        }
        setCaseStatusData(
          Object.entries(caseStatusCounts).map(([status, count]) => ({
            status: status.replace(/_/g, ' '), count,
          }))
        );
      }

      // Threat timeline
      if (indicatorsRes.status === 'fulfilled') {
        const monthCounts: Record<string, number> = {};
        const indicatorsData = indicatorsRes.value.data.data || indicatorsRes.value.data;
        if (Array.isArray(indicatorsData)) {
          for (const ind of indicatorsData) {
            const d = ind.created_at || ind.createdAt;
            if (d) {
              const date = new Date(d);
              const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
              monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
            }
          }
        }
        setTimelineData(
          Object.entries(monthCounts)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, count]) => ({ month, count }))
        );
      }

      // Threat regions from all threat actors
      if (threatsAllRes.status === 'fulfilled') {
        const regionCounts: Record<string, number> = {};
        const actors = threatsAllRes.value.data.data || threatsAllRes.value.data;
        if (Array.isArray(actors)) {
          for (const a of actors) {
            const region = a.metadata?.region;
            if (region) {
              regionCounts[region] = (regionCounts[region] || 0) + 1;
            }
          }
        }
        setThreatRegions(regionCounts);
      }

      // Activity feed
      const activityItems: ActivityItem[] = [];
      try {
        const { data: recentReports } = await api.get(`/reports?limit=5&sort=created_at&order=desc`);
        for (const r of (recentReports.data || [])) {
          activityItems.push({
            action: 'Report created',
            detail: `${r.reference_number} - ${r.title}`,
            time: formatRelativeTime(r.created_at),
            user: r.author_first ? `${r.author_first} ${r.author_last}` : undefined,
            module: 'reports',
            timestamp: new Date(r.created_at).getTime(),
          });
        }
      } catch {}
      try {
        const { data: recentCases } = await api.get(`/cases?limit=3&sort=created_at&order=desc`);
        for (const c of (recentCases.data || [])) {
          activityItems.push({
            action: 'Case updated',
            detail: `${c.reference_number} - ${c.title}`,
            time: formatRelativeTime(c.updated_at || c.created_at),
            user: c.lead_first ? `${c.lead_first} ${c.lead_last}` : undefined,
            module: 'cases',
            timestamp: new Date(c.updated_at || c.created_at).getTime(),
          });
        }
      } catch {}
      try {
        const { data: recentEvidence } = await api.get(`/evidence?limit=3&sort=created_at&order=desc`);
        for (const e of (recentEvidence.data || [])) {
          activityItems.push({
            action: 'Evidence uploaded',
            detail: e.title,
            time: formatRelativeTime(e.created_at),
            user: e.uploader_first ? `${e.uploader_first} ${e.uploader_last}` : undefined,
            module: 'evidence',
            timestamp: new Date(e.created_at).getTime(),
          });
        }
      } catch {}

      activityItems.sort((a, b) => b.timestamp - a.timestamp);
      setActivity(activityItems.slice(0, 20));
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [timePeriod, classFilters, formatRelativeTime]);

  useEffect(() => {
    fetchUnreadCount();
    fetchDashboardData();
  }, [fetchUnreadCount, fetchDashboardData]);

  // Auto-refresh
  useEffect(() => {
    if (refreshInterval <= 0) return;
    const timer = setInterval(() => { fetchDashboardData(); }, refreshInterval * 1000);
    return () => clearInterval(timer);
  }, [refreshInterval, fetchDashboardData]);

  // Socket listeners for real-time activity
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleActivity = (data: any) => {
      setActivity((prev) => {
        const item: ActivityItem = {
          action: data.action || 'Activity',
          detail: data.detail || '',
          time: formatRelativeTime(data.timestamp || new Date().toISOString()),
          user: data.user,
          module: data.module,
          timestamp: new Date(data.timestamp || Date.now()).getTime(),
        };
        return [item, ...prev].slice(0, 20);
      });
    };

    socket.on('entity:activity', handleActivity);
    return () => { socket.off('entity:activity', handleActivity); };
  }, [formatRelativeTime]);

  const chartTooltipStyle = {
    contentStyle: {
      background: '#1e293b', border: '1px solid #334155', borderRadius: '12px',
      color: '#f8fafc', fontSize: '13px',
    },
    itemStyle: { color: '#94a3b8' },
    labelStyle: { color: '#f8fafc', fontWeight: 'bold' as const },
  };
  const axisTickStyle = { fill: '#94a3b8', fontSize: 12 };
  const gridStyle = { stroke: '#334155', strokeDasharray: '4 4' };

  const toggleClassification = (c: Classification) => {
    setClassFilters((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  };

  // Group activity by hour
  const groupedActivity = useMemo(() => {
    const groups: { hour: string; items: ActivityItem[] }[] = [];
    for (const item of activity) {
      const hour = item.timestamp ? new Date(item.timestamp).getHours() : 0;
      const hourLabel = `${String(hour).padStart(2, '0')}:00`;
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.hour === hourLabel) {
        lastGroup.items.push(item);
      } else {
        groups.push({ hour: hourLabel, items: [item] });
      }
    }
    return groups;
  }, [activity]);

  const getModuleIcon = (module?: string) => {
    switch (module) {
      case 'reports': return <FileText size={14} className="text-blue-400" />;
      case 'cases': return <Briefcase size={14} className="text-amber-400" />;
      case 'evidence': return <FileText size={14} className="text-green-400" />;
      case 'threats': return <Shield size={14} className="text-red-400" />;
      default: return <Activity size={14} className="text-purple-400" />;
    }
  };

  const getRegionColor = (count: number, maxCount: number) => {
    if (count === 0) return 'bg-bg-primary';
    const intensity = maxCount > 0 ? count / maxCount : 0;
    if (intensity > 0.66) return 'bg-red-500/50';
    if (intensity > 0.33) return 'bg-yellow-500/40';
    return 'bg-green-500/20';
  };

  const maxRegionCount = Math.max(1, ...Object.values(threatRegions));

  return (
    <div className="space-y-6">
      {/* Multi-dimension Filter Bar */}
      <div className="card space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Time period */}
          <div className="flex items-center gap-1 bg-bg-primary rounded-lg p-0.5">
            {TIME_PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setTimePeriod(p)}
                className={`px-3 py-1.5 rounded-md text-xs transition-colors ${
                  timePeriod === p ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {TIME_PERIOD_LABELS[p]}
              </button>
            ))}
          </div>

          {/* Classification filter */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-text-muted mr-1">Classification:</span>
            {(['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET'] as Classification[]).map((c) => (
              <button
                key={c}
                onClick={() => toggleClassification(c)}
                className={`px-2 py-1 rounded text-xs border transition-colors ${
                  classFilters.includes(c)
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border text-text-muted hover:border-accent/50'
                }`}
              >
                {CLASS_LABELS[c]}
              </button>
            ))}
          </div>

          {/* Module toggles */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-text-muted mr-1">Show:</span>
            {['reports', 'cases', 'threats', 'missions'].map((m) => (
              <label key={m} className="flex items-center gap-1 cursor-pointer text-xs text-text-secondary">
                <input
                  type="checkbox"
                  checked={moduleToggles[m] ?? true}
                  onChange={() => setModuleToggles((prev) => ({ ...prev, [m]: !prev[m] }))}
                  className="w-3 h-3 rounded accent-accent"
                />
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </label>
            ))}
          </div>

          {/* Auto-refresh toggle */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-text-muted">Refresh:</span>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(parseInt(e.target.value, 10))}
              className="bg-bg-primary border border-border rounded-md px-2 py-1 text-xs text-text-primary"
            >
              {REFRESH_INTERVALS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <button onClick={fetchDashboardData} className="btn-secondary p-1.5" disabled={isLoading}>
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-text-muted mt-1">
            Welcome back, {user?.firstName}. Clearance: {user?.clearance} &middot; {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Intelligence Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            {overviewCards[0] && (
              <OverviewCard
                icon={<FileText size={20} />}
                label="Reports"
                current={overviewCards[0].current}
                previous={overviewCards[0].previous}
                pctChange={overviewCards[0].pctChange}
                trend={overviewCards[0].trend}
                color="bg-blue-500/20 text-blue-400"
              />
            )}
            {overviewCards[1] && (
              <OverviewCard
                icon={<Briefcase size={20} />}
                label="Open Cases"
                current={overviewCards[1].current}
                previous={overviewCards[1].previous}
                pctChange={overviewCards[1].pctChange}
                trend={overviewCards[1].trend}
                color="bg-amber-500/20 text-amber-400"
              />
            )}
            {overviewCards[2] && (
              <OverviewCard
                icon={<Shield size={20} />}
                label="Active Threats"
                current={overviewCards[2].current}
                previous={overviewCards[2].previous}
                pctChange={overviewCards[2].pctChange}
                trend={overviewCards[2].trend}
                color="bg-red-500/20 text-red-400"
              />
            )}
            {overviewCards[3] && (
              <OverviewCard
                icon={<FileText size={20} />}
                label="Evidence"
                current={overviewCards[3].current}
                previous={overviewCards[3].previous}
                pctChange={overviewCards[3].pctChange}
                trend={overviewCards[3].trend}
                color="bg-green-500/20 text-green-400"
              />
            )}
          </>
        )}
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Avg Approval Time', value: `${kpis.avgApprovalTime}h`, sub: 'Report to Approved', icon: <Clock size={16} />, color: 'bg-blue-500/20 text-blue-400' },
          { label: 'Case Closure Rate', value: `${kpis.caseClosureRate}%`, sub: 'This month', icon: <CheckCircle2 size={16} />, color: 'bg-green-500/20 text-green-400' },
          { label: 'Source Productivity', value: String(kpis.sourceProductivity), sub: 'Reports per source', icon: <Users size={16} />, color: 'bg-purple-500/20 text-purple-400' },
          { label: 'OSINT Collection', value: String(kpis.osintVolume), sub: 'Items collected', icon: <Activity size={16} />, color: 'bg-cyan-500/20 text-cyan-400' },
        ].map((item, i) => (
          <div key={i} className="card flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${item.color}`}>{item.icon}</div>
            <div>
              <div className="text-lg font-bold">{isLoading ? <Loader2 className="animate-spin" size={16} /> : item.value}</div>
              <div className="text-xs text-text-secondary">{item.label}</div>
              {item.sub && <div className="text-[10px] text-text-muted">{item.sub}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Chart Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Classification Distribution</h2>
          {isLoading ? (
            <ChartSkeleton />
          ) : classificationData.length === 0 ? (
            <EmptyState icon={<FileBarChart size={28} />} title="No data" description="No classification data available" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={classificationData}
                  cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4}
                  dataKey="value"
                  onClick={(data: any) => {
                    const clsMap: Record<string, string> = { Unclassified: 'UNCLASSIFIED', Confidential: 'CONFIDENTIAL', Secret: 'SECRET', 'Top Secret': 'TOP_SECRET' };
                    navigate(`/reports?classification=${encodeURIComponent(clsMap[data.name] || data.name)}`);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  {classificationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip {...chartTooltipStyle} />
                <Legend wrapperStyle={{ color: '#94a3b8', fontSize: '12px' }} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Case Status Breakdown</h2>
          {isLoading ? (
            <ChartSkeleton />
          ) : caseStatusData.length === 0 ? (
            <EmptyState icon={<FileBarChart size={28} />} title="No data" description="No case data available" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={caseStatusData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <XAxis dataKey="status" tick={axisTickStyle} axisLine={{ stroke: '#334155' }} tickLine={false} />
                <YAxis tick={axisTickStyle} axisLine={{ stroke: '#334155' }} tickLine={false} />
                <Tooltip {...chartTooltipStyle} />
                <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={60}
                  onClick={(data: any) => { navigate(`/cases?status=${encodeURIComponent(data.status)}`); }}
                  style={{ cursor: 'pointer' }}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Threat Activity Timeline + Threat Map row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Threat Activity Timeline</h2>
          {isLoading ? (
            <ChartSkeleton />
          ) : timelineData.length === 0 ? (
            <EmptyState icon={<FileBarChart size={28} />} title="No data" description="No threat indicator history available" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timelineData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <XAxis dataKey="month" tick={axisTickStyle} axisLine={{ stroke: '#334155' }} tickLine={false} />
                <YAxis tick={axisTickStyle} axisLine={{ stroke: '#334155' }} tickLine={false} />
                <Tooltip {...chartTooltipStyle} />
                <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2}
                  dot={{ fill: '#8b5cf6', r: 4, strokeWidth: 0 }}
                  activeDot={{ fill: '#8b5cf6', r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Threat Map - CSS grid world map */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Threat Actor Locations</h2>
          <div className="grid grid-cols-[repeat(8,1fr)] grid-rows-[repeat(5,42px)] gap-0.5 bg-border rounded-lg overflow-hidden">
            <div className="bg-(--color-bg-primary) rounded-tl-lg flex items-center justify-center text-xs text-text-muted col-span-3"></div>
            <div className="bg-(--color-bg-primary) col-span-2"></div>
            <div className="bg-(--color-bg-primary) col-span-3 rounded-tr-lg"></div>

            {/* North America */}
            <div className="bg-(--color-bg-primary) row-start-2 row-span-2 col-span-3"></div>
            {/* Europe */}
            <div className="bg-(--color-bg-primary) row-start-2 row-span-2 col-span-2"></div>
            {/* Russia/CIS */}
            <div className="bg-(--color-bg-primary) row-start-2 row-span-2 col-span-3"></div>
            {/* Central America */}
            <div className="bg-(--color-bg-primary) row-start-4 row-span-1 col-span-3"></div>
            {/* Middle East */}
            <div className="bg-(--color-bg-primary) row-start-4 row-span-1 col-span-1"></div>
            {/* South Asia */}
            <div className="bg-(--color-bg-primary) row-start-4 row-span-1 col-span-1"></div>
            {/* SE Asia */}
            <div className="bg-(--color-bg-primary) row-start-4 row-span-1 col-span-2"></div>
            {/* South America */}
            <div className="bg-(--color-bg-primary) row-start-5 row-span-1 col-span-2"></div>
            {/* Africa */}
            <div className="bg-(--color-bg-primary) row-start-5 row-span-1 col-span-3"></div>
            {/* Oceania */}
            <div className="bg-(--color-bg-primary) row-start-5 row-span-1 col-span-3"></div>
          </div>
          <div className="mt-3 space-y-2">
            {WORLD_REGIONS.map((region) => {
              const count = threatRegions[region.name] || 0;
              return (
                <div
                  key={region.name}
                  className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer text-xs transition-colors ${
                    count > 0 ? 'hover:bg-bg-hover' : 'text-text-muted'
                  }`}
                  onClick={() => {
                    if (count > 0) navigate(`/threats/actors?region=${encodeURIComponent(region.name)}`);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-sm ${getRegionColor(count, maxRegionCount)}`} />
                    <span>{region.label}</span>
                  </div>
                  <span className="text-text-secondary">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pending Actions + Activity Stream row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Actions */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Pending Actions</h2>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-8 h-8 rounded-lg bg-bg-tertiary" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-bg-tertiary rounded w-32" />
                    <div className="h-2 bg-bg-tertiary rounded w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : pendingActions.length === 0 ? (
            <EmptyState icon={<CheckCircle2 size={28} />} title="All clear" description="No pending actions" />
          ) : (
            <div className="space-y-3">
              {pendingActions.map((action, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-xl bg-bg-hover cursor-pointer hover:bg-bg-tertiary transition-colors"
                  onClick={() => navigate(action.path)}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent/20 text-accent">{action.icon}</div>
                    <div>
                      <div className="text-sm text-text-primary">{action.label}</div>
                      <div className="text-xs text-text-muted">{action.count} item{action.count !== 1 ? 's' : ''}</div>
                    </div>
                  </div>
                  <button className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary" title="View">
                    <Play size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity Stream */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Activity Stream</h2>
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${refreshInterval > 0 ? 'bg-green-400 animate-pulse' : 'bg-text-muted'}`} />
              <span className="text-xs text-text-muted">{refreshInterval > 0 ? 'Live' : 'Static'}</span>
            </div>
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 pb-3 border-b border-border last:border-0 last:pb-0 animate-pulse">
                  <div className="w-8 h-8 rounded-lg bg-bg-tertiary shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-bg-tertiary rounded w-24" />
                    <div className="h-2 bg-bg-tertiary rounded w-48" />
                  </div>
                  <div className="h-2 bg-bg-tertiary rounded w-12" />
                </div>
              ))}
            </div>
          ) : groupedActivity.length === 0 ? (
            <EmptyState icon={<Clock size={28} />} title="No activity" description="No recent activity" />
          ) : (
            <div className="space-y-2">
              {groupedActivity.map((group) => (
                <div key={group.hour}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">{group.hour}</div>
                    <div className="flex-1 h-px bg-border" />
                    <div className="text-[10px] text-text-muted">{group.items.length} new</div>
                  </div>
                  <div className="space-y-1.5">
                    {group.items.map((item, j) => (
                      <div key={j} className="flex items-start gap-2 py-1 rounded-lg hover:bg-bg-hover transition-colors -mx-1 px-1">
                        <div className="p-1.5 rounded-lg bg-bg-primary shrink-0 mt-0.5">
                          {getModuleIcon(item.module)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-text-primary truncate">{item.detail}</div>
                          <div className="text-[10px] text-text-muted">{item.action}</div>
                        </div>
                        <div className="text-[10px] text-text-muted shrink-0 mt-0.5">{item.time}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
