import React, { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { Edit, Trash2, Building2, FileText, Phone } from 'lucide-react';
import PageHeader from '../../../components/common/PageHeader';
import SearchBar from '../../../components/common/SearchBar';
import DataTable from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { FormInput, FormSelect, FormTextarea } from '../../../components/common/FormComponents';
import { StatusBadge, ClassificationBadge } from '../../../components/common/Badges';
import { useLiaisonStore } from '../store';

const classificationOpts = [
  { value: 'UNCLASSIFIED', label: 'UNCLASSIFIED' },
  { value: 'CONFIDENTIAL', label: 'CONFIDENTIAL' },
  { value: 'SECRET', label: 'SECRET' },
  { value: 'TOP_SECRET', label: 'TOP SECRET' },
];

const tabs = [
  { key: 'partners', label: 'Partners', icon: Building2 },
  { key: 'mous', label: 'MOUs', icon: FileText },
  { key: 'contactLogs', label: 'Contact Logs', icon: Phone },
];

const defaultPartner = { name: '', organization: '', classification: 'UNCLASSIFIED', status: 'ACTIVE', notes: '' };
const defaultMou = { reference_number: '', title: '', partner_id: '', start_date: '', end_date: '', classification: 'UNCLASSIFIED', status: 'ACTIVE' };
const defaultContactLog = { partner_id: '', contact_date: new Date().toISOString().split('T')[0], summary: '', follow_up_required: false, status: 'COMPLETED' };

export default function LiaisonList() {
  const store = useLiaisonStore();
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

  const tab = store.activeTab;

  const openCreate = () => {
    setEditItem(null);
    if (tab === 'partners') setForm(defaultPartner);
    else if (tab === 'mous') setForm(defaultMou);
    else setForm(defaultContactLog);
    setModalOpen(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    if (tab === 'partners') {
      setForm({ name: item.name, organization: item.organization || '', classification: item.classification, status: item.status, notes: item.notes || '' });
    } else if (tab === 'mous') {
      setForm({ reference_number: item.reference_number, title: item.title, partner_id: item.partner_id || '', start_date: item.start_date?.split('T')[0] || '', end_date: item.end_date?.split('T')[0] || '', classification: item.classification, status: item.status });
    } else {
      setForm({ partner_id: item.partner_id || '', contact_date: item.contact_date?.split('T')[0] || '', summary: item.summary || '', follow_up_required: item.follow_up_required || false, status: item.status });
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (tab === 'partners') {
      if (!form.name) { toast.error('Name is required'); return; }
      editItem ? await store.updatePartner(editItem.id, form) : await store.createPartner(form);
      toast.success(editItem ? 'Partner updated' : 'Partner created');
    } else if (tab === 'mous') {
      if (!form.title) { toast.error('Title is required'); return; }
      editItem ? await store.updateMou(editItem.id, form) : await store.createMou(form);
      toast.success(editItem ? 'MOU updated' : 'MOU created');
    } else {
      if (!form.summary) { toast.error('Summary is required'); return; }
      await store.createContactLog(form);
      toast.success('Contact log created');
    }
    setModalOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    if (tab === 'partners') await store.deletePartner(deleteId);
    else if (tab === 'mous') await store.deleteMou(deleteId);
    else await store.deleteContactLog(deleteId);
    toast.success('Deleted successfully');
    setDeleteId(null);
  };

  const getData = () => {
    if (tab === 'partners') return store.partners;
    if (tab === 'mous') return store.mous;
    return store.contactLogs;
  };

  const partnerColumns = [
    { key: 'name', label: 'Name' },
    { key: 'organization', label: 'Organization' },
    { key: 'classification', label: 'Classification', render: (item: any) => <ClassificationBadge level={item.classification} /> },
    { key: 'status', label: 'Status', render: (item: any) => <StatusBadge label={item.status} color={item.status === 'ACTIVE' ? 'green' : 'gray'} /> },
    { key: 'actions', label: '', className: 'text-right', render: (item: any) => (
      <div className="flex justify-end gap-1">
        <button onClick={(e) => { e.stopPropagation(); openEdit(item); }} className="p-1.5 rounded-lg hover:bg-bg-hover"><Edit size={16} /></button>
        <button onClick={(e) => { e.stopPropagation(); setDeleteId(item.id); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-accent-danger"><Trash2 size={16} /></button>
      </div>
    )},
  ];

  const mouColumns = [
    { key: 'reference_number', label: 'Ref #' },
    { key: 'title', label: 'Title' },
    { key: 'partner_name', label: 'Partner' },
    { key: 'start_date', label: 'Start', render: (item: any) => item.start_date ? new Date(item.start_date).toLocaleDateString() : '-' },
    { key: 'end_date', label: 'End', render: (item: any) => item.end_date ? new Date(item.end_date).toLocaleDateString() : '-' },
    { key: 'status', label: 'Status', render: (item: any) => <StatusBadge label={item.status} color={item.status === 'ACTIVE' ? 'green' : 'gray'} /> },
    { key: 'actions', label: '', className: 'text-right', render: (item: any) => (
      <div className="flex justify-end gap-1">
        <button onClick={(e) => { e.stopPropagation(); openEdit(item); }} className="p-1.5 rounded-lg hover:bg-bg-hover"><Edit size={16} /></button>
        <button onClick={(e) => { e.stopPropagation(); setDeleteId(item.id); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-accent-danger"><Trash2 size={16} /></button>
      </div>
    )},
  ];

  const logColumns = [
    { key: 'partner_name', label: 'Partner' },
    { key: 'contact_date', label: 'Date', render: (item: any) => item.contact_date ? new Date(item.contact_date).toLocaleDateString() : '-' },
    { key: 'summary', label: 'Summary', render: (item: any) => <span className="truncate block max-w-xs">{item.summary}</span> },
    { key: 'follow_up_required', label: 'Follow Up', render: (item: any) => <StatusBadge label={item.follow_up_required ? 'Required' : 'No'} color={item.follow_up_required ? 'yellow' : 'gray'} /> },
    { key: 'status', label: 'Status', render: (item: any) => <StatusBadge label={item.status} color="blue" /> },
    { key: 'actions', label: '', className: 'text-right', render: (item: any) => (
      <div className="flex justify-end gap-1">
        <button onClick={(e) => { e.stopPropagation(); openEdit(item); }} className="p-1.5 rounded-lg hover:bg-bg-hover"><Edit size={16} /></button>
        <button onClick={(e) => { e.stopPropagation(); setDeleteId(item.id); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-accent-danger"><Trash2 size={16} /></button>
      </div>
    )},
  ];

  const getColumns = () => {
    if (tab === 'partners') return partnerColumns;
    if (tab === 'mous') return mouColumns;
    return logColumns;
  };

  return (
    <div>
      <PageHeader title="Liaison" subtitle="Manage external partners, MOUs, and contact logs" onCreate={openCreate} createLabel={`New ${tab === 'partners' ? 'Partner' : tab === 'mous' ? 'MOU' : 'Contact Log'}`}>
        <SearchBar value={store.search} onChange={handleSearch} placeholder={`Search ${tab}...`} />
      </PageHeader>

      <div className="flex gap-1 mb-6 border-b border-border">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => store.setActiveTab(t.key as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      <DataTable
        columns={getColumns()}
        data={getData()}
        pagination={store.pagination}
        isLoading={store.isLoading}
        emptyMessage={`No ${tab} found`}
        onPageChange={(p) => { store.setPage(p); }}
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={`${editItem ? 'Edit' : 'New'} ${tab === 'partners' ? 'Partner' : tab === 'mous' ? 'MOU' : 'Contact Log'}`} size="lg">
        <div className="space-y-4">
          {tab === 'partners' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <FormInput label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <FormInput label="Organization" value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormSelect label="Classification" options={classificationOpts} value={form.classification} onChange={(e) => setForm({ ...form, classification: e.target.value })} />
                <FormSelect label="Status" options={[{ value: 'ACTIVE', label: 'Active' }, { value: 'INACTIVE', label: 'Inactive' }]} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} />
              </div>
              <FormTextarea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </>
          )}
          {tab === 'mous' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <FormInput label="Reference Number" required value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} />
                <FormInput label="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormInput label="Start Date" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                <FormInput label="End Date" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormSelect label="Classification" options={classificationOpts} value={form.classification} onChange={(e) => setForm({ ...form, classification: e.target.value })} />
                <FormSelect label="Status" options={[{ value: 'ACTIVE', label: 'Active' }, { value: 'EXPIRED', label: 'Expired' }, { value: 'TERMINATED', label: 'Terminated' }]} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} />
              </div>
            </>
          )}
          {tab === 'contactLogs' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <FormInput label="Partner ID" value={form.partner_id} onChange={(e) => setForm({ ...form, partner_id: e.target.value })} />
                <FormInput label="Contact Date" type="date" value={form.contact_date} onChange={(e) => setForm({ ...form, contact_date: e.target.value })} />
              </div>
              <FormTextarea label="Summary" required value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.follow_up_required} onChange={(e) => setForm({ ...form, follow_up_required: e.target.checked })} className="rounded" />
                    <span className="text-sm text-text-secondary">Follow-up Required</span>
                  </label>
                </div>
                <FormSelect label="Status" options={[{ value: 'COMPLETED', label: 'Completed' }, { value: 'PENDING', label: 'Pending' }, { value: 'CANCELLED', label: 'Cancelled' }]} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} />
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
        message={`Are you sure? This will permanently delete this ${tab === 'partners' ? 'partner' : tab === 'mous' ? 'MOU' : 'contact log'}.`}
        isLoading={store.isSaving}
      />
    </div>
  );
}
