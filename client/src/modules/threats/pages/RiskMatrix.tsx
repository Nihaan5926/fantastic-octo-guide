import React, { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useThreatStore } from '../store';
import { threatsApi } from '../api';
import Modal from '../../../components/common/Modal';
import { useNavigate } from 'react-router-dom';

function RiskGrid({ actors, onZoneClick }: {
  actors: any[];
  onZoneClick: (likelihood: number | null, impact: number | null) => void;
}) {
  const getScore = (actor: any): number => {
    let meta = actor.metadata;
    if (typeof meta === 'string') {
      try { meta = JSON.parse(meta); } catch { meta = {}; }
    }
    const assessment = meta?.riskAssessment || {};
    const likelihood = assessment.likelihood || 1;
    const impact = assessment.impact || 1;
    return likelihood * impact;
  };

  const getLikelihood = (actor: any): number => {
    let meta = actor.metadata;
    if (typeof meta === 'string') {
      try { meta = JSON.parse(meta); } catch { meta = {}; }
    }
    return meta?.riskAssessment?.likelihood || 1;
  };

  const getImpact = (actor: any): number => {
    let meta = actor.metadata;
    if (typeof meta === 'string') {
      try { meta = JSON.parse(meta); } catch { meta = {}; }
    }
    return meta?.riskAssessment?.impact || 1;
  };

  const getRiskColor = (score: number): string => {
    if (score <= 6) return 'bg-green-500/25 border-green-500/40 text-green-400';
    if (score <= 12) return 'bg-yellow-500/25 border-yellow-500/40 text-yellow-400';
    if (score <= 18) return 'bg-orange-500/25 border-orange-500/40 text-orange-400';
    return 'bg-red-500/25 border-red-500/40 text-red-400';
  };

  const zoneColor = (l: number, i: number): string => {
    const s = l * i;
    if (s <= 6) return 'rgba(34, 197, 94, 0.15)';
    if (s <= 12) return 'rgba(234, 179, 8, 0.15)';
    if (s <= 18) return 'rgba(249, 115, 22, 0.15)';
    return 'rgba(239, 68, 68, 0.15)';
  };

  return (
    <div>
      <div className="grid grid-cols-[40px_repeat(5,1fr)] gap-1 mb-6">
        <div className="flex items-center justify-center text-[10px] text-text-muted font-semibold rotate-[-90deg] h-full">
          IMPACT
        </div>
        {[5, 4, 3, 2, 1].map((impact) => (
          <React.Fragment key={impact}>
            <div className="flex items-center justify-center text-[10px] text-text-muted font-semibold min-w-[40px]">
              {impact}
            </div>
            {[1, 2, 3, 4, 5].map((likelihood) => {
              const cellActors = actors.filter((a) => getLikelihood(a) === likelihood && getImpact(a) === impact);
              return (
                <button
                  key={likelihood}
                  onClick={() => onZoneClick(likelihood, impact)}
                  className="relative rounded-lg border border-border min-h-[60px] flex items-center justify-center hover:border-accent/50 transition-colors"
                  style={{ backgroundColor: zoneColor(likelihood, impact) }}
                >
                  {cellActors.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 justify-center p-1">
                      {cellActors.map((a) => (
                        <div
                          key={a.id}
                          className="w-2.5 h-2.5 rounded-full cursor-pointer hover:scale-125 transition-transform"
                          style={{ backgroundColor: getRiskColor(getScore(a)).includes('red') ? '#ef4444' : getRiskColor(getScore(a)).includes('orange') ? '#f97316' : getRiskColor(getScore(a)).includes('yellow') ? '#eab308' : '#22c55e' }}
                          title={`${a.name || 'Unknown'} (${getScore(a)})`}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ))}
                    </div>
                  )}
                  {cellActors.length > 0 && (
                    <span className="absolute top-0.5 right-1 text-[9px] font-semibold text-text-muted">{cellActors.length}</span>
                  )}
                </button>
              );
            })}
          </React.Fragment>
        ))}
        <div />
        <div className="col-span-5 flex justify-between px-2 pt-1">
          {[1, 2, 3, 4, 5].map((l) => (
            <div key={l} className="text-[10px] text-text-muted font-semibold">{l}</div>
          ))}
        </div>
        <div />
        <div className="col-span-5 text-center text-[10px] text-text-muted font-semibold pt-0.5">
          LIKELIHOOD
        </div>
      </div>

      <div className="flex items-center gap-3 text-[10px] text-text-muted mt-2">
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-green-500/40" /> Low (1-6)</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-yellow-500/40" /> Medium (7-12)</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-orange-500/40" /> High (13-18)</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-red-500/40" /> Critical (19-25)</div>
      </div>
    </div>
  );
}

export default function RiskMatrix() {
  const navigate = useNavigate();
  const { actors, fetchActors, updateActor, isSubmitting } = useThreatStore();
  const [likelihoodFilter, setLikelihoodFilter] = useState<number | null>(null);
  const [impactFilter, setImpactFilter] = useState<number | null>(null);
  const [assessmentModalOpen, setAssessmentModalOpen] = useState(false);
  const [selectedActor, setSelectedActor] = useState<any | null>(null);
  const [assessmentForm, setAssessmentForm] = useState({ likelihood: 1, impact: 1 });

  useEffect(() => {
    fetchActors({ limit: 500 });
  }, []);

  const getScore = (actor: any): number => {
    let meta = actor.metadata;
    if (typeof meta === 'string') {
      try { meta = JSON.parse(meta); } catch { meta = {}; }
    }
    const assessment = meta?.riskAssessment || {};
    return (assessment.likelihood || 1) * (assessment.impact || 1);
  };

  const getLikelihood = (actor: any): number => {
    let meta = actor.metadata;
    if (typeof meta === 'string') {
      try { meta = JSON.parse(meta); } catch { meta = {}; }
    }
    return meta?.riskAssessment?.likelihood || 1;
  };

  const getImpact = (actor: any): number => {
    let meta = actor.metadata;
    if (typeof meta === 'string') {
      try { meta = JSON.parse(meta); } catch { meta = {}; }
    }
    return meta?.riskAssessment?.impact || 1;
  };

  const getRiskColor = (score: number): string => {
    if (score <= 6) return 'bg-green-500/25 border-green-500/40 text-green-400';
    if (score <= 12) return 'bg-yellow-500/25 border-yellow-500/40 text-yellow-400';
    if (score <= 18) return 'bg-orange-500/25 border-orange-500/40 text-orange-400';
    return 'bg-red-500/25 border-red-500/40 text-red-400';
  };

  const getRiskLabel = (score: number): string => {
    if (score <= 6) return 'Low';
    if (score <= 12) return 'Medium';
    if (score <= 18) return 'High';
    return 'Critical';
  };

  const filteredActors = useMemo(() => {
    let result = actors;
    if (likelihoodFilter !== null) result = result.filter((a: any) => getLikelihood(a) === likelihoodFilter);
    if (impactFilter !== null) result = result.filter((a: any) => getImpact(a) === impactFilter);
    return result.sort((a: any, b: any) => getScore(b) - getScore(a));
  }, [actors, likelihoodFilter, impactFilter]);

  const openAssessment = (actor: any) => {
    let meta = actor.metadata;
    if (typeof meta === 'string') {
      try { meta = JSON.parse(meta); } catch { meta = {}; }
    }
    const assessment = meta?.riskAssessment || {};
    setSelectedActor(actor);
    setAssessmentForm({
      likelihood: assessment.likelihood || 1,
      impact: assessment.impact || 1,
    });
    setAssessmentModalOpen(true);
  };

  const handleSubmitAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedActor) return;
    try {
      await threatsApi.updateAssessment(selectedActor.id, assessmentForm);
      toast.success(`Risk assessment updated (Score: ${assessmentForm.likelihood * assessmentForm.impact})`);
      setAssessmentModalOpen(false);
      fetchActors({ limit: 500 });
    } catch {
      toast.error('Failed to update assessment');
    }
  };

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Risk Assessment Matrix</h2>
        <div className="flex items-center gap-2">
          {(likelihoodFilter !== null || impactFilter !== null) && (
            <button
              onClick={() => { setLikelihoodFilter(null); setImpactFilter(null); }}
              className="text-xs text-accent hover:underline"
            >
              Clear filters
            </button>
          )}
          <span className="text-xs text-text-muted">{actors.length} actors</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 flex-1 overflow-hidden">
        <div className="xl:col-span-2 card p-4 overflow-y-auto">
          <RiskGrid actors={actors} onZoneClick={(l, i) => {
            if (likelihoodFilter === l && impactFilter === i) {
              setLikelihoodFilter(null);
              setImpactFilter(null);
            } else {
              setLikelihoodFilter(l);
              setImpactFilter(i);
            }
          }} />
        </div>

        <div className="card p-4 overflow-y-auto">
          <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
            {likelihoodFilter !== null || impactFilter !== null ? 'Filtered Actors' : 'All Actors'}
            <span className="ml-2 text-text-primary">{filteredActors.length}</span>
          </div>
          {filteredActors.length === 0 ? (
            <p className="text-xs text-text-muted py-4">No threat actors match the selected criteria.</p>
          ) : (
            <div className="space-y-2">
              {filteredActors.map((actor: any) => {
                const score = getScore(actor);
                const colorClass = getRiskColor(score);
                return (
                  <div
                    key={actor.id}
                    className={`rounded-lg border p-3 cursor-pointer hover:border-accent/30 transition-colors`}
                    onClick={() => navigate(`/threats/actors/${actor.id}`)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${colorClass.split(' ')[2] || ''}`} style={{ backgroundColor: score <= 6 ? '#22c55e' : score <= 12 ? '#eab308' : score <= 18 ? '#f97316' : '#ef4444' }} />
                        <span className="text-sm font-medium text-text-primary">{actor.name || 'Unnamed'}</span>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${colorClass}`}>
                        {score} · {getRiskLabel(score)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-text-muted mt-1">
                      <span>Likelihood: <b className="text-text-primary">{getLikelihood(actor)}</b></span>
                      <span>Impact: <b className="text-text-primary">{getImpact(actor)}</b></span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); openAssessment(actor); }}
                      className="mt-2 text-xs text-accent hover:underline"
                    >
                      Update Assessment
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={assessmentModalOpen} onClose={() => setAssessmentModalOpen(false)} title={`Update Risk Assessment: ${selectedActor?.name || 'Actor'}`} size="sm">
        <form onSubmit={handleSubmitAssessment} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-2">
              Likelihood (1-5): <span className="text-text-primary font-bold">{assessmentForm.likelihood}</span>
            </label>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={assessmentForm.likelihood}
              onChange={(e) => setAssessmentForm({ ...assessmentForm, likelihood: parseInt(e.target.value) })}
              className="w-full accent-accent"
            />
            <div className="flex justify-between text-[10px] text-text-muted mt-1">
              <span>Very Low</span><span>Low</span><span>Medium</span><span>High</span><span>Very High</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-2">
              Impact (1-5): <span className="text-text-primary font-bold">{assessmentForm.impact}</span>
            </label>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={assessmentForm.impact}
              onChange={(e) => setAssessmentForm({ ...assessmentForm, impact: parseInt(e.target.value) })}
              className="w-full accent-accent"
            />
            <div className="flex justify-between text-[10px] text-text-muted mt-1">
              <span>Very Low</span><span>Low</span><span>Medium</span><span>High</span><span>Very High</span>
            </div>
          </div>
          <div className="text-center pt-2 pb-1">
            <div className="text-sm font-semibold text-text-primary">
              Risk Score: {assessmentForm.likelihood * assessmentForm.impact}
            </div>
            <div className={`text-xs font-medium mt-1 px-2 py-0.5 rounded inline-block ${
              assessmentForm.likelihood * assessmentForm.impact <= 6 ? 'text-green-400' :
              assessmentForm.likelihood * assessmentForm.impact <= 12 ? 'text-yellow-400' :
              assessmentForm.likelihood * assessmentForm.impact <= 18 ? 'text-orange-400' : 'text-red-400'
            }`} style={{ backgroundColor: assessmentForm.likelihood * assessmentForm.impact <= 6 ? 'rgba(34,197,94,0.15)' : assessmentForm.likelihood * assessmentForm.impact <= 12 ? 'rgba(234,179,8,0.15)' : assessmentForm.likelihood * assessmentForm.impact <= 18 ? 'rgba(249,115,22,0.15)' : 'rgba(239,68,68,0.15)' }}>
              {assessmentForm.likelihood * assessmentForm.impact <= 6 ? 'Low' : assessmentForm.likelihood * assessmentForm.impact <= 12 ? 'Medium' : assessmentForm.likelihood * assessmentForm.impact <= 18 ? 'High' : 'Critical'}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button type="button" onClick={() => setAssessmentModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
