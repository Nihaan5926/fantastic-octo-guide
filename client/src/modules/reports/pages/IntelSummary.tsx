import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { reportsApi } from '../api';
import PageHeader from '../../../components/common/PageHeader';
import { StatusBadge } from '../../../components/common/Badges';
import {
  FileText, RefreshCw, Download, Save, Shield, Activity, Target,
  Globe, Clock, AlertTriangle, ArrowRight, Calendar, Layers
} from 'lucide-react';

interface SummaryData {
  generatedAt: string;
  period: { start: string; end: string };
  executiveSummary: any;
  threatOverview: any;
  operationalUpdate: any;
  collectionStatus: any;
  watchCenter: any;
}

export default function IntelSummary() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const { data } = await reportsApi.generateSummary({ startDate, endDate });
      setSummary(data);
      toast.success('Intelligence summary generated');
    } catch {
      toast.error('Failed to generate summary');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAsReport = async () => {
    if (!summary) return;
    setSaving(true);
    try {
      const reportTitle = `Intel Summary ${new Date().toISOString().split('T')[0]}`;
      const reportBody = generateHtmlBody(summary);
      await reportsApi.create({
        title: reportTitle,
        content: reportBody,
        summary: generatePlainText(summary),
        classification: 'CONFIDENTIAL',
        priority: 'HIGH',
        status: 'DRAFT',
      });
      toast.success('Saved as report');
    } catch {
      toast.error('Failed to save report');
    } finally {
      setSaving(false);
    }
  };

  const handleExportHTML = () => {
    if (!summary) return;
    const html = generateFullHtml(summary);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `intel-summary-${new Date().toISOString().split('T')[0]}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported as HTML');
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <div>
      <PageHeader title="Intelligence Summary Generator" subtitle="Auto-generate daily intelligence summaries from recent activity">
        <div className="flex items-center gap-2">
          <button onClick={handleGenerate} disabled={loading} className="btn-primary flex items-center gap-2 text-sm">
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <Activity size={14} />}
            {loading ? 'Generating...' : 'Generate'}
          </button>
          {summary && (
            <>
              <button onClick={handleSaveAsReport} disabled={saving} className="btn-secondary flex items-center gap-2 text-sm">
                <Save size={14} /> {saving ? 'Saving...' : 'Save as Report'}
              </button>
              <button onClick={handleExportHTML} className="btn-secondary flex items-center gap-2 text-sm">
                <Download size={14} /> Export HTML
              </button>
            </>
          )}
        </div>
      </PageHeader>

      <div className="flex items-center gap-3 mb-6 card">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-text-muted" />
          <label className="text-sm text-text-secondary">From:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="input text-sm w-40"
          />
        </div>
        <ArrowRight size={14} className="text-text-muted" />
        <div className="flex items-center gap-2">
          <label className="text-sm text-text-secondary">To:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="input text-sm w-40"
          />
        </div>
        <span className="text-xs text-text-muted ml-2">Default: last 7 days</span>
      </div>

      {!summary && !loading && (
        <div className="card text-center py-16">
          <FileText size={48} className="text-text-muted mx-auto mb-4 opacity-30" />
          <h3 className="text-lg font-semibold mb-1">No Summary Generated</h3>
          <p className="text-text-muted text-sm mb-4">Set date range and click Generate to compile an intelligence summary</p>
        </div>
      )}

      {loading && (
        <div className="card text-center py-16">
          <RefreshCw size={40} className="text-accent mx-auto mb-4 animate-spin" />
          <p className="text-text-muted">Compiling intelligence summary across all modules...</p>
        </div>
      )}

      {summary && (
        <div className="space-y-6">
          {/* Section 1: Executive Summary */}
          <div className="card border-l-4 border-l-red-500">
            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
              <Shield size={14} className="text-red-400" /> 1. Executive Summary
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="bg-bg-tertiary rounded-lg p-3 border border-border">
                <p className="text-xl font-bold text-red-400">{summary.executiveSummary.criticalReports}</p>
                <p className="text-[10px] text-text-muted uppercase tracking-wider">Critical Reports</p>
              </div>
              <div className="bg-bg-tertiary rounded-lg p-3 border border-border">
                <p className="text-xl font-bold text-amber-400">{summary.executiveSummary.highPriorityReports}</p>
                <p className="text-[10px] text-text-muted uppercase tracking-wider">High Priority</p>
              </div>
              <div className="bg-bg-tertiary rounded-lg p-3 border border-border">
                <p className="text-xl font-bold text-accent">{summary.threatOverview.actorCount}</p>
                <p className="text-[10px] text-text-muted uppercase tracking-wider">Active Actors</p>
              </div>
              <div className="bg-bg-tertiary rounded-lg p-3 border border-border">
                <p className="text-xl font-bold text-accent">{summary.watchCenter.highSeverityAlerts}</p>
                <p className="text-[10px] text-text-muted uppercase tracking-wider">High Severity Alerts</p>
              </div>
            </div>
            {summary.executiveSummary.recentActivity.length > 0 ? (
              <div className="space-y-1.5">
                {summary.executiveSummary.recentActivity.slice(0, 3).map((r: any) => (
                  <div key={r.id} className="flex items-center gap-2 text-sm bg-bg-tertiary px-3 py-2 rounded-lg">
                    <StatusBadge label={r.priority} color={r.priority === 'CRITICAL' ? 'red' : 'yellow'} />
                    <span className="text-text-primary truncate">{r.title}</span>
                    <span className="text-text-muted text-xs ml-auto">{formatDate(r.created_at)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted py-2">No high-priority reports in the selected period.</p>
            )}
          </div>

          {/* Section 2: Threat Overview */}
          <div className="card border-l-4 border-l-orange-500">
            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
              <Shield size={14} className="text-orange-400" /> 2. Threat Overview
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-semibold text-text-muted uppercase mb-2">Recent Actor Activity ({summary.threatOverview.actorCount})</h4>
                {summary.threatOverview.recentActors.length > 0 ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {summary.threatOverview.recentActors.map((actor: any) => (
                      <div key={actor.id} className="flex items-center gap-2 text-sm bg-bg-tertiary px-3 py-2 rounded-lg">
                        <StatusBadge label={actor.status} color={actor.status === 'ACTIVE' ? 'red' : 'gray'} />
                        <span className="text-text-primary truncate">{actor.name}</span>
                        <StatusBadge label={actor.sophistication} color="blue" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-text-muted">No recent threat actor activity.</p>
                )}
              </div>
              <div>
                <h4 className="text-xs font-semibold text-text-muted uppercase mb-2">New Indicators ({summary.threatOverview.newIocCount})</h4>
                {summary.threatOverview.newIndicators.length > 0 ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {summary.threatOverview.newIndicators.map((ind: any) => (
                      <div key={ind.id} className="flex items-center gap-2 text-sm bg-bg-tertiary px-3 py-2 rounded-lg">
                        <StatusBadge label={ind.type} color="blue" />
                        <span className="text-text-primary font-mono text-xs truncate">{ind.value}</span>
                        <span className="text-text-muted text-xs ml-auto">{ind.actor_name || '—'}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-text-muted">No new indicators in this period.</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Operational Update */}
          <div className="card border-l-4 border-l-blue-500">
            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
              <Target size={14} className="text-blue-400" /> 3. Operational Update
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-semibold text-text-muted uppercase mb-2">Case Activity ({summary.operationalUpdate.caseCount})</h4>
                {summary.operationalUpdate.caseChanges.length > 0 ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {summary.operationalUpdate.caseChanges.map((c: any) => (
                      <div key={c.id} className="flex items-center gap-2 text-sm bg-bg-tertiary px-3 py-2 rounded-lg">
                        <StatusBadge label={c.status} color={c.status === 'CLOSED' ? 'green' : c.status === 'IN_PROGRESS' ? 'yellow' : 'blue'} />
                        <span className="text-text-primary truncate">{c.title || c.reference_number}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-text-muted">No recent case activity.</p>
                )}
              </div>
              <div>
                <h4 className="text-xs font-semibold text-text-muted uppercase mb-2">New Missions ({summary.operationalUpdate.missionCount})</h4>
                {summary.operationalUpdate.newMissions.length > 0 ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {summary.operationalUpdate.newMissions.map((m: any) => (
                      <div key={m.id} className="flex items-center gap-2 text-sm bg-bg-tertiary px-3 py-2 rounded-lg">
                        <Target size={12} className="text-accent" />
                        <span className="text-text-primary truncate">{m.title || m.name || m.id}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-text-muted">No new missions created.</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 4: Collection Status */}
          <div className="card border-l-4 border-l-green-500">
            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
              <Globe size={14} className="text-green-400" /> 4. Collection Status
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-semibold text-text-muted uppercase mb-2">OSINT Tasks Run ({summary.collectionStatus.tasksRun})</h4>
                {summary.collectionStatus.osintTasks.length > 0 ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {summary.collectionStatus.osintTasks.map((t: any) => (
                      <div key={t.id} className="flex items-center gap-2 text-sm bg-bg-tertiary px-3 py-2 rounded-lg">
                        <Globe size={12} className="text-text-muted" />
                        <span className="text-text-primary truncate">{t.title || t.name || t.query || t.id}</span>
                        <span className="text-xs text-text-muted ml-auto">{formatDate(t.created_at)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-text-muted">No OSINT tasks run.</p>
                )}
              </div>
              <div>
                <h4 className="text-xs font-semibold text-text-muted uppercase mb-2">New Sources ({summary.collectionStatus.sourcesDiscovered})</h4>
                {summary.collectionStatus.newSources.length > 0 ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {summary.collectionStatus.newSources.map((s: any) => (
                      <div key={s.id} className="flex items-center gap-2 text-sm bg-bg-tertiary px-3 py-2 rounded-lg">
                        <Layers size={12} className="text-text-muted" />
                        <span className="text-text-primary truncate">{s.name || s.title || s.id}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-text-muted">No new sources discovered.</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 5: Watch Center */}
          <div className="card border-l-4 border-l-purple-500">
            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
              <Clock size={14} className="text-purple-400" /> 5. Watch Center
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="bg-bg-tertiary rounded-lg p-3 border border-border">
                <p className="text-xl font-bold text-text-primary">{summary.watchCenter.totalAlerts}</p>
                <p className="text-[10px] text-text-muted uppercase tracking-wider">Total Alerts</p>
              </div>
              <div className="bg-bg-tertiary rounded-lg p-3 border border-red-500/30">
                <p className="text-xl font-bold text-red-400">{summary.watchCenter.highSeverityAlerts}</p>
                <p className="text-[10px] text-text-muted uppercase tracking-wider">High Severity</p>
              </div>
              <div className="bg-bg-tertiary rounded-lg p-3 border border-border">
                <p className="text-xl font-bold text-text-primary">{summary.watchCenter.totalSitreps}</p>
                <p className="text-[10px] text-text-muted uppercase tracking-wider">SITREPs</p>
              </div>
              <div className="bg-bg-tertiary rounded-lg p-3 border border-border">
                <p className="text-xl font-bold text-accent">
                  {summary.watchCenter.totalAlerts + summary.threatOverview.newIocCount}
                </p>
                <p className="text-[10px] text-text-muted uppercase tracking-wider">Total Indicators</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-semibold text-text-muted uppercase mb-2">Recent Alerts</h4>
                {summary.watchCenter.recentAlerts.length > 0 ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {summary.watchCenter.recentAlerts.map((a: any) => (
                      <div key={a.id} className="flex items-center gap-2 text-sm bg-bg-tertiary px-3 py-2 rounded-lg">
                        <AlertTriangle size={12} className={a.severity === 'HIGH' || a.severity === 'CRITICAL' ? 'text-red-400' : 'text-amber-400'} />
                        <span className="text-text-primary truncate">{a.title || a.message || a.id}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-text-muted">No recent alerts.</p>
                )}
              </div>
              <div>
                <h4 className="text-xs font-semibold text-text-muted uppercase mb-2">Recent SITREPs</h4>
                {summary.watchCenter.recentSitreps.length > 0 ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {summary.watchCenter.recentSitreps.map((s: any) => (
                      <div key={s.id} className="flex items-center gap-2 text-sm bg-bg-tertiary px-3 py-2 rounded-lg">
                        <FileText size={12} className="text-text-muted" />
                        <span className="text-text-primary truncate">{s.title || s.subject || s.id}</span>
                        <span className="text-xs text-text-muted ml-auto">{formatDate(s.created_at)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-text-muted">No recent SITREPs.</p>
                )}
              </div>
            </div>
          </div>

          <div className="text-xs text-text-muted text-center py-4">
            Generated at {formatDate(summary.generatedAt)} | Period: {formatDate(summary.period.start)} — {formatDate(summary.period.end)}
          </div>
        </div>
      )}
    </div>
  );
}

function generatePlainText(summary: SummaryData): string {
  const lines = [
    'INTELLIGENCE SUMMARY',
    `Period: ${new Date(summary.period.start).toLocaleDateString()} — ${new Date(summary.period.end).toLocaleDateString()}`,
    `Generated: ${new Date(summary.generatedAt).toLocaleString()}`,
    '',
    `EXECUTIVE SUMMARY: ${summary.executiveSummary.criticalReports} critical, ${summary.executiveSummary.highPriorityReports} high priority reports`,
    '',
    `THREAT OVERVIEW: ${summary.threatOverview.actorCount} active actors, ${summary.threatOverview.newIocCount} new IOCs`,
    '',
    `OPERATIONAL UPDATE: ${summary.operationalUpdate.caseCount} case changes, ${summary.operationalUpdate.missionCount} new missions`,
    '',
    `COLLECTION STATUS: ${summary.collectionStatus.tasksRun} OSINT tasks, ${summary.collectionStatus.sourcesDiscovered} new sources`,
    '',
    `WATCH CENTER: ${summary.watchCenter.totalAlerts} alerts (${summary.watchCenter.highSeverityAlerts} high), ${summary.watchCenter.totalSitreps} SITREPs`,
  ];
  return lines.join('\n');
}

function generateHtmlBody(summary: SummaryData): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Intel Summary</title>
<style>
  body { font-family: Arial, sans-serif; margin: 40px; color: #1a1a1a; background: #fff; }
  h1 { border-bottom: 2px solid #333; padding-bottom: 10px; }
  h2 { color: #333; margin-top: 30px; }
  .meta { color: #666; font-size: 12px; margin-bottom: 20px; }
  .stats { display: flex; gap: 20px; margin: 15px 0; }
  .stat { background: #f5f5f5; padding: 12px 16px; border-radius: 8px; border: 1px solid #e0e0e0; }
  .stat-value { font-size: 24px; font-weight: bold; color: #1a1a1a; }
  .stat-label { font-size: 11px; color: #888; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; }
  th { text-align: left; padding: 8px; border-bottom: 2px solid #ddd; font-size: 11px; color: #888; text-transform: uppercase; }
  td { padding: 8px; border-bottom: 1px solid #eee; font-size: 13px; }
  .footer { margin-top: 40px; border-top: 1px solid #ccc; padding-top: 10px; font-size: 10px; color: #999; }
</style></head><body>
  <h1>INTELLIGENCE SUMMARY</h1>
  <div class="meta">Period: ${new Date(summary.period.start).toLocaleDateString()} — ${new Date(summary.period.end).toLocaleDateString()}</div>

  <h2>1. Executive Summary</h2>
  <div class="stats">
    <div class="stat"><div class="stat-value">${summary.executiveSummary.criticalReports}</div><div class="stat-label">Critical Reports</div></div>
    <div class="stat"><div class="stat-value">${summary.executiveSummary.highPriorityReports}</div><div class="stat-label">High Priority</div></div>
    <div class="stat"><div class="stat-value">${summary.threatOverview.actorCount}</div><div class="stat-label">Active Actors</div></div>
    <div class="stat"><div class="stat-value">${summary.watchCenter.highSeverityAlerts}</div><div class="stat-label">High Severity Alerts</div></div>
  </div>

  <h2>2. Threat Overview</h2>
  <p>${summary.threatOverview.actorCount} active threat actors identified with ${summary.threatOverview.newIocCount} new indicators of compromise.</p>

  <h2>3. Operational Update</h2>
  <p>${summary.operationalUpdate.caseCount} case status changes recorded. ${summary.operationalUpdate.missionCount} new missions initiated.</p>

  <h2>4. Collection Status</h2>
  <p>${summary.collectionStatus.tasksRun} OSINT collection tasks executed. ${summary.collectionStatus.sourcesDiscovered} new intelligence sources discovered.</p>

  <h2>5. Watch Center</h2>
  <p>${summary.watchCenter.totalAlerts} alerts received (${summary.watchCenter.highSeverityAlerts} high severity). ${summary.watchCenter.totalSitreps} SITREPs filed.</p>

  <div class="footer">Generated by ICMP Intelligence Summary Generator | ${new Date(summary.generatedAt).toISOString()}</div>
</body></html>`;
}

function generateFullHtml(summary: SummaryData): string {
  return generateHtmlBody(summary);
}
