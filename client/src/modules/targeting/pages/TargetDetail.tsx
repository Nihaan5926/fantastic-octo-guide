import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, Edit, Trash2, Target, MapPin, Crosshair, CheckCircle, Play, ClipboardCheck } from 'lucide-react';
import Modal from '../../../components/common/Modal';
import { FormInput, FormTextarea, FormSelect } from '../../../components/common/FormComponents';
import { StatusBadge, ClassificationBadge, PriorityBadge } from '../../../components/common/Badges';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { DetailSkeleton, CardSkeleton } from '../../../components/common/LoadingSkeleton';
import { useTargetStore } from '../store';
import { targetPackagesApi } from '../api';

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

const cdeOptions = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
];

const LIFECYCLE_STEPS = ['DRAFT', 'NOMINATED', 'VETTED', 'APPROVED', 'EXECUTED', 'ASSESSED'];
const lifecycleStatusColorMap: Record<string, string> = {
  DRAFT: 'gray', NOMINATED: 'blue', VETTED: 'purple', APPROVED: 'yellow', EXECUTED: 'green', ASSESSED: 'emerald',
};

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
  const [lifecycleLoading, setLifecycleLoading] = useState(false);
  const [cdeValue, setCdeValue] = useState<string>('');
  const [cdeEditing, setCdeEditing] = useState(false);
  const [bdaText, setBdaText] = useState('');
  const [bdaEditing, setBdaEditing] = useState(false);
  const [cdeSaving, setCdeSaving] = useState(false);
  const [bdaSaving, setBdaSaving] = useState(false);
  const [lifecycle, setLifecycle] = useState(LIFECYCLE_STEPS);

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
        cde_estimate: selectedPackage.cde_estimate || '',
      });
      setCdeValue(selectedPackage.cde_estimate || '');
      const assessment = selectedPackage.assessment || {};
      setBdaText((assessment as any).bda_results || '');
    }
  }, [selectedPackage]);

  const handleLifecycleAction = async (action: string, data?: string) => {
    if (!id) return;
    setLifecycleLoading(true);
    try {
      switch (action) {
        case 'nominate': await targetPackagesApi.nominate(id); break;
        case 'vet': await targetPackagesApi.vet(id, data); break;
        case 'approve': await targetPackagesApi.approve(id); break;
        case 'execute': await targetPackagesApi.execute(id); break;
        case 'assess': await targetPackagesApi.assess(id, data || ''); break;
      }
      toast.success(`Package ${action === 'assess' ? 'assessed' : action + 'd'}`);
      await fetchPackage(id);
    } catch (err: any) {
      toast.error(err.response?.data?.error || `Failed to ${action}`);
    } finally {
      setLifecycleLoading(false);
    }
  };

  const handleCdeSave = async () => {
    if (!id) return;
    setCdeSaving(true);
    try {
      await updatePackage(id, { cde_estimate: cdeValue });
      toast.success('CDE estimate updated');
      setCdeEditing(false);
      await fetchPackage(id);
    } catch {
      toast.error('Failed to update CDE');
    } finally { setCdeSaving(false); }
  };

  const handleBdaSave = async () => {
    if (!id) return;
    setBdaSaving(true);
    try {
      await handleLifecycleAction('assess', bdaText);
      setBdaEditing(false);
      setBdaSaving(false);
    } catch {
      setBdaSaving(false);
    }
  };

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
    return <DetailSkeleton />;
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
        <div className="space-y-6">
          {/* Lifecycle Stepper */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Targeting Lifecycle</h2>
            <div className="flex items-center">
              {LIFECYCLE_STEPS.map((step, idx) => {
                const currentStepIdx = LIFECYCLE_STEPS.indexOf(selectedPackage?.status || 'DRAFT');
                const isCompleted = currentStepIdx > idx;
                const isCurrent = currentStepIdx === idx;
                return (
                  <React.Fragment key={step}>
                    <div className="flex flex-col items-center flex-1">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                          isCompleted
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : isCurrent
                            ? 'bg-accent border-accent text-white'
                            : 'bg-bg-tertiary border-border text-text-muted'
                        }`}
                      >
                        {isCompleted ? '\u2713' : idx + 1}
                      </div>
                      <span className={`text-[10px] mt-1 text-center leading-tight ${isCurrent ? 'text-text-primary font-semibold' : 'text-text-muted'}`}>
                        {step}
                      </span>
                    </div>
                    {idx < LIFECYCLE_STEPS.length - 1 && (
                      <div className={`h-0.5 flex-1 -mt-4 ${isCompleted ? 'bg-emerald-500' : 'bg-border'}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Action Buttons */}
            {selectedPackage?.status !== 'ASSESSED' && (
              <div className="mt-4 flex justify-end gap-2 flex-wrap">
                {selectedPackage?.status === 'DRAFT' && (
                  <button onClick={() => handleLifecycleAction('nominate')} disabled={lifecycleLoading} className="btn-primary text-sm">
                    <Crosshair size={14} className="mr-1" /> Nominate
                  </button>
                )}
                {selectedPackage?.status === 'NOMINATED' && (
                  <button onClick={() => handleLifecycleAction('vet')} disabled={lifecycleLoading} className="btn-primary text-sm">
                    <CheckCircle size={14} className="mr-1" /> Vet
                  </button>
                )}
                {selectedPackage?.status === 'VETTED' && (
                  <button onClick={() => handleLifecycleAction('approve')} disabled={lifecycleLoading} className="btn-primary text-sm bg-emerald-600 hover:bg-emerald-700">
                    <CheckCircle size={14} className="mr-1" /> Approve
                  </button>
                )}
                {selectedPackage?.status === 'APPROVED' && (
                  <button onClick={() => handleLifecycleAction('execute')} disabled={lifecycleLoading} className="btn-primary text-sm bg-red-600 hover:bg-red-700">
                    <Play size={14} className="mr-1" /> Execute
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Package Details */}
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
                { label: 'CDE Estimate', value: selectedPackage.cde_estimate || '—' },
                { label: 'Objective', value: selectedPackage.objective, span: 3 },
              ].map((item, i) => (
                <div key={i} className={item.span && item.span > 1 ? 'col-span-3' : ''}>
                  <label className="block text-xs text-text-muted mb-1">{item.label}</label>
                  <p className="text-sm">{item.value || '—'}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CDE Estimate */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Collateral Damage Estimate (CDE)</h3>
              {!cdeEditing ? (
                <button onClick={() => setCdeEditing(true)} className="btn-secondary text-xs">
                  <Edit size={12} /> Edit
                </button>
              ) : null}
            </div>
            {cdeEditing ? (
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <FormSelect
                    label="CDE Level"
                    options={cdeOptions}
                    value={cdeValue}
                    onChange={(e) => setCdeValue(e.target.value)}
                  />
                </div>
                <button onClick={handleCdeSave} disabled={cdeSaving} className="btn-primary">
                  {cdeSaving ? 'Saving...' : 'Save'}
                </button>
                <button onClick={() => { setCdeEditing(false); setCdeValue(selectedPackage?.cde_estimate || ''); }} className="btn-secondary">Cancel</button>
              </div>
            ) : (
              <StatusBadge
                label={selectedPackage?.cde_estimate || 'Not Set'}
                color={selectedPackage?.cde_estimate === 'HIGH' ? 'red' : selectedPackage?.cde_estimate === 'MEDIUM' ? 'yellow' : selectedPackage?.cde_estimate === 'LOW' ? 'green' : 'gray'}
              />
            )}
          </div>

          {/* BDA Section */}
          {selectedPackage?.status === 'EXECUTED' || selectedPackage?.status === 'ASSESSED' ? (
            <div className="card border-amber-500/30">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Battle Damage Assessment (BDA)</h3>
                {!bdaEditing && selectedPackage?.status === 'EXECUTED' ? (
                  <button onClick={() => setBdaEditing(true)} className="btn-primary text-xs">
                    <ClipboardCheck size={12} /> Enter BDA
                  </button>
                ) : null}
              </div>
              {bdaEditing ? (
                <div>
                  <FormTextarea
                    label="BDA Results"
                    value={bdaText}
                    onChange={(e) => setBdaText(e.target.value)}
                    placeholder="Describe the battle damage assessment results..."
                    rows={4}
                  />
                  <div className="flex justify-end gap-2 mt-3">
                    <button onClick={() => { setBdaEditing(false); setBdaText(''); }} className="btn-secondary">Cancel</button>
                    <button onClick={handleBdaSave} disabled={bdaSaving || !bdaText.trim()} className="btn-primary">
                      {bdaSaving ? 'Saving...' : 'Assess'}
                    </button>
                  </div>
                </div>
              ) : bdaText ? (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <p className="text-sm text-amber-200 whitespace-pre-wrap">{bdaText}</p>
                  {selectedPackage?.status === 'ASSESSED' && (
                    <p className="text-xs text-amber-400 mt-2">
                      Assessed at: {(selectedPackage.assessment as any)?.assessed_at ? new Date((selectedPackage.assessment as any).assessed_at).toLocaleString() : 'Unknown'}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-text-muted">No BDA recorded yet. Click "Enter BDA" to provide assessment results.</p>
              )}
            </div>
          ) : null}

          {selectedPackage.assessment && typeof selectedPackage.assessment === 'object' && Object.keys(selectedPackage.assessment).length > 0 && !(selectedPackage.assessment as any).bda_results && (
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
            <CardSkeleton />
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
