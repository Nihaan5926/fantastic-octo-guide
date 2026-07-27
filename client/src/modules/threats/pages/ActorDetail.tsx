import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useThreatStore } from '../store';
import DataTable from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import PageHeader from '../../../components/common/PageHeader';
import { FormInput, FormSelect } from '../../../components/common/FormComponents';
import { StatusBadge } from '../../../components/common/Badges';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { Trash2, ArrowLeft, Plus, Download, Activity, Clock } from 'lucide-react';

const statusColorMap: Record<string, string> = {
  ACTIVE: 'red', INACTIVE: 'gray', DEFUNCT: 'purple', MONITORED: 'yellow',
};

const sophisticationColorMap: Record<string, string> = {
  LOW: 'gray', MEDIUM: 'blue', HIGH: 'yellow', ADVANCED: 'red', NATION_STATE: 'purple',
};

const sophisticationScore: Record<string, number> = {
  LOW: 20, MEDIUM: 40, HIGH: 60, ADVANCED: 80, NATION_STATE: 100,
};

const confidenceScore: Record<string, number> = {
  LOW: 25, MEDIUM: 50, HIGH: 75, CRITICAL: 100,
};

const indicatorTypeOptions = [
  { value: 'IP', label: 'IP Address' },
  { value: 'DOMAIN', label: 'Domain' },
  { value: 'URL', label: 'URL' },
  { value: 'HASH', label: 'File Hash' },
  { value: 'EMAIL', label: 'Email Address' },
  { value: 'MUTEX', label: 'Mutex' },
  { value: 'REGISTRY', label: 'Registry Key' },
  { value: 'OTHER', label: 'Other' },
];

const confidenceOptions = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

const confidenceColorMap: Record<string, string> = {
  LOW: 'gray', MEDIUM: 'blue', HIGH: 'yellow', CRITICAL: 'red',
};

interface IndicatorForm {
  type: string;
  value: string;
  confidence: string;
}

const emptyIndicator: IndicatorForm = { type: 'IP', value: '', confidence: 'MEDIUM' };

function RiskScoreCard({ score }: { score: number }) {
  const radius = 44;
  const stroke = 6;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const color = score >= 70 ? '#ef4444' : score >= 40 ? '#f59e0b' : '#22c55e';
  const textColor = score >= 70 ? 'text-red-400' : score >= 40 ? 'text-amber-400' : 'text-emerald-400';

  return (
    <div className="flex flex-col items-center">
      <div className="relative inline-flex items-center justify-center">
        <svg height="100" width="100">
          <circle
            stroke="#334155"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx="50"
            cy="50"
          />
          <circle
            stroke={color}
            fill="transparent"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            r={normalizedRadius}
            cx="50"
            cy="50"
            style={{ transition: 'stroke-dashoffset 0.8s ease-out', transform: 'rotate(-90deg)', transformOrigin: 'center' }}
          />
        </svg>
        <span className={`absolute text-xl font-bold ${textColor}`}>{score}</span>
      </div>
      <span className="text-xs text-text-muted mt-1">Risk Score</span>
    </div>
  );
}

function TtpBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-violet-500/15 text-violet-400 border border-violet-500/25 mr-1.5 mb-1.5">
      {label}
    </span>
  );
}

const entityTypeColorMap: Record<string, string> = {
  threat_actor: 'red', case: 'amber', report: 'blue', source: 'purple', evidence: 'green', indicator: 'yellow',
};

const relTypeColorMap: Record<string, string> = {
  RELATED_TO: 'blue', PART_OF: 'purple', LEADS_TO: 'yellow',
  SUPPORTS: 'green', CONTRADICTS: 'red', REFERENCES: 'gray',
  ATTRIBUTED_TO: 'yellow', LOCATED_IN: 'green',
};

export default function ActorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    selectedActor, indicators, relationships, summary,
    isLoading, isSubmitting,
    fetchActor, fetchIndicators, createIndicator, removeIndicator,
    fetchActorRelationships, fetchActorSummary,
  } = useThreatStore();
  const [indicatorFormOpen, setIndicatorFormOpen] = useState(false);
  const [indicatorForm, setIndicatorForm] = useState<IndicatorForm>(emptyIndicator);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  useEffect(() => {
    if (id) {
      fetchActor(id);
      fetchIndicators(id);
      fetchActorRelationships(id);
      fetchActorSummary(id);
    }
  }, [id]);

  const openCreateIndicator = () => {
    setIndicatorForm(emptyIndicator);
    setIndicatorFormOpen(true);
  };

  const handleIndicatorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await createIndicator(id, indicatorForm);
      toast.success('Indicator created');
      setIndicatorFormOpen(false);
      fetchIndicators(id);
      fetchActorSummary(id);
    } catch {
      toast.error('Operation failed');
    }
  };

  const handleIndicatorDelete = async () => {
    if (!deleteTarget || !id) return;
    try {
      await removeIndicator(deleteTarget.id);
      toast.success('Indicator deleted');
      setDeleteTarget(null);
      fetchActorSummary(id);
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleExport = () => {
    const profile = {
      actor: selectedActor,
      indicators,
      relationships,
      summary,
      exportedAt: new Date().toISOString(),
    };
    console.log('Exporting actor profile:', JSON.stringify(profile, null, 2));
    toast.success('Actor profile exported to console');
  };

  const riskScore = useMemo(() => {
    const sophWeight = sophisticationScore[selectedActor?.sophistication] || 20;
    if (indicators.length === 0) return Math.round(sophWeight * 0.6);
    const avgConf = indicators.reduce((sum: number, ind: any) => sum + (confidenceScore[ind.confidence] || 25), 0) / indicators.length;
    return Math.round(sophWeight * 0.5 + avgConf * 0.5);
  }, [selectedActor?.sophistication, indicators]);

  const threatLevel = riskScore < 30 ? 'LOW' : riskScore < 60 ? 'MODERATE' : 'HIGH';
  const threatLevelColor = riskScore < 30 ? 'text-emerald-400' : riskScore < 60 ? 'text-amber-400' : 'text-red-400';
  const threatBorderColor = riskScore < 30 ? 'border-emerald-500/30' : riskScore < 60 ? 'border-amber-500/30' : 'border-red-500/30';

  const ttps = useMemo(() => {
    const metadata = selectedActor?.metadata || selectedActor?.entity_custom_fields;
    if (!metadata) return [];
    if (Array.isArray(metadata)) return metadata;
    if (typeof metadata === 'object') {
      const ttp = metadata.ttp || metadata.TTP || metadata.tactics_techniques_procedures;
      if (Array.isArray(ttp)) return ttp;
      if (typeof ttp === 'string') return [ttp];
      return Object.values(metadata).filter((v) => typeof v === 'string');
    }
    return [];
  }, [selectedActor]);

  const sortedIndicators = useMemo(() => {
    return [...indicators].sort((a: any, b: any) => {
      const aDate = a.first_seen || a.created_at;
      const bDate = b.first_seen || b.created_at;
      if (!aDate) return 1;
      if (!bDate) return -1;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
  }, [indicators]);

  const caseRelationships = useMemo(() => {
    return (relationships || []).filter(
      (r: any) => r.relationship_type === 'ATTRIBUTED_TO' || r.source_type === 'case' || r.target_type === 'case'
    );
  }, [relationships]);

  const indicatorColumns = [
    {
      key: 'type',
      label: 'Type',
      render: (item: any) => <StatusBadge label={item.type} color="blue" />,
    },
    { key: 'value', label: 'Value' },
    {
      key: 'confidence',
      label: 'Confidence',
      render: (item: any) => <StatusBadge label={item.confidence} color={confidenceColorMap[item.confidence] || 'gray'} />,
    },
    {
      key: 'actions',
      label: '',
      className: 'w-24',
      render: (item: any) => (
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(item); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-red-400">
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  if (isLoading && !selectedActor) {
    return (
      <div className="card text-center py-16">
        <div className="animate-pulse text-text-muted">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={selectedActor?.name || 'Actor Detail'} subtitle="View actor details and associated indicators">
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
            <Download size={16} /> Export
          </button>
          <button onClick={() => navigate('/threats/actors')} className="btn-secondary flex items-center gap-2">
            <ArrowLeft size={16} /> Back to Actors
          </button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="card">
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">Threat Assessment</h3>
          <div className="flex justify-center mb-4">
            <RiskScoreCard score={riskScore} />
          </div>
          <div className={`border rounded-lg p-3 mb-4 ${threatBorderColor} bg-bg-tertiary/30`}>
            <div className="flex items-center justify-center">
              <span className={`text-sm font-bold uppercase ${threatLevelColor}`}>{threatLevel} THREAT</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-xs text-text-muted">Status</span>
              <StatusBadge label={selectedActor?.status || 'N/A'} color={statusColorMap[selectedActor?.status] || 'gray'} />
            </div>
      <div className="flex justify-between">
        <span className="text-xs text-text-muted">Sophistication</span>
        <StatusBadge label={selectedActor?.sophistication || 'N/A'} color={sophisticationColorMap[selectedActor?.sophistication] || 'gray'} />
      </div>
      <div>
        <span className="text-xs text-text-muted">Threat Level</span>
        <div className="mt-1.5">
          <div className="w-full bg-bg-tertiary rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${riskScore < 30 ? 'bg-emerald-500' : riskScore < 60 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${Math.min(riskScore, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className={`text-xs font-semibold ${riskScore < 30 ? 'text-emerald-400' : riskScore < 60 ? 'text-amber-400' : 'text-red-400'}`}>
              {riskScore < 30 ? 'LOW' : riskScore < 60 ? 'MODERATE' : 'HIGH'}
            </span>
            <span className="text-xs text-text-muted">{riskScore}/100</span>
          </div>
        </div>
      </div>
            {summary && (
              <>
                <div className="flex justify-between">
                  <span className="text-xs text-text-muted">Indicators</span>
                  <span className="text-sm font-medium">{summary.indicatorCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-text-muted">Related Cases</span>
                  <span className="text-sm font-medium">{summary.relatedCaseCount}</span>
                </div>
              </>
            )}
            <div>
              <span className="text-xs text-text-muted">Aliases</span>
              <p className="text-sm mt-0.5">
                {Array.isArray(selectedActor?.aliases) && selectedActor.aliases.length > 0
                  ? selectedActor.aliases.join(', ')
                  : '—'}
              </p>
            </div>
            <div>
              <span className="text-xs text-text-muted">Motivation</span>
              <p className="text-sm mt-0.5">{selectedActor?.motivation || '—'}</p>
            </div>
            <div>
              <span className="text-xs text-text-muted">Description</span>
              <p className="text-sm mt-0.5 whitespace-pre-wrap">{selectedActor?.description || '—'}</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
              <Activity size={14} /> Tactics, Techniques & Procedures
            </h3>
            {ttps.length > 0 ? (
              <div className="flex flex-wrap">
                {ttps.map((ttp: string, idx: number) => (
                  <TtpBadge key={idx} label={ttp} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted">No TTP data recorded for this actor.</p>
            )}
          </div>

          <div className="card">
            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">Associated Cases</h3>
            {caseRelationships.length > 0 ? (
              <div className="space-y-2">
                {caseRelationships.map((rel: any) => (
                  <div key={rel.id} className="flex items-center justify-between px-3 py-2 bg-bg-tertiary rounded-lg border border-border">
                    <div className="flex items-center gap-2">
                      <StatusBadge label={rel.relationship_type} color={relTypeColorMap[rel.relationship_type] || 'gray'} />
                      <span className="text-sm">
                        {rel.source_type === 'case' ? rel.source_id : rel.target_type === 'case' ? rel.target_id : `${rel.source_type}:${rel.source_id} → ${rel.target_type}:${rel.target_id}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-muted">{new Date(rel.created_at).toLocaleDateString()}</span>
                      {rel.source_type === 'case' && (
                        <button onClick={() => navigate(`/cases/${rel.source_id}`)} className="text-xs text-accent hover:underline">View</button>
                      )}
                      {rel.target_type === 'case' && (
                        <button onClick={() => navigate(`/cases/${rel.target_id}`)} className="text-xs text-accent hover:underline">View</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted">No associated cases found.</p>
            )}
          </div>

          <div className="card">
            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
              <Clock size={14} /> Indicator Timeline
            </h3>
            {sortedIndicators.length > 0 ? (
              <div className="relative pl-6">
                <div className="absolute left-[7px] top-1 bottom-1 w-px bg-border" />
                <div className="space-y-4">
                  {sortedIndicators.map((ind: any, idx: number) => (
                    <div key={ind.id || idx} className="relative">
                      <div className={`absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-bg-card ${confidenceScore[ind.confidence] >= 75 ? 'bg-red-500' : confidenceScore[ind.confidence] >= 50 ? 'bg-amber-500' : 'bg-blue-500'}`} />
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <StatusBadge label={ind.type} color="blue" />
                            <span className="text-sm font-mono">{ind.value}</span>
                          </div>
                          <div className="text-xs text-text-muted mt-1">
                            {ind.first_seen && <span>First: {new Date(ind.first_seen).toLocaleDateString()}</span>}
                            {ind.first_seen && ind.last_seen && <span className="mx-1">|</span>}
                            {ind.last_seen && <span>Last: {new Date(ind.last_seen).toLocaleDateString()}</span>}
                            {!ind.first_seen && !ind.last_seen && <span>Added {new Date(ind.created_at).toLocaleDateString()}</span>}
                          </div>
                        </div>
                        <StatusBadge label={ind.confidence} color={confidenceColorMap[ind.confidence] || 'gray'} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-text-muted">No indicators recorded.</p>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Indicators of Compromise</h3>
          <button onClick={openCreateIndicator} className="btn-primary text-xs flex items-center gap-1.5 py-1.5 px-3">
            <Plus size={14} /> Add Indicator
          </button>
        </div>
        <DataTable
          columns={indicatorColumns}
          data={indicators}
          isLoading={isLoading}
          emptyMessage="No indicators recorded"
        />
      </div>

      <Modal isOpen={indicatorFormOpen} onClose={() => setIndicatorFormOpen(false)} title="Add Indicator" size="sm">
        <form onSubmit={handleIndicatorSubmit} className="space-y-4">
          <FormSelect label="Type" options={indicatorTypeOptions} value={indicatorForm.type} onChange={(e) => setIndicatorForm({ ...indicatorForm, type: e.target.value })} required />
          <FormInput label="Value" value={indicatorForm.value} onChange={(e) => setIndicatorForm({ ...indicatorForm, value: e.target.value })} required />
          <FormSelect label="Confidence" options={confidenceOptions} value={indicatorForm.confidence} onChange={(e) => setIndicatorForm({ ...indicatorForm, confidence: e.target.value })} required />
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button type="button" onClick={() => setIndicatorFormOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleIndicatorDelete}
        title="Delete Indicator"
        message={`Are you sure you want to delete indicator "${deleteTarget?.value}"? This action cannot be undone.`}
        variant="danger"
        isLoading={isSubmitting}
      />
    </div>
  );
}
