import React, { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { Edit, Trash2, Wallet, FileText, Download, ChevronDown } from 'lucide-react';
import { exportToCSV, exportToJSON } from '../../../utils/export';
import { budgetApi } from '../api';
import { useDynamicTable } from '../../../hooks/useDynamicTable';
import PageHeader from '../../../components/common/PageHeader';
import SearchBar from '../../../components/common/SearchBar';
import DataTable from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { FormInput, FormSelect, FormTextarea } from '../../../components/common/FormComponents';
import { StatusBadge } from '../../../components/common/Badges';
import { useBudgetStore } from '../store';

const programStatusOpts = [
  { value: 'PLANNED', label: 'Planned' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CLOSED', label: 'Closed' },
];

const contractStatusOpts = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'TERMINATED', label: 'Terminated' },
  { value: 'EXPIRED', label: 'Expired' },
];

const contractTypeOpts = [
  { value: 'FIXED_PRICE', label: 'Fixed Price' },
  { value: 'COST_PLUS', label: 'Cost Plus' },
  { value: 'TIME_MATERIALS', label: 'Time & Materials' },
  { value: 'INDEFINITE_DELIVERY', label: 'Indefinite Delivery' },
];

const tabs = [
  { key: 'programs', label: 'Programs', icon: Wallet },
  { key: 'contracts', label: 'Contracts', icon: FileText },
];

const defaultProgram = { reference_number: '', program_name: '', fiscal_year: new Date().getFullYear(), total_amount: 0, allocated_amount: 0, spent_amount: 0, status: 'PLANNED' };
const defaultContract = { reference_number: '', vendor_name: '', description: '', contract_type: 'FIXED_PRICE', value: 0, start_date: '', end_date: '', status: 'DRAFT' };

export default function BudgetList() {
  const store = useBudgetStore();
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
      const isProg = store.activeTab === 'programs';
      const { data } = isProg
        ? await budgetApi.listPrograms({ limit: 1000 })
        : await budgetApi.listContracts({ limit: 1000 });
      const allItems = data.data || data.items || [];
      const label = isProg ? 'programs' : 'contracts';
      exportToCSV(allItems, `budget-${label}-export`);
      toast.success(`Exported ${allItems.length} ${label} as CSV`);
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
      const isProg = store.activeTab === 'programs';
      const { data } = isProg
        ? await budgetApi.listPrograms({ limit: 1000 })
        : await budgetApi.listContracts({ limit: 1000 });
      const allItems = data.data || data.items || [];
      const label = isProg ? 'programs' : 'contracts';
      exportToJSON(allItems, `budget-${label}-export`);
      toast.success(`Exported ${allItems.length} ${label} as JSON`);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
      setExportOpen(false);
    }
  };

  const openCreate = () => {
    setEditItem(null);
    setForm(store.activeTab === 'programs' ? { ...defaultProgram } : { ...defaultContract });
    setModalOpen(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    if (store.activeTab === 'programs') {
      setForm({
        reference_number: item.reference_number || '',
        program_name: item.program_name || '',
        fiscal_year: item.fiscal_year || new Date().getFullYear(),
        total_amount: item.total_amount || 0,
        allocated_amount: item.allocated_amount || 0,
        spent_amount: item.spent_amount || 0,
        status: item.status || 'PLANNED',
      });
    } else {
      setForm({
        reference_number: item.reference_number || '',
        vendor_name: item.vendor_name || '',
        description: item.description || '',
        contract_type: item.contract_type || 'FIXED_PRICE',
        value: item.value || 0,
        start_date: item.start_date?.split('T')[0] || '',
        end_date: item.end_date?.split('T')[0] || '',
        status: item.status || 'DRAFT',
      });
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (store.activeTab === 'programs' && !form.program_name) { toast.error('Program name is required'); return; }
    if (store.activeTab === 'contracts' && !form.vendor_name) { toast.error('Vendor name is required'); return; }
    if (store.activeTab === 'programs') {
      editItem ? await store.updateProgram(editItem.id, form) : await store.createProgram(form);
    } else {
      editItem ? await store.updateContract(editItem.id, form) : await store.createContract(form);
    }
    toast.success(editItem ? 'Updated' : 'Created');
    setModalOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    if (store.activeTab === 'programs') await store.deleteProgram(deleteId);
    else await store.deleteContract(deleteId);
    toast.success('Deleted');
    setDeleteId(null);
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(val);

  const totalPrograms = store.programs.length;
  const totalAllocated = store.programs.reduce((sum: number, p: any) => sum + (p.allocated_amount || 0), 0);
  const totalSpent = store.programs.reduce((sum: number, p: any) => sum + (p.spent_amount || 0), 0);
  const totalBudget = store.programs.reduce((sum: number, p: any) => sum + (p.total_amount || 0), 0);
  const totalRemaining = totalAllocated - totalSpent;

  const progressColumns = [
    {
      key: 'progress',
      label: 'Budget vs Actual',
      render: (item: any) => {
        const total = item.total_amount || 0;
        const allocated = item.allocated_amount || 0;
        const spent = item.spent_amount || 0;
        if (total === 0) return <span className="text-text-muted text-xs">—</span>;
        const allocatedPct = Math.min(100, (allocated / total) * 100);
        const spentPct = Math.min(100, (spent / total) * 100);
        return (
          <div className="w-full max-w-xs">
            <div className="flex justify-between text-xs text-text-muted mb-0.5">
              <span>Allocated {formatCurrency(allocated)}</span>
              <span>Spent {formatCurrency(spent)}</span>
            </div>
            <div className="w-full bg-bg-tertiary rounded-full h-3 relative overflow-hidden">
              <div className="absolute inset-0 rounded-full bg-blue-500/40 h-3" style={{ width: `${allocatedPct}%` }} />
              <div className="absolute inset-0 rounded-full bg-red-500/60 h-3" style={{ width: `${spentPct}%` }} />
            </div>
            <div className="flex justify-between text-xs text-text-muted mt-0.5">
              <span>{allocatedPct.toFixed(0)}% allocated</span>
              <span>{spentPct.toFixed(0)}% spent</span>
            </div>
          </div>
        );
      },
    },
  ];

  const programColumns = [
    { key: 'reference_number', label: 'Ref #' },
    { key: 'program_name', label: 'Program' },
    { key: 'fiscal_year', label: 'FY' },
    { key: 'total_amount', label: 'Total', render: (item: any) => formatCurrency(item.total_amount) },
    { key: 'allocated_amount', label: 'Allocated', render: (item: any) => formatCurrency(item.allocated_amount) },
    { key: 'spent_amount', label: 'Spent', render: (item: any) => formatCurrency(item.spent_amount) },
    { key: 'status', label: 'Status', render: (item: any) => {
      const colors: Record<string, string> = { PLANNED: 'gray', APPROVED: 'blue', ACTIVE: 'green', COMPLETED: 'blue', CLOSED: 'gray' };
      return <StatusBadge label={item.status} color={colors[item.status] || 'gray'} />;
    }},
    ...progressColumns,
    { key: 'actions', label: '', className: 'text-right', render: (item: any) => (
      <div className="flex justify-end gap-1">
        <button onClick={(e) => { e.stopPropagation(); openEdit(item); }} className="p-1.5 rounded-lg hover:bg-bg-hover"><Edit size={16} /></button>
        <button onClick={(e) => { e.stopPropagation(); setDeleteId(item.id); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-accent-danger"><Trash2 size={16} /></button>
      </div>
    )},
  ];

  const contractColumns = [
    { key: 'reference_number', label: 'Ref #' },
    { key: 'vendor_name', label: 'Vendor' },
    { key: 'description', label: 'Description', render: (item: any) => <span className="truncate block max-w-xs">{item.description}</span> },
    { key: 'contract_type', label: 'Type' },
    { key: 'value', label: 'Value', render: (item: any) => formatCurrency(item.value) },
    { key: 'start_date', label: 'Start', render: (item: any) => item.start_date ? new Date(item.start_date).toLocaleDateString() : '-' },
    { key: 'end_date', label: 'End', render: (item: any) => item.end_date ? new Date(item.end_date).toLocaleDateString() : '-' },
    { key: 'status', label: 'Status', render: (item: any) => {
      const colors: Record<string, string> = { DRAFT: 'gray', ACTIVE: 'green', COMPLETED: 'blue', TERMINATED: 'red', EXPIRED: 'yellow' };
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
      <PageHeader title="Budget" subtitle="Manage program budgets and contracts" onCreate={openCreate} createLabel={store.activeTab === 'programs' ? 'New Program' : 'New Contract'}>
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

      {store.activeTab === 'programs' && store.programs.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="card border-l-4 border-l-accent">
            <span className="text-xs text-text-muted uppercase tracking-wide">Total Budgets</span>
            <span className="text-2xl font-bold block">{totalPrograms}</span>
          </div>
          <div className="card border-l-4 border-l-blue-500">
            <span className="text-xs text-text-muted uppercase tracking-wide">Total Allocated</span>
            <span className="text-2xl font-bold block">{formatCurrency(totalAllocated)}</span>
          </div>
          <div className="card border-l-4 border-l-red-500">
            <span className="text-xs text-text-muted uppercase tracking-wide">Total Spent</span>
            <span className="text-2xl font-bold block">{formatCurrency(totalSpent)}</span>
          </div>
          <div className="card border-l-4 border-l-green-500">
            <span className="text-xs text-text-muted uppercase tracking-wide">Remaining</span>
            <span className="text-2xl font-bold block">{formatCurrency(totalRemaining)}</span>
          </div>
        </div>
      )}

      {store.activeTab === 'programs' && totalBudget > 0 && (
        <div className="card mb-6">
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">Overall Budget Progress</h3>
          <div className="w-full bg-bg-tertiary rounded-full h-4 relative overflow-hidden">
            <div className="absolute inset-0 rounded-full bg-blue-500/50 h-4" style={{ width: `${Math.min(100, (totalAllocated / totalBudget) * 100)}%` }} />
            <div className="absolute inset-0 rounded-full bg-red-500/70 h-4" style={{ width: `${Math.min(100, (totalSpent / totalBudget) * 100)}%` }} />
          </div>
          <div className="flex justify-between text-xs text-text-muted mt-2">
            <span>Budget: {formatCurrency(totalBudget)}</span>
            <span>Allocated (blue): {formatCurrency(totalAllocated)} ({totalBudget > 0 ? ((totalAllocated / totalBudget) * 100).toFixed(0) : 0}%)</span>
            <span>Spent (red): {formatCurrency(totalSpent)} ({totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(0) : 0}%)</span>
          </div>
        </div>
      )}

      <DataTable
        columns={store.activeTab === 'programs' ? programColumns : contractColumns}
        data={store.activeTab === 'programs' ? store.programs : store.contracts}
        pagination={store.pagination}
        isLoading={store.isLoading}
        emptyMessage={`No ${store.activeTab} found`}
        onPageChange={(p) => { store.setPage(p); }}
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={`${editItem ? 'Edit' : 'New'} ${store.activeTab === 'programs' ? 'Program Budget' : 'Contract'}`} size="lg">
        <div className="space-y-4">
          {store.activeTab === 'programs' ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <FormInput label="Reference Number" value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} />
                <FormInput label="Program Name" required value={form.program_name} onChange={(e) => setForm({ ...form, program_name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormInput label="Fiscal Year" type="number" value={form.fiscal_year} onChange={(e) => setForm({ ...form, fiscal_year: parseInt(e.target.value) || 0 })} />
                <FormSelect label="Status" options={programStatusOpts} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <FormInput label="Total Amount" type="number" value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: parseFloat(e.target.value) || 0 })} />
                <FormInput label="Allocated Amount" type="number" value={form.allocated_amount} onChange={(e) => setForm({ ...form, allocated_amount: parseFloat(e.target.value) || 0 })} />
                <FormInput label="Spent Amount" type="number" value={form.spent_amount} onChange={(e) => setForm({ ...form, spent_amount: parseFloat(e.target.value) || 0 })} />
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <FormInput label="Reference Number" value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} />
                <FormInput label="Vendor Name" required value={form.vendor_name} onChange={(e) => setForm({ ...form, vendor_name: e.target.value })} />
              </div>
              <FormTextarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <div className="grid grid-cols-3 gap-4">
                <FormSelect label="Contract Type" options={contractTypeOpts} value={form.contract_type} onChange={(e) => setForm({ ...form, contract_type: e.target.value })} />
                <FormInput label="Value" type="number" value={form.value} onChange={(e) => setForm({ ...form, value: parseFloat(e.target.value) || 0 })} />
                <FormSelect label="Status" options={contractStatusOpts} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormInput label="Start Date" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                <FormInput label="End Date" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
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
        message={`Are you sure you want to delete this ${store.activeTab === 'programs' ? 'program' : 'contract'}?`}
        isLoading={store.isSaving}
      />
    </div>
  );
}