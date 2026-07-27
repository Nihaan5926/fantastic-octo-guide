import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Eye, Edit, Trash2 } from 'lucide-react';
import PageHeader from '../../../components/common/PageHeader';
import SearchBar from '../../../components/common/SearchBar';
import DataTable from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { FormInput, FormSelect, FormTextarea } from '../../../components/common/FormComponents';
import { StatusBadge, ClassificationBadge } from '../../../components/common/Badges';
import { useBriefingStore } from '../store';

const classificationOpts = [
  { value: 'UNCLASSIFIED', label: 'UNCLASSIFIED' },
  { value: 'CONFIDENTIAL', label: 'CONFIDENTIAL' },
  { value: 'SECRET', label: 'SECRET' },
  { value: 'TOP_SECRET', label: 'TOP SECRET' },
];

const statusOpts = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'PRESENTED', label: 'Presented' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const defaultForm = {
  reference_number: '',
  title: '',
  classification: 'UNCLASSIFIED',
  status: 'DRAFT',
  prepared_by: '',
  slides_count: 0,
};

export default function BriefingsList() {
  const navigate = useNavigate();
  const store = useBriefingStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState(defaultForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    store.fetchBriefings();
  }, [store.pagination.page]);

  const handleSearch = (val: string) => {
    store.setSearch(val);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      store.fetchBriefings();
    }, 300);
  };

  const handleCreate = () => {
    setEditItem(null);
    setForm(defaultForm);
    setModalOpen(true);
  };

  const handleEdit = (item: any) => {
    setEditItem(item);
    setForm({
      reference_number: item.reference_number || '',
      title: item.title || '',
      classification: item.classification || 'UNCLASSIFIED',
      status: item.status || 'DRAFT',
      prepared_by: item.prepared_by || '',
      slides_count: item.slides_count || 0,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.reference_number) {
      toast.error('Title and Reference Number are required');
      return;
    }
    if (editItem) {
      await store.updateBriefing(editItem.id, form);
      toast.success('Briefing updated');
    } else {
      await store.createBriefing(form);
      toast.success('Briefing created');
    }
    setModalOpen(false);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await store.deleteBriefing(deleteId);
      toast.success('Briefing deleted');
      setDeleteId(null);
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
      render: (item: any) => {
        const colors: Record<string, string> = { DRAFT: 'gray', SCHEDULED: 'blue', PRESENTED: 'green', CANCELLED: 'red' };
        return <StatusBadge label={item.status} color={colors[item.status] || 'gray'} />;
      },
    },
    { key: 'prepared_by', label: 'Prepared By' },
    { key: 'slides_count', label: 'Slides' },
    {
      key: 'actions',
      label: '',
      className: 'text-right',
      render: (item: any) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={(e) => { e.stopPropagation(); navigate(`/briefings/${item.id}`); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary" title="View">
            <Eye size={16} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); handleEdit(item); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary" title="Edit">
            <Edit size={16} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteId(item.id); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-accent-danger" title="Delete">
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Briefings" subtitle="Manage intelligence briefings and distribution lists" onCreate={handleCreate} createLabel="New Briefing">
        <SearchBar value={store.search} onChange={handleSearch} placeholder="Search briefings..." />
      </PageHeader>

      <DataTable
        columns={columns}
        data={store.briefings}
        pagination={store.pagination}
        isLoading={store.isLoading}
        emptyMessage="No briefings found"
        onPageChange={(p) => { store.setPage(p); }}
        onRowClick={(item) => navigate(`/briefings/${item.id}`)}
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Briefing' : 'New Briefing'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Reference Number" required value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} />
            <FormInput label="Slides Count" type="number" value={form.slides_count} onChange={(e) => setForm({ ...form, slides_count: parseInt(e.target.value) || 0 })} />
          </div>
          <FormInput label="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <FormSelect label="Classification" options={classificationOpts} value={form.classification} onChange={(e) => setForm({ ...form, classification: e.target.value })} />
            <FormSelect label="Status" options={statusOpts} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} />
          </div>
          <FormInput label="Prepared By" value={form.prepared_by} onChange={(e) => setForm({ ...form, prepared_by: e.target.value })} />
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
        title="Delete Briefing"
        message="Are you sure you want to delete this briefing? This action cannot be undone."
        isLoading={store.isSaving}
      />
    </div>
  );
}
