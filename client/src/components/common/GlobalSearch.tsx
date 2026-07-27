import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, Users, FolderOpen, Shield, Globe, Target, Briefcase, AlertCircle } from 'lucide-react';
import api from '../../api/client';

interface SearchResult {
  entity_type: string;
  entity_id: string;
  title: string;
  subtitle: string;
  path: string;
}

const iconMap: Record<string, React.ReactNode> = {
  Report: <FileText size={18} />,
  Source: <Users size={18} />,
  Case: <FolderOpen size={18} />,
  Threat: <Shield size={18} />,
  Evidence: <FolderOpen size={18} />,
  Personnel: <Users size={18} />,
  Mission: <Target size={18} />,
};

const badgeColorMap: Record<string, string> = {
  Report: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Source: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  Case: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  Threat: 'bg-red-500/20 text-red-400 border-red-500/30',
  Evidence: 'bg-green-500/20 text-green-400 border-green-500/30',
  Personnel: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  Mission: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === 'K' && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        setOpen(true);
        setQuery('');
        setResults([]);
        setSelectedIndex(-1);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get('/search', { params: { q: q.trim() } });
      setResults(data.results || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => doSearch(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, doSearch]);

  useEffect(() => { setSelectedIndex(-1); }, [results]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0 && results[selectedIndex]) {
      e.preventDefault();
      navigate(results[selectedIndex].path);
      setOpen(false);
    }
  };

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.entity_type]) acc[r.entity_type] = [];
    acc[r.entity_type].push(r);
    return acc;
  }, {});

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      className="flex items-center gap-2 px-3 py-1.5 text-sm text-text-muted bg-bg-tertiary/50 border border-border rounded-lg hover:bg-bg-hover hover:text-text-secondary transition-colors"
    >
      <Search size={15} />
      <span className="hidden md:inline">Search...</span>
      <kbd className="hidden lg:inline-flex items-center gap-0.5 ml-2 text-[10px] font-mono text-text-muted bg-bg-hover border border-border rounded px-1.5 py-0.5">
        Ctrl+K
      </kbd>
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-xl bg-bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 border-b border-border">
          <Search size={18} className="text-text-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search reports, cases, sources, threats..."
            className="flex-1 py-4 bg-transparent text-text-primary placeholder:text-text-muted outline-none text-sm"
          />
          <kbd className="text-xs text-text-muted bg-bg-hover border border-border rounded px-1.5 py-0.5 font-mono">Esc</kbd>
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-2">
          {loading && (
            <div className="text-center py-8 text-sm text-text-muted animate-pulse">Searching...</div>
          )}

          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <div className="text-center py-8">
              <AlertCircle size={24} className="mx-auto text-text-muted mb-2" />
              <p className="text-sm text-text-muted">No results found for "{query}"</p>
            </div>
          )}

          {!loading && results.length > 0 && Object.entries(grouped).map(([entityType, items]) => (
            <div key={entityType} className="mb-2">
              <div className="text-[10px] font-semibold text-text-muted uppercase tracking-widest px-3 py-1.5">
                {entityType}s
              </div>
              {items.map((item, idx) => {
                const globalIdx = results.indexOf(item);
                return (
                  <button
                    key={item.entity_id}
                    onClick={() => { navigate(item.path); setOpen(false); }}
                    onMouseEnter={() => setSelectedIndex(globalIdx)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      globalIdx === selectedIndex ? 'bg-bg-hover' : ''
                    }`}
                  >
                    <div className="text-text-muted shrink-0">
                      {iconMap[item.entity_type] || <Briefcase size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{item.title}</p>
                      {item.subtitle && (
                        <p className="text-xs text-text-muted truncate">{item.subtitle}</p>
                      )}
                    </div>
                    <span className={`shrink-0 badge border text-[10px] px-2 py-0.5 rounded ${badgeColorMap[item.entity_type] || 'bg-slate-500/20 text-slate-400 border-slate-500/30'}`}>
                      {item.entity_type}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}

          {!loading && query.trim().length < 2 && (
            <div className="text-center py-8 text-sm text-text-muted">
              <Globe size={24} className="mx-auto mb-2 opacity-40" />
              Type at least 2 characters to search
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
