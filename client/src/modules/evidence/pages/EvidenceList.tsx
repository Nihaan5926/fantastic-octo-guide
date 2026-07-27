import React, { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useEvidenceStore } from '../store';
import { evidenceApi } from '../api';
import { exportToCSV, exportToJSON } from '../../../utils/export';
import Modal from '../../../components/common/Modal';
import PageHeader from '../../../components/common/PageHeader';
import SearchBar from '../../../components/common/SearchBar';
import { FormInput, FormTextarea, FormSelect } from '../../../components/common/FormComponents';
import { TableSkeleton } from '../../../components/common/LoadingSkeleton';
import { StatusBadge, ClassificationBadge } from '../../../components/common/Badges';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import FileUpload from '../../../components/common/FileUpload';
import { Trash2, File, ChevronDown, ChevronRight, Eye, Clock, User as UserIcon, Download, Play, Image, FileText, Video, FileArchive, Database, X, Upload } from 'lucide-react';
import { ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react';

const typeOptions = [
  { value: 'DOCUMENT', label: 'Document' },
  { value: 'IMAGE', label: 'Image' },
  { value: 'VIDEO', label: 'Video' },
  { value: 'AUDIO', label: 'Audio' },
  { value: 'OTHER', label: 'Other' },
];

const classificationOptions = [
  { value: 'UNCLASSIFIED', label: 'Unclassified' },
  { value: 'CONFIDENTIAL', label: 'Confidential' },
  { value: 'SECRET', label: 'Secret' },
  { value: 'TOP_SECRET', label: 'Top Secret' },
];

const statusOptions = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const statusColorMap: Record<string, string> = {
  DRAFT: 'gray', ACTIVE: 'green', ARCHIVED: 'yellow',
};

const typeColorMap: Record<string, string> = {
  DOCUMENT: 'blue', IMAGE: 'purple', VIDEO: 'red', AUDIO: 'yellow', OTHER: 'gray',
};

interface CustodyEntry {
  action: string;
  timestamp: string;
  user_id?: string;
  user?: string;
}

interface EvidenceForm {
  type: string;
  title: string;
  description: string;
  classification: string;
  case_id: string;
  report_id: string;
}

const emptyForm: EvidenceForm = {
  type: 'DOCUMENT', title: '', description: '', classification: 'UNCLASSIFIED', case_id: '', report_id: '',
};

function formatSize(bytes: number): string {
  if (bytes > 1048576) return `${(bytes / 1048576).toFixed(2)} MB`;
  if (bytes > 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function getFileTypeIcon(mimeType: string | null, className?: string) {
  const cls = className || 'w-5 h-5';
  if (!mimeType) return <File className={cls} />;
  if (mimeType.startsWith('image/')) return <Image className={cls} />;
  if (mimeType.startsWith('video/')) return <Video className={cls} />;
  if (mimeType === 'application/pdf') return <FileText className={cls} />;
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar') || mimeType.includes('gzip')) return <FileArchive className={cls} />;
  if (mimeType.includes('json') || mimeType.includes('xml') || mimeType.includes('csv') || mimeType.includes('sql')) return <Database className={cls} />;
  if (mimeType.startsWith('text/') || mimeType.includes('document') || mimeType.includes('word') || mimeType.includes('excel') || mimeType.includes('powerpoint')) return <FileText className={cls} />;
  return <File className={cls} />;
}

function getPreviewable(mimeType: string | null): boolean {
  if (!mimeType) return false;
  if (mimeType.startsWith('image/')) return true;
  if (mimeType === 'application/pdf') return true;
  if (mimeType.startsWith('text/')) return true;
  if (mimeType.startsWith('video/')) return true;
  if (mimeType.startsWith('audio/')) return true;
  return false;
}

export default function EvidenceList() {
  const { items, pagination, isLoading, isSubmitting, fetchList, create, createWithFile, remove } = useEvidenceStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [classificationFilter, setClassificationFilter] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [form, setForm] = useState<EvidenceForm>(emptyForm);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    fetchList({ page, search, type: typeFilter, classification: classificationFilter });
  }, [page, typeFilter, classificationFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchList({ page: 1, search, type: typeFilter, classification: classificationFilter });
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const openCreate = () => {
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openUpload = () => {
    setUploadFile(null);
    setUploadProgress(0);
    setUploadOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await create(form);
      toast.success('Evidence created');
      setFormOpen(false);
      fetchList({ page, search, type: typeFilter, classification: classificationFilter });
    } catch {
      toast.error('Operation failed');
    }
  };

  const handleFileUpload = async () => {
    if (!uploadFile) return;
    setIsUploading(true);
    setUploadProgress(0);

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) { clearInterval(progressInterval); return prev; }
        return prev + Math.random() * 15;
      });
    }, 200);

    try {
      const fd = new FormData();
      fd.append('file', uploadFile);
      fd.append('type', form.type);
      fd.append('title', form.title || uploadFile.name);
      fd.append('description', form.description);
      fd.append('classification', form.classification);
      if (form.case_id) fd.append('caseId', form.case_id);
      if (form.report_id) fd.append('reportId', form.report_id);

      await createWithFile(fd);

      clearInterval(progressInterval);
      setUploadProgress(100);
      toast.success('File uploaded successfully');
      setUploadOpen(false);
      setUploadFile(null);
      fetchList({ page, search, type: typeFilter, classification: classificationFilter });
    } catch {
      clearInterval(progressInterval);
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await remove(deleteTarget.id);
      toast.success('Evidence deleted');
      setDeleteTarget(null);
    } catch {
      toast.error('Delete failed');
    }
  };

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const parseCustodyChain = (item: any): CustodyEntry[] => {
    try {
      if (Array.isArray(item.chain_of_custody)) return item.chain_of_custody;
      if (typeof item.chain_of_custody === 'string') {
        const parsed = JSON.parse(item.chain_of_custody);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch { /* ignore */ }
    return [];
  };

  const handleDownload = async (item: any) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/evidence/${item.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) { toast.error('Download failed'); return; }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.file_path || item.title || 'evidence-file';
      a.click();
      URL.revokeObjectURL(url);
      evidenceApi.addCustody(item.id, 'DOWNLOADED').catch(() => {});
    } catch {
      toast.error('Download failed');
    }
  };

  const handlePreview = (item: any) => {
    window.open(`/api/evidence/${item.id}/preview`, '_blank');
    evidenceApi.addCustody(item.id, 'VIEWED').catch(() => {});
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const { data } = await evidenceApi.list({ limit: 1000 });
      const allItems = data.data || data.items || [];
      const flat = allItems.map((item: any) => {
        const { chain_of_custody, ...rest } = item;
        return rest;
      });
      exportToCSV(flat, 'evidence-export');
      toast.success(`Exported ${flat.length} evidence items as CSV`);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
      setExportOpen(false);
    }
  };

  const handleExportJSON = async () => {
    setExporting(true);
    try {
      const { data } = await evidenceApi.list({ limit: 1000 });
      const allItems = data.data || data.items || [];
      exportToJSON(allItems, 'evidence-export');
      toast.success(`Exported ${allItems.length} evidence items as JSON`);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
      setExportOpen(false);
    }
  };

  const handleBulkDelete = async () => {
    setBulkDeleteOpen(false);
    const count = selectedIds.length;
    try {
      const results = await Promise.allSettled(selectedIds.map((id) => evidenceApi.delete(id)));
      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed > 0) {
        toast.success(`${count - failed} deleted, ${failed} failed`);
      } else {
        toast.success(`${count} evidence item(s) deleted`);
      }
      setSelectedIds([]);
      fetchList({ page, search, type: typeFilter, classification: classificationFilter });
    } catch {
      toast.error('Bulk delete failed');
    }
  };

  const handleBulkDownload = () => {
    const selectedItems = items.filter((item: any) => selectedIds.includes(item.id));
    let downloaded = 0;
    selectedItems.forEach((item: any) => {
      if (item.file_path) {
        handleDownload(item);
        downloaded++;
      }
    });
    if (downloaded > 0) {
      toast.success(`Downloading ${downloaded} file(s)`);
    } else {
      toast.error('No downloadable files found in selection');
    }
  };

  const allSelected = items.length > 0 && items.every((item: any) => selectedIds.includes(item.id));
  const someSelected = items.some((item: any) => selectedIds.includes(item.id)) && !allSelected;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(selectedIds.filter((id) => !items.find((item: any) => item.id === id)));
    } else {
      const newIds = items.map((item: any) => item.id).filter((id: any) => !selectedIds.includes(id));
      setSelectedIds([...selectedIds, ...newIds]);
    }
  };

  const toggleSelectItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((s) => s !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const columns = [
    {
      key: 'classification',
      label: 'Class',
      render: (item: any) => <ClassificationBadge level={item.classification || 'UNCLASSIFIED'} />,
    },
    {
      key: 'type',
      label: 'Type',
      render: (item: any) => <StatusBadge label={item.type} color={typeColorMap[item.type] || 'gray'} />,
    },
    { key: 'title', label: 'Title' },
    { key: 'case_id', label: 'Case' },
    { key: 'report_id', label: 'Report' },
    {
      key: 'file',
      label: 'File',
      render: (item: any) => item.file_path ? (
        <span className="flex items-center gap-1.5 text-accent text-xs">
          {getFileTypeIcon(item.mime_type, 'w-3.5 h-3.5')}
          <span className="truncate max-w-[120px]">{item.file_path}</span>
        </span>
      ) : <span className="text-xs text-text-muted">—</span>,
    },
    {
      key: 'actions',
      label: '',
      className: 'w-40',
      render: (item: any) => (
        <div className="flex items-center gap-0.5">
          {item.file_path && getPreviewable(item.mime_type) && (
            <button onClick={(e) => { e.stopPropagation(); handlePreview(item); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-accent" title="Preview">
              <Play size={14} />
            </button>
          )}
          {item.file_path && (
            <button onClick={(e) => { e.stopPropagation(); handleDownload(item); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-text-primary" title="Download">
              <Download size={14} />
            </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); navigate(`/evidence/${item.id}`); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-text-primary" title="View Details">
            <Eye size={14} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); toggleRow(item.id); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-text-primary" title="Chain of Custody">
            {expandedRows.has(item.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(item); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-red-400">
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  const totalCols = columns.length + 1;

  return (
    <div>
      <PageHeader title="Evidence" subtitle="Manage evidence records" onCreate={openCreate} createLabel="New Evidence">
        <div className="flex items-center gap-2">
          <button onClick={openUpload} className="btn-primary flex items-center gap-2">
            <Upload size={16} /> Upload File
          </button>
          <div className="relative" ref={exportRef}>
            <button
              onClick={() => setExportOpen(!exportOpen)}
              disabled={exporting}
              className="btn-secondary"
            >
              {exporting ? (
                <span className="flex items-center gap-1">
                  <span className="animate-pulse">Exporting...</span>
                </span>
              ) : (
                <>
                  <Download size={16} />
                  Export
                  <ChevronDown size={14} />
                </>
              )}
            </button>
            {exportOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-bg-card border border-border rounded-xl shadow-xl z-50 py-1">
                <button
                  onClick={handleExportCSV}
                  className="w-full text-left px-4 py-2.5 text-sm text-text-primary hover:bg-bg-hover transition-colors flex items-center gap-2"
                >
                  <Download size={14} /> Export CSV
                </button>
                <button
                  onClick={handleExportJSON}
                  className="w-full text-left px-4 py-2.5 text-sm text-text-primary hover:bg-bg-hover transition-colors flex items-center gap-2"
                >
                  <Download size={14} /> Export JSON
                </button>
              </div>
            )}
          </div>
        </div>
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search evidence..." className="flex-1" />
        <FormSelect label="" options={typeOptions} value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} placeholder="All Types" className="w-36" />
        <FormSelect label="" options={classificationOptions} value={classificationFilter} onChange={(e) => { setClassificationFilter(e.target.value); setPage(1); }} placeholder="All Classifications" className="w-40" />
      </div>

      {selectedIds.length > 0 && (
        <div className="mb-4 p-3 bg-accent/10 border border-accent/30 rounded-xl flex items-center justify-between">
          <span className="text-sm text-text-primary">
            {selectedIds.length} item(s) selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkDownload}
              className="btn-secondary text-xs py-1.5"
            >
              <Download size={14} /> Download Selected
            </button>
            <button
              onClick={() => setBulkDeleteOpen(true)}
              className="btn-danger text-xs py-1.5"
            >
              <Trash2 size={14} /> Delete Selected
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="text-xs text-text-muted hover:text-text-secondary px-2"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-bg-tertiary/50">
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
                  <td colSpan={totalCols} className="p-0">
                    <TableSkeleton rows={5} cols={totalCols} />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={totalCols} className="px-4 py-16 text-center text-text-muted">
                    No evidence found
                  </td>
                </tr>
              ) : (
                items.map((item: any) => {
                  const custodyChain = parseCustodyChain(item);
                  const isExpanded = expandedRows.has(item.id);
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <React.Fragment key={item.id}>
                      <tr
                        onClick={() => navigate(`/evidence/${item.id}`)}
                        className={`border-b border-border last:border-0 hover:bg-bg-hover transition-colors cursor-pointer ${isSelected ? 'bg-accent/10' : ''}`}
                      >
                        <td className="w-10 px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => toggleSelectItem(item.id, e as any)}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded border-border bg-bg-primary accent-accent cursor-pointer"
                          />
                        </td>
                        {columns.map((col) => (
                          <td key={col.key} className={`px-4 py-3 text-sm ${col.className || ''}`}>
                            {col.render ? col.render(item) : (item as any)[col.key]}
                          </td>
                        ))}
                      </tr>
                      {isExpanded && custodyChain.length > 0 && (
                        <tr className="bg-bg-tertiary/20 border-b border-border">
                          <td colSpan={totalCols} className="px-4 py-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Clock size={14} className="text-text-muted" />
                              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Chain of Custody</span>
                              <span className="text-[10px] text-text-muted">({custodyChain.length} entries)</span>
                            </div>
                            <div className="space-y-2">
                              {custodyChain.map((entry: CustodyEntry, idx: number) => (
                                <div key={idx} className="flex items-start gap-3">
                                  <div className="flex flex-col items-center">
                                    <div className={`w-2 h-2 rounded-full ${idx === custodyChain.length - 1 ? 'bg-accent' : 'bg-text-muted'}`} />
                                    {idx < custodyChain.length - 1 && <div className="w-px h-6 bg-border" />}
                                  </div>
                                  <div className="flex-1 min-w-0 pb-1">
                                    <p className="text-xs text-text-primary font-medium">{entry.action}</p>
                                    <div className="flex items-center gap-3 mt-0.5">
                                      <span className="text-[10px] text-text-muted flex items-center gap-1">
                                        <UserIcon size={10} /> {entry.user_id || entry.user || 'Unknown'}
                                      </span>
                                      <span className="text-[10px] text-text-muted">
                                        {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : '—'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                      {isExpanded && custodyChain.length === 0 && (
                        <tr className="bg-bg-tertiary/20 border-b border-border">
                          <td colSpan={totalCols} className="px-4 py-3 text-center text-xs text-text-muted">
                            No custody records
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
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
                onClick={() => setPage(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="p-1.5 rounded-lg hover:bg-bg-hover disabled:opacity-30 disabled:cursor-not-allowed text-text-secondary"
              >
                <ChevronRightIcon size={16} className="rotate-180" />
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
                    onClick={() => setPage(pageNum)}
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
                onClick={() => setPage(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="p-1.5 rounded-lg hover:bg-bg-hover disabled:opacity-30 disabled:cursor-not-allowed text-text-secondary"
              >
                <ChevronRightIcon size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title="Create Evidence" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormSelect label="Type" options={typeOptions} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} required />
            <FormSelect label="Classification" options={classificationOptions} value={form.classification} onChange={(e) => setForm({ ...form, classification: e.target.value })} required />
          </div>
          <FormInput label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <FormTextarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput label="Case ID" value={form.case_id} onChange={(e) => setForm({ ...form, case_id: e.target.value })} placeholder="Optional" />
            <FormInput label="Report ID" value={form.report_id} onChange={(e) => setForm({ ...form, report_id: e.target.value })} placeholder="Optional" />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button type="button" onClick={() => setFormOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={uploadOpen} onClose={() => { if (!isUploading) { setUploadOpen(false); setUploadFile(null); } }} title="Upload File" size="md">
        <div className="space-y-4">
          <FileUpload
            selectedFile={uploadFile}
            onChange={(f) => setUploadFile(f)}
            disabled={isUploading}
            isUploading={isUploading}
          />

          {uploadFile && (
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormSelect label="Type" options={typeOptions} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
                <FormSelect label="Classification" options={classificationOptions} value={form.classification} onChange={(e) => setForm({ ...form, classification: e.target.value })} />
              </div>
              <FormInput label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={uploadFile.name} />
              <FormTextarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormInput label="Case ID" value={form.case_id} onChange={(e) => setForm({ ...form, case_id: e.target.value })} placeholder="Optional" />
                <FormInput label="Report ID" value={form.report_id} onChange={(e) => setForm({ ...form, report_id: e.target.value })} placeholder="Optional" />
              </div>
            </div>
          )}

          {uploadProgress > 0 && isUploading && (
            <div className="mt-2">
              <div className="w-full bg-bg-tertiary rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(uploadProgress, 100)}%` }}
                />
              </div>
              <p className="text-xs text-text-muted mt-1 text-center">
                Uploading... {Math.min(Math.round(uploadProgress), 100)}%
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button type="button" onClick={() => { if (!isUploading) { setUploadOpen(false); setUploadFile(null); } }} className="btn-secondary" disabled={isUploading}>Cancel</button>
            <button type="button" onClick={handleFileUpload} disabled={!uploadFile || isUploading} className="btn-primary">
              {isUploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Evidence"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        variant="danger"
        isLoading={isSubmitting}
      />

      <ConfirmDialog
        isOpen={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        title="Delete Selected Evidence"
        message={`Are you sure you want to delete ${selectedIds.length} evidence item(s)? This action cannot be undone.`}
        confirmLabel={`Delete ${selectedIds.length} Item(s)`}
        variant="danger"
      />
    </div>
  );
}
