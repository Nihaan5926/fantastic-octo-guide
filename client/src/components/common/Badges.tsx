import React from 'react';

interface BadgeProps {
  label: string;
  color: string;
  className?: string;
}

export function StatusBadge({ label, color, className }: BadgeProps) {
  const colorMap: Record<string, string> = {
    green: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    yellow: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    red: 'bg-red-500/20 text-red-400 border-red-500/30',
    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    gray: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  };

  return (
    <span className={`badge border ${colorMap[color] || colorMap.gray} ${className || ''}`}>
      {label}
    </span>
  );
}

export function ClassificationBadge({ level }: { level: string }) {
  const map: Record<string, { label: string; color: string }> = {
    UNCLASSIFIED: { label: 'UNCLASS', color: 'green' },
    CONFIDENTIAL: { label: 'CONFIDENTIAL', color: 'blue' },
    SECRET: { label: 'SECRET', color: 'yellow' },
    TOP_SECRET: { label: 'TOP SECRET', color: 'red' },
  };
  const info = map[level] || { label: level, color: 'gray' };
  return <StatusBadge label={info.label} color={info.color} />;
}

export function PriorityBadge({ level }: { level: string }) {
  const map: Record<string, { label: string; color: string }> = {
    CRITICAL: { label: 'CRITICAL', color: 'red' },
    HIGH: { label: 'HIGH', color: 'yellow' },
    MEDIUM: { label: 'MEDIUM', color: 'blue' },
    LOW: { label: 'LOW', color: 'gray' },
  };
  const info = map[level] || { label: level, color: 'gray' };
  return <StatusBadge label={info.label} color={info.color} />;
}

export function SourceTypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    HUMINT: 'purple', OSINT: 'blue', SIGINT: 'yellow',
    GEOINT: 'green', MASINT: 'red', TECHINT: 'gray',
  };
  return <StatusBadge label={type} color={map[type] || 'gray'} />;
}
