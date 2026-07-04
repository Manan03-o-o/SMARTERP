'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Ledger, LedgerGroup } from '@/types/database';
import { ArrowLeft, Plus, Edit3, Trash2, List } from 'lucide-react';

interface LedgerFormProps {
  companyId: string;
  ledgers: Ledger[];
  companyState: string;
  onSaveLedger: (ledger: Omit<Ledger, 'id' | 'companyId' | 'currentBalance'> & { id?: string }) => void;
  onDeleteLedger: (id: string) => void;
  onClose: () => void;
  initialMode?: 'create' | 'list';
}

const GROUPS: LedgerGroup[] = [
  'Sundry Debtors',
  'Sundry Creditors',
  'Sales Accounts',
  'Purchase Accounts',
  'Bank Accounts',
  'Cash-in-hand',
  'Indirect Expenses',
  'Indirect Incomes'
];

const STATES = [
  'Maharashtra', 'Karnataka', 'Delhi', 'Tamil Nadu', 'Gujarat',
  'Uttar Pradesh', 'West Bengal', 'Telangana', 'Rajasthan', 'Kerala'
];

export default function LedgerForm({
  companyId,
  ledgers,
  companyState,
  onSaveLedger,
  onDeleteLedger,
  onClose,
  initialMode = 'create'
}: LedgerFormProps) {
  const [mode, setMode] = useState<'create' | 'list' | 'edit'>(initialMode);
  const [selectedLedgerId, setSelectedLedgerId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [group, setGroup] = useState<LedgerGroup>('Sundry Debtors');
  const [gstin, setGstin] = useState('');
  const [state, setState] = useState(companyState);
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [balType, setBalType] = useState<'Dr' | 'Cr'>('Dr');
  const [error, setError] = useState('');

  // Search in list view
  const [search, setSearch] = useState('');
  const [listIndex, setListIndex] = useState(0);

  // Form field refs for keyboard focus
  const formRefs = useRef<(HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement | null)[]>([]);

  const activeLedgers = ledgers.filter((l) => l.companyId === companyId);
  const filteredLedgers = activeLedgers.filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.group.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    // ESC goes back or closes
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (mode === 'edit' || (mode === 'create' && initialMode === 'list')) {
          resetForm();
          setMode('list');
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [mode, initialMode, onClose]);

  // List view key navigation
  useEffect(() => {
    if (mode !== 'list') return;

    const handleListKeys = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setListIndex((prev) => (filteredLedgers.length ? (prev + 1) % filteredLedgers.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setListIndex((prev) => (filteredLedgers.length ? (prev - 1 + filteredLedgers.length) % filteredLedgers.length : 0));
      } else if (e.key === 'Enter') {
        if (filteredLedgers[listIndex]) {
          e.preventDefault();
          handleEdit(filteredLedgers[listIndex]);
        }
      }
    };
    window.addEventListener('keydown', handleListKeys);
    return () => window.removeEventListener('keydown', handleListKeys);
  }, [mode, filteredLedgers, listIndex]);

  const resetForm = () => {
    setName('');
    setGroup('Sundry Debtors');
    setGstin('');
    setState(companyState);
    setAddress('');
    setPhone('');
    setOpeningBalance(0);
    setBalType('Dr');
    setError('');
    setSelectedLedgerId(null);
  };

  const handleEdit = (ledger: Ledger) => {
    setSelectedLedgerId(ledger.id);
    setName(ledger.name);
    setGroup(ledger.group);
    setGstin(ledger.gstin || '');
    setState(ledger.state || companyState);
    setAddress(ledger.address || '');
    setPhone(ledger.phone || '');
    
    const bal = ledger.openingBalance;
    setOpeningBalance(Math.abs(bal));
    setBalType(bal >= 0 ? 'Dr' : 'Cr');
    
    setMode('edit');
    setError('');
    setTimeout(() => formRefs.current[0]?.focus(), 50);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Ledger Name is required');
      formRefs.current[0]?.focus();
      return;
    }

    // Validation for GSTIN if Sundry Debtor or Creditor
    const isParty = group === 'Sundry Debtors' || group === 'Sundry Creditors';
    if (isParty && gstin.trim() && gstin.length !== 15) {
      setError('GSTIN must be exactly 15 characters long if provided');
      formRefs.current[2]?.focus();
      return;
    }

    const calculatedBalance = balType === 'Dr' ? Math.abs(openingBalance) : -Math.abs(openingBalance);

    onSaveLedger({
      id: selectedLedgerId || undefined,
      name,
      group,
      gstin: gstin.toUpperCase() || undefined,
      state: isParty ? state : undefined,
      address: isParty ? address : undefined,
      phone: phone || undefined,
      openingBalance: calculatedBalance
    });

    resetForm();
    if (initialMode === 'list') {
      setMode('list');
    } else {
      onClose();
    }
  };

  const isPartySelected = group === 'Sundry Debtors' || group === 'Sundry Creditors';

  return (
    <div className="w-full max-w-4xl bg-tally-panel border border-tally-border rounded-lg shadow-2xl overflow-hidden font-mono animate-slide-up">
      {/* Header */}
      <div className="bg-tally-header px-6 py-3.5 border-b border-tally-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 bg-tally-amber rounded-full"></span>
          <h2 className="text-sm font-bold uppercase tracking-wider text-tally-text">
            {mode === 'create' && 'Ledger Creation Master'}
            {mode === 'edit' && `Alter Ledger: ${name}`}
            {mode === 'list' && 'Ledgers Registry list'}
          </h2>
        </div>
        
        <div className="flex gap-2">
          {mode === 'list' ? (
            <button
              onClick={() => {
                resetForm();
                setMode('create');
              }}
              className="px-3 py-1 bg-tally-teal hover:bg-tally-teal-light text-white text-xs rounded transition-all flex items-center gap-1 cursor-pointer"
            >
              <Plus size={14} /> [ALT+L] Create New
            </button>
          ) : (
            <button
              onClick={() => {
                resetForm();
                setMode('list');
              }}
              className="px-3 py-1 bg-tally-bg border border-tally-border hover:bg-tally-border text-tally-text text-xs rounded transition-all flex items-center gap-1 cursor-pointer"
            >
              <List size={14} /> View List
            </button>
          )}
          <button
            onClick={onClose}
            className="text-tally-muted hover:text-tally-text transition-colors flex items-center gap-1 text-xs uppercase pl-2 border-l border-tally-border/40"
          >
            <ArrowLeft size={14} /> Back [ESC]
          </button>
        </div>
      </div>

      {mode === 'list' ? (
        /* Registry List View */
        <div className="p-6">
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by ledger name or account group..."
              className="w-full bg-tally-bg border border-tally-border text-tally-text px-4 py-2.5 rounded focus:outline-hidden focus:border-tally-teal-light text-xs"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setListIndex(0);
              }}
            />
          </div>

          <div className="border border-tally-border rounded overflow-hidden max-h-[400px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-tally-header text-tally-muted uppercase font-bold sticky top-0 border-b border-tally-border">
                <tr>
                  <th className="p-3">Ledger Name</th>
                  <th className="p-3">Accounting Group</th>
                  <th className="p-3">State / GSTIN</th>
                  <th className="p-3 text-right">Opening Bal (₹)</th>
                  <th className="p-3 text-right">Current Bal (₹)</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tally-border/30 bg-tally-bg/20">
                {filteredLedgers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-tally-muted italic">
                      No matching ledgers found. Press ALT+L to create one.
                    </td>
                  </tr>
                ) : (
                  filteredLedgers.map((l, idx) => {
                    const isSelected = listIndex === idx;
                    const opBalAbs = Math.abs(l.openingBalance).toLocaleString('en-IN');
                    const opType = l.openingBalance >= 0 ? 'Dr' : 'Cr';
                    const curBalAbs = Math.abs(l.currentBalance).toLocaleString('en-IN');
                    const curType = l.currentBalance >= 0 ? 'Dr' : 'Cr';
                    return (
                      <tr
                        key={l.id}
                        onClick={() => handleEdit(l)}
                        className={`hover:bg-tally-teal/10 cursor-pointer select-none transition-colors ${
                          isSelected ? 'bg-tally-teal/20 text-white font-semibold' : 'text-tally-text'
                        }`}
                      >
                        <td className="p-3 font-semibold">{l.name}</td>
                        <td className="p-3 text-tally-teal-light">{l.group}</td>
                        <td className="p-3 text-tally-muted text-[11px]">
                          {l.state || 'N/A'} {l.gstin ? `(${l.gstin})` : ''}
                        </td>
                        <td className="p-3 text-right font-mono font-medium">
                          {opBalAbs} <span className={l.openingBalance >= 0 ? 'text-tally-emerald' : 'text-tally-rose'}>{opType}</span>
                        </td>
                        <td className="p-3 text-right font-mono font-bold">
                          {curBalAbs} <span className={l.currentBalance >= 0 ? 'text-tally-emerald' : 'text-tally-rose'}>{curType}</span>
                        </td>
                        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-center gap-1.5">
                            <button
                              onClick={() => handleEdit(l)}
                              className="p-1 text-tally-muted hover:text-tally-amber hover:bg-tally-bg rounded transition-colors"
                              title="Edit Ledger Details"
                            >
                              <Edit3 size={13} />
                            </button>
                            {/* Prevent deleting core ledgers like Cash */}
                            {l.name !== 'Cash' && (
                              <button
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete ledger "${l.name}"?`)) {
                                    onDeleteLedger(l.id);
                                  }
                                }}
                                className="p-1 text-tally-muted hover:text-tally-rose hover:bg-tally-bg rounded transition-colors"
                                title="Delete Ledger"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-[10px] text-tally-muted flex justify-between">
            <span>[Arrow Keys] Navigate items</span>
            <span>[Enter] Select to edit</span>
          </div>
        </div>
      ) : (
        /* Create / Alter Form View */
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 text-xs">
          {error && (
            <div className="p-3 bg-tally-rose/10 border border-tally-rose text-tally-rose rounded">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left side: General Ledger details */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-tally-muted">Ledger Name *</label>
                <input
                  ref={(el) => { formRefs.current[0] = el; }}
                  type="text"
                  placeholder="e.g. Acme Corporation"
                  className="bg-tally-bg border border-tally-border text-tally-text p-2 rounded focus:outline-hidden focus:border-tally-teal-light text-xs font-semibold"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={name === 'Cash'}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-tally-muted">Account Group *</label>
                <select
                  ref={(el) => { formRefs.current[1] = el as HTMLSelectElement | null; }}
                  className="bg-tally-bg border border-tally-border text-tally-text p-2 rounded focus:outline-hidden focus:border-tally-teal-light text-xs font-semibold"
                  value={group}
                  onChange={(e) => setGroup(e.target.value as LedgerGroup)}
                  disabled={name === 'Cash'}
                >
                  {GROUPS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-tally-muted">Opening Balance (₹)</label>
                <div className="flex gap-1.5">
                  <input
                    ref={(el) => { formRefs.current[6] = el; }}
                    type="number"
                    min="0"
                    placeholder="0"
                    className="w-full bg-tally-bg border border-tally-border text-tally-text p-2 rounded focus:outline-hidden focus:border-tally-teal-light text-xs font-mono"
                    value={openingBalance || ''}
                    onChange={(e) => setOpeningBalance(parseFloat(e.target.value) || 0)}
                  />
                  <select
                    className="w-16 bg-tally-bg border border-tally-border text-tally-text p-2 rounded focus:outline-hidden focus:border-tally-teal-light text-xs font-semibold"
                    value={balType}
                    onChange={(e) => setBalType(e.target.value as 'Dr' | 'Cr')}
                  >
                    <option value="Dr">Dr</option>
                    <option value="Cr">Cr</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Right side: Party/Tax Details (Only visible for debtors/creditors) */}
            <div className={`flex flex-col gap-3 p-4 bg-tally-bg/40 border border-tally-border/40 rounded transition-all duration-300 ${
              isPartySelected ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-40 scale-95 pointer-events-none'
            }`}>
              <div className="text-[10px] text-tally-teal-light font-bold uppercase tracking-wider mb-1 border-b border-tally-border pb-1">
                Tax & Shipping Details (Party Ledgers)
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-tally-muted">GSTIN (15-digit)</label>
                <input
                  ref={(el) => { formRefs.current[2] = el; }}
                  type="text"
                  placeholder="e.g. 27AAAAA1111A1Z1"
                  maxLength={15}
                  disabled={!isPartySelected}
                  className="bg-tally-bg border border-tally-border text-tally-text p-2 rounded focus:outline-hidden focus:border-tally-teal-light text-xs uppercase"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-tally-muted">State</label>
                <select
                  ref={(el) => { formRefs.current[3] = el as HTMLSelectElement | null; }}
                  disabled={!isPartySelected}
                  className="bg-tally-bg border border-tally-border text-tally-text p-2 rounded focus:outline-hidden focus:border-tally-teal-light text-xs"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                >
                  {STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-tally-muted">Contact Number</label>
                <input
                  ref={(el) => { formRefs.current[4] = el; }}
                  type="text"
                  placeholder="e.g. 9123456789"
                  disabled={!isPartySelected}
                  className="bg-tally-bg border border-tally-border text-tally-text p-2 rounded focus:outline-hidden focus:border-tally-teal-light text-xs"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-tally-muted">Billing Address</label>
                <textarea
                  ref={(el) => { formRefs.current[5] = el as HTMLTextAreaElement | null; }}
                  rows={2}
                  placeholder="Street details, Building Name, ZIP"
                  disabled={!isPartySelected}
                  className="bg-tally-bg border border-tally-border text-tally-text p-2 rounded focus:outline-hidden focus:border-tally-teal-light text-xs"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 mt-4 border-t border-tally-border pt-4">
            <button
              type="button"
              onClick={() => {
                resetForm();
                if (initialMode === 'list') {
                  setMode('list');
                } else {
                  onClose();
                }
              }}
              className="px-4 py-2 border border-tally-border hover:bg-tally-border text-tally-text rounded transition-all cursor-pointer font-bold uppercase"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-tally-teal hover:bg-tally-teal-light text-white rounded transition-all cursor-pointer font-bold uppercase"
            >
              {mode === 'create' ? 'Create Ledger' : 'Save Alterations'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
