import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useReportStore } from '../store';
import { useDynamicTable } from '../../../hooks/useDynamicTable';
import { reportsApi } from '../api';
import { exportToCSV, exportToJSON } from '../../../utils/export';
import DataTable from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import PageHeader from '../../../components/common/PageHeader';
import SearchBar from '../../../components/common/SearchBar';
import { FormInput, FormSelect } from '../../../components/common/FormComponents';
import { StatusBadge, ClassificationBadge, PriorityBadge } from '../../../components/common/Badges';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { Pencil, Trash2, Download, ChevronDown, Trash, Printer, Share2 } from 'lucide-react';
import RichTextEditor from '../../../components/common/RichTextEditor';

const statusOptions = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'IN_REVIEW', label: 'In Review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const classificationOptions = [
  { value: 'UNCLASSIFIED', label: 'Unclassified' },
  { value: 'CONFIDENTIAL', label: 'Confidential' },
  { value: 'SECRET', label: 'Secret' },
  { value: 'TOP_SECRET', label: 'Top Secret' },
];

const priorityOptions = [
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

interface ReportForm {
  reference_number: string;
  title: string;
  classification: string;
  status: string;
  summary: string;
  author_id: string;
  priority: string;
}

const emptyForm: ReportForm = {
  reference_number: '',
  title: '',
  classification: 'UNCLASSIFIED',
  status: 'DRAFT',
  summary: '',
  author_id: '',
  priority: 'MEDIUM',
};

const statusColorMap: Record<string, string> = {
  DRAFT: 'gray', IN_REVIEW: 'blue', APPROVED: 'yellow', PUBLISHED: 'green', ARCHIVED: 'purple',
};

export default function ReportsList() {
  const navigate = useNavigate();
  const { items, pagination, isLoading, isSubmitting, fetchList, create, update, remove } = useReportStore();
  const { tableColumns } = useDynamicTable('intelligence_reports');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [classificationFilter, setClassificationFilter] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ReportForm>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
  const [bulkStatusValue, setBulkStatusValue] = useState('');
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
    fetchList({ page, search, status: statusFilter, classification: classificationFilter });
  }, [page, statusFilter, classificationFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchList({ page: 1, search, status: statusFilter, classification: classificationFilter });
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (item: any) => {
    setEditingId(item.id);
    setForm({
      reference_number: item.reference_number || '',
      title: item.title || '',
      classification: item.classification || 'UNCLASSIFIED',
      status: item.status || 'DRAFT',
      summary: item.summary || '',
      author_id: item.author_id || '',
      priority: item.priority || 'MEDIUM',
    });
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await update(editingId, form);
        toast.success('Report updated');
      } else {
        await create(form);
        toast.success('Report created');
      }
      setFormOpen(false);
      fetchList({ page, search, status: statusFilter, classification: classificationFilter });
    } catch {
      toast.error('Operation failed');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await remove(deleteTarget.id);
      toast.success('Report deleted');
      setDeleteTarget(null);
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const { data } = await reportsApi.list({ limit: 1000 });
      const allItems = data.data || data.items || [];
      exportToCSV(allItems, 'reports-export');
      toast.success(`Exported ${allItems.length} reports as CSV`);
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
      const { data } = await reportsApi.list({ limit: 1000 });
      const allItems = data.data || data.items || [];
      exportToJSON(allItems, 'reports-export');
      toast.success(`Exported ${allItems.length} reports as JSON`);
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
      const results = await Promise.allSettled(selectedIds.map((id) => reportsApi.delete(id)));
      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed > 0) {
        toast.success(`${count - failed} deleted, ${failed} failed`);
      } else {
        toast.success(`${count} report(s) deleted`);
      }
      setSelectedIds([]);
      fetchList({ page, search, status: statusFilter, classification: classificationFilter });
    } catch {
      toast.error('Bulk delete failed');
    }
  };

  const handlePrintPDF = (item: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>${item.title || item.reference_number}</title>
      <style>
        body { font-family: sans-serif; padding: 40px; color: #111; max-width: 800px; margin: auto; }
        h1 { font-size: 24px; margin-bottom: 4px; }
        .meta { color: #666; font-size: 12px; margin-bottom: 20px; }
        .box { border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-bottom: 16px; }
        .box h2 { font-size: 14px; color: #888; text-transform: uppercase; margin: 0 0 8px; }
        .badge { display:inline-block; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
        .summary { white-space: pre-wrap; font-size: 14px; line-height: 1.6; }
      </style></head><body>
      <h1>${item.reference_number}: ${item.title}</h1>
      <div class="meta">
        <span class="badge" style="background:#e5e7eb;color:#374151;">${item.classification}</span>
        <span class="badge" style="margin-left:6px;background:#dbeafe;color:#1e40af;">${item.status}</span>
        <span class="badge" style="margin-left:6px;background:#fef3c7;color:#92400e;">${item.priority}</span>
        <span style="margin-left:12px;">Created: ${item.created_at ? new Date(item.created_at).toLocaleDateString() : '-'}</span>
      </div>
      ${item.summary ? `<div class="box"><h2>Summary</h2><div class="summary">${item.summary}</div></div>` : ''}
      ${item.content ? `<div class="box"><h2>Content</h2><pre style="font-size:12px;background:#f5f5f5;padding:12px;border-radius:6px;overflow-x:auto;">${JSON.stringify(item.content, null, 2)}</pre></div>` : ''}
      </body></html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
    toast.success('Print dialog opened');
  };

  const handleShare = (item: any) => {
    const url = `${window.location.origin}/reports/${item.id}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Report URL copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy URL');
    });
  };

  const handleBulkStatusChange = async () => {
    if (!bulkStatusValue) return;
    setBulkStatusOpen(false);
    const count = selectedIds.length;
    try {
      const results = await Promise.allSettled(
        selectedIds.map((id) => reportsApi.update(id, { status: bulkStatusValue }))
      );
      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed > 0) {
        toast.success(`${count - failed} updated, ${failed} failed`);
      } else {
        toast.success(`${count} report(s) updated`);
      }
      setSelectedIds([]);
      setBulkStatusValue('');
      fetchList({ page, search, status: statusFilter, classification: classificationFilter });
    } catch {
      toast.error('Bulk update failed');
    }
  };

  const columns = [
    { key: 'reference_number', label: 'Ref #' },
    { key: 'title', label: 'Title' },
    {
      key: 'classification',
      label: 'Classification',
      render: (item: any) => <ClassificationBadge level={item.classification} />,
    },
    {
      key: 'status',
      label: 'Status',
      render: (item: any) => <StatusBadge label={item.status} color={statusColorMap[item.status] || 'gray'} />,
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (item: any) => <PriorityBadge level={item.priority} />,
    },
    {
      key: 'actions',
      label: '',
      className: 'w-32',
      render: (item: any) => (
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); handlePrintPDF(item); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-text-primary" title="Print PDF">
            <Printer size={14} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); handleShare(item); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-text-primary" title="Share">
            <Share2 size={14} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); openEdit(item); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-text-primary">
            <Pencil size={14} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(item); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-red-400">
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Reports" subtitle="Manage intelligence reports" onCreate={openCreate} createLabel="New Report">
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
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search reports..." className="flex-1" />
        <FormSelect label="" options={statusOptions} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} placeholder="All Statuses" className="w-40" />
        <FormSelect label="" options={classificationOptions} value={classificationFilter} onChange={(e) => { setClassificationFilter(e.target.value); setPage(1); }} placeholder="All Classifications" className="w-40" />
      </div>

      {selectedIds.length > 0 && (
        <div className="mb-4 p-3 bg-accent/10 border border-accent/30 rounded-xl flex items-center justify-between">
          <span className="text-sm text-text-primary">
            {selectedIds.length} report(s) selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setBulkStatusOpen(true)}
              className="btn-secondary text-xs py-1.5"
            >
              Change Status
            </button>
            <button
              onClick={() => setBulkDeleteOpen(true)}
              className="btn-danger text-xs py-1.5"
            >
              <Trash size={14} /> Delete Selected
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

      <DataTable
        columns={[...tableColumns, ...columns.filter(c => c.key === 'actions')]}
        data={items}
        pagination={pagination}
        isLoading={isLoading}
        emptyMessage="No reports found"
        onPageChange={setPage}
        onRowClick={(item) => navigate(`/reports/${item.id}`)}
        selectable
        selected={selectedIds}
        onSelectionChange={setSelectedIds}
      />

      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title={editingId ? 'Edit Report' : 'Create Report'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput label="Reference Number" value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} required />
            <FormInput label="Author ID" value={form.author_id} onChange={(e) => setForm({ ...form, author_id: e.target.value })} required />
          </div>
          <FormInput label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Summary</label>
            <RichTextEditor
              content={form.summary}
              onChange={(html) => setForm({ ...form, summary: html })}
              placeholder="Write a summary..."
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormSelect label="Classification" options={classificationOptions} value={form.classification} onChange={(e) => setForm({ ...form, classification: e.target.value })} required />
            <FormSelect label="Status" options={statusOptions} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} required />
            <FormSelect label="Priority" options={priorityOptions} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} required />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button type="button" onClick={() => setFormOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Report"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        variant="danger"
        isLoading={isSubmitting}
      />

      <ConfirmDialog
        isOpen={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        title="Delete Selected Reports"
        message={`Are you sure you want to delete ${selectedIds.length} report(s)? This action cannot be undone.`}
        confirmLabel={`Delete ${selectedIds.length} Report(s)`}
        variant="danger"
      />

      <Modal isOpen={bulkStatusOpen} onClose={() => setBulkStatusOpen(false)} title={`Change Status for ${selectedIds.length} Report(s)`} size="sm">
        <div className="space-y-4">
          <FormSelect
            label="New Status"
            options={statusOptions}
            value={bulkStatusValue}
            onChange={(e) => setBulkStatusValue(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button type="button" onClick={() => setBulkStatusOpen(false)} className="btn-secondary">Cancel</button>
            <button
              type="button"
              onClick={handleBulkStatusChange}
              disabled={!bulkStatusValue}
              className="btn-primary"
            >
              Update {selectedIds.length} Report(s)
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}