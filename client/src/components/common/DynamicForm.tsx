import React from 'react';
import { ColumnInfo } from '../../hooks/useDynamicTable';

const TYPE_COLORS: Record<string, string> = {
  uuid: 'bg-purple-500/20 text-purple-400',
  varchar: 'bg-blue-500/20 text-blue-400',
  'character varying': 'bg-blue-500/20 text-blue-400',
  text: 'bg-green-500/20 text-green-400',
  integer: 'bg-amber-500/20 text-amber-400',
  bigint: 'bg-amber-500/20 text-amber-400',
  numeric: 'bg-amber-500/20 text-amber-400',
  boolean: 'bg-cyan-500/20 text-cyan-400',
  jsonb: 'bg-pink-500/20 text-pink-400',
  json: 'bg-pink-500/20 text-pink-400',
  date: 'bg-teal-500/20 text-teal-400',
  'timestamp with time zone': 'bg-teal-500/20 text-teal-400',
};

function typeBadge(t: string) {
  const short = t.replace('character varying', 'varchar').replace('timestamp with time zone', 'timestamptz');
  const color = TYPE_COLORS[t] || 'bg-gray-500/20 text-gray-400';
  return <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${color}`}>{short}</span>;
}

interface DynamicFormProps {
  columns: ColumnInfo[];
  form: Record<string, string>;
  onChange: (field: string, value: string) => void;
}

export default function DynamicForm({ columns, form, onChange }: DynamicFormProps) {
  return (
    <>
      {columns.map(c => (
        <div key={c.column_name}>
          <div className="flex items-center gap-1.5 mb-1">
            <label className="text-xs font-medium text-text-primary">{c.column_name}</label>
            {typeBadge(c.data_type)}
          </div>
          {c.data_type === 'text' || c.data_type === 'jsonb' || c.data_type === 'json' ? (
            <textarea
              className="input min-h-[60px] w-full text-sm"
              value={form[c.column_name] || ''}
              onChange={(e) => onChange(c.column_name, e.target.value)}
              rows={2}
            />
          ) : c.data_type === 'boolean' ? (
            <select
              className="input w-full"
              value={form[c.column_name] || ''}
              onChange={(e) => onChange(c.column_name, e.target.value)}
            >
              <option value="">— null —</option>
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          ) : (
            <input
              className="input w-full text-sm"
              type={c.data_type === 'date' ? 'date' : c.data_type?.includes('timestamp') ? 'datetime-local' : 'text'}
              value={form[c.column_name] || ''}
              onChange={(e) => onChange(c.column_name, e.target.value)}
            />
          )}
        </div>
      ))}
    </>
  );
}
