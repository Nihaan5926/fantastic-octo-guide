import React, { useEffect, useState, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { Edit, Trash2, ArrowRightCircle, AlertTriangle, Flag, Download, ChevronDown } from 'lucide-react';
import { useFintStore } from '../store';
import { fintApi } from '../api';
import { exportToCSV, exportToJSON } from '../../../utils/export';
import PageHeader from '../../../components/common/PageHeader';
import SearchBar from '../../../components/common/SearchBar';
import DataTable from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { FormInput, FormSelect, FormTextarea } from '../../../components/common/FormComponents';
import { StatusBadge } from '../../../components/common/Badges';

const TABS = [
  { key: 'transactions' as const, label: 'Transactions' },
  { key: 'entities' as const, label: 'Entities' },
];

interface TransactionForm {
  transaction_ref: string; amount: string; currency: string;
  sender_entity_id: string; receiver_entity_id: string;
  transaction_date: string; flagged: string;
}
interface EntityForm {
  name: string; entity_type: string; jurisdiction: string;
  risk_score: string; sanctions_list: string;
}

const emptyTx: TransactionForm = { transaction_ref: '', amount: '', currency: 'USD', sender_entity_id: '', receiver_entity_id: '', transaction_date: '', flagged: 'false' };
const emptyEnt: EntityForm = { name: '', entity_type: '', jurisdiction: '', risk_score: '', sanctions_list: '' };

export default function FintList() {
  const {
    activeTab, setActiveTab,
    transactions, transactionsPagination, transactionsLoading, transactionsError, transactionSearch, setTransactionSearch,
    entities, entitiesPagination, entitiesLoading, entitiesError, entitySearch, setEntitySearch,
    fetchTransactions, createTransaction, updateTransaction, deleteTransaction,
    fetchEntities, createEntity, updateEntity, deleteEntity,
  } = useFintStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [txForm, setTxForm] = useState<TransactionForm>(emptyTx);
  const [entForm, setEntForm] = useState<EntityForm>(emptyEnt);
  const [saving, setSaving] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
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
    fetchTransactions();
    fetchEntities();
  }, []);

  const tabPagination = activeTab === 'transactions' ? transactionsPagination : entitiesPagination;

  const handleTabPageChange = (page: number) => {
    const p = { page, limit: tabPagination.limit };
    if (activeTab === 'transactions') fetchTransactions(p);
    else fetchEntities(p);
  };

  const openCreate = () => {
    setEditingId(null);
    if (activeTab === 'transactions') setTxForm(emptyTx);
    else setEntForm(emptyEnt);
    setModalOpen(true);
  };

  const openEdit = (item: any) => {
    setEditingId(item.id);
    if (activeTab === 'transactions') {
      setTxForm({
        transaction_ref: item.transaction_ref || '',
        amount: item.amount !== undefined ? String(item.amount) : '',
        currency: item.currency || 'USD',
        sender_entity_id: item.sender_entity_id || '',
        receiver_entity_id: item.receiver_entity_id || '',
        transaction_date: item.transaction_date ? item.transaction_date.slice(0, 10) : '',
        flagged: String(item.flagged || false),
      });
    } else {
      setEntForm({
        name: item.name || '',
        entity_type: item.entity_type || '',
        jurisdiction: item.jurisdiction || '',
        risk_score: item.risk_score !== undefined ? String(item.risk_score) : '',
        sanctions_list: typeof item.sanctions_list === 'object' ? JSON.stringify(item.sanctions_list) : (item.sanctions_list || ''),
      });
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    let ok: boolean;
    if (activeTab === 'transactions') {
      if (!txForm.transaction_ref.trim()) { setSaving(false); return; }
      ok = editingId
        ? await updateTransaction(editingId, { ...txForm, amount: parseFloat(txForm.amount) || 0, flagged: txForm.flagged === 'true' })
        : await createTransaction({ ...txForm, amount: parseFloat(txForm.amount) || 0, flagged: txForm.flagged === 'true' });
    } else {
      if (!entForm.name.trim()) { setSaving(false); return; }
      const payload = {
        ...entForm,
        risk_score: parseInt(entForm.risk_score, 10) || 0,
        sanctions_list: (() => { try { return JSON.parse(entForm.sanctions_list); } catch { return entForm.sanctions_list; } })(),
      };
      ok = editingId ? await updateEntity(editingId, payload) : await createEntity(payload);
    }
    setSaving(false);
    if (ok) setModalOpen(false);
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const isTx = activeTab === 'transactions';
      const { data } = isTx
        ? await fintApi.listTransactions({ limit: 1000 })
        : await fintApi.listEntities({ limit: 1000 });
      const allItems = data.data || data.items || [];
      const label = isTx ? 'transactions' : 'entities';
      exportToCSV(allItems, `fint-${label}-export`);
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
      const isTx = activeTab === 'transactions';
      const { data } = isTx
        ? await fintApi.listTransactions({ limit: 1000 })
        : await fintApi.listEntities({ limit: 1000 });
      const allItems = data.data || data.items || [];
      const label = isTx ? 'transactions' : 'entities';
      exportToJSON(allItems, `fint-${label}-export`);
      toast.success(`Exported ${allItems.length} ${label} as JSON`);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
      setExportOpen(false);
    }
  };

  const openDeleteConfirm = (id: string) => { setDeleteTargetId(id); setConfirmOpen(true); };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    setDeleting(true);
    if (activeTab === 'transactions') await deleteTransaction(deleteTargetId);
    else await deleteEntity(deleteTargetId);
    setDeleting(false);
    setConfirmOpen(false);
    setDeleteTargetId(null);
  };

  const txColumns = [
    { key: 'transaction_ref', label: 'Ref #' },
    { key: 'amount', label: 'Amount', render: (it: any) => it.amount != null ? formatCurrency(Number(it.amount), it.currency) : '-', sortable: true },
    { key: 'currency', label: 'Currency' },
    { key: 'transaction_date', label: 'Date', render: (it: any) => it.transaction_date ? new Date(it.transaction_date).toLocaleDateString() : '-' },
    { key: 'flagged', label: 'Flagged', render: (it: any) => (
      it.flagged ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/25"><Flag size={10} /> FLAGGED</span> : <StatusBadge label="CLEAR" color="green" />
    ) },
    { key: 'actions', label: '', className: 'w-20', render: (it: any) => (
      <div className="flex items-center gap-1">
        <button onClick={(e) => { e.stopPropagation(); openEdit(it); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary"><Edit size={15} /></button>
        <button onClick={(e) => { e.stopPropagation(); openDeleteConfirm(it.id); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-accent-danger"><Trash2 size={15} /></button>
      </div>
    )},
  ];

  const entColumns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'entity_type', label: 'Type' },
    { key: 'jurisdiction', label: 'Jurisdiction' },
    { key: 'risk_score', label: 'Risk Score', sortable: true, render: (it: any) => {
      const score = Number(it.risk_score) || 0;
      const color = score >= 75 ? 'bg-red-500' : score >= 50 ? 'bg-amber-500' : score >= 25 ? 'bg-blue-500' : 'bg-emerald-500';
      const textColor = score >= 75 ? 'text-red-400' : score >= 50 ? 'text-amber-400' : score >= 25 ? 'text-blue-400' : 'text-emerald-400';
      return (
        <div className="flex items-center gap-2 min-w-[120px]">
          <div className="flex-1 h-2 bg-bg-tertiary rounded-full overflow-hidden">
            <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${Math.min(score, 100)}%` }} />
          </div>
          <span className={`text-xs font-semibold ${textColor} w-8`}>{score}</span>
        </div>
      );
    }},
    { key: 'actions', label: '', className: 'w-20', render: (it: any) => (
      <div className="flex items-center gap-1">
        <button onClick={(e) => { e.stopPropagation(); openEdit(it); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary"><Edit size={15} /></button>
        <button onClick={(e) => { e.stopPropagation(); openDeleteConfirm(it.id); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-accent-danger"><Trash2 size={15} /></button>
      </div>
    )},
  ];

  const tabData = activeTab === 'transactions' ? transactions : entities;
  const tabLoading = activeTab === 'transactions' ? transactionsLoading : entitiesLoading;
  const tabError = activeTab === 'transactions' ? transactionsError : entitiesError;
  const tabColumns = activeTab === 'transactions' ? txColumns : entColumns;
  const tabSearch = activeTab === 'transactions' ? transactionSearch : entitySearch;
  const setTabSearch = activeTab === 'transactions' ? setTransactionSearch : setEntitySearch;

  const flaggedCount = useMemo(() => transactions.filter((t: any) => t.flagged).length, [transactions]);

  const jurisdictionRiskFactors: Record<string, number> = {
    'OFAC': 30, 'EU': 20, 'UN': 25, 'UK': 20, 'SWITZERLAND': 5, 'PANAMA': 25, 'CAYMAN ISLANDS': 20, 'HONG KONG': 15, 'SINGAPORE': 10,
  };

  const autoCalcRiskScore = (entity: any): number => {
    let base = Number(entity.risk_score) || 0;
    if (entity.jurisdiction) {
      for (const [key, val] of Object.entries(jurisdictionRiskFactors)) {
        if (entity.jurisdiction.toUpperCase().includes(key)) {
          base = Math.max(base, val);
        }
      }
    }
    if (entity.sanctions_list) {
      let listCount = 0;
      if (typeof entity.sanctions_list === 'string') {
        try { const arr = JSON.parse(entity.sanctions_list); listCount = Array.isArray(arr) ? arr.length : 1; } catch { listCount = 1; }
      } else if (Array.isArray(entity.sanctions_list)) {
        listCount = entity.sanctions_list.length;
      }
      base = Math.min(base + listCount * 15, 100);
    }
    return base;
  };

  const riskWarning = useMemo(() => (activeTab === 'entities' ? entities.filter((e: any) => autoCalcRiskScore(e) >= 60).length : 0), [entities, activeTab]);

  const networkNodes = useMemo(() => {
    if (activeTab !== 'transactions' || transactions.length === 0) return [];
    const unique: { id: string; label: string; count: number }[] = [];
    const seen = new Set<string>();
    const takeN = Math.min(transactions.length, 20);
    for (let i = 0; i < takeN; i++) {
      const t = transactions[i];
      [t.sender_entity_id, t.receiver_entity_id].forEach((id) => {
        if (id && !seen.has(id)) {
          seen.add(id);
          unique.push({ id, label: id.length > 12 ? id.slice(0, 12) + '...' : id, count: 1 });
        } else if (id) {
          const found = unique.find((n) => n.id === id);
          if (found) found.count++;
        }
      });
    }
    return unique;
  }, [activeTab, transactions]);

  const networkEdges = useMemo(() => {
    if (activeTab !== 'transactions' || transactions.length === 0) return [];
    const edges: { from: string; to: string; amount: number; flagged: boolean }[] = [];
    const takeN = Math.min(transactions.length, 20);
    for (let i = 0; i < takeN; i++) {
      const t = transactions[i];
      if (t.sender_entity_id && t.receiver_entity_id) {
        edges.push({
          from: t.sender_entity_id,
          to: t.receiver_entity_id,
          amount: t.amount || 0,
          flagged: t.flagged,
        });
      }
    }
    return edges;
  }, [activeTab, transactions]);

  const formatCurrency = (val: number, currency?: string) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD', minimumFractionDigits: 2 }).format(val);

  return (
    <div>
      <PageHeader title="FININT" subtitle="Financial Intelligence" onCreate={openCreate} createLabel={activeTab === 'transactions' ? 'New Transaction' : 'New Entity'}>
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

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-bg-tertiary rounded-lg p-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === tab.key ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary'}`}
            >
              {tab.label}
              {tab.key === 'transactions' && ` (${transactionsPagination.total})`}
              {tab.key === 'transactions' && flaggedCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-red-500 text-white">{flaggedCount} flagged</span>
              )}
              {tab.key === 'entities' && ` (${entitiesPagination.total})`}
            </button>
          ))}
        </div>
        <SearchBar value={tabSearch} onChange={setTabSearch} placeholder={`Search ${activeTab}...`} className="max-w-xs" />
      </div>

      {activeTab === 'transactions' && networkNodes.length > 0 && (
        <div className="card mb-4">
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">Transaction Network Graph</h3>
          <div className="bg-bg-primary rounded-lg p-4 overflow-x-auto">
            <div className="flex flex-wrap items-center gap-3 min-w-fit">
              {networkNodes.map((node, i) => (
                <div key={node.id} className="flex items-center gap-2">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-accent" />
                    <span className="text-xs text-text-muted mt-1 max-w-[80px] truncate" title={node.id}>{node.label}</span>
                    {node.count > 1 && <span className="text-xs text-accent">{node.count} tx</span>}
                  </div>
                  {i < networkNodes.length - 1 && (
                    <ArrowRightCircle size={16} className="text-text-muted mx-1" />
                  )}
                </div>
              ))}
            </div>
            {networkEdges.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {networkEdges.slice(0, 10).map((edge, i) => (
                  <div key={i} className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${edge.flagged ? 'bg-red-500/10 border border-red-500/30' : 'bg-bg-card border border-border'}`}>
                    <span className="text-text-muted">{edge.from.slice(0, 8)}</span>
                    <ArrowRightCircle size={10} className={edge.flagged ? 'text-red-400' : 'text-text-muted'} />
                    <span className="text-text-muted">{edge.to.slice(0, 8)}</span>
                    <span className={`font-mono ml-1 ${edge.flagged ? 'text-red-400' : 'text-text-secondary'}`}>{formatCurrency(edge.amount)}</span>
                  </div>
                ))}
                {networkEdges.length > 10 && (
                  <span className="text-xs text-text-muted self-center">+{networkEdges.length - 10} more</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {tabError && <div className="card border-red-500/30 bg-red-500/10 text-red-400 text-sm p-4 mb-4">{tabError}</div>}

      {activeTab === 'entities' && riskWarning > 0 && (
        <div className="card border-red-500/30 bg-red-500/10 p-4 mb-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-red-400" />
          <span className="text-sm text-red-400">{riskWarning} high-risk entit{riskWarning !== 1 ? 'ies' : 'y'} detected (score ≥ 60)</span>
        </div>
      )}

      <DataTable columns={tabColumns} data={tabData} isLoading={tabLoading} pagination={tabPagination} onPageChange={handleTabPageChange} emptyMessage={`No ${activeTab} found`} />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? `Edit ${activeTab === 'transactions' ? 'Transaction' : 'Entity'}` : `Create ${activeTab === 'transactions' ? 'Transaction' : 'Entity'}`} size="lg">
        {activeTab === 'transactions' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Transaction Ref" required value={txForm.transaction_ref} onChange={(e) => setTxForm({ ...txForm, transaction_ref: e.target.value })} />
              <FormInput label="Transaction Date" type="date" value={txForm.transaction_date} onChange={(e) => setTxForm({ ...txForm, transaction_date: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <FormInput label="Amount" type="number" value={txForm.amount} onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })} />
              <FormInput label="Currency" value={txForm.currency} onChange={(e) => setTxForm({ ...txForm, currency: e.target.value })} />
              <FormSelect label="Flagged" options={[{ value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }]} value={txForm.flagged} onChange={(e) => setTxForm({ ...txForm, flagged: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Sender Entity ID" value={txForm.sender_entity_id} onChange={(e) => setTxForm({ ...txForm, sender_entity_id: e.target.value })} />
              <FormInput label="Receiver Entity ID" value={txForm.receiver_entity_id} onChange={(e) => setTxForm({ ...txForm, receiver_entity_id: e.target.value })} />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Name" required value={entForm.name} onChange={(e) => setEntForm({ ...entForm, name: e.target.value })} />
              <FormInput label="Entity Type" value={entForm.entity_type} onChange={(e) => setEntForm({ ...entForm, entity_type: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Jurisdiction" value={entForm.jurisdiction} onChange={(e) => setEntForm({ ...entForm, jurisdiction: e.target.value })} />
              <FormInput label="Risk Score" type="number" value={entForm.risk_score} onChange={(e) => setEntForm({ ...entForm, risk_score: e.target.value })} />
            </div>
            <FormTextarea label="Sanctions List (JSON)" value={entForm.sanctions_list} onChange={(e) => setEntForm({ ...entForm, sanctions_list: e.target.value })} placeholder='["OFAC", "UN"]' />
          </div>
        )}
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || (activeTab === 'transactions' ? !txForm.transaction_ref.trim() : !entForm.name.trim())}
            className="btn-primary"
          >
            {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={handleDelete} title="Delete Record" message="Are you sure you want to delete this record? This action cannot be undone." confirmLabel="Delete" variant="danger" isLoading={deleting} />
    </div>
  );
}
