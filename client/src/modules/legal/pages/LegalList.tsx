import React, { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { Edit, Trash2, Scale, ShieldCheck } from 'lucide-react';
import PageHeader from '../../../components/common/PageHeader';
import SearchBar from '../../../components/common/SearchBar';
import DataTable from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { FormInput, FormSelect, FormTextarea } from '../../../components/common/FormComponents';
import { StatusBadge, PriorityBadge } from '../../../components/common/Badges';
import { useLegalStore } from '../store';

const statusOpts = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'ESCALATED', label: 'Escalated' },
];

const priorityOpts = [
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

const tabs = [
  { key: 'reviews', label: 'Reviews', icon: Scale },
  { key: 'compliance', label: 'Compliance Checks', icon: ShieldCheck },
];

const defaultReview = { reference_number: '', title: '', entity_type: '', entity_id: '', status: 'PENDING', priority: 'MEDIUM', due_date: '', assigned_to: '' };
const defaultCompliance = { title: '', regulation: '', check_type: '', status: 'PENDING', violations_found: false, remediation_required: false, due_date: '', assigned_to: '' };

export default function LegalList() {
  const store = useLegalStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);

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

  const openCreate = () => {
    setEditItem(null);
    setForm(store.activeTab === 'reviews' ? { ...defaultReview } : { ...defaultCompliance });
    setModalOpen(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    if (store.activeTab === 'reviews') {
      setForm({
        reference_number: item.reference_number || '',
        title: item.title || '',
        entity_type: item.entity_type || '',
        entity_id: item.entity_id || '',
        status: item.status || 'PENDING',
        priority: item.priority || 'MEDIUM',
        due_date: item.due_date?.split('T')[0] || '',
        assigned_to: item.assigned_to || '',
      });
    } else {
      setForm({
        title: item.title || '',
        regulation: item.regulation || '',
        check_type: item.check_type || '',
        status: item.status || 'PENDING',
        violations_found: item.violations_found || false,
        remediation_required: item.remediation_required || false,
        due_date: item.due_date?.split('T')[0] || '',
        assigned_to: item.assigned_to || '',
      });
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title) { toast.error('Title is required'); return; }
    if (store.activeTab === 'reviews') {
      editItem ? await store.updateReview(editItem.id, form) : await store.createReview(form);
    } else {
      editItem ? await store.updateCompliance(editItem.id, form) : await store.createCompliance(form);
    }
    toast.success(editItem ? 'Updated' : 'Created');
    setModalOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    if (store.activeTab === 'reviews') await store.deleteReview(deleteId);
    else await store.deleteCompliance(deleteId);
    toast.success('Deleted');
    setDeleteId(null);
  };

  const reviewColumns = [
    { key: 'reference_number', label: 'Ref #' },
    { key: 'title', label: 'Title' },
    { key: 'entity_type', label: 'Entity Type' },
    { key: 'priority', label: 'Priority', render: (item: any) => <PriorityBadge level={item.priority} /> },
    { key: 'status', label: 'Status', render: (item: any) => <StatusBadge label={item.status} color={item.status === 'COMPLETED' ? 'green' : item.status === 'IN_PROGRESS' ? 'blue' : 'yellow'} /> },
    { key: 'due_date', label: 'Due', render: (item: any) => item.due_date ? new Date(item.due_date).toLocaleDateString() : '-' },
    { key: 'assigned_to', label: 'Assigned To' },
    { key: 'actions', label: '', className: 'text-right', render: (item: any) => (
      <div className="flex justify-end gap-1">
        <button onClick={(e) => { e.stopPropagation(); openEdit(item); }} className="p-1.5 rounded-lg hover:bg-bg-hover"><Edit size={16} /></button>
        <button onClick={(e) => { e.stopPropagation(); setDeleteId(item.id); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-accent-danger"><Trash2 size={16} /></button>
      </div>
    )},
  ];

  const complianceColumns = [
    { key: 'title', label: 'Title' },
    { key: 'regulation', label: 'Regulation' },
    { key: 'check_type', label: 'Check Type' },
    { key: 'status', label: 'Status', render: (item: any) => <StatusBadge label={item.status} color={item.status === 'COMPLETED' ? 'green' : 'blue'} /> },
    { key: 'violations_found', label: 'Violations', render: (item: any) => <StatusBadge label={item.violations_found ? 'Yes' : 'No'} color={item.violations_found ? 'red' : 'green'} /> },
    { key: 'remediation_required', label: 'Remediation', render: (item: any) => <StatusBadge label={item.remediation_required ? 'Yes' : 'No'} color={item.remediation_required ? 'yellow' : 'gray'} /> },
    { key: 'assigned_to', label: 'Assigned To' },
    { key: 'actions', label: '', className: 'text-right', render: (item: any) => (
      <div className="flex justify-end gap-1">
        <button onClick={(e) => { e.stopPropagation(); openEdit(item); }} className="p-1.5 rounded-lg hover:bg-bg-hover"><Edit size={16} /></button>
        <button onClick={(e) => { e.stopPropagation(); setDeleteId(item.id); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-accent-danger"><Trash2 size={16} /></button>
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader title="Legal" subtitle="Manage legal reviews and compliance checks" onCreate={openCreate} createLabel={store.activeTab === 'reviews' ? 'New Review' : 'New Check'}>
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
        columns={store.activeTab === 'reviews' ? reviewColumns : complianceColumns}
        data={store.activeTab === 'reviews' ? store.reviews : store.complianceChecks}
        pagination={store.pagination}
        isLoading={store.isLoading}
        emptyMessage={`No ${store.activeTab} found`}
        onPageChange={(p) => { store.setPage(p); }}
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={`${editItem ? 'Edit' : 'New'} ${store.activeTab === 'reviews' ? 'Legal Review' : 'Compliance Check'}`} size="lg">
        <div className="space-y-4">
          {store.activeTab === 'reviews' ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <FormInput label="Reference Number" value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} />
                <FormInput label="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormInput label="Entity Type" value={form.entity_type} onChange={(e) => setForm({ ...form, entity_type: e.target.value })} />
                <FormInput label="Entity ID" value={form.entity_id} onChange={(e) => setForm({ ...form, entity_id: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <FormSelect label="Status" options={statusOpts} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} />
                <FormSelect label="Priority" options={priorityOpts} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} />
                <FormInput label="Due Date" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
              </div>
              <FormInput label="Assigned To" value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} />
            </>
          ) : (
            <>
              <FormInput label="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <div className="grid grid-cols-2 gap-4">
                <FormInput label="Regulation" value={form.regulation} onChange={(e) => setForm({ ...form, regulation: e.target.value })} />
                <FormInput label="Check Type" value={form.check_type} onChange={(e) => setForm({ ...form, check_type: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormSelect label="Status" options={statusOpts} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} />
                <FormInput label="Due Date" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.violations_found} onChange={(e) => setForm({ ...form, violations_found: e.target.checked })} className="rounded" />
                  <span className="text-sm text-text-secondary">Violations Found</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.remediation_required} onChange={(e) => setForm({ ...form, remediation_required: e.target.checked })} className="rounded" />
                  <span className="text-sm text-text-secondary">Remediation Required</span>
                </label>
              </div>
              <FormInput label="Assigned To" value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} />
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
        message={`Are you sure you want to delete this ${store.activeTab === 'reviews' ? 'review' : 'compliance check'}?`}
        isLoading={store.isSaving}
      />
    </div>
  );
}
