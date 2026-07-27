import React from 'react';
import { ChevronLeft, ChevronRight, Database } from 'lucide-react';
import { TableSkeleton } from './LoadingSkeleton';
import EmptyState from './EmptyState';

interface DataTableProps {
  columns: {
    key: string;
    label: string;
    render?: (item: any, index: number) => React.ReactNode;
    sortable?: boolean;
    className?: string;
  }[];
  data: any[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  isLoading?: boolean;
  emptyMessage?: string;
  onPageChange?: (page: number) => void;
  onRowClick?: (item: any) => void;
  rowClassName?: (item: any) => string;
  className?: string;
  selectable?: boolean;
  selected?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

export default function DataTable({
  columns, data, pagination, isLoading, emptyMessage = 'No data found',
  onPageChange, onRowClick, rowClassName,
  selectable, selected = [], onSelectionChange,
}: DataTableProps) {
  const allSelected = data.length > 0 && data.every((item) => selected.includes(item.id));
  const someSelected = data.some((item) => selected.includes(item.id)) && !allSelected;

  const toggleSelectAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange(selected.filter((id) => !data.find((item) => item.id === id)));
    } else {
      const newIds = data.map((item) => item.id).filter((id) => !selected.includes(id));
      onSelectionChange([...selected, ...newIds]);
    }
  };

  const toggleRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onSelectionChange) return;
    if (selected.includes(id)) {
      onSelectionChange(selected.filter((s) => s !== id));
    } else {
      onSelectionChange([...selected, id]);
    }
  };

  const allCols = selectable
    ? [{ key: '__select', label: '', className: 'w-10', render: null as any }, ...columns]
    : columns;

  return (
    <div className="card p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-bg-tertiary/50">
              {selectable && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={toggleSelectAll}
                    className="rounded border-border bg-bg-primary accent-accent cursor-pointer"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th key={col.key} className={`text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider ${col.className || ''}`}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={allCols.length} className="p-0">
                  <TableSkeleton rows={5} cols={allCols.length} />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={allCols.length} className="p-0">
                  <EmptyState
                    icon={<Database size={28} />}
                    title="No data"
                    description={emptyMessage}
                  />
                </td>
              </tr>
            ) : (
              data.map((item, idx) => (
                <tr
                  key={item.id}
                  onClick={() => onRowClick?.(item)}
                  className={`border-b border-border last:border-0 hover:bg-bg-hover transition-colors ${
                    onRowClick ? 'cursor-pointer' : ''
                  } ${rowClassName?.(item) || ''} ${selected.includes(item.id) ? 'bg-accent/10' : ''}`}
                >
                  {selectable && (
                    <td className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.includes(item.id)}
                        onChange={(e) => toggleRow(item.id, e as any)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-border bg-bg-primary accent-accent cursor-pointer"
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 text-sm ${col.className || ''}`}>
                      {col.render ? col.render(item, idx) : (item as any)[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-bg-tertiary/30">
          <span className="text-xs text-text-muted">
            Showing {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange?.(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-1.5 rounded-lg hover:bg-bg-hover disabled:opacity-30 disabled:cursor-not-allowed text-text-secondary"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
              let pageNum: number;
              if (pagination.totalPages <= 5) {
                pageNum = i + 1;
              } else if (pagination.page <= 3) {
                pageNum = i + 1;
              } else if (pagination.page >= pagination.totalPages - 2) {
                pageNum = pagination.totalPages - 4 + i;
              } else {
                pageNum = pagination.page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange?.(pageNum)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                    pageNum === pagination.page
                      ? 'bg-accent text-white'
                      : 'text-text-secondary hover:bg-bg-hover'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => onPageChange?.(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="p-1.5 rounded-lg hover:bg-bg-hover disabled:opacity-30 disabled:cursor-not-allowed text-text-secondary"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
