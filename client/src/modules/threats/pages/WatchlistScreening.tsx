import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { threatsApi } from '../api';
import PageHeader from '../../../components/common/PageHeader';
import { StatusBadge } from '../../../components/common/Badges';
import { Shield, Search, X, Upload, AlertTriangle, CheckCircle, FileText } from 'lucide-react';

const typeColorMap: Record<string, string> = {
  IP: 'blue', DOMAIN: 'purple', URL: 'teal', HASH: 'orange',
  EMAIL: 'yellow', MUTEX: 'red', REGISTRY: 'pink', OTHER: 'gray',
};

const confidenceColorMap: Record<string, string> = {
  LOW: 'gray', MEDIUM: 'blue', HIGH: 'yellow', CRITICAL: 'red',
};

interface MatchResult {
  input: string;
  matched: boolean;
  matchType?: 'exact' | 'contains';
  indicatorId?: string;
  indicatorType?: string;
  indicatorValue?: string;
  confidence?: string;
  actorName?: string;
  actorId?: string;
}

export default function WatchlistScreening() {
  const [inputText, setInputText] = useState('');
  const [results, setResults] = useState<MatchResult[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleSingleScreening = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) { toast.error('Enter a value to screen'); return; }
    await runScreening([trimmed]);
  };

  const handleBulkScreening = async () => {
    const lines = inputText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) { toast.error('Enter at least one value per line'); return; }
    await runScreening(lines);
  };

  const runScreening = async (values: string[]) => {
    setLoading(true);
    try {
      const { data } = await threatsApi.screening(values);
      setResults(data.data || []);
      setSummary(data.summary || null);
      if (data.summary?.totalMatches > 0) {
        toast.success(`${data.summary.totalMatches} match(es) found across ${data.summary.uniqueMatchedInputs} input(s)`);
      } else {
        toast('No matches found', { icon: '✅' });
      }
    } catch {
      toast.error('Screening failed');
      setResults([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setResults([]);
    setSummary(null);
    setInputText('');
  };

  const uniqueInputs = [...new Set(results.map((r) => r.input))];

  return (
    <div>
      <PageHeader title="Watchlist Screening" subtitle="Check entities against intelligence indicators" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
            <Search size={14} /> Screening Input
          </h3>
          <form onSubmit={handleSingleScreening} className="space-y-3">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Enter entity name, email, IP, domain, or URL...
For bulk screening, paste one value per line"
              rows={8}
              className="input w-full font-mono text-sm resize-y"
            />
            <div className="flex items-center gap-2">
              <button type="submit" disabled={loading || !inputText.trim()} className="btn-primary flex items-center gap-2 text-sm">
                <Shield size={14} /> Screen Single
              </button>
              <button type="button" onClick={handleBulkScreening} disabled={loading || !inputText.trim()} className="btn-secondary flex items-center gap-2 text-sm">
                <Upload size={14} /> Bulk Screen
              </button>
              <button type="button" onClick={clearResults} disabled={loading} className="btn-secondary flex items-center gap-2 text-sm">
                <X size={14} /> Clear
              </button>
            </div>
            {inputText.trim() && inputText.includes('\n') && (
              <p className="text-xs text-text-muted flex items-center gap-1">
                <FileText size={12} />
                {inputText.split('\n').filter((l) => l.trim()).length} values detected — use Bulk Screen
              </p>
            )}
          </form>
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
            <Shield size={14} /> Match Summary
          </h3>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-pulse text-text-muted">Screening in progress...</div>
            </div>
          ) : summary ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-bg-tertiary rounded-xl p-4 border border-border">
                  <p className="text-2xl font-bold text-text-primary">{summary.totalInputs}</p>
                  <p className="text-xs text-text-muted">Total Inputs</p>
                </div>
                <div className={`bg-bg-tertiary rounded-xl p-4 border ${summary.totalMatches > 0 ? 'border-red-500/30' : 'border-green-500/30'}`}>
                  <p className={`text-2xl font-bold ${summary.totalMatches > 0 ? 'text-red-400' : 'text-green-400'}`}>{summary.totalMatches}</p>
                  <p className="text-xs text-text-muted">Matches Found</p>
                </div>
                <div className="bg-bg-tertiary rounded-xl p-4 border border-border">
                  <p className="text-2xl font-bold text-accent">{summary.uniqueMatchedInputs}</p>
                  <p className="text-xs text-text-muted">Inputs with Hits</p>
                </div>
                <div className="bg-bg-tertiary rounded-xl p-4 border border-border">
                  <p className="text-2xl font-bold text-text-secondary">{summary.inputsWithNoMatch}</p>
                  <p className="text-xs text-text-muted">Clean Inputs</p>
                </div>
              </div>
              <div className={`rounded-lg p-3 border ${summary.totalMatches > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
                <p className={`text-sm font-medium flex items-center gap-2 ${summary.totalMatches > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {summary.totalMatches > 0 ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
                  {summary.totalMatches > 0
                    ? `${summary.totalMatches} indicator(s) matched — review results below`
                    : 'All inputs are clean — no matches found'}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-text-muted">
              <Search size={40} className="mb-3 opacity-30" />
              <p className="text-sm">Enter values on the left and run screening</p>
            </div>
          )}
        </div>
      </div>

      {results.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">Screening Results</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-3 text-text-muted font-medium text-xs uppercase tracking-wider">Input Value</th>
                  <th className="text-left py-3 px-3 text-text-muted font-medium text-xs uppercase tracking-wider">Status</th>
                  <th className="text-left py-3 px-3 text-text-muted font-medium text-xs uppercase tracking-wider">Matched Indicator</th>
                  <th className="text-left py-3 px-3 text-text-muted font-medium text-xs uppercase tracking-wider">Type</th>
                  <th className="text-left py-3 px-3 text-text-muted font-medium text-xs uppercase tracking-wider">Threat Actor</th>
                  <th className="text-left py-3 px-3 text-text-muted font-medium text-xs uppercase tracking-wider">Confidence</th>
                  <th className="text-left py-3 px-3 text-text-muted font-medium text-xs uppercase tracking-wider">Match Method</th>
                </tr>
              </thead>
              <tbody>
                {uniqueInputs.map((input) => {
                  const matches = results.filter((r) => r.input === input);
                  const anyMatch = matches.some((m) => m.matched);
                  const noMatches = matches.every((m) => !m.matched);

                  if (noMatches) {
                    return (
                      <tr key={input} className="border-b border-border hover:bg-bg-hover/40">
                        <td className="py-3 px-3 font-mono text-sm break-all">{input}</td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/15 text-green-400 border border-green-500/25">
                            <CheckCircle size={12} /> No Match
                          </span>
                        </td>
                        <td className="py-3 px-3 text-text-muted text-xs">—</td>
                        <td className="py-3 px-3 text-text-muted text-xs">—</td>
                        <td className="py-3 px-3 text-text-muted text-xs">—</td>
                        <td className="py-3 px-3 text-text-muted text-xs">—</td>
                        <td className="py-3 px-3 text-text-muted text-xs">—</td>
                      </tr>
                    );
                  }

                  return matches.filter((m) => m.matched).map((match, idx) => (
                    <tr key={`${match.input}-${idx}`} className="border-b border-border bg-red-500/5 hover:bg-red-500/10">
                      <td className="py-3 px-3 font-mono text-sm break-all">
                        <span className={anyMatch ? 'text-red-400' : ''}>{match.input}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/25">
                          <AlertTriangle size={12} /> Match
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-sm break-all">{match.indicatorValue}</td>
                      <td className="py-3 px-3">
                        <StatusBadge label={match.indicatorType || 'N/A'} color={typeColorMap[match.indicatorType || ''] || 'gray'} />
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-sm font-medium">{match.actorName}</span>
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge label={match.confidence || 'N/A'} color={confidenceColorMap[match.confidence || ''] || 'gray'} />
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-xs font-mono px-2 py-0.5 rounded ${match.matchType === 'exact' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25' : 'bg-blue-500/15 text-blue-400 border border-blue-500/25'}`}>
                          {match.matchType}
                        </span>
                      </td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
