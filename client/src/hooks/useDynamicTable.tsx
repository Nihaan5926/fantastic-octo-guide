import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';

export interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

const schemaCache: Record<string, ColumnInfo[]> = {};

export function useDynamicTable(tableName: string) {
  const [columns, setColumns] = useState<ColumnInfo[]>(schemaCache[tableName] || []);
  const [loading, setLoading] = useState(false);

  const loadSchema = useCallback(async () => {
    if (schemaCache[tableName]) { setColumns(schemaCache[tableName]); return; }
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/data/${tableName}/schema`);
      const cols: ColumnInfo[] = (data.data || []).filter(
        (c: ColumnInfo) => c.column_name !== 'id' && c.column_name !== 'created_at' && c.column_name !== 'updated_at'
      );
      schemaCache[tableName] = cols;
      setColumns(cols);
    } catch { /* fallback to empty */ }
    finally { setLoading(false); }
  }, [tableName]);

  useEffect(() => { loadSchema(); }, [loadSchema]);

  const buildFormPayload = (form: Record<string, string>) => {
    const payload: Record<string, any> = {};
    columns.forEach(c => {
      let v: any = form[c.column_name];
      if (v === '' || v === undefined) v = null;
      else if (c.data_type === 'jsonb' || c.data_type === 'json') {
        try { v = JSON.parse(v); } catch { v = v; }
      } else if (c.data_type === 'integer' || c.data_type === 'bigint' || c.data_type === 'smallint') {
        v = v === null ? null : parseInt(v, 10);
      } else if (c.data_type === 'numeric' || c.data_type === 'decimal' || c.data_type === 'real') {
        v = v === null ? null : parseFloat(v);
      } else if (c.data_type === 'boolean') {
        v = v === 'true' || v === true || v === '1';
      }
      payload[c.column_name] = v;
    });
    return payload;
  };

  const itemToForm = (item: any) => {
    const f: Record<string, string> = {};
    columns.forEach(c => {
      const v = item[c.column_name];
      f[c.column_name] = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
    });
    return f;
  };

  const emptyForm = () => {
    const f: Record<string, string> = {};
    columns.forEach(c => { f[c.column_name] = ''; });
    return f;
  };

  const tableColumns = columns.map(c => ({
    key: c.column_name,
    label: c.column_name,
    render: (item: any) => {
      const val = item[c.column_name];
      if (val === null || val === undefined) return <span className="text-text-muted italic text-xs">—</span>;
      if (typeof val === 'object') return <span className="text-xs font-mono">{JSON.stringify(val).slice(0, 40)}</span>;
      const s = String(val);
      return s.length > 40 ? <span title={s}>{s.slice(0, 40)}...</span> : s;
    },
  }));

  return { columns, loading, buildFormPayload, itemToForm, emptyForm, tableColumns, reload: loadSchema };
}
