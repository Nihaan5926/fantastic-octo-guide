import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, Edit, Trash2, Target, MapPin } from 'lucide-react';
import Modal from '../../../components/common/Modal';
import { FormInput, FormTextarea, FormSelect } from '../../../components/common/FormComponents';
import { StatusBadge, ClassificationBadge, PriorityBadge } from '../../../components/common/Badges';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { useTargetStore } from '../store';

const statusOptions = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'IN_REVIEW', label: 'In Review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'EXECUTED', label: 'Executed' },
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

export default function TargetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    selectedPackage, nominations, isLoading,
    fetchPackage, updatePackage,
    fetchNominations, createNomination, updateNomination, deleteNomination,
    clearSelected,
  } = useTargetStore();

  const [activeTab, setActiveTab] = useState<'info' | 'nominations'>('info');
  const [editPackageOpen, setEditPackageOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  const [nomModal, setNomModal] = useState(false);
  const [nomForm, setNomForm] = useState({ reference_number: '', title: '', description: '', status: 'DRAFT', classification: 'UNCLASSIFIED', nominated_by: '', nominated_at: '' });
  const [editingNom, setEditingNom] = useState<any>(null);
  const [nomErrors, setNomErrors] = useState<Record<string, string>>({});

  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      fetchPackage(id);
      fetchNominations(id);
    }
    return () => clearSelected();
  }, [id]);

  useEffect(() => {
    if (selectedPackage) {
      setEditForm({
        title: selectedPackage.title || '',
        status: selectedPackage.status || 'DRAFT',
        classification: selectedPackage.classification || 'UNCLASSIFIED',
        priority: selectedPackage.priority || 'MEDIUM',
        objective: selectedPackage.objective || '',
        target_name: selectedPackage.target_name || '',
        location: selectedPackage.location || '',
        cde_estimate: selectedPackage.cde_estimate != null ? String(selectedPackage.cde_estimate) : '',
      });
    }
  }, [selectedPackage]);

  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    try {
      await updatePackage(id, { ...editForm, cde_estimate: editForm.cde_estimate ? Number(editForm.cde_estimate) : null });
      toast.success('Package updated');
      setEditPackageOpen(false);
    } catch {
      toast.error('Failed to update package');
    } finally {
      setSaving(false);
    }
  };

  const handleNomSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    const errors: Record<string, string> = {};
    if (!nomForm.reference_number.trim()) errors.reference_number = 'Required';
    if (!nomForm.title.trim()) errors.title = 'Required';
    if (!nomForm.description.trim()) errors.description = 'Required';
    if (Object.keys(errors).length > 0) { setNomErrors(errors); return; }
    setSaving(true);
    try {
      if (editingNom) {
        await updateNomination(editingNom.id, nomForm);
        toast.success('Nomination updated');
        await fetchNominations(id);
      } else {
        await createNomination(id!, nomForm);
        toast.success('Nomination created');
        await fetchNominations(id);
      }
      setNomModal(false);
    } catch {
      toast.error('Failed to save nomination');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || !id) return;
    setSaving(true);
    try {
      await deleteNomination(deleteTarget.id);
      toast.success('Nomination deleted');
      setDeleteTarget(null);
      fetchNominations(id);
    } catch {
      toast.error('Failed to delete nomination');
    } finally {
      setSaving(false);
    }
  };

  const openNomModal = (item?: any) => {
    if (item) {
      setEditingNom(item);
      setNomForm({ reference_number: item.reference_number || '', title: item.title || '', description: item.description || '', status: item.status || 'DRAFT', classification: item.classification || 'UNCLASSIFIED', nominated_by: item.nominated_by || '', nominated_at: item.nominated_at ? item.nominated_at.split('T')[0] : '' });
    } else {
      setEditingNom(null);
      setNomForm({ reference_number: '', title: '', description: '', status: 'DRAFT', classification: 'UNCLASSIFIED', nominated_by: '', nominated_at: '' });
    }
    setNomErrors({});
    setNomModal(true);
  };

  if (!selectedPackage && isLoading) {
    return (
      <div className="card text-center py-16">
        <div className="animate-pulse text-text-muted">Loading target package...</div>
      </div>
    );
  }

  if (!selectedPackage) {
    return (
      <div className="card text-center py-16">
        <h2 className="text-xl font-semibold mb-2">Package Not Found</h2>
        <button onClick={() => navigate('/targeting')} className="btn-primary">Back to Targeting</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <button onClick={() => navigate('/targeting')} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold">{selectedPackage.title}</h1>
          <p className="text-sm text-text-muted">{selectedPackage.reference_number}</p>
        </div>
        <div className="flex gap-2 ml-auto">
          <ClassificationBadge level={selectedPackage.classification} />
          <PriorityBadge level={selectedPackage.priority} />
          <StatusBadge label={selectedPackage.status} color={selectedPackage.status === 'EXECUTED' ? 'green' : selectedPackage.status === 'APPROVED' ? 'blue' : 'yellow'} />
        </div>
      </div>

      <div className="flex gap-1 border-b border-border">
        {(['info', 'nominations'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab === 'info' ? <Target size={15} /> : <MapPin size={15} />}
            {tab === 'info' ? 'Package Info' : `Nominations (${nominations.length})`}
          </button>
        ))}
      </div>

      {activeTab === 'info' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Target Package Details</h2>
            <button onClick={() => setEditPackageOpen(true)} className="btn-secondary text-sm">
              <Edit size={14} /> Edit Package
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Target Name', value: selectedPackage.target_name },
              { label: 'Location', value: selectedPackage.location },
              { label: 'CDE Estimate', value: selectedPackage.cde_estimate != null ? String(selectedPackage.cde_estimate) : '—' },
              { label: 'Objective', value: selectedPackage.objective, span: 3 },
            ].map((item, i) => (
              <div key={i} className={item.span && item.span > 1 ? 'col-span-3' : ''}>
                <label className="block text-xs text-text-muted mb-1">{item.label}</label>
                <p className="text-sm">{item.value || '—'}</p>
              </div>
            ))}
          </div>
          {selectedPackage.assessment && (
            <div className="mt-4 p-4 rounded-lg bg-bg-tertiary/50 border border-border">
              <label className="block text-xs text-text-muted mb-1">Assessment</label>
              <pre className="text-xs text-text-secondary whitespace-pre-wrap font-mono">{JSON.stringify(selectedPackage.assessment, null, 2)}</pre>
            </div>
          )}
        </div>
      )}

      {activeTab === 'nominations' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Target Nominations</h2>
            <button onClick={() => openNomModal()} className="btn-primary text-sm">
              <Plus size={14} /> Add Nomination
            </button>
          </div>
          {isLoading ? (
            <div className="card text-center py-8 text-text-muted animate-pulse">Loading nominations...</div>
          ) : nominations.length === 0 ? (
            <div className="card text-center py-12 text-text-muted">
              <Target size={32} className="mx-auto mb-3 opacity-40" />
              <p>No nominations for this package</p>
            </div>
          ) : (
            <div className="space-y-3">
              {nominations.map((nom: any) => (
                <div key={nom.id} className="card flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{nom.title}</span>
                      <ClassificationBadge level={nom.classification} />
                      <StatusBadge label={nom.status} color={nom.status === 'APPROVED' ? 'green' : 'yellow'} />
                    </div>
                    <p className="text-xs text-text-muted mb-1">Ref: {nom.reference_number}</p>
                    <p className="text-sm text-text-secondary">{nom.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
                      <span>Nominated by: {nom.nominated_by || '—'}</span>
                      <span>{nom.nominated_at ? new Date(nom.nominated_at).toLocaleDateString() : '—'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-3">
                    <button onClick={() => openNomModal(nom)} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary"><Edit size={14} /></button>
                    <button onClick={() => setDeleteTarget(nom)} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-red-400"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal isOpen={editPackageOpen} onClose={() => setEditPackageOpen(false)} title="Edit Target Package" size="lg">
        <form onSubmit={handleSavePackage} className="space-y-4">
          <FormInput label="Title" value={editForm.title || ''} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} required />
          <div className="grid grid-cols-3 gap-4">
            <FormSelect label="Status" options={statusOptions} value={editForm.status || ''} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} />
            <FormSelect label="Priority" options={priorityOptions} value={editForm.priority || ''} onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })} />
            <FormSelect label="Classification" options={classificationOptions} value={editForm.classification || ''} onChange={(e) => setEditForm({ ...editForm, classification: e.target.value })} />
          </div>
          <FormTextarea label="Objective" value={editForm.objective || ''} onChange={(e) => setEditForm({ ...editForm, objective: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Target Name" value={editForm.target_name || ''} onChange={(e) => setEditForm({ ...editForm, target_name: e.target.value })} />
            <FormInput label="Location" value={editForm.location || ''} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} />
          </div>
          <FormInput label="CDE Estimate" type="number" value={editForm.cde_estimate || ''} onChange={(e) => setEditForm({ ...editForm, cde_estimate: e.target.value })} />
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button type="button" onClick={() => setEditPackageOpen(false)} className="btn-secondary" disabled={saving}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={nomModal} onClose={() => setNomModal(false)} title={editingNom ? 'Edit Nomination' : 'New Nomination'} size="lg">
        <form onSubmit={handleNomSave} className="space-y-4">
          <FormInput label="Reference Number" value={nomForm.reference_number} onChange={(e) => setNomForm({ ...nomForm, reference_number: e.target.value })} required error={nomErrors.reference_number} />
          <FormInput label="Title" value={nomForm.title} onChange={(e) => setNomForm({ ...nomForm, title: e.target.value })} required error={nomErrors.title} />
          <div className="grid grid-cols-2 gap-4">
            <FormSelect label="Status" options={statusOptions} value={nomForm.status} onChange={(e) => setNomForm({ ...nomForm, status: e.target.value })} />
            <FormSelect label="Classification" options={classificationOptions} value={nomForm.classification} onChange={(e) => setNomForm({ ...nomForm, classification: e.target.value })} />
          </div>
          <FormTextarea label="Description" value={nomForm.description} onChange={(e) => setNomForm({ ...nomForm, description: e.target.value })} required error={nomErrors.description} />
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Nominated By" value={nomForm.nominated_by} onChange={(e) => setNomForm({ ...nomForm, nominated_by: e.target.value })} />
            <FormInput label="Nominated At" type="date" value={nomForm.nominated_at} onChange={(e) => setNomForm({ ...nomForm, nominated_at: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button type="button" onClick={() => setNomModal(false)} className="btn-secondary" disabled={saving}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : editingNom ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Nomination"
        message={`Are you sure you want to delete "${deleteTarget?.title}"?`}
        variant="danger"
      />
    </div>
  );
}
