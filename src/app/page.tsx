'use client';

import React, { useState, useEffect } from 'react';
import { Company, Ledger, StockItem, Voucher, DatabaseState } from '@/types/database';
import { getDatabaseState, saveDatabaseState, resetDatabase } from '@/utils/db';
import CompanySelection from '@/components/CompanySelection';
import GatewayOfTally from '@/components/GatewayOfTally';
import LedgerForm from '@/components/LedgerForm';
import StockItemForm from '@/components/StockItemForm';
import VoucherEntry from '@/components/VoucherEntry';
import Reports from '@/components/Reports';
import Calculator from '@/components/Calculator';
import KeyboardGuide, { ShortcutItem } from '@/components/KeyboardGuide';
import useKeyboardShortcuts, { KeyBinding } from '@/hooks/useKeyboardShortcuts';
import { Calendar, User, Info, Building2, RefreshCw } from 'lucide-react';

export default function Home() {
  const [hydrated, setHydrated] = useState(false);
  const [state, setState] = useState<DatabaseState>({
    companies: [],
    ledgers: [],
    stockItems: [],
    vouchers: [],
    activeCompanyId: null,
    currentDate: '2026-06-26'
  });

  // Navigation and overlay controls
  const [activeScreen, setActiveScreen] = useState<string>('company-selection');
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [tempDate, setTempDate] = useState('');

  // Initial client hydration
  useEffect(() => {
    const dbState = getDatabaseState();
    setState(dbState);
    if (dbState.activeCompanyId) {
      setActiveScreen('gateway');
    }
    setHydrated(true);
  }, []);

  // Update date handler
  const handleDateChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempDate) return;
    const newState = { ...state, currentDate: tempDate };
    setState(newState);
    saveDatabaseState(newState);
    setIsDateModalOpen(false);
  };

  // Reset database callback
  const handleResetDb = () => {
    const freshDb = resetDatabase();
    setState(freshDb);
    if (freshDb.activeCompanyId) {
      setActiveScreen('gateway');
    } else {
      setActiveScreen('company-selection');
    }
  };

  // Company management callbacks
  const handleSelectCompany = (id: string) => {
    const newState = { ...state, activeCompanyId: id };
    setState(newState);
    saveDatabaseState(newState);
    setActiveScreen('gateway');
  };

  const handleCreateCompany = (newCo: Omit<Company, 'id'>) => {
    const coId = `co-${Date.now()}`;
    const company: Company = { ...newCo, id: coId };
    
    // Auto-create default Cash & Bank ledgers for new companies
    const cashLedger: Ledger = {
      id: `led-cash-${Date.now()}`,
      companyId: coId,
      name: 'Cash',
      group: 'Cash-in-hand',
      openingBalance: 0,
      currentBalance: 0
    };

    const bankLedger: Ledger = {
      id: `led-bank-${Date.now()}`,
      companyId: coId,
      name: 'Bank A/c',
      group: 'Bank Accounts',
      openingBalance: 0,
      currentBalance: 0
    };

    // Sales and Purchase ledger
    const salesLedger: Ledger = {
      id: `led-sales-${Date.now()}`,
      companyId: coId,
      name: 'Sales Ledger',
      group: 'Sales Accounts',
      openingBalance: 0,
      currentBalance: 0
    };

    const purchaseLedger: Ledger = {
      id: `led-purchase-${Date.now()}`,
      companyId: coId,
      name: 'Purchase Ledger',
      group: 'Purchase Accounts',
      openingBalance: 0,
      currentBalance: 0
    };

    const newState: DatabaseState = {
      ...state,
      companies: [...state.companies, company],
      ledgers: [...state.ledgers, cashLedger, bankLedger, salesLedger, purchaseLedger],
      activeCompanyId: coId
    };

    setState(newState);
    saveDatabaseState(newState);
    setActiveScreen('gateway');
  };

  const handleAlterCompany = (altCo: Company) => {
    const updated = state.companies.map((c) => (c.id === altCo.id ? altCo : c));
    const newState = { ...state, companies: updated };
    setState(newState);
    saveDatabaseState(newState);
  };

  const handleDeleteCompany = (id: string) => {
    const updatedCos = state.companies.filter((c) => c.id !== id);
    const updatedLeds = state.ledgers.filter((l) => l.companyId !== id);
    const updatedItems = state.stockItems.filter((i) => i.companyId !== id);
    const updatedVouchs = state.vouchers.filter((v) => v.companyId !== id);
    const nextActive = state.activeCompanyId === id ? (updatedCos[0]?.id || null) : state.activeCompanyId;
    
    const newState = {
      companies: updatedCos,
      ledgers: updatedLeds,
      stockItems: updatedItems,
      vouchers: updatedVouchs,
      activeCompanyId: nextActive,
      currentDate: state.currentDate
    };

    setState(newState);
    saveDatabaseState(newState);
    if (!nextActive) {
      setActiveScreen('company-selection');
    }
  };

  // Ledger management callbacks
  const handleSaveLedger = (ledData: Omit<Ledger, 'id' | 'companyId' | 'currentBalance'> & { id?: string }) => {
    const isEdit = !!ledData.id;
    let updatedLedgers: Ledger[];

    if (isEdit) {
      updatedLedgers = state.ledgers.map((l) => {
        if (l.id === ledData.id) {
          // Calculate difference between new opening balance and old opening balance to adjust current balance
          const diff = ledData.openingBalance - l.openingBalance;
          return {
            ...l,
            ...ledData,
            currentBalance: l.currentBalance + diff
          } as Ledger;
        }
        return l;
      });
    } else {
      const newLedger: Ledger = {
        ...ledData,
        id: `led-${Date.now()}`,
        companyId: state.activeCompanyId!,
        currentBalance: ledData.openingBalance
      };
      updatedLedgers = [...state.ledgers, newLedger];
    }

    const newState = { ...state, ledgers: updatedLedgers };
    setState(newState);
    saveDatabaseState(newState);
  };

  const handleDeleteLedger = (id: string) => {
    const updated = state.ledgers.filter((l) => l.id !== id);
    const newState = { ...state, ledgers: updated };
    setState(newState);
    saveDatabaseState(newState);
  };

  // Inventory management callbacks
  const handleSaveStockItem = (itemData: Omit<StockItem, 'id' | 'companyId'> & { id?: string }) => {
    const isEdit = !!itemData.id;
    let updatedItems: StockItem[];

    if (isEdit) {
      updatedItems = state.stockItems.map((i) => {
        if (i.id === itemData.id) {
          return {
            ...i,
            ...itemData
          } as StockItem;
        }
        return i;
      });
    } else {
      const newItem: StockItem = {
        ...itemData,
        id: `item-${Date.now()}`,
        companyId: state.activeCompanyId!
      };
      updatedItems = [...state.stockItems, newItem];
    }

    const newState = { ...state, stockItems: updatedItems };
    setState(newState);
    saveDatabaseState(newState);
  };

  const handleDeleteStockItem = (id: string) => {
    const updated = state.stockItems.filter((i) => i.id !== id);
    const newState = { ...state, stockItems: updated };
    setState(newState);
    saveDatabaseState(newState);
  };

  // Transaction Voucher entry engine (Accounting double-entry + Stock level controls)
  const handleSaveVoucher = (vouchData: Omit<Voucher, 'id' | 'companyId'>) => {
    const newVoucher: Voucher = {
      ...vouchData,
      id: `vouch-${Date.now()}`,
      companyId: state.activeCompanyId!
    };

    // Calculate double entry accounting balances
    const updatedLedgers = state.ledgers.map((l) => {
      // 1. Update Party account (Debtor or Creditor)
      if (l.id === vouchData.partyLedgerId) {
        if (vouchData.type === 'Sales') {
          // Sales: Customer balance increases (debit increases)
          return { ...l, currentBalance: l.currentBalance + vouchData.totalAmount };
        } else {
          // Purchase: Supplier balance decreases (credit increases / debit decreases)
          return { ...l, currentBalance: l.currentBalance - vouchData.totalAmount };
        }
      }

      // 2. Update Sales Account ledger
      if (vouchData.type === 'Sales' && l.group === 'Sales Accounts') {
        return { ...l, currentBalance: l.currentBalance - vouchData.subtotal };
      }

      // 3. Update Purchase Account ledger
      if (vouchData.type === 'Purchase' && l.group === 'Purchase Accounts') {
        return { ...l, currentBalance: l.currentBalance + vouchData.subtotal };
      }

      return l;
    });

    // Calculate stock adjustments
    const updatedStockItems = state.stockItems.map((item) => {
      const lineItem = vouchData.items.find((line) => line.stockItemId === item.id);
      if (!lineItem) return item;

      if (vouchData.type === 'Sales') {
        return { ...item, quantity: item.quantity - lineItem.qty };
      } else {
        return { ...item, quantity: item.quantity + lineItem.qty };
      }
    });

    const newState = {
      ...state,
      vouchers: [...state.vouchers, newVoucher],
      ledgers: updatedLedgers,
      stockItems: updatedStockItems
    };

    setState(newState);
    saveDatabaseState(newState);
  };

  // Global Keyboard Shortcuts registrations
  const bindings: KeyBinding[] = [
    {
      key: 'f1',
      action: () => setActiveScreen('company-selection'),
      description: 'Select Company',
      category: 'Global'
    },
    {
      key: 'f2',
      action: () => {
        setTempDate(state.currentDate);
        setIsDateModalOpen(true);
      },
      description: 'Alter Period Date',
      category: 'Global'
    },
    {
      key: 'f4',
      action: () => setIsCalcOpen((prev) => !prev),
      description: 'Open Calculator',
      category: 'Global'
    },
    {
      key: 'alt+l',
      action: () => {
        if (state.activeCompanyId) setActiveScreen('create-ledger');
      },
      description: 'Create Ledger Account',
      category: 'Masters'
    },
    {
      key: 'alt+s',
      action: () => {
        if (state.activeCompanyId) setActiveScreen('create-stock-item');
      },
      description: 'Create Stock Product',
      category: 'Masters'
    },
    {
      key: 'f8',
      action: () => {
        if (state.activeCompanyId) setActiveScreen('voucher-entry');
      },
      description: 'Sales Invoice Entry',
      category: 'Vouchers'
    },
    {
      key: 'f9',
      action: () => {
        if (state.activeCompanyId) setActiveScreen('voucher-entry');
      },
      description: 'Purchase Inward Entry',
      category: 'Vouchers'
    },
    {
      key: 'alt+b',
      action: () => {
        if (state.activeCompanyId) setActiveScreen('report-balance-sheet');
      },
      description: 'Show Balance Sheet',
      category: 'Reports'
    },
    {
      key: 'alt+p',
      action: () => {
        if (state.activeCompanyId) setActiveScreen('report-profit-loss');
      },
      description: 'Show Profit & Loss',
      category: 'Reports'
    },
    {
      key: 'alt+t',
      action: () => {
        if (state.activeCompanyId) setActiveScreen('report-trial-balance');
      },
      description: 'Show Trial Balance',
      category: 'Reports'
    },
    {
      key: 'alt+r',
      action: () => {
        if (state.activeCompanyId) setActiveScreen('report-stock-summary');
      },
      description: 'Show Stock Summary',
      category: 'Reports'
    },
    {
      key: 'alt+x',
      action: () => {
        if (state.activeCompanyId) setActiveScreen('report-gst-summary');
      },
      description: 'GST Tax Summary',
      category: 'Reports'
    }
  ];

  useKeyboardShortcuts(bindings, hydrated);

  if (!hydrated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-tally-bg text-tally-teal-light font-mono text-xs">
        <RefreshCw className="animate-spin mb-3 text-tally-amber" size={24} />
        BOOTSTRAPPING SMARTERP ENGINE...
      </div>
    );
  }

  const activeCompany = state.companies.find((c) => c.id === state.activeCompanyId);

  // Dynamic Keyboard Guide Footer content based on view
  const getShortcutsForScreen = (): ShortcutItem[] => {
    const isCompanyActive = !!state.activeCompanyId;
    return [
      { key: 'F1', label: 'Select Company', isAvailable: true },
      { key: 'F2', label: 'Change Date', isAvailable: isCompanyActive },
      { key: 'F4', label: 'Calculator', isAvailable: true },
      { key: 'ALT+L', label: 'New Ledger', isAvailable: isCompanyActive },
      { key: 'ALT+S', label: 'New Product', isAvailable: isCompanyActive },
      { key: 'F8', label: 'Sales Voucher', isAvailable: isCompanyActive },
      { key: 'F9', label: 'Purchase Voucher', isAvailable: isCompanyActive },
      { key: 'ALT+B', label: 'Bal Sheet', isAvailable: isCompanyActive },
      { key: 'ALT+P', label: 'P&L A/c', isAvailable: isCompanyActive }
    ];
  };

  const handleShortcutClick = (key: string) => {
    const match = bindings.find((b) => b.key.toUpperCase() === key);
    if (match) match.action(new KeyboardEvent('keydown'));
  };

  return (
    <main className="min-h-screen bg-tally-bg text-tally-text flex flex-col justify-between pb-10">
      
      {/* Top Navigation Ribbon Bar */}
      <header className="bg-tally-header border-b border-tally-border h-12 px-6 flex items-center justify-between select-none">
        <div className="flex items-center gap-4">
          <span className="font-extrabold text-sm tracking-wider text-tally-teal-light flex items-center gap-1.5 font-mono">
            <Building2 size={16} className="text-tally-amber" />
            SmartERP <span className="text-[10px] text-tally-muted font-normal bg-tally-panel px-1.5 py-0.5 border border-tally-border rounded">V1.0.0</span>
          </span>
        </div>

        {activeCompany && (
          <div className="flex items-center gap-6 font-mono text-[11px] text-tally-muted">
            <span className="flex items-center gap-1">
              <Calendar size={13} className="text-tally-amber" />
              Active Date: <strong className="text-tally-text font-semibold">{state.currentDate}</strong>
            </span>
            <span className="flex items-center gap-1 pl-4 border-l border-tally-border/40">
              <User size={13} className="text-tally-teal-light" />
              Company: <strong className="text-tally-text font-semibold">{activeCompany.name}</strong>
            </span>
          </div>
        )}
      </header>

      {/* Screen coordinate viewport */}
      <div className="flex-1 flex items-center justify-center p-6 pb-12 w-full max-w-7xl mx-auto">
        
        {activeScreen === 'company-selection' && (
          <CompanySelection
            companies={state.companies}
            activeCompanyId={state.activeCompanyId}
            onSelectCompany={handleSelectCompany}
            onCreateCompany={handleCreateCompany}
            onAlterCompany={handleAlterCompany}
            onDeleteCompany={handleDeleteCompany}
          />
        )}

        {activeScreen === 'gateway' && activeCompany && (
          <GatewayOfTally
            company={activeCompany}
            currentDate={state.currentDate}
            onNavigate={(screen) => setActiveScreen(screen)}
            onResetDb={handleResetDb}
          />
        )}

        {activeScreen === 'create-ledger' && activeCompany && (
          <LedgerForm
            companyId={activeCompany.id}
            ledgers={state.ledgers}
            companyState={activeCompany.state}
            onSaveLedger={handleSaveLedger}
            onDeleteLedger={handleDeleteLedger}
            onClose={() => setActiveScreen('gateway')}
            initialMode="create"
          />
        )}

        {activeScreen === 'alter-ledger-list' && activeCompany && (
          <LedgerForm
            companyId={activeCompany.id}
            ledgers={state.ledgers}
            companyState={activeCompany.state}
            onSaveLedger={handleSaveLedger}
            onDeleteLedger={handleDeleteLedger}
            onClose={() => setActiveScreen('gateway')}
            initialMode="list"
          />
        )}

        {activeScreen === 'create-stock-item' && activeCompany && (
          <StockItemForm
            companyId={activeCompany.id}
            stockItems={state.stockItems}
            onSaveStockItem={handleSaveStockItem}
            onDeleteStockItem={handleDeleteStockItem}
            onClose={() => setActiveScreen('gateway')}
            initialMode="create"
          />
        )}

        {(activeScreen === 'alter-ledger-item-list' || activeScreen === 'alter-stock-item-list') && activeCompany && (
          <StockItemForm
            companyId={activeCompany.id}
            stockItems={state.stockItems}
            onSaveStockItem={handleSaveStockItem}
            onDeleteStockItem={handleDeleteStockItem}
            onClose={() => setActiveScreen('gateway')}
            initialMode="list"
          />
        )}

        {activeScreen === 'voucher-entry' && activeCompany && (
          <VoucherEntry
            companyId={activeCompany.id}
            companyState={activeCompany.state}
            ledgers={state.ledgers}
            stockItems={state.stockItems}
            vouchers={state.vouchers}
            currentDate={state.currentDate}
            onSaveVoucher={handleSaveVoucher}
            onClose={() => setActiveScreen('gateway')}
          />
        )}

        {activeScreen.startsWith('report-') && activeCompany && (
          <Reports
            company={activeCompany}
            ledgers={state.ledgers}
            stockItems={state.stockItems}
            vouchers={state.vouchers}
            onClose={() => setActiveScreen('gateway')}
            initialReport={activeScreen.replace('report-', '') as any}
          />
        )}

      </div>

      {/* Floating F2 Date Alteration modal */}
      {isDateModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in font-mono">
          <div className="w-80 bg-tally-panel border border-tally-border p-5 rounded-lg shadow-2xl flex flex-col gap-4 animate-slide-up">
            <div className="text-xs font-bold text-tally-text uppercase border-b border-tally-border pb-1.5 tracking-wider flex items-center gap-1.5">
              <Calendar size={15} className="text-tally-amber" />
              Alter System Date [F2]
            </div>
            <form onSubmit={handleDateChange} className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-tally-muted">Select Date of Entries</label>
                <input
                  type="date"
                  className="bg-tally-bg border border-tally-border text-tally-text p-2 rounded focus:outline-hidden focus:border-tally-teal-light font-bold"
                  value={tempDate}
                  onChange={(e) => setTempDate(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setIsDateModalOpen(false)}
                  className="px-3 py-1.5 border border-tally-border hover:bg-tally-border text-tally-text rounded cursor-pointer font-bold uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-tally-teal hover:bg-tally-teal-light text-white rounded cursor-pointer font-bold uppercase"
                >
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating F4 Calculator panel */}
      <Calculator isOpen={isCalcOpen} onClose={() => setIsCalcOpen(false)} />

      {/* Shortcuts guidance footer */}
      <KeyboardGuide
        shortcuts={getShortcutsForScreen()}
        onShortcutClick={handleShortcutClick}
      />

    </main>
  );
}
