import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { analysisApi } from '../api';
import SearchBar from '../../../components/common/SearchBar';
import { FormInput } from '../../../components/common/FormComponents';
import { Shield, FileText, Briefcase, FolderOpen, Users, Target, Crosshair, Clock, Activity } from 'lucide-react';

const entityColorMap: Record<string, string> = {
  report: '#3b82f6',
  case: '#f59e0b',
  evidence: '#22c55e',
  source: '#a855f7',
  threat_actor: '#ef4444',
  mission_plan: '#f59e0b',
  target_package: '#ef4444',
  sitrep: '#3b82f6',
  tasking_assignment: '#22c55e',
};

const entityIconMap: Record<string, React.ReactNode> = {
  report: <FileText size={16} />,
  case: <Briefcase size={16} />,
  evidence: <FolderOpen size={16} />,
  source: <Users size={16} />,
  threat_actor: <Shield size={16} />,
  mission_plan: <Target size={16} />,
  target_package: <Crosshair size={16} />,
  sitrep: <Clock size={16} />,
  tasking_assignment: <Activity size={16} />,
};

const entityPathMap: Record<string, (id: string) => string> = {
  report: (id) => `/reports/${id}`,
  case: (id) => `/cases/${id}`,
  evidence: (id) => `/evidence/${id}`,
  source: (id) => `/sources/${id}`,
  threat_actor: (id) => `/threats/actors/${id}`,
  mission_plan: (id) => `/missions/${id}`,
  target_package: (id) => `/targeting/${id}`,
  sitrep: (id) => `/watch-center/${id}`,
  tasking_assignment: (id) => `/tasking/${id}`,
};

const entityLabelMap: Record<string, string> = {
  report: 'Report',
  case: 'Case',
  evidence: 'Evidence',
  source: 'Source',
  threat_actor: 'Threat Actor',
  mission_plan: 'Mission Plan',
  target_package: 'Target Package',
  sitrep: 'SitRep',
  tasking_assignment: 'Tasking Assignment',
};

const entityTypeOptions = [
  { value: 'report', label: 'Report', color: '#3b82f6' },
  { value: 'case', label: 'Case', color: '#f59e0b' },
  { value: 'evidence', label: 'Evidence', color: '#22c55e' },
  { value: 'source', label: 'Source', color: '#a855f7' },
  { value: 'threat_actor', label: 'Threat Actor', color: '#ef4444' },
  { value: 'mission_plan', label: 'Mission Plan', color: '#f59e0b' },
  { value: 'target_package', label: 'Target Package', color: '#ef4444' },
  { value: 'sitrep', label: 'SitRep', color: '#3b82f6' },
  { value: 'tasking_assignment', label: 'Tasking Assignment', color: '#22c55e' },
];

interface TimelineEvent {
  entity_type: string;
  entity_id: string;
  title: string;
  description: string;
  created_at: string;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return {
    date: d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    iso: d.toISOString().split('T')[0],
  };
}

export default function TimelineAnalysis() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [jumpToDate, setJumpToDate] = useState('');

  useEffect(() => {
    setIsLoading(true);
    analysisApi.getTimeline()
      .then(({ data }: any) => {
        setEvents(data.data || data.events || data || []);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, []);

  const toggleType = (type: string) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const filteredEvents = useMemo(() => {
    let result = events;
    if (startDate) result = result.filter((e) => new Date(e.created_at) >= new Date(startDate));
    if (endDate) result = result.filter((e) => new Date(e.created_at) <= new Date(endDate + 'T23:59:59'));
    if (selectedTypes.size > 0) result = result.filter((e) => selectedTypes.has(e.entity_type));
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((e) =>
        (e.title || '').toLowerCase().includes(q) ||
        (e.description || '').toLowerCase().includes(q) ||
        (e.entity_type || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [events, startDate, endDate, selectedTypes, search]);

  const handleJumpToDate = () => {
    if (!jumpToDate) return;
    const el = document.getElementById(`timeline-${jumpToDate}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const groupedByDate = useMemo(() => {
    const map = new Map<string, TimelineEvent[]>();
    for (const evt of filteredEvents) {
      const dateKey = new Date(evt.created_at).toISOString().split('T')[0];
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(evt);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredEvents]);

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Timeline Analysis</h2>
        <span className="text-xs text-text-muted">{filteredEvents.length} events</span>
      </div>

      <div className="card p-3 mb-3">
        <div className="flex items-center gap-3 flex-wrap">
          <SearchBar value={search} onChange={setSearch} placeholder="Search events..." className="w-48" />
          <FormInput label="" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} placeholder="Start date" className="w-36" />
          <FormInput label="" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} placeholder="End date" className="w-36" />
          <div className="h-6 w-px bg-border mx-1" />
          <FormInput label="" type="date" value={jumpToDate} onChange={(e) => setJumpToDate(e.target.value)} placeholder="Jump to date" className="w-36" />
          <button onClick={handleJumpToDate} className="btn-secondary text-xs py-1.5">Go</button>
        </div>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {entityTypeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => toggleType(opt.value)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors border ${
                selectedTypes.has(opt.value)
                  ? 'border-current opacity-100'
                  : 'border-border opacity-50 hover:opacity-80'
              }`}
              style={{ color: opt.color, borderColor: selectedTypes.has(opt.value) ? opt.color : undefined }}
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="card text-center py-16 text-text-muted">Loading timeline...</div>
        ) : groupedByDate.length === 0 ? (
          <div className="card text-center py-16 text-text-muted">
            <Clock size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No timeline events found. Create entities across modules to populate the timeline.</p>
          </div>
        ) : (
          <div className="relative pl-16 pr-4 space-y-0">
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border" />
            {groupedByDate.map(([dateKey, dayEvents]) => (
              <div key={dateKey} id={`timeline-${dateKey}`} className="relative pb-8">
                <div className="sticky top-0 z-10 mb-3 ml-2">
                  <div className="absolute left-[-2.25rem] top-2 w-3 h-3 rounded-full bg-accent border-2 border-bg-card" />
                  <span className="text-xs font-semibold bg-bg-card text-accent px-2 py-0.5 rounded border border-accent/20">
                    {formatDate(dateKey + 'T00:00:00').date}
                  </span>
                  <span className="text-xs text-text-muted ml-2">{dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="space-y-2 ml-4">
                  {dayEvents.map((evt, i) => {
                    const color = entityColorMap[evt.entity_type] || '#94a3b8';
                    const time = formatDate(evt.created_at).time;
                    const entityLabel = entityLabelMap[evt.entity_type] || evt.entity_type;
                    const pathFn = entityPathMap[evt.entity_type];
                    return (
                      <div
                        key={i}
                        onClick={() => { if (pathFn) navigate(pathFn(evt.entity_id)); }}
                        className={`card p-3 border-l-2 cursor-pointer hover:bg-bg-hover transition-colors`}
                        style={{ borderLeftColor: color }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex items-center gap-1.5">
                            <span style={{ color }}>{entityIconMap[evt.entity_type] || <Activity size={16} />}</span>
                            <span className="text-[10px] font-medium uppercase px-1.5 py-0.5 rounded" style={{ backgroundColor: `${color}20`, color }}>
                              {entityLabel}
                            </span>
                          </div>
                          <span className="text-xs text-text-muted ml-auto">{time}</span>
                        </div>
                        <div className="text-sm font-medium text-text-primary">{evt.title || 'Untitled'}</div>
                        {evt.description && (
                          <div className="text-xs text-text-secondary mt-1 line-clamp-2">{evt.description}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
