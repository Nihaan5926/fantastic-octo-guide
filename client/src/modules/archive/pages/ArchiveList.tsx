import React, { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { Edit, Trash2, Archive, FileClock, Download, ChevronDown } from 'lucide-react';
import { exportToCSV, exportToJSON } from '../../../utils/export';
import { archiveApi } from '../api';
import PageHeader from '../../../components/common/PageHeader';
import SearchBar from '../../../components/common/SearchBar';
import DataTable from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { FormInput, FormSelect, FormTextarea } from '../../../components/common/FormComponents';
import { StatusBadge, ClassificationBadge } from '../../../components/common/Badges';
import { useArchiveStore } from '../store';

const classificationOpts = [
  { value: 'UNCLASSIFIED', label: 'UNCLASSIFIED' },
  { value: 'CONFIDENTIAL', label: 'CONFIDENTIAL' },
  { value: 'SECRET', label: 'SECRET' },
  { value: 'TOP_SECRET', label: 'TOP SECRET' },
];

const recordStatusOpts = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ARCHIVED', label: 'Archived' },
  { value: 'PENDING_DESTRUCTION', label: 'Pending Destruction' },
  { value: 'DESTROYED', label: 'Destroyed' },
];

const declassStatusOpts = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_REVIEW', label: 'In Review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'DENIED', label: 'Denied' },
];

const tabs = [
  { key: 'records', label: 'Records', icon: Archive },
  { key: 'declassRequests', label: 'Declassification', icon: FileClock },
];

const defaultRecord = { reference_number: '', title: '', entity_type: '', classification: 'UNCLASSIFIED', retention_period_days: 0, destruction_date: '', review_date: '', status: 'ACTIVE' };
const defaultDeclass = { reference_number: '', title: '', entity_type: '', entity_id: '', classification: 'UNCLASSIFIED', requested_by: '', justification: '', status: 'PENDING', review_date: '' };

export default function ArchiveList() {
  const store = useArchiveStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
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
    store.fetchCurrentTab();
  }, [store.activeTab, store.pagination.page]);

  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  const handleSearch = (val: string) => {
    store.setSearch(val);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      store.fetchCurrentTab();
    }, 300);
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const isRecords = store.activeTab === 'records';
      const { data } = isRecords
        ? await archiveApi.listRecords({ limit: 1000 })
        : await archiveApi.listDeclassRequests({ limit: 1000 });
      const allItems = data.data || data.items || [];
      const label = isRecords ? 'records' : 'declass-requests';
      exportToCSV(allItems, `archive-${label}-export`);
      toast.success(`Exported ${allItems.length} ${label.replace(/-/g, ' ')} as CSV`);
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
      const isRecords = store.activeTab === 'records';
      const { data } = isRecords
        ? await archiveApi.listRecords({ limit: 1000 })
        : await archiveApi.listDeclassRequests({ limit: 1000 });
      const allItems = data.data || data.items || [];
      const label = isRecords ? 'records' : 'declass-requests';
      exportToJSON(allItems, `archive-${label}-export`);
      toast.success(`Exported ${allItems.length} ${label.replace(/-/g, ' ')} as JSON`);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
      setExportOpen(false);
    }
  };

  const openCreate = () => {
    setEditItem(null);
    setForm(store.activeTab === 'records' ? { ...defaultRecord } : { ...defaultDeclass });
    setModalOpen(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    if (store.activeTab === 'records') {
      setForm({
        reference_number: item.reference_number || '',
        title: item.title || '',
        entity_type: item.entity_type || '',
        classification: item.classification || 'UNCLASSIFIED',
        retention_period_days: item.retention_period_days || 0,
        destruction_date: item.destruction_date?.split('T')[0] || '',
        review_date: item.review_date?.split('T')[0] || '',
        status: item.status || 'ACTIVE',
      });
    } else {
      setForm({
        reference_number: item.reference_number || '',
        title: item.title || '',
        entity_type: item.entity_type || '',
        entity_id: item.entity_id || '',
        classification: item.classification || 'UNCLASSIFIED',
        requested_by: item.requested_by || '',
        justification: item.justification || '',
        status: item.status || 'PENDING',
        review_date: item.review_date?.split('T')[0] || '',
      });
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title) { toast.error('Title is required'); return; }
    if (store.activeTab === 'records') {
      editItem ? await store.updateRecord(editItem.id, form) : await store.createRecord(form);
    } else {
      editItem ? await store.updateDeclassRequest(editItem.id, form) : await store.createDeclassRequest(form);
    }
    toast.success(editItem ? 'Updated' : 'Created');
    setModalOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    if (store.activeTab === 'records') await store.deleteRecord(deleteId);
    else await store.deleteDeclassRequest(deleteId);
    toast.success('Deleted');
    setDeleteId(null);
  };

  const recordColumns = [
    { key: 'reference_number', label: 'Ref #' },
    { key: 'title', label: 'Title' },
    { key: 'entity_type', label: 'Entity Type' },
    { key: 'classification', label: 'Classification', render: (item: any) => <ClassificationBadge level={item.classification} /> },
    { key: 'retention_period_days', label: 'Retention (days)' },
    { key: 'review_date', label: 'Review Date', render: (item: any) => item.review_date ? new Date(item.review_date).toLocaleDateString() : '-' },
    { key: 'status', label: 'Status', render: (item: any) => {
      const colors: Record<string, string> = { ACTIVE: 'green', ARCHIVED: 'blue', PENDING_DESTRUCTION: 'yellow', DESTROYED: 'red' };
      return <StatusBadge label={item.status} color={colors[item.status] || 'gray'} />;
    }},
    { key: 'actions', label: '', className: 'text-right', render: (item: any) => (
      <div className="flex justify-end gap-1">
        <button onClick={(e) => { e.stopPropagation(); openEdit(item); }} className="p-1.5 rounded-lg hover:bg-bg-hover"><Edit size={16} /></button>
        <button onClick={(e) => { e.stopPropagation(); setDeleteId(item.id); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-accent-danger"><Trash2 size={16} /></button>
      </div>
    )},
  ];

  const declassColumns = [
    { key: 'reference_number', label: 'Ref #' },
    { key: 'title', label: 'Title' },
    { key: 'entity_type', label: 'Entity Type' },
    { key: 'classification', label: 'Classification', render: (item: any) => <ClassificationBadge level={item.classification} /> },
    { key: 'requested_by', label: 'Requested By' },
    { key: 'review_date', label: 'Review Date', render: (item: any) => item.review_date ? new Date(item.review_date).toLocaleDateString() : '-' },
    { key: 'status', label: 'Status', render: (item: any) => {
      const colors: Record<string, string> = { PENDING: 'yellow', IN_REVIEW: 'blue', APPROVED: 'green', DENIED: 'red' };
      return <StatusBadge label={item.status} color={colors[item.status] || 'gray'} />;
    }},
    { key: 'actions', label: '', className: 'text-right', render: (item: any) => (
      <div className="flex justify-end gap-1">
        <button onClick={(e) => { e.stopPropagation(); openEdit(item); }} className="p-1.5 rounded-lg hover:bg-bg-hover"><Edit size={16} /></button>
        <button onClick={(e) => { e.stopPropagation(); setDeleteId(item.id); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-accent-danger"><Trash2 size={16} /></button>
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader title="Archive" subtitle="Manage archive records and declassification requests" onCreate={openCreate} createLabel={store.activeTab === 'records' ? 'New Record' : 'New Request'}>
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
        <SearchBar value={store.search} onChange={handleSearch} placeholder={`Search ${store.activeTab}...`} />
      </PageHeader>

      <div className="flex gap-1 mb-6 border-b border-border">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => store.setActiveTab(t.key as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                store.activeTab === t.key ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      <DataTable
        columns={store.activeTab === 'records' ? recordColumns : declassColumns}
        data={store.activeTab === 'records' ? store.records : store.declassRequests}
        pagination={store.pagination}
        isLoading={store.isLoading}
        emptyMessage={`No ${store.activeTab === 'records' ? 'records' : 'requests'} found`}
        onPageChange={(p) => { store.setPage(p); store.fetchCurrentTab(); }}
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={`${editItem ? 'Edit' : 'New'} ${store.activeTab === 'records' ? 'Archive Record' : 'Declassification Request'}`} size="lg">
        <div className="space-y-4">
          {store.activeTab === 'records' ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <FormInput label="Reference Number" value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} />
                <FormInput label="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormInput label="Entity Type" value={form.entity_type} onChange={(e) => setForm({ ...form, entity_type: e.target.value })} />
                <FormSelect label="Classification" options={classificationOpts} value={form.classification} onChange={(e) => setForm({ ...form, classification: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormInput label="Retention Period (days)" type="number" value={form.retention_period_days} onChange={(e) => setForm({ ...form, retention_period_days: parseInt(e.target.value) || 0 })} />
                <FormSelect label="Status" options={recordStatusOpts} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormInput label="Review Date" type="date" value={form.review_date} onChange={(e) => setForm({ ...form, review_date: e.target.value })} />
                <FormInput label="Destruction Date" type="date" value={form.destruction_date} onChange={(e) => setForm({ ...form, destruction_date: e.target.value })} />
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <FormInput label="Reference Number" value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} />
                <FormInput label="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormInput label="Entity Type" value={form.entity_type} onChange={(e) => setForm({ ...form, entity_type: e.target.value })} />
                <FormInput label="Entity ID" value={form.entity_id} onChange={(e) => setForm({ ...form, entity_id: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormSelect label="Classification" options={classificationOpts} value={form.classification} onChange={(e) => setForm({ ...form, classification: e.target.value })} />
                <FormInput label="Requested By" value={form.requested_by} onChange={(e) => setForm({ ...form, requested_by: e.target.value })} />
              </div>
              <FormTextarea label="Justification" value={form.justification} onChange={(e) => setForm({ ...form, justification: e.target.value })} />
              <div className="grid grid-cols-2 gap-4">
                <FormSelect label="Status" options={declassStatusOpts} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} />
                <FormInput label="Review Date" type="date" value={form.review_date} onChange={(e) => setForm({ ...form, review_date: e.target.value })} />
              </div>
            </>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={store.isSaving} className="btn-primary">
            {store.isSaving ? 'Saving...' : editItem ? 'Update' : 'Create'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Confirm Delete"
        message={`Are you sure you want to delete this ${store.activeTab === 'records' ? 'record' : 'request'}?`}
        isLoading={store.isSaving}
      />
    </div>
  );
}
