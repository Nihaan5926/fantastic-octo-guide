import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Edit, Trash2, Eye, Calendar, MapPin } from 'lucide-react';
import DataTable from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import PageHeader from '../../../components/common/PageHeader';
import SearchBar from '../../../components/common/SearchBar';
import { FormInput, FormTextarea, FormSelect } from '../../../components/common/FormComponents';
import { StatusBadge, ClassificationBadge, PriorityBadge } from '../../../components/common/Badges';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { useMissionStore } from '../store';

const statusOptions = [
  { value: 'PLANNING', label: 'Planning' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const classificationOptions = [
  { value: 'UNCLASSIFIED', label: 'Unclassified' },
  { value: 'CONFIDENTIAL', label: 'Confidential' },
  { value: 'SECRET', label: 'Secret' },
  { value: 'TOP_SECRET', label: 'Top Secret' },
];

const priorityOptions = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

const emptyPlan = {
  reference_number: '',
  title: '',
  status: 'PLANNING',
  classification: 'UNCLASSIFIED',
  priority: 'MEDIUM',
  objective: '',
  location: '',
  start_date: '',
  end_date: '',
  commander_id: '',
  lead_analyst_id: '',
};

export default function MissionsList() {
  const navigate = useNavigate();
  const {
    plans, plansPagination, isLoading,
    fetchPlans, createPlan, updatePlan, deletePlan,
  } = useMissionStore();

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [form, setForm] = useState(emptyPlan);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchPlans({ search, limit: 10 });
  }, [search]);

  const handleCreate = () => {
    setEditingPlan(null);
    setForm(emptyPlan);
    setErrors({});
    setIsModalOpen(true);
  };

  const handleEdit = (plan: any) => {
    setEditingPlan(plan);
    setForm({
      reference_number: plan.reference_number || '',
      title: plan.title || '',
      status: plan.status || 'PLANNING',
      classification: plan.classification || 'UNCLASSIFIED',
      priority: plan.priority || 'MEDIUM',
      objective: plan.objective || '',
      location: plan.location || '',
      start_date: plan.start_date ? plan.start_date.split('T')[0] : '',
      end_date: plan.end_date ? plan.end_date.split('T')[0] : '',
      commander_id: plan.commander_id || '',
      lead_analyst_id: plan.lead_analyst_id || '',
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!form.reference_number.trim()) errs.reference_number = 'Required';
    if (!form.title.trim()) errs.title = 'Required';
    if (!form.objective.trim()) errs.objective = 'Required';
    if (!form.classification) errs.classification = 'Required';
    if (!form.priority) errs.priority = 'Required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSaving(true);
    try {
      if (editingPlan) {
        await updatePlan(editingPlan.id, form);
        toast.success('Mission plan updated');
      } else {
        await createPlan(form);
        toast.success('Mission plan created');
      }
      setIsModalOpen(false);
      fetchPlans({ search, page: plansPagination.page, limit: 10 });
    } catch {
      toast.error('Failed to save mission plan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deletePlan(deleteTarget.id);
      toast.success('Mission plan deleted');
      setDeleteTarget(null);
      fetchPlans({ search, page: plansPagination.page, limit: 10 });
    } catch {
      toast.error('Failed to delete mission plan');
    }
  };

  const columns = [
    { key: 'reference_number', label: 'Ref #', className: 'font-mono text-xs' },
    { key: 'title', label: 'Title', className: 'font-medium' },
    {
      key: 'status',
      label: 'Status',
      render: (item: any) => <StatusBadge label={item.status} color={item.status === 'IN_PROGRESS' ? 'blue' : item.status === 'COMPLETED' ? 'green' : item.status === 'CANCELLED' ? 'red' : item.status === 'APPROVED' ? 'purple' : 'yellow'} />,
    },
    {
      key: 'classification',
      label: 'Classification',
      render: (item: any) => <ClassificationBadge level={item.classification} />,
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (item: any) => <PriorityBadge level={item.priority} />,
    },
    {
      key: 'location',
      label: 'Location',
      render: (item: any) => (
        <span className="flex items-center gap-1 text-text-secondary text-xs">
          <MapPin size={12} /> {item.location || '—'}
        </span>
      ),
    },
    {
      key: 'dates',
      label: 'Timeline',
      render: (item: any) => (
        <span className="flex items-center gap-1 text-text-secondary text-xs">
          <Calendar size={12} /> {item.start_date ? item.start_date.split('T')[0] : '—'} → {item.end_date ? item.end_date.split('T')[0] : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      className: 'w-24',
      render: (item: any) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/missions/${item.id}`); }}
            className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-accent transition-colors"
            title="View details"
          >
            <Eye size={15} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleEdit(item); }}
            className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-accent transition-colors"
            title="Edit"
          >
            <Edit size={15} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(item); }}
            className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-red-400 transition-colors"
            title="Delete"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Missions"
        subtitle="Manage mission plans, briefs, and debriefs"
        onCreate={handleCreate}
        createLabel="New Mission Plan"
      />
      <SearchBar value={search} onChange={(v) => { setSearch(v); fetchPlans({ search: v, page: 1, limit: 10 }); }} placeholder="Search mission plans..." />
      <DataTable
        columns={columns}
        data={plans}
        pagination={plansPagination.totalPages > 0 ? plansPagination : undefined}
        isLoading={isLoading}
        emptyMessage="No mission plans found"
        onPageChange={(n) => fetchPlans({ search, page: n, limit: 10 })}
        onRowClick={(item) => navigate(`/missions/${item.id}`)}
      />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingPlan ? 'Edit Mission Plan' : 'New Mission Plan'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Reference Number" value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} required />
            <FormSelect label="Status" options={statusOptions} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} required />
          </div>
          <FormInput label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <div className="grid grid-cols-2 gap-4">
            <FormSelect label="Classification" options={classificationOptions} value={form.classification} onChange={(e) => setForm({ ...form, classification: e.target.value })} required />
            <FormSelect label="Priority" options={priorityOptions} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} required />
          </div>
          <FormTextarea label="Objective" value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} required />
          <FormInput label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <div className="grid grid-cols-3 gap-4">
            <FormInput label="Start Date" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            <FormInput label="End Date" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Commander ID" value={form.commander_id} onChange={(e) => setForm({ ...form, commander_id: e.target.value })} />
            <FormInput label="Lead Analyst ID" value={form.lead_analyst_id} onChange={(e) => setForm({ ...form, lead_analyst_id: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary" disabled={saving}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : editingPlan ? 'Update Plan' : 'Create Plan'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Mission Plan"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        variant="danger"
      />
    </div>
  );
}
