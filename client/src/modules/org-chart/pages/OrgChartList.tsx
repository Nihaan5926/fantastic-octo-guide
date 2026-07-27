import React, { useEffect, useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { ChevronRight, ChevronDown, Pencil, Trash2, Plus, Building2, Download, ChevronDown as ChevronDownIcon } from 'lucide-react';
import { exportToCSV, exportToJSON } from '../../../utils/export';
import { orgChartApi } from '../api';
import PageHeader from '../../../components/common/PageHeader';
import SearchBar from '../../../components/common/SearchBar';
import DataTable from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { FormInput, FormTextarea, FormSelect } from '../../../components/common/FormComponents';
import { useOrgChartStore, OrgUnit, PersonnelAssignment } from '../store';

const UNIT_TYPE_OPTIONS = [
  { value: 'DIRECTORATE', label: 'Directorate' },
  { value: 'DIVISION', label: 'Division' },
  { value: 'BRANCH', label: 'Branch' },
  { value: 'SECTION', label: 'Section' },
  { value: 'TEAM', label: 'Team' },
  { value: 'SQUAD', label: 'Squad' },
  { value: 'DETACHMENT', label: 'Detachment' },
];

function TreeNode({ unit, level = 0 }: { unit: OrgUnit; level?: number }) {
  const [expanded, setExpanded] = useState(level < 2);
  const hasChildren = unit.children && unit.children.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-bg-hover transition-colors cursor-pointer"
        style={{ paddingLeft: `${level * 20 + 8}px` }}
      >
        {hasChildren ? (
          <button onClick={() => setExpanded(!expanded)} className="p-0.5 text-text-muted">
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="w-5" />
        )}
        <Building2 size={14} className="text-accent shrink-0" />
        <span className="text-sm font-medium">{unit.name}</span>
        <span className="text-xs text-text-muted">{unit.unit_type}</span>
        {unit.location && <span className="text-xs text-text-muted">— {unit.location}</span>}
      </div>
      {expanded && hasChildren && (
        <div>
          {unit.children!.map((child) => (
            <TreeNode key={child.id} unit={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

const emptyUnitForm: Partial<OrgUnit> = {
  name: '',
  parent_id: null,
  unit_type: 'SECTION',
  commander_id: '',
  description: '',
  location: '',
  established_date: '',
};

const emptyAssignmentForm: Partial<PersonnelAssignment> = {
  unit_id: '',
  user_id: '',
  role: '',
  is_primary: false,
  start_date: '',
  end_date: '',
};

export default function OrgChartList() {
  const {
    tree, units, assignments, pagination, assignmentsPagination, isLoading,
    fetchTree, fetchUnits, fetchAssignments,
    createUnit, updateUnit, deleteUnit,
    createAssignment, updateAssignment, deleteAssignment,
  } = useOrgChartStore();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [assignmentPage, setAssignmentPage] = useState(1);

  const [unitModalOpen, setUnitModalOpen] = useState(false);
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [deleteTargetUnit, setDeleteTargetUnit] = useState<OrgUnit | null>(null);
  const [deleteTargetAssignment, setDeleteTargetAssignment] = useState<PersonnelAssignment | null>(null);
  const [unitForm, setUnitForm] = useState<Partial<OrgUnit>>(emptyUnitForm);
  const [assignmentForm, setAssignmentForm] = useState<Partial<PersonnelAssignment>>(emptyAssignmentForm);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
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

  const load = useCallback(() => {
    fetchTree();
    fetchUnits({ search, page, limit: 20 });
    fetchAssignments({ page: assignmentPage, limit: 20 });
  }, [fetchTree, fetchUnits, fetchAssignments, search, page, assignmentPage]);

  useEffect(() => { load(); }, [load]);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const { data } = await orgChartApi.listUnits({ limit: 1000 });
      const allItems = data.data || data.items || [];
      exportToCSV(allItems, 'org-chart-units-export');
      toast.success(`Exported ${allItems.length} units as CSV`);
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
      const { data } = await orgChartApi.listUnits({ limit: 1000 });
      const allItems = data.data || data.items || [];
      exportToJSON(allItems, 'org-chart-units-export');
      toast.success(`Exported ${allItems.length} units as JSON`);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
      setExportOpen(false);
    }
  };

  const handleCreateUnit = () => {
    setEditingUnitId(null);
    setUnitForm(emptyUnitForm);
    setUnitModalOpen(true);
  };

  const handleEditUnit = (unit: OrgUnit) => {
    setEditingUnitId(unit.id);
    setUnitForm({
      name: unit.name,
      parent_id: unit.parent_id,
      unit_type: unit.unit_type,
      commander_id: unit.commander_id || '',
      description: unit.description || '',
      location: unit.location || '',
      established_date: unit.established_date || '',
    });
    setUnitModalOpen(true);
  };

  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingUnitId) {
        await updateUnit(editingUnitId, unitForm);
        toast.success('Unit updated');
      } else {
        await createUnit(unitForm);
        toast.success('Unit created');
      }
      setUnitModalOpen(false);
    } catch {
      toast.error('Operation failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUnit = async () => {
    if (!deleteTargetUnit) return;
    try {
      await deleteUnit(deleteTargetUnit.id);
      toast.success('Unit deleted');
      setDeleteTargetUnit(null);
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleCreateAssignment = () => {
    setEditingAssignmentId(null);
    setAssignmentForm(emptyAssignmentForm);
    setAssignmentModalOpen(true);
  };

  const handleEditAssignment = (a: PersonnelAssignment) => {
    setEditingAssignmentId(a.id);
    setAssignmentForm({
      unit_id: a.unit_id,
      user_id: a.user_id,
      role: a.role,
      is_primary: a.is_primary,
      start_date: a.start_date || '',
      end_date: a.end_date || '',
    });
    setAssignmentModalOpen(true);
  };

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingAssignmentId) {
        await updateAssignment(editingAssignmentId, assignmentForm);
        toast.success('Assignment updated');
      } else {
        await createAssignment(assignmentForm);
        toast.success('Assignment created');
      }
      setAssignmentModalOpen(false);
    } catch {
      toast.error('Operation failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAssignment = async () => {
    if (!deleteTargetAssignment) return;
    try {
      await deleteAssignment(deleteTargetAssignment.id);
      toast.success('Assignment deleted');
      setDeleteTargetAssignment(null);
    } catch {
      toast.error('Delete failed');
    }
  };

  const setUnitField = (field: string, value: any) => setUnitForm((f) => ({ ...f, [field]: value }));
  const setAssignmentField = (field: string, value: any) => setAssignmentForm((f) => ({ ...f, [field]: value }));

  const unitColumns = [
    { key: 'name', label: 'Name' },
    { key: 'unit_type', label: 'Type' },
    { key: 'location', label: 'Location' },
    { key: 'established_date', label: 'Established' },
    {
      key: 'actions',
      label: 'Actions',
      render: (item: OrgUnit) => (
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); handleEditUnit(item); }} className="btn-ghost p-1.5">
            <Pencil size={14} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteTargetUnit(item); }} className="btn-ghost p-1.5 text-accent-danger">
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  const assignmentColumns = [
    { key: 'unit_id', label: 'Unit ID' },
    { key: 'user_id', label: 'User ID' },
    { key: 'role', label: 'Role' },
    {
      key: 'is_primary',
      label: 'Primary',
      render: (item: PersonnelAssignment) => (
        <span className={`badge ${item.is_primary ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}`}>
          {item.is_primary ? 'Yes' : 'No'}
        </span>
      ),
    },
    { key: 'start_date', label: 'Start Date' },
    { key: 'end_date', label: 'End Date' },
    {
      key: 'actions',
      label: 'Actions',
      render: (item: PersonnelAssignment) => (
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); handleEditAssignment(item); }} className="btn-ghost p-1.5">
            <Pencil size={14} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteTargetAssignment(item); }} className="btn-ghost p-1.5 text-accent-danger">
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organizational Chart"
        subtitle="Manage units, structure, and personnel assignments"
      >
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
                <ChevronDownIcon size={14} />
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Unit Hierarchy</h2>
            <button onClick={handleCreateUnit} className="btn-primary text-xs">
              <Plus size={14} /> Add Unit
            </button>
          </div>
          {isLoading && tree.length === 0 ? (
            <div className="animate-pulse text-center py-8 text-text-muted">Loading...</div>
          ) : tree.length === 0 ? (
            <div className="text-center py-8 text-text-muted">No units configured</div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {tree.map((unit) => (
                <TreeNode key={unit.id} unit={unit} />
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">All Units</h2>
          </div>
          <SearchBar value={search} onChange={setSearch} placeholder="Search units..." className="mb-3" />
          <DataTable
            columns={unitColumns}
            data={units}
            pagination={pagination}
            isLoading={isLoading}
            emptyMessage="No units found"
            onPageChange={setPage}
          />
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Personnel Assignments</h2>
          <button onClick={handleCreateAssignment} className="btn-primary text-xs">
            <Plus size={14} /> Add Assignment
          </button>
        </div>
        <DataTable
          columns={assignmentColumns}
          data={assignments}
          pagination={assignmentsPagination}
          isLoading={isLoading}
          emptyMessage="No assignments found"
          onPageChange={setAssignmentPage}
        />
      </div>

      <Modal isOpen={unitModalOpen} onClose={() => setUnitModalOpen(false)} title={editingUnitId ? 'Edit Unit' : 'Create Unit'} size="lg">
        <form onSubmit={handleSaveUnit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput label="Name" value={unitForm.name || ''} onChange={(e) => setUnitField('name', e.target.value)} required />
            <FormSelect label="Unit Type" value={unitForm.unit_type || 'SECTION'} options={UNIT_TYPE_OPTIONS} onChange={(e) => setUnitField('unit_type', e.target.value)} />
            <FormInput label="Parent Unit ID" value={unitForm.parent_id || ''} onChange={(e) => setUnitField('parent_id', e.target.value || null)} />
            <FormInput label="Commander ID" value={unitForm.commander_id || ''} onChange={(e) => setUnitField('commander_id', e.target.value)} />
            <FormInput label="Location" value={unitForm.location || ''} onChange={(e) => setUnitField('location', e.target.value)} />
            <FormInput label="Established Date" type="date" value={unitForm.established_date || ''} onChange={(e) => setUnitField('established_date', e.target.value)} />
          </div>
          <FormTextarea label="Description" value={unitForm.description || ''} onChange={(e) => setUnitField('description', e.target.value)} />
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setUnitModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSaving} className="btn-primary">
              {isSaving ? 'Saving...' : editingUnitId ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={assignmentModalOpen} onClose={() => setAssignmentModalOpen(false)} title={editingAssignmentId ? 'Edit Assignment' : 'Create Assignment'} size="md">
        <form onSubmit={handleSaveAssignment} className="space-y-4">
          <FormInput label="Unit ID" value={assignmentForm.unit_id || ''} onChange={(e) => setAssignmentField('unit_id', e.target.value)} required />
          <FormInput label="User ID" value={assignmentForm.user_id || ''} onChange={(e) => setAssignmentField('user_id', e.target.value)} required />
          <FormInput label="Role" value={assignmentForm.role || ''} onChange={(e) => setAssignmentField('role', e.target.value)} required />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_primary"
              checked={assignmentForm.is_primary || false}
              onChange={(e) => setAssignmentField('is_primary', e.target.checked)}
              className="rounded"
            />
            <label htmlFor="is_primary" className="text-sm text-text-secondary">Primary Assignment</label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Start Date" type="date" value={assignmentForm.start_date || ''} onChange={(e) => setAssignmentField('start_date', e.target.value)} />
            <FormInput label="End Date" type="date" value={assignmentForm.end_date || ''} onChange={(e) => setAssignmentField('end_date', e.target.value)} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setAssignmentModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSaving} className="btn-primary">
              {isSaving ? 'Saving...' : editingAssignmentId ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTargetUnit}
        onClose={() => setDeleteTargetUnit(null)}
        onConfirm={handleDeleteUnit}
        title="Delete Unit"
        message={`Are you sure you want to delete "${deleteTargetUnit?.name}"? This may affect sub-units and assignments.`}
        variant="danger"
      />

      <ConfirmDialog
        isOpen={!!deleteTargetAssignment}
        onClose={() => setDeleteTargetAssignment(null)}
        onConfirm={handleDeleteAssignment}
        title="Delete Assignment"
        message="Are you sure you want to delete this assignment?"
        variant="danger"
      />
    </div>
  );
}
