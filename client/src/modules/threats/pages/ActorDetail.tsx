import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useThreatStore } from '../store';
import { threatsApi } from '../api';
import DataTable from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import PageHeader from '../../../components/common/PageHeader';
import { FormInput, FormSelect } from '../../../components/common/FormComponents';
import { StatusBadge } from '../../../components/common/Badges';
import { DetailSkeleton } from '../../../components/common/LoadingSkeleton';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { Trash2, ArrowLeft, Plus, Download, Activity, Clock, File, Paperclip, Search, X, RefreshCw, Upload } from 'lucide-react';
import FileUpload from '../../../components/common/FileUpload';
import BulkImport from '../../../components/common/BulkImport';
import type { Column } from '../../../components/common/BulkImport';

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

const ATTACK_TECHNIQUES = [
  { id: 'T1566', name: 'Phishing', tactic: 'Initial Access', category: 'initial_access' },
  { id: 'T1190', name: 'Exploit Public-Facing Application', tactic: 'Initial Access', category: 'initial_access' },
  { id: 'T1078', name: 'Valid Accounts', tactic: 'Initial Access', category: 'initial_access' },
  { id: 'T1059', name: 'Command and Scripting Interpreter', tactic: 'Execution', category: 'execution' },
  { id: 'T1203', name: 'Exploitation for Client Execution', tactic: 'Execution', category: 'execution' },
  { id: 'T1204', name: 'User Execution', tactic: 'Execution', category: 'execution' },
  { id: 'T1547', name: 'Boot or Logon Autostart Execution', tactic: 'Persistence', category: 'persistence' },
  { id: 'T1098', name: 'Account Manipulation', tactic: 'Persistence', category: 'persistence' },
  { id: 'T1543', name: 'Create or Modify System Process', tactic: 'Persistence', category: 'persistence' },
  { id: 'T1055', name: 'Process Injection', tactic: 'Privilege Escalation', category: 'privilege_escalation' },
  { id: 'T1068', name: 'Exploitation for Privilege Escalation', tactic: 'Privilege Escalation', category: 'privilege_escalation' },
  { id: 'T1562', name: 'Impair Defenses', tactic: 'Defense Evasion', category: 'defense_evasion' },
  { id: 'T1070', name: 'Indicator Removal', tactic: 'Defense Evasion', category: 'defense_evasion' },
  { id: 'T1027', name: 'Obfuscated Files or Information', tactic: 'Defense Evasion', category: 'defense_evasion' },
  { id: 'T1003', name: 'OS Credential Dumping', tactic: 'Credential Access', category: 'credential_access' },
  { id: 'T1552', name: 'Unsecured Credentials', tactic: 'Credential Access', category: 'credential_access' },
  { id: 'T1082', name: 'System Information Discovery', tactic: 'Discovery', category: 'discovery' },
  { id: 'T1046', name: 'Network Service Scanning', tactic: 'Discovery', category: 'discovery' },
  { id: 'T1049', name: 'System Network Connections Discovery', tactic: 'Discovery', category: 'discovery' },
  { id: 'T1486', name: 'Data Encrypted for Impact', tactic: 'Impact', category: 'impact' },
  { id: 'T1490', name: 'Inhibit System Recovery', tactic: 'Impact', category: 'impact' },
  { id: 'T1071', name: 'Application Layer Protocol', tactic: 'Command and Control', category: 'c2' },
  { id: 'T1105', name: 'Ingress Tool Transfer', tactic: 'Command and Control', category: 'c2' },
  { id: 'T1041', name: 'Exfiltration Over C2 Channel', tactic: 'Exfiltration', category: 'exfiltration' },
  { id: 'T1567', name: 'Exfiltration Over Web Service', tactic: 'Exfiltration', category: 'exfiltration' },
  { id: 'T1210', name: 'Exploitation of Remote Services', tactic: 'Lateral Movement', category: 'lateral_movement' },
  { id: 'T1021', name: 'Remote Services', tactic: 'Lateral Movement', category: 'lateral_movement' },
  { id: 'T1112', name: 'Modify Registry', tactic: 'Defense Evasion', category: 'defense_evasion' },
  { id: 'T1106', name: 'Native API', tactic: 'Execution', category: 'execution' },
  { id: 'T1036', name: 'Masquerading', tactic: 'Defense Evasion', category: 'defense_evasion' },
];

const TACTIC_COLORS: Record<string, string> = {
  initial_access: 'red',
  execution: 'orange',
  persistence: 'yellow',
  privilege_escalation: 'amber',
  defense_evasion: 'blue',
  credential_access: 'violet',
  discovery: 'indigo',
  lateral_movement: 'teal',
  collection: 'pink',
  c2: 'purple',
  exfiltration: 'emerald',
  impact: 'red',
};

const TACTIC_BG: Record<string, string> = {
  red: 'bg-red-500/15 border-red-500/30 text-red-400',
  orange: 'bg-orange-500/15 border-orange-500/30 text-orange-400',
  yellow: 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400',
  amber: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
  blue: 'bg-blue-500/15 border-blue-500/30 text-blue-400',
  violet: 'bg-violet-500/15 border-violet-500/30 text-violet-400',
  indigo: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400',
  teal: 'bg-teal-500/15 border-teal-500/30 text-teal-400',
  pink: 'bg-pink-500/15 border-pink-500/30 text-pink-400',
  purple: 'bg-purple-500/15 border-purple-500/30 text-purple-400',
  emerald: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
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
  const [attachments, setAttachments] = useState<any[]>([]);
  const [attachModalOpen, setAttachModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteAttachId, setDeleteAttachId] = useState<string | null>(null);
  const [ttpSearch, setTtpSearch] = useState('');
  const [ttpSearchOpen, setTtpSearchOpen] = useState(false);
  const [actorTtps, setActorTtps] = useState<any[]>([]);
  const [riskBreakdown, setRiskBreakdown] = useState<any>(null);
  const [recalculating, setRecalculating] = useState(false);
  const [importIndicatorsOpen, setImportIndicatorsOpen] = useState(false);

  const indicatorImportColumns: Column[] = [
    { key: 'type', label: 'Type', required: true },
    { key: 'value', label: 'Value', required: true },
    { key: 'confidence', label: 'Confidence' },
  ];

  const handleImportIndicators = async (rows: Record<string, any>[]) => {
    if (!id) return;
    const indicators = rows.map((row) => ({
      ...row,
      threat_actor_id: id,
    }));
    await threatsApi.importBulk({ indicators });
    fetchIndicators(id);
    fetchActorSummary(id);
  };

  useEffect(() => {
    if (id) {
      fetchActor(id);
      fetchIndicators(id);
      fetchActorRelationships(id);
      fetchActorSummary(id);
      fetchAttachments();
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

  const fetchAttachments = async () => {
    if (!id) return;
    try {
      const { data } = await threatsApi.listAttachments(id);
      setAttachments(data.data || []);
    } catch {}
  };

  const handleUploadAttachment = async () => {
    if (!id || !selectedFile) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', selectedFile);
      await threatsApi.uploadAttachment(id, fd);
      toast.success('Attachment uploaded');
      setAttachModalOpen(false);
      setSelectedFile(null);
      fetchAttachments();
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAttachment = async () => {
    if (!id || !deleteAttachId) return;
    try {
      await threatsApi.deleteAttachment(id, deleteAttachId);
      toast.success('Attachment removed');
      setDeleteAttachId(null);
      fetchAttachments();
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleDownloadAttachment = async (attachmentId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/threats/actors/${id}/attachments/${attachmentId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { toast.error('Download failed'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const disposition = res.headers.get('content-disposition');
      if (disposition) {
        const match = disposition.match(/filename="?(.+?)"?$/);
        if (match) a.download = match[1];
      }
      a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Download failed'); }
  };

  const riskScore = useMemo(() => {
    const sophWeight = sophisticationScore[selectedActor?.sophistication] || 20;
    if (indicators.length === 0) return Math.round(sophWeight * 0.6);
    const avgConf = indicators.reduce((sum: number, ind: any) => sum + (confidenceScore[ind.confidence] || 25), 0) / indicators.length;
    return Math.round(sophWeight * 0.5 + avgConf * 0.5);
  }, [selectedActor?.sophistication, indicators]);

  const handleRecalculateRisk = async () => {
    if (!id) return;
    setRecalculating(true);
    try {
      const { data } = await threatsApi.calculateRisk(id);
      setRiskBreakdown(data.breakdown);
      toast.success(`Risk score: ${data.risk_score}`);
      fetchActor(id);
      fetchActorSummary(id);
    } catch {
      toast.error('Recalculation failed');
    } finally {
      setRecalculating(false);
    }
  };

  const threatLevel = riskScore < 30 ? 'LOW' : riskScore < 60 ? 'MODERATE' : 'HIGH';
  const threatLevelColor = riskScore < 30 ? 'text-emerald-400' : riskScore < 60 ? 'text-amber-400' : 'text-red-400';
  const threatBorderColor = riskScore < 30 ? 'border-emerald-500/30' : riskScore < 60 ? 'border-amber-500/30' : 'border-red-500/30';

  const ttps = useMemo(() => {
    if (actorTtps.length > 0) return actorTtps;
    const metadata = selectedActor?.metadata || selectedActor?.entity_custom_fields;
    if (!metadata) return [];
    if (Array.isArray(metadata)) return metadata;
    if (typeof metadata === 'object') {
      const ttp = metadata.ttp || metadata.TTP || metadata.tactics_techniques_procedures || metadata.ttps;
      if (Array.isArray(ttp)) return ttp;
      if (typeof ttp === 'string') return [{ id: '', name: ttp, tactic: 'Unknown', category: 'unknown' }];
    }
    return [];
  }, [selectedActor, actorTtps]);

  useEffect(() => {
    const loaded = ttps;
    if (loaded.length > 0) {
      const enriched = loaded.map((t: any) => {
        if (typeof t === 'string') {
          const match = ATTACK_TECHNIQUES.find((at) => at.id === t || at.name === t);
          return match || { id: t, name: t, tactic: 'Unknown', category: 'unknown' };
        }
        return t;
      });
      setActorTtps(enriched);
    }
  }, [selectedActor?.metadata, selectedActor?.entity_custom_fields]);

  const handleAddTtp = async (technique: typeof ATTACK_TECHNIQUES[0]) => {
    const newTtps = [...actorTtps, technique];
    setActorTtps(newTtps);
    setTtpSearch('');
    setTtpSearchOpen(false);
    if (id) {
      try {
        await threatsApi.updateActor(id, {
          metadata: { ...(selectedActor?.metadata || {}), ttps: newTtps.map((t) => ({ id: t.id, name: t.name, tactic: t.tactic })) },
        });
        toast.success('TTP added');
      } catch {
        toast.error('Failed to save TTP');
      }
    }
  };

  const handleRemoveTtp = async (techniqueId: string) => {
    const newTtps = actorTtps.filter((t: any) => t.id !== techniqueId);
    setActorTtps(newTtps);
    if (id) {
      try {
        await threatsApi.updateActor(id, {
          metadata: { ...(selectedActor?.metadata || {}), ttps: newTtps.map((t: any) => ({ id: t.id, name: t.name, tactic: t.tactic })) },
        });
        toast.success('TTP removed');
      } catch {
        toast.error('Failed to save TTP');
      }
    }
  };

  const filteredTtps = ttpSearch
    ? ATTACK_TECHNIQUES.filter((t) =>
        t.name.toLowerCase().includes(ttpSearch.toLowerCase()) ||
        t.id.toLowerCase().includes(ttpSearch.toLowerCase()) ||
        t.tactic.toLowerCase().includes(ttpSearch.toLowerCase())
      )
    : ATTACK_TECHNIQUES;

  const handleExportSTIX = () => {
    if (!selectedActor) return;
    const bundle: any = {
      type: 'bundle',
      id: `bundle--${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`,
      spec_version: '2.1',
      objects: [],
    };

    const actorId = `threat-actor--${selectedActor.id || Math.random().toString(36).slice(2)}`;
    const actorObj: any = {
      type: 'threat-actor',
      id: actorId,
      created: selectedActor.created_at || new Date().toISOString(),
      modified: selectedActor.updated_at || new Date().toISOString(),
      name: selectedActor.name || 'Unnamed Actor',
      threat_actor_types: [],
      aliases: Array.isArray(selectedActor.aliases) ? selectedActor.aliases : [],
      sophistication: selectedActor.sophistication?.toLowerCase() || 'unknown',
      resource_level: 'unknown',
      primary_motivation: selectedActor.motivation || 'unknown',
    };
    bundle.objects.push(actorObj);

    indicators.forEach((ind: any, idx: number) => {
      const indId = `indicator--${ind.id || idx}`;
      const indObj: any = {
        type: 'indicator',
        id: indId,
        created: ind.created_at || new Date().toISOString(),
        modified: ind.updated_at || ind.created_at || new Date().toISOString(),
        name: `${ind.type}: ${ind.value}`,
        pattern: `[${ind.type === 'IP' ? 'ipv4-addr:value' : ind.type === 'DOMAIN' ? 'domain-name:value' : ind.type === 'URL' ? 'url:value' : ind.type === 'HASH' ? 'file:hashes' : 'x-custom'} = '${ind.value}']`,
        pattern_type: 'stix',
        valid_from: ind.created_at || new Date().toISOString(),
        indicator_types: ['malicious-activity'],
      };
      bundle.objects.push(indObj);

      bundle.objects.push({
        type: 'relationship',
        id: `relationship--${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`,
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        relationship_type: 'indicates',
        source_ref: indId,
        target_ref: actorId,
      });
    });

    actorTtps.forEach((ttp: any) => {
      const attackId = `attack-pattern--${ttp.id || Math.random().toString(36).slice(2)}`;
      bundle.objects.push({
        type: 'attack-pattern',
        id: attackId,
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        name: ttp.name,
        external_references: ttp.id ? [{
          source_name: 'mitre-attack',
          external_id: ttp.id,
        }] : [],
      });
      bundle.objects.push({
        type: 'relationship',
        id: `relationship--${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`,
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        relationship_type: 'uses',
        source_ref: actorId,
        target_ref: attackId,
      });
    });

    const json = JSON.stringify(bundle, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stix-${selectedActor.name?.replace(/\s+/g, '-').toLowerCase() || 'actor'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('STIX 2.1 bundle exported');
  };

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
    return <DetailSkeleton />;
  }

  return (
    <div>
      <PageHeader title={selectedActor?.name || 'Actor Detail'} subtitle="View actor details and associated indicators">
        <div className="flex items-center gap-2">
          <button onClick={() => setImportIndicatorsOpen(true)} className="btn-secondary flex items-center gap-2 text-sm">
            <Upload size={16} /> Import Indicators
          </button>
          <button onClick={handleExportSTIX} className="btn-secondary flex items-center gap-2 text-sm">
            <Download size={16} /> Export STIX
          </button>
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
          <div className="flex justify-center mb-4">
            <button
              onClick={handleRecalculateRisk}
              disabled={recalculating}
              className="btn-secondary text-xs flex items-center gap-1.5"
            >
              <RefreshCw size={12} className={recalculating ? 'animate-spin' : ''} />
              {recalculating ? 'Calculating...' : 'Recalculate Risk'}
            </button>
          </div>
          <div className={`border rounded-lg p-3 mb-4 ${threatBorderColor} bg-bg-tertiary/30`}>
            <div className="flex items-center justify-center">
              <span className={`text-sm font-bold uppercase ${threatLevelColor}`}>{threatLevel} THREAT</span>
            </div>
          </div>

          {/* Risk Score Breakdown */}
          {riskBreakdown && (
            <div className="mb-4 p-3 bg-bg-tertiary rounded-lg border border-border">
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Score Breakdown</h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-text-muted">Sophistication Level</span>
                  <span className="text-text-primary">{riskBreakdown.sophistication_level} ({riskBreakdown.sophistication_weight})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Indicator Count</span>
                  <span className="text-text-primary">{riskBreakdown.indicator_count}</span>
                </div>
                {riskBreakdown.avg_indicator_confidence && (
                  <div className="flex justify-between">
                    <span className="text-text-muted">Avg Indicator Confidence</span>
                    <span className="text-text-primary">{riskBreakdown.avg_indicator_confidence}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border mt-1.5 pt-1.5">
                  <span className="text-text-muted font-medium">Formula</span>
                  <span className="text-accent font-mono">{riskBreakdown.formula}</span>
                </div>
              </div>
            </div>
          )}
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
              <Activity size={14} /> TTP Matrix (MITRE ATT&CK)
            </h3>
            <div className="relative mb-4">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    value={ttpSearch}
                    onChange={(e) => { setTtpSearch(e.target.value); setTtpSearchOpen(true); }}
                    onFocus={() => setTtpSearchOpen(true)}
                    placeholder="Search ATT&CK techniques..."
                    className="input pl-9 text-sm"
                  />
                  {ttpSearchOpen && ttpSearch && (
                    <div className="absolute left-0 right-0 top-full mt-1 max-h-60 overflow-y-auto bg-bg-card border border-border rounded-lg shadow-xl z-50">
                      {filteredTtps.filter((t) => !actorTtps.find((a: any) => a.id === t.id)).length === 0 ? (
                        <div className="p-3 text-sm text-text-muted text-center">No matching techniques found (or already added)</div>
                      ) : (
                        filteredTtps
                          .filter((t) => !actorTtps.find((a: any) => a.id === t.id))
                          .map((t) => (
                            <button
                              key={t.id}
                              onClick={() => handleAddTtp(t)}
                              className="w-full text-left px-4 py-2.5 text-sm hover:bg-bg-hover transition-colors flex items-center justify-between"
                            >
                              <div>
                                <span className="text-text-primary">{t.name}</span>
                                <span className="text-xs text-text-muted ml-2">{t.id}</span>
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded border ${TACTIC_BG[TACTIC_COLORS[t.category]] || 'bg-gray-500/15 border-gray-500/30 text-gray-400'}`}>
                                {t.tactic}
                              </span>
                            </button>
                          ))
                      )}
                    </div>
                  )}
                </div>
              </div>
              {ttpSearchOpen && ttpSearch && (
                <div className="fixed inset-0 z-40" onClick={() => setTtpSearchOpen(false)} />
              )}
            </div>
            {actorTtps.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {actorTtps.map((ttp: any, idx: number) => {
                  const color = TACTIC_COLORS[ttp.category] || 'gray';
                  const bgClass = TACTIC_BG[color] || 'bg-gray-500/15 border-gray-500/30 text-gray-400';
                  return (
                    <span key={idx} className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border ${bgClass}`}>
                      <span className="opacity-70">{ttp.id}</span>
                      <span>{ttp.name}</span>
                      <button onClick={() => handleRemoveTtp(ttp.id)} className="ml-0.5 hover:text-white transition-colors">
                        <X size={12} />
                      </button>
                    </span>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-text-muted">No TTPs mapped. Search above to add techniques from MITRE ATT&CK.</p>
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

      <div className="card mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Paperclip size={18} /> Attachments
          </h2>
          <button onClick={() => { setSelectedFile(null); setAttachModalOpen(true); }} className="btn-primary text-sm">
            <Plus size={14} /> Add File
          </button>
        </div>
        {attachments.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-8">No attachments yet</p>
        ) : (
          <div className="space-y-2">
            {attachments.map((att: any) => (
              <div key={att.id} className="flex items-center justify-between p-3 bg-bg-primary rounded-lg border border-border">
                <div className="flex items-center gap-3 min-w-0">
                  <File size={16} className="text-text-muted shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{att.original_name}</p>
                    <p className="text-xs text-text-muted">
                      {att.mime_type} {att.size ? `· ${att.size > 1048576 ? `${(att.size / 1048576).toFixed(1)} MB` : `${(att.size / 1024).toFixed(1)} KB`}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => handleDownloadAttachment(att.id)} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-accent" title="Download">
                    <Download size={14} />
                  </button>
                  <button onClick={() => setDeleteAttachId(att.id)} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-accent-danger" title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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

      <Modal isOpen={attachModalOpen} onClose={() => setAttachModalOpen(false)} title="Add Attachment" size="sm">
        <div className="space-y-4">
          <FileUpload
            selectedFile={selectedFile}
            onChange={setSelectedFile}
            isUploading={uploading}
            disabled={uploading}
          />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setAttachModalOpen(false)} className="btn-secondary">Cancel</button>
          <button onClick={handleUploadAttachment} disabled={!selectedFile || uploading} className="btn-primary">
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteAttachId}
        onClose={() => setDeleteAttachId(null)}
        onConfirm={handleDeleteAttachment}
        title="Delete Attachment"
        message="Are you sure you want to delete this attachment? This action cannot be undone."
        isLoading={false}
      />

      <BulkImport
        isOpen={importIndicatorsOpen}
        onClose={() => setImportIndicatorsOpen(false)}
        entityType="indicator"
        columns={indicatorImportColumns}
        onImport={handleImportIndicators}
        title="Import Indicators"
      />
    </div>
  );
}
