import React, { useState, useCallback, useRef } from 'react';
import Papa from 'papaparse';
import toast from 'react-hot-toast';
import Modal from './Modal';
import { Upload, AlertTriangle, Check, ChevronDown, FileText, X, ArrowRight } from 'lucide-react';

export interface Column {
  key: string;
  label: string;
  required?: boolean;
  type?: 'string' | 'number';
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

interface BulkImportProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: string;
  columns: Column[];
  onImport: (rows: Record<string, any>[]) => Promise<void>;
  title?: string;
}

export default function BulkImport({ isOpen, onClose, entityType, columns, onImport, title }: BulkImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [showColumnMap, setShowColumnMap] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const requiredColumns = columns.filter((c) => c.required);

  const validateRows = useCallback(
    (data: Record<string, any>[]) => {
      const errs: ValidationError[] = [];
      data.forEach((row, idx) => {
        for (const col of requiredColumns) {
          const val = row[col.key];
          if (val === undefined || val === null || String(val).trim() === '') {
            errs.push({ row: idx + 2, field: col.label, message: `${col.label} is required` });
          }
        }
        for (const col of columns) {
          if (col.type === 'number' && row[col.key]) {
            if (isNaN(Number(row[col.key]))) {
              errs.push({ row: idx + 2, field: col.label, message: `${col.label} must be a number` });
            }
          }
        }
      });
      setErrors(errs);
      return errs.length === 0;
    },
    [requiredColumns, columns],
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    if (!f) return;

    if (!f.name.endsWith('.csv')) {
      toast.error('Only CSV files are supported');
      return;
    }

    setFile(f);
    setErrors([]);

    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length === 0) {
          toast.error('CSV file is empty');
          return;
        }
        const hdrs = results.meta.fields || [];
        setHeaders(hdrs);
        const parsedRows = results.data as Record<string, any>[];
        setRows(parsedRows);
        validateRows(parsedRows);
        toast.success(`Parsed ${parsedRows.length} rows from CSV`);
      },
      error: () => {
        toast.error('Failed to parse CSV file');
      },
    });
  };

  const handleImport = async () => {
    if (!validateRows(rows)) {
      toast.error('Please fix validation errors before importing');
      return;
    }

    const validRows = rows.map((row, idx) => ({ ...row, _row: idx + 2 }));
    setImporting(true);
    setProgress({ current: 0, total: validRows.length });

    try {
      await onImport(validRows);
      setProgress({ current: validRows.length, total: validRows.length });
      toast.success(`Successfully imported ${validRows.length} ${entityType}(s)`);
      setTimeout(() => {
        onClose();
        setFile(null);
        setRows([]);
        setHeaders([]);
        setErrors([]);
      }, 800);
    } catch {
      toast.error('Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) {
      const input = fileInputRef.current;
      if (input) {
        const dt = new DataTransfer();
        dt.items.add(f);
        input.files = dt.files;
        handleFileSelect({ target: { files: dt.files } } as any);
      }
    }
  };

  const getErrorForCell = (header: string, rowIdx: number) => {
    // rowIdx is 0-based in rows array, errors use CSV line number (starting at 2)
    return errors.filter((e) => e.row === rowIdx + 2 && e.field === header);
  };

  const validCount = rows.length - [...new Set(errors.map((e) => e.row))].length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title || `Import ${entityType}s`} size="xl">
      <div className="space-y-4">
        {!file ? (
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-accent/50 transition-colors cursor-pointer"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Upload size={40} className="text-text-muted mx-auto mb-3" />
            <p className="text-sm text-text-primary font-medium">Click or drag to upload CSV file</p>
            <p className="text-xs text-text-muted mt-1">Only CSV files are supported</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-accent" />
                <span className="text-sm font-medium">{file.name}</span>
                <span className="text-xs text-text-muted">({rows.length} rows)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowColumnMap(!showColumnMap)}
                  className="btn-secondary text-xs flex items-center gap-1"
                >
                  Column Map <ChevronDown size={12} className={showColumnMap ? 'rotate-180' : ''} />
                </button>
                <button
                  onClick={() => { setFile(null); setRows([]); setHeaders([]); setErrors([]); }}
                  className="btn-secondary text-xs flex items-center gap-1"
                >
                  <X size={12} /> Change File
                </button>
              </div>
            </div>

            {showColumnMap && (
              <div className="bg-bg-tertiary rounded-lg p-3 border border-border">
                <p className="text-xs text-text-muted mb-2">CSV columns detected. Required fields marked with *.</p>
                <div className="flex flex-wrap gap-2">
                  {headers.map((h) => {
                    const isRequired = columns.some((c) => c.key === h && c.required);
                    const isKnown = columns.some((c) => c.key === h);
                    return (
                      <span
                        key={h}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs border ${
                          isRequired
                            ? 'bg-red-500/10 border-red-500/30 text-red-400'
                            : isKnown
                              ? 'bg-green-500/10 border-green-500/30 text-green-400'
                              : 'bg-bg-hover border-border text-text-muted'
                        }`}
                      >
                        {h}
                        {isRequired && <span className="text-red-400">*</span>}
                        {isKnown && <Check size={10} />}
                      </span>
                    );
                  })}
                </div>
                {requiredColumns.some((c) => !headers.includes(c.key)) && (
                  <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                    <AlertTriangle size={12} /> Missing required columns:{' '}
                    {requiredColumns.filter((c) => !headers.includes(c.key)).map((c) => c.label).join(', ')}
                  </p>
                )}
              </div>
            )}

            {errors.length > 0 && (
              <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                <p className="text-xs text-red-400 flex items-center gap-1 font-medium mb-2">
                  <AlertTriangle size={12} /> {errors.length} validation error(s) —{' '}
                  {[...new Set(errors.map((e) => e.row))].length} row(s) affected
                </p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {errors.slice(0, 10).map((err, i) => (
                    <p key={i} className="text-xs text-red-400/80">
                      Row {err.row}: {err.message}
                    </p>
                  ))}
                  {errors.length > 10 && (
                    <p className="text-xs text-text-muted">...and {errors.length - 10} more errors</p>
                  )}
                </div>
              </div>
            )}

            <div className="overflow-x-auto max-h-64 border border-border rounded-lg">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-bg-tertiary">
                  <tr>
                    <th className="text-left py-2 px-3 text-text-muted font-medium text-xs border-b border-border">#</th>
                    {headers.map((h) => (
                      <th key={h} className="text-left py-2 px-3 text-text-muted font-medium text-xs border-b border-border">
                        {h}
                        {requiredColumns.some((c) => c.key === h) && <span className="text-red-400 ml-0.5">*</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 50).map((row, rowIdx) => (
                    <tr key={rowIdx} className={`border-b border-border hover:bg-bg-hover/40 ${
                      errors.some((e) => e.row === rowIdx + 2) ? 'bg-red-500/5' : ''
                    }`}>
                      <td className="py-2 px-3 text-text-muted text-xs font-mono">{rowIdx + 1}</td>
                      {headers.map((h) => {
                        const cellErrors = getErrorForCell(h, rowIdx);
                        return (
                          <td key={h} className="py-2 px-3 text-xs">
                            <span className={cellErrors.length > 0 ? 'text-red-400' : 'text-text-primary'}>
                              {row[h] ?? ''}
                            </span>
                            {cellErrors.length > 0 && (
                              <div className="text-[10px] text-red-400/80">{cellErrors[0].message}</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 50 && (
                <div className="text-xs text-text-muted p-3 text-center border-t border-border">
                  Showing 50 of {rows.length} rows
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-text-muted">
                {validCount} of {rows.length} rows valid
              </div>
              <div className="flex items-center gap-3">
                {importing && (
                  <div className="flex items-center gap-2 text-xs text-accent">
                    <div className="w-20 bg-bg-tertiary rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full transition-all"
                        style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
                      />
                    </div>
                    {progress.current}/{progress.total}
                  </div>
                )}
                <button onClick={onClose} disabled={importing} className="btn-secondary text-sm">
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing || rows.length === 0 || (errors.length > 0 && validCount === 0)}
                  className="btn-primary text-sm flex items-center gap-1"
                >
                  {importing ? 'Importing...' : (
                    <>
                      Import {validCount} {entityType}{validCount !== 1 ? 's' : ''}
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
