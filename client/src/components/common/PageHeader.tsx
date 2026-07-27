import React from 'react';
import { Plus, Loader2 } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onCreate?: () => void;
  createLabel?: string;
  isLoading?: boolean;
  children?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, onCreate, createLabel = 'Create', isLoading, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="text-sm text-text-muted mt-1">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {children}
        {onCreate && (
          <button onClick={onCreate} disabled={isLoading} className="btn-primary">
            {isLoading ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
            {createLabel}
          </button>
        )}
      </div>
    </div>
  );
}
