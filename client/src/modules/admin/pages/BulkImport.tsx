import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { Upload, FileText, Check, X, Loader2, AlertTriangle } from 'lucide-react';
import PageHeader from '../../../components/common/PageHeader';
import api from '../../../api/client';

interface CsvRow {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  clearance: string;
}

interface ValidationError {
  row: number;
  email: string;
  errors: string[];
}

const ALLOWED_ROLES = ['VIEWER', 'ANALYST', 'ADMIN'];
const ALLOWED_CLEARANCES = ['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET'];

function parseCSV(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/["']/g, ''));
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim().replace(/^["']|["']$/g, ''));
    const row: any = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    rows.push({
      email: row.email || '',
      firstName: row.firstname || row.first_name || row.firstName || '',
      lastName: row.lastname || row.last_name || row.lastName || '',
      role: (row.role || 'VIEWER').toUpperCase(),
      clearance: (row.clearance || 'UNCLASSIFIED').toUpperCase(),
    });
  }

  return rows;
}

export default function BulkImport() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CsvRow[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<{ imported: number; skipped: number; messages: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResults(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const rows = parseCSV(text);
        setPreview(rows);

        const validationErrors: ValidationError[] = [];
        rows.forEach((row, idx) => {
          const rowErrors: string[] = [];
          if (!row.email || !row.email.includes('@')) rowErrors.push('Invalid email');
          if (!row.firstName) rowErrors.push('First name required');
          if (!row.lastName) rowErrors.push('Last name required');
          if (!ALLOWED_ROLES.includes(row.role)) rowErrors.push(`Invalid role: ${row.role}`);
          if (!ALLOWED_CLEARANCES.includes(row.clearance)) rowErrors.push(`Invalid clearance: ${row.clearance}`);

          if (rowErrors.length > 0) {
            validationErrors.push({ row: idx + 1, email: row.email, errors: rowErrors });
          }
        });
        setErrors(validationErrors);
      } catch {
        toast.error('Failed to parse CSV file');
        setPreview([]);
      }
    };
    reader.readAsText(f);
  };

  const handleImport = async () => {
    const validRows = preview.filter((_, idx) => {
      return !errors.some((e) => e.row === idx + 1);
    });

    if (validRows.length === 0) {
      toast.error('No valid rows to import');
      return;
    }

    setImporting(true);
    let imported = 0;
    let skipped = 0;
    const messages: string[] = [];

    for (const row of validRows) {
      try {
        await api.post('/admin/users', {
          email: row.email,
          password: 'changeme123!',
          firstName: row.firstName,
          lastName: row.lastName,
          roleName: row.role,
          clearance: row.clearance,
        });
        imported++;
        messages.push(`Imported: ${row.email}`);
      } catch (err: any) {
        skipped++;
        messages.push(`Skipped ${row.email}: ${err.response?.data?.error || err.message}`);
      }
    }

    setResults({ imported, skipped, messages });
    setImporting(false);
    toast.success(`Imported ${imported}, skipped ${skipped}`);
  };

  const handleClear = () => {
    setFile(null);
    setPreview([]);
    setErrors([]);
    setResults(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Bulk User Import" subtitle="Upload a CSV file to create multiple users at once" />

      <div className="card">
        <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
            id="csv-upload"
          />
          <label
            htmlFor="csv-upload"
            className="cursor-pointer flex flex-col items-center gap-3"
          >
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
              <Upload size={24} className="text-accent" />
            </div>
            <div>
              <p className="text-sm font-medium">Drop CSV file here or click to browse</p>
              <p className="text-xs text-text-muted mt-1">
                Columns: email, firstName, lastName, role, clearance
              </p>
            </div>
          </label>
        </div>

        {file && (
          <div className="mt-4 flex items-center gap-2 text-sm text-text-secondary">
            <FileText size={16} />
            <span>{file.name}</span>
            <span className="text-text-muted">({(file.size / 1024).toFixed(1)} KB)</span>
            <button onClick={handleClear} className="ml-auto text-xs text-accent-danger hover:underline">Clear</button>
          </div>
        )}
      </div>

      {errors.length > 0 && (
        <div className="card border-accent-danger/30 bg-accent-danger/5">
          <h3 className="text-sm font-semibold text-accent-danger flex items-center gap-2 mb-3">
            <AlertTriangle size={16} />
            Validation Errors ({errors.length})
          </h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {errors.map((err, i) => (
              <div key={i} className="text-sm p-2 bg-bg-primary rounded-lg">
                <span className="font-medium">Row {err.row}</span>
                <span className="text-text-muted ml-2">{err.email}</span>
                <div className="text-xs text-accent-danger mt-1">
                  {err.errors.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {preview.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold mb-3">
            Preview ({preview.length} rows)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-text-muted uppercase">
                  <th className="py-2 px-3">#</th>
                  <th className="py-2 px-3">Email</th>
                  <th className="py-2 px-3">First Name</th>
                  <th className="py-2 px-3">Last Name</th>
                  <th className="py-2 px-3">Role</th>
                  <th className="py-2 px-3">Clearance</th>
                  <th className="py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row, idx) => {
                  const hasError = errors.some((e) => e.row === idx + 1);
                  return (
                    <tr key={idx} className="border-b border-border/50 hover:bg-bg-hover/50">
                      <td className="py-2 px-3 text-text-muted">{idx + 1}</td>
                      <td className="py-2 px-3">{row.email}</td>
                      <td className="py-2 px-3">{row.firstName}</td>
                      <td className="py-2 px-3">{row.lastName}</td>
                      <td className="py-2 px-3">{row.role}</td>
                      <td className="py-2 px-3">{row.clearance}</td>
                      <td className="py-2 px-3">
                        {hasError ? (
                          <span className="text-accent-danger flex items-center gap-1"><X size={14} /> Invalid</span>
                        ) : (
                          <span className="text-green-400 flex items-center gap-1"><Check size={14} /> Valid</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              onClick={handleImport}
              disabled={importing || preview.length === 0}
              className="btn-primary"
            >
              {importing ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
              Import {preview.filter((_, idx) => !errors.some((e) => e.row === idx + 1)).length} valid users
            </button>
            <button onClick={handleClear} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {results && (
        <div className="card">
          <h3 className="text-sm font-semibold mb-3">Import Results</h3>
          <div className="flex gap-6 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{results.imported}</div>
              <div className="text-xs text-text-muted">Imported</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">{results.skipped}</div>
              <div className="text-xs text-text-muted">Skipped</div>
            </div>
          </div>
          <div className="space-y-1 max-h-60 overflow-y-auto text-xs font-mono">
            {results.messages.map((msg, i) => (
              <div key={i} className={`p-2 rounded ${msg.startsWith('Imported') ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                {msg}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
