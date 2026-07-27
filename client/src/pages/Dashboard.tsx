import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Users, Briefcase, Shield, Target, Clock, Loader2, RefreshCw, FileBarChart } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { useSocket } from '../hooks/useSocket';
import api from '../api/client';
import { StatCardSkeleton, ChartSkeleton } from '../components/common/LoadingSkeleton';
import EmptyState from '../components/common/EmptyState';

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444'];

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color: string;
  isLoading?: boolean;
  onClick: () => void;
}

function StatCard({ icon, label, value, sub, color, isLoading, onClick }: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className="card flex items-start gap-4 cursor-pointer hover:border-accent/50 transition-colors"
    >
      <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
      <div>
        {isLoading ? (
          <Loader2 className="animate-spin text-text-muted mb-1" size={24} />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        <div className="text-sm text-text-secondary">{label}</div>
        {sub && <div className="text-xs text-text-muted mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

interface DashboardStats {
  activeReports: number;
  inReviewReports: number;
  activeSources: number;
  openCases: number;
  criticalCases: number;
  activeThreats: number;
  activeMissions: number;
  highAlerts: number;
}

interface ActivityItem {
  action: string;
  detail: string;
  time: string;
  user?: string;
}

interface ClassificationItem {
  name: string;
  value: number;
  color: string;
}

interface CaseStatusItem {
  status: string;
  count: number;
}

interface TimelineItem {
  month: string;
  count: number;
}

export default function DashboardPage() {
  useSocket();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { fetchUnreadCount } = useNotificationStore();
  const [isLoading, setIsLoading] = React.useState(true);
  const [stats, setStats] = React.useState<DashboardStats>({
    activeReports: 0, inReviewReports: 0, activeSources: 0,
    openCases: 0, criticalCases: 0, activeThreats: 0,
    activeMissions: 0, highAlerts: 0,
  });
  const [activity, setActivity] = React.useState<ActivityItem[]>([]);
  const [classificationData, setClassificationData] = React.useState<ClassificationItem[]>([]);
  const [caseStatusData, setCaseStatusData] = React.useState<CaseStatusItem[]>([]);
  const [timelineData, setTimelineData] = React.useState<TimelineItem[]>([]);
  const [totalEvidence, setTotalEvidence] = React.useState(0);
  const [totalOsintTasks, setTotalOsintTasks] = React.useState(0);
  const [totalPersonnel, setTotalPersonnel] = React.useState(0);
  const [totalCI, setTotalCI] = React.useState(0);
  const [totalBudgets, setTotalBudgets] = React.useState(0);

  const fetchDashboardData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [
        reportsRes, reportsAllRes, casesAllRes, casesOpenRes,
        threatsRes, missionsRes, watchLogsRes,
        evidenceRes, indicatorsRes,
        sourcesRes, osintRes, personnelRes, ciRes, budgetRes,
      ] = await Promise.all([
        api.get('/reports', { params: { limit: 1 } }),
        api.get('/reports', { params: { limit: 1000 } }),
        api.get('/cases', { params: { limit: 1000 } }),
        api.get('/cases', { params: { limit: 1, status: 'OPEN' } }),
        api.get('/threats/actors', { params: { limit: 1 } }),
        api.get('/missions/plans', { params: { limit: 1 } }),
        api.get('/watch-center/logs', { params: { limit: 1 } }),
        api.get('/evidence', { params: { limit: 1 } }),
        api.get('/threats/indicators', { params: { limit: 1000 } }),
        api.get('/sources', { params: { limit: 1, status: 'ACTIVE' } }),
        api.get('/osint/tasks', { params: { limit: 1 } }).catch(() => ({ data: { pagination: { total: 0 } } })),
        api.get('/personnel', { params: { limit: 1 } }).catch(() => ({ data: { pagination: { total: 0 } } })),
        api.get('/ci/investigations', { params: { limit: 1 } }).catch(() => ({ data: { pagination: { total: 0 } } })),
        api.get('/budget/budgets', { params: { limit: 1 } }).catch(() => ({ data: { pagination: { total: 0 } } })),
      ]);

      const totalReports = reportsRes.data.pagination.total;
      const sourcesActive = sourcesRes.data.pagination.total;
      const totalCases = casesAllRes.data.pagination.total;
      const casesOpenCount = casesOpenRes.data.pagination.total;
      const totalThreats = threatsRes.data.pagination.total;
      const totalMissions = missionsRes.data.pagination.total;
      const highAlertsCount = watchLogsRes.data.pagination.total;
      const totalEvidenceCount = evidenceRes.data.pagination.total;

      setTotalEvidence(totalEvidenceCount);
      setTotalOsintTasks(osintRes.data.pagination.total);
      setTotalPersonnel(personnelRes.data.pagination.total);
      setTotalCI(ciRes.data.pagination.total);
      setTotalBudgets(budgetRes.data.pagination.total);

      // Additional filtered counts
      let inReview = 0;
      try {
        const { data: reviewData } = await api.get('/reports', { params: { limit: 1, status: 'IN_REVIEW' } });
        inReview = reviewData.pagination.total;
      } catch {}

      let criticalCasesCount = 0;
      try {
        const { data: criticalData } = await api.get('/cases', { params: { limit: 1, priority: 'CRITICAL' } });
        criticalCasesCount = criticalData.pagination.total;
      } catch {}

      let activeThreatsCount = 0;
      try {
        const { data: activeData } = await api.get('/threats/actors', { params: { limit: 1, status: 'ACTIVE' } });
        activeThreatsCount = activeData.pagination.total;
      } catch {}

      let activeMissionCount = 0;
      try {
        const { data: activeMissionsData } = await api.get('/missions/plans', { params: { limit: 1, status: 'ACTIVE' } });
        activeMissionCount = activeMissionsData.pagination.total;
      } catch {}

      let highAlertsTotal = 0;
      try {
        const { data: highData } = await api.get('/watch-center/logs', { params: { limit: 1, severity: 'HIGH' } });
        highAlertsTotal = highData.pagination.total;
      } catch {}

      setStats({
        activeReports: totalReports,
        inReviewReports: inReview,
        activeSources: sourcesActive,
        openCases: casesOpenCount,
        criticalCases: criticalCasesCount,
        activeThreats: activeThreatsCount,
        activeMissions: activeMissionCount,
        highAlerts: highAlertsTotal,
      });

      // Classification distribution from reports
      const classificationCounts: Record<string, number> = {};
      const reportsData = reportsAllRes.data.data || reportsAllRes.data;
      if (Array.isArray(reportsData)) {
        for (const r of reportsData) {
          const cls = r.classification || 'UNCLASSIFIED';
          classificationCounts[cls] = (classificationCounts[cls] || 0) + 1;
        }
      }
      const clsLabels: Record<string, string> = {
        UNCLASSIFIED: 'Unclassified',
        CONFIDENTIAL: 'Confidential',
        SECRET: 'Secret',
        TOP_SECRET: 'Top Secret',
      };
      const clsColors: Record<string, string> = {
        UNCLASSIFIED: '#22c55e',
        CONFIDENTIAL: '#3b82f6',
        SECRET: '#f59e0b',
        TOP_SECRET: '#ef4444',
      };
      setClassificationData(
        Object.entries(classificationCounts).map(([key, count]) => ({
          name: clsLabels[key] || key,
          value: count,
          color: clsColors[key] || CHART_COLORS[0],
        }))
      );

      // Case status breakdown
      const caseStatusCounts: Record<string, number> = {};
      const casesData = casesAllRes.data.data || casesAllRes.data;
      if (Array.isArray(casesData)) {
        for (const c of casesData) {
          const status = c.status || 'UNKNOWN';
          caseStatusCounts[status] = (caseStatusCounts[status] || 0) + 1;
        }
      }
      setCaseStatusData(
        Object.entries(caseStatusCounts).map(([status, count]) => ({
          status: status.replace(/_/g, ' '),
          count,
        }))
      );

      // Threat indicator timeline – group by month
      const monthCounts: Record<string, number> = {};
      const indicatorsData = indicatorsRes.data.data || indicatorsRes.data;
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
      const sortedMonths = Object.entries(monthCounts)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, count]) => ({
          month,
          count,
        }));
      setTimelineData(sortedMonths);

      // Activity feed
      const activityItems: ActivityItem[] = [];
      const formatTime = (dateStr: string) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        const hours = Math.floor(diff / 3600000);
        if (hours < 1) return 'Just now';
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
      };

      try {
        const { data: recentReports } = await api.get('/reports', { params: { limit: 5 } });
        for (const r of recentReports.data) {
          activityItems.push({
            action: 'Report created',
            detail: `${r.reference_number} - ${r.title}`,
            time: formatTime(r.created_at),
            user: r.author_first ? `${r.author_first} ${r.author_last}` : undefined,
          });
        }
      } catch {}

      try {
        const { data: recentCases } = await api.get('/cases', { params: { limit: 3 } });
        for (const c of recentCases.data) {
          activityItems.push({
            action: 'Case opened',
            detail: `${c.reference_number} - ${c.title}`,
            time: formatTime(c.created_at),
            user: c.lead_first ? `${c.lead_first} ${c.lead_last}` : undefined,
          });
        }
      } catch {}

      try {
        const { data: recentEvidence } = await api.get('/evidence', { params: { limit: 3 } });
        for (const e of recentEvidence.data) {
          activityItems.push({
            action: 'Evidence uploaded',
            detail: e.title,
            time: formatTime(e.created_at),
            user: e.uploader_first ? `${e.uploader_first} ${e.uploader_last}` : undefined,
          });
        }
      } catch {}

      activityItems.sort((a, b) => b.time.localeCompare(a.time));
      setActivity(activityItems.slice(0, 8));
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchUnreadCount();
    fetchDashboardData();
  }, [fetchUnreadCount, fetchDashboardData]);

  const statCards = [
    { icon: <FileText size={20} />, label: 'Total Reports', value: String(stats.activeReports), sub: stats.inReviewReports > 0 ? `${stats.inReviewReports} in review` : undefined, color: 'bg-blue-500/20 text-blue-400', path: '/reports' },
    { icon: <Users size={20} />, label: 'Active Sources', value: String(stats.activeSources), sub: 'Across 6 INT types', color: 'bg-purple-500/20 text-purple-400', path: '/sources' },
    { icon: <Briefcase size={20} />, label: 'Open Cases', value: String(stats.openCases), sub: stats.criticalCases > 0 ? `${stats.criticalCases} critical` : undefined, color: 'bg-amber-500/20 text-amber-400', path: '/cases' },
    { icon: <Shield size={20} />, label: 'Active Threats', value: String(stats.activeThreats), sub: `${stats.activeThreats} monitored`, color: 'bg-red-500/20 text-red-400', path: '/threats' },
    { icon: <Target size={20} />, label: 'Active Missions', value: String(stats.activeMissions), sub: stats.activeMissions > 0 ? 'Operational' : 'None active', color: 'bg-emerald-500/20 text-emerald-400', path: '/missions' },
    { icon: <Clock size={20} />, label: 'High Alerts', value: String(stats.highAlerts), sub: 'Requires attention', color: 'bg-cyan-500/20 text-cyan-400', path: '/watch-center' },
  ];

  const chartTooltipStyle = {
    contentStyle: {
      background: '#1e293b',
      border: '1px solid #334155',
      borderRadius: '12px',
      color: '#f8fafc',
      fontSize: '13px',
    },
    itemStyle: { color: '#94a3b8' },
    labelStyle: { color: '#f8fafc', fontWeight: 'bold' as const },
  };

  const axisTickStyle = { fill: '#94a3b8', fontSize: 12 };
  const gridStyle = { stroke: '#334155', strokeDasharray: '4 4' };

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-text-muted mt-1">
            Welcome back, {user?.firstName}. Clearance: {user?.clearance} · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button onClick={fetchDashboardData} className="btn-secondary" disabled={isLoading}>
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />)
          : statCards.map((s, i) => (
              <StatCard key={i} {...s} isLoading={false} onClick={() => navigate(s.path)} />
            ))
        }
      </div>

      {/* Chart Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Classification Distribution Pie */}
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
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                  onClick={(data: any) => {
                    const clsMap: Record<string, string> = {
                      Unclassified: 'UNCLASSIFIED', Confidential: 'CONFIDENTIAL',
                      Secret: 'SECRET', 'Top Secret': 'TOP_SECRET',
                    };
                    const cls = clsMap[data.name] || data.name;
                    navigate(`/reports?classification=${encodeURIComponent(cls)}`);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  {classificationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip {...chartTooltipStyle} />
                <Legend
                  wrapperStyle={{ color: '#94a3b8', fontSize: '12px' }}
                  iconType="circle"
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Case Status Breakdown Bar */}
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
                <Bar
                  dataKey="count"
                  fill="#3b82f6"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={60}
                  onClick={(data: any) => {
                    navigate(`/cases?status=${encodeURIComponent(data.status)}`);
                  }}
                  style={{ cursor: 'pointer' }}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Threat Activity Timeline */}
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
              <Line
                type="monotone"
                dataKey="count"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ fill: '#8b5cf6', r: 4, strokeWidth: 0 }}
                activeDot={{ fill: '#8b5cf6', r: 6, strokeWidth: 0, onClick: (_, payload: any) => {
                  const month = payload?.payload?.month;
                  if (month) navigate(`/threats/indicators?month=${encodeURIComponent(month)}`);
                } }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Recent Activity + Quick Stats Grid row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 pb-3 border-b border-border last:border-0 last:pb-0 animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-bg-tertiary mt-2 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-bg-tertiary rounded w-24" />
                    <div className="h-2 bg-bg-tertiary rounded w-48" />
                  </div>
                  <div className="space-y-1">
                    <div className="h-2 bg-bg-tertiary rounded w-12" />
                    <div className="h-2 bg-bg-tertiary rounded w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : activity.length === 0 ? (
            <EmptyState icon={<Clock size={28} />} title="No activity" description="No recent activity" />
          ) : (
            <div className="space-y-3">
              {activity.map((item, i) => (
                <div key={i} className="flex items-start gap-3 pb-3 border-b border-border last:border-0 last:pb-0">
                  <div className="w-2 h-2 rounded-full bg-accent mt-2 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{item.action}</div>
                    <div className="text-xs text-text-secondary truncate">{item.detail}</div>
                  </div>
                  <div className="text-xs text-text-muted shrink-0 text-right">
                    <div>{item.time}</div>
                    {item.user && <div>{item.user}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Stats Grid */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Quick Stats</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Total Entities', value: stats.activeReports + stats.openCases + totalEvidence },
              { label: 'Active Missions', value: stats.activeMissions },
              { label: 'Tracked Indicators', value: timelineData.reduce((sum, d) => sum + d.count, 0) },
              { label: 'OSINT Tasks', value: totalOsintTasks },
              { label: 'Personnel', value: totalPersonnel },
              { label: 'Open CI Investigations', value: totalCI },
              { label: 'Active Budgets', value: totalBudgets },
              { label: 'Watch Alerts', value: stats.highAlerts },
            ].map((item, i) => (
              <div key={i} className="bg-bg-primary rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-accent">
                  {isLoading ? <Loader2 className="animate-spin mx-auto" size={20} /> : item.value}
                </div>
                <div className="text-xs text-text-muted mt-1">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
