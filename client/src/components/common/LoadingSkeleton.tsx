import React from 'react';

export function CardSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="h-4 bg-bg-tertiary rounded w-3/4 mb-3" />
      <div className="h-3 bg-bg-tertiary rounded w-full mb-2" />
      <div className="h-3 bg-bg-tertiary rounded w-5/6 mb-2" />
      <div className="h-3 bg-bg-tertiary rounded w-2/3" />
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="card p-0 overflow-hidden animate-pulse">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-bg-tertiary/50">
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i} className="px-4 py-3">
                  <div className="h-3 bg-bg-tertiary rounded w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r} className="border-b border-border last:border-0">
                {Array.from({ length: cols }).map((_, c) => (
                  <td key={c} className="px-4 py-3">
                    <div className="h-4 bg-bg-tertiary rounded" style={{ width: `${60 + Math.random() * 30}%` }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="card flex items-start gap-4 animate-pulse">
      <div className="p-3 rounded-xl bg-bg-tertiary">
        <div className="w-5 h-5 bg-bg-tertiary rounded" />
      </div>
      <div className="flex-1">
        <div className="h-6 bg-bg-tertiary rounded w-12 mb-2" />
        <div className="h-3 bg-bg-tertiary rounded w-24 mb-1" />
        <div className="h-3 bg-bg-tertiary rounded w-16" />
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="h-4 bg-bg-tertiary rounded w-1/3 mb-6" />
      <div className="flex items-end justify-center gap-4 h-[300px] pb-4">
        {[60, 80, 45, 90, 70, 55, 85].map((h, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-2">
            <div
              className="w-full bg-bg-tertiary rounded-t"
              style={{ height: `${h * 2.5}px`, maxWidth: '48px' }}
            />
            <div className="h-3 bg-bg-tertiary rounded w-8" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="card">
        <div className="h-6 bg-bg-tertiary rounded w-1/4 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <div className="h-3 bg-bg-tertiary rounded w-20 mb-2" />
              <div className="h-5 bg-bg-tertiary rounded w-32" />
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="h-5 bg-bg-tertiary rounded w-1/3 mb-4" />
        <div className="space-y-2">
          <div className="h-4 bg-bg-tertiary rounded w-full" />
          <div className="h-4 bg-bg-tertiary rounded w-5/6" />
          <div className="h-4 bg-bg-tertiary rounded w-3/4" />
        </div>
      </div>
    </div>
  );
}
