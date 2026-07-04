'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Company } from '@/types/database';
import { Building2, Plus, Edit, Trash2, ArrowLeft, HelpCircle } from 'lucide-react';

interface CompanySelectionProps {
  companies: Company[];
  activeCompanyId: string | null;
  onSelectCompany: (id: string) => void;
  onCreateCompany: (company: Omit<Company, 'id'>) => void;
  onAlterCompany: (company: Company) => void;
  onDeleteCompany: (id: string) => void;
}

export default function CompanySelection({
  companies,
  activeCompanyId,
  onSelectCompany,
  onCreateCompany,
  onAlterCompany,
  onDeleteCompany
}: CompanySelectionProps) {
  const [view, setView] = useState<'list' | 'create' | 'alter'>('list');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedAlterCompanyId, setSelectedAlterCompanyId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [state, setState] = useState('Maharashtra');
  const [financialYearStart, setFinancialYearStart] = useState('2026-04-01');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [formError, setFormError] = useState('');

  // Refs for keyboard navigation inside form
  const inputRefs = useRef<(HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLButtonElement | null)[]>([]);

  const statesOfIndia = [
    'Maharashtra', 'Karnataka', 'Delhi', 'Tamil Nadu', 'Gujarat', 
    'Uttar Pradesh', 'West Bengal', 'Telangana', 'Rajasthan', 'Kerala'
  ];

  // Key navigation for company list
  useEffect(() => {
    if (view !== 'list') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (companies.length + 1)); // +1 for "Create Company" row
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + companies.length + 1) % (companies.length + 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex < companies.length) {
          onSelectCompany(companies[selectedIndex].id);
        } else {
          openCreateForm();
        }
      } else if (e.key === 'Escape' && activeCompanyId) {
        // Allow exiting if we already have an active company
        e.preventDefault();
        onSelectCompany(activeCompanyId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, selectedIndex, companies, activeCompanyId, onSelectCompany]);

  const openCreateForm = () => {
    if (companies.length >= 5) {
      alert('Maximum limit of 5 companies reached. Please delete an existing company first.');
      return;
    }
    setFormError('');
    setName('');
    setAddress('');
    setGstin('');
    setState('Maharashtra');
    setFinancialYearStart('2026-04-01');
    setPhone('');
    setEmail('');
    setView('create');
    setTimeout(() => inputRefs.current[0]?.focus(), 50);
  };

  const openAlterForm = (co: Company) => {
    setFormError('');
    setSelectedAlterCompanyId(co.id);
    setName(co.name);
    setAddress(co.address);
    setGstin(co.gstin);
    setState(co.state);
    setFinancialYearStart(co.financialYearStart);
    setPhone(co.phone);
    setEmail(co.email || '');
    setView('alter');
    setTimeout(() => inputRefs.current[0]?.focus(), 50);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Company Name is required.');
      inputRefs.current[0]?.focus();
      return;
    }
    if (!gstin.trim() || gstin.length !== 15) {
      setFormError('Valid 15-digit GSTIN is required.');
      inputRefs.current[2]?.focus();
      return;
    }

    if (view === 'create') {
      onCreateCompany({
        name,
        address,
        gstin: gstin.toUpperCase(),
        state,
        financialYearStart,
        phone,
        email
      });
    } else if (view === 'alter' && selectedAlterCompanyId) {
      onAlterCompany({
        id: selectedAlterCompanyId,
        name,
        address,
        gstin: gstin.toUpperCase(),
        state,
        financialYearStart,
        phone,
        email
      });
    }
    setView('list');
    setSelectedIndex(0);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-2.5rem)] bg-tally-bg text-tally-text p-6 font-sans">
      {/* Title */}
      <div className="mb-8 text-center animate-fade-in">
        <h1 className="text-3xl font-extrabold tracking-wider bg-linear-to-r from-tally-teal-light via-tally-amber to-tally-teal-light bg-clip-text text-transparent">
          SmartERP Business Suite
        </h1>
        <p className="text-xs text-tally-muted mt-2 font-mono uppercase tracking-widest">
          Tally-Inspired Cloud Accounting
        </p>
      </div>

      {view === 'list' ? (
        <div className="w-full max-w-2xl bg-tally-panel border border-tally-border rounded-lg shadow-2xl overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="bg-tally-header px-6 py-4 border-b border-tally-border flex items-center justify-between">
            <h2 className="text-md font-bold uppercase tracking-wider font-mono flex items-center gap-2 text-tally-text">
              <Building2 className="text-tally-teal-light" size={18} />
              Company Selection Screen
            </h2>
            <span className="text-[10px] bg-tally-teal/30 text-tally-teal-light px-2.5 py-1 rounded-sm border border-tally-teal/50 font-mono">
              Companies: {companies.length} / 5
            </span>
          </div>

          {/* List items */}
          <div className="p-4 flex flex-col gap-1.5 font-mono">
            {companies.map((co, idx) => {
              const isSelected = selectedIndex === idx;
              const isActive = co.id === activeCompanyId;
              return (
                <div
                  key={co.id}
                  onClick={() => onSelectCompany(co.id)}
                  className={`flex items-center justify-between px-4 py-3 rounded border transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'border-tally-teal bg-tally-teal/15 text-white scale-[1.01]'
                      : 'border-tally-border/40 hover:border-tally-border bg-tally-bg/40 text-tally-muted'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-tally-emerald animate-pulse' : 'bg-tally-border'}`} />
                    <div className="flex flex-col">
                      <span className={`font-semibold ${isSelected ? 'text-tally-teal-light' : 'text-tally-text'}`}>
                        {co.name}
                      </span>
                      <span className="text-[10px] text-tally-muted opacity-80">
                        GSTIN: {co.gstin} | State: {co.state} | Period: {co.financialYearStart.split('-')[0]}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => openAlterForm(co)}
                      className="p-1.5 text-tally-muted hover:text-tally-amber hover:bg-tally-bg rounded transition-colors"
                      title="Alter Company Details"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete "${co.name}"? All accounts and transactions will be deleted!`)) {
                          onDeleteCompany(co.id);
                        }
                      }}
                      className="p-1.5 text-tally-muted hover:text-tally-rose hover:bg-tally-bg rounded transition-colors"
                      title="Delete Company"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Create company row */}
            {companies.length < 5 && (
              <div
                onClick={openCreateForm}
                className={`flex items-center gap-3 px-4 py-3.5 rounded border border-dashed transition-all cursor-pointer select-none ${
                  selectedIndex === companies.length
                    ? 'border-tally-amber bg-tally-amber/5 text-tally-amber scale-[1.01]'
                    : 'border-tally-border/40 hover:border-tally-amber/50 text-tally-muted hover:text-tally-text bg-tally-bg/10'
                }`}
              >
                <Plus size={16} />
                <span className="font-semibold uppercase tracking-wider text-xs">
                  Create New Company
                </span>
              </div>
            )}
          </div>

          {/* Quick Info bar */}
          <div className="bg-tally-bg/50 px-6 py-2.5 text-[10px] text-tally-muted flex justify-between border-t border-tally-border/50 font-mono">
            <span>[Arrow Keys] Navigate</span>
            <span>[Enter] Select / Execute</span>
            {activeCompanyId && <span>[ESC] Cancel / Exit</span>}
          </div>
        </div>
      ) : (
        /* Create / Alter Form */
        <div className="w-full max-w-xl bg-tally-panel border border-tally-border rounded-lg shadow-2xl overflow-hidden animate-slide-up">
          <div className="bg-tally-header px-6 py-4 border-b border-tally-border flex items-center justify-between">
            <h2 className="text-md font-bold uppercase tracking-wider font-mono flex items-center gap-2 text-tally-text">
              <Building2 className="text-tally-amber" size={18} />
              {view === 'create' ? 'Create Company Master' : 'Alter Company Master'}
            </h2>
            <button
              onClick={() => setView('list')}
              className="text-tally-muted hover:text-tally-text transition-colors flex items-center gap-1 font-mono text-xs uppercase"
            >
              <ArrowLeft size={14} /> Back
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 font-mono text-xs">
            {formError && (
              <div className="p-3 bg-tally-rose/10 border border-tally-rose text-tally-rose rounded">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-tally-muted">Company Name *</label>
                <input
                  ref={(el) => { inputRefs.current[0] = el; }}
                  type="text"
                  placeholder="e.g. Smart Retailers Ltd"
                  className="bg-tally-bg border border-tally-border text-tally-text p-2 rounded focus:outline-hidden focus:border-tally-teal-light font-sans text-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Escape' && setView('list')}
                />
              </div>

              {/* GST Number */}
              <div className="flex flex-col gap-1.5">
                <label className="text-tally-muted">GSTIN (15-digit) *</label>
                <input
                  ref={(el) => { inputRefs.current[1] = el; }}
                  type="text"
                  placeholder="e.g. 27AAAAA1111A1Z1"
                  maxLength={15}
                  className="bg-tally-bg border border-tally-border text-tally-text p-2 rounded focus:outline-hidden focus:border-tally-teal-light uppercase text-sm"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  onKeyDown={(e) => e.key === 'Escape' && setView('list')}
                />
              </div>

              {/* State */}
              <div className="flex flex-col gap-1.5">
                <label className="text-tally-muted">State *</label>
                <select
                  ref={(el) => { inputRefs.current[2] = el as HTMLSelectElement | null; }}
                  className="bg-tally-bg border border-tally-border text-tally-text p-2 rounded focus:outline-hidden focus:border-tally-teal-light text-sm"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  onKeyDown={(e) => e.key === 'Escape' && setView('list')}
                >
                  {statesOfIndia.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Financial Year Start */}
              <div className="flex flex-col gap-1.5">
                <label className="text-tally-muted">Financial Year From *</label>
                <input
                  ref={(el) => { inputRefs.current[3] = el; }}
                  type="date"
                  className="bg-tally-bg border border-tally-border text-tally-text p-2 rounded focus:outline-hidden focus:border-tally-teal-light text-sm"
                  value={financialYearStart}
                  onChange={(e) => setFinancialYearStart(e.target.value)}
                  onKeyDown={(e) => e.key === 'Escape' && setView('list')}
                />
              </div>

              {/* Phone */}
              <div className="flex flex-col gap-1.5">
                <label className="text-tally-muted">Contact Number</label>
                <input
                  ref={(el) => { inputRefs.current[4] = el; }}
                  type="text"
                  placeholder="e.g. 9876543210"
                  className="bg-tally-bg border border-tally-border text-tally-text p-2 rounded focus:outline-hidden focus:border-tally-teal-light text-sm"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === 'Escape' && setView('list')}
                />
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label className="text-tally-muted">Email Address</label>
                <input
                  ref={(el) => { inputRefs.current[5] = el; }}
                  type="email"
                  placeholder="e.g. audit@smarterp.in"
                  className="bg-tally-bg border border-tally-border text-tally-text p-2 rounded focus:outline-hidden focus:border-tally-teal-light text-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Escape' && setView('list')}
                />
              </div>
            </div>

            {/* Address */}
            <div className="flex flex-col gap-1.5 mt-2">
              <label className="text-tally-muted">Company Address</label>
              <textarea
                ref={(el) => { inputRefs.current[6] = el as HTMLTextAreaElement | null; }}
                rows={2}
                placeholder="Enter complete office/factory address"
                className="bg-tally-bg border border-tally-border text-tally-text p-2 rounded focus:outline-hidden focus:border-tally-teal-light font-sans text-sm"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && setView('list')}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={() => setView('list')}
                className="px-4 py-2 border border-tally-border hover:bg-tally-border text-tally-text rounded transition-all cursor-pointer font-bold uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-tally-teal hover:bg-tally-teal-light text-white rounded transition-all cursor-pointer font-bold uppercase tracking-wider"
              >
                {view === 'create' ? 'Create' : 'Save Alterations'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
