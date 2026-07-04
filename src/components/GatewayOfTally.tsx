'use client';

import React, { useState, useEffect } from 'react';
import { Company } from '@/types/database';
import { Landmark, ArrowRight, UserCircle, Briefcase, Database } from 'lucide-react';

interface GatewayOfTallyProps {
  company: Company;
  currentDate: string;
  onNavigate: (screen: string) => void;
  onResetDb: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  hotkey: string; // The character to trigger
  hotkeyIndex: number; // The character index to underline
  action: () => void;
  category: 'Masters' | 'Transactions' | 'Utilities' | 'Reports' | 'Exit';
}

export default function GatewayOfTally({
  company,
  currentDate,
  onNavigate,
  onResetDb
}: GatewayOfTallyProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const menuItems: MenuItem[] = [
    // Masters
    {
      id: 'create-master',
      label: 'Create Masters',
      hotkey: 'C',
      hotkeyIndex: 0,
      action: () => onNavigate('create-ledger'),
      category: 'Masters'
    },
    {
      id: 'alter-master',
      label: 'Alter Masters',
      hotkey: 'A',
      hotkeyIndex: 0,
      action: () => onNavigate('alter-ledger-list'),
      category: 'Masters'
    },
    // Transactions
    {
      id: 'vouchers',
      label: 'Vouchers (Sales/Purchase)',
      hotkey: 'V',
      hotkeyIndex: 0,
      action: () => onNavigate('voucher-entry'),
      category: 'Transactions'
    },
    // Reports
    {
      id: 'balance-sheet',
      label: 'Balance Sheet',
      hotkey: 'B',
      hotkeyIndex: 0,
      action: () => onNavigate('report-balance-sheet'),
      category: 'Reports'
    },
    {
      id: 'profit-loss',
      label: 'Profit & Loss A/c',
      hotkey: 'L',
      hotkeyIndex: 9, // Underline the 'L' in Loss
      action: () => onNavigate('report-profit-loss'),
      category: 'Reports'
    },
    {
      id: 'trial-balance',
      label: 'Trial Balance',
      hotkey: 'T',
      hotkeyIndex: 0,
      action: () => onNavigate('report-trial-balance'),
      category: 'Reports'
    },
    {
      id: 'stock-summary',
      label: 'Stock Summary',
      hotkey: 'S',
      hotkeyIndex: 0,
      action: () => onNavigate('report-stock-summary'),
      category: 'Reports'
    },
    {
      id: 'outstanding-statements',
      label: 'Outstanding Statements',
      hotkey: 'O',
      hotkeyIndex: 0,
      action: () => onNavigate('report-outstanding-statements'),
      category: 'Reports'
    },
    {
      id: 'gst-tax-report',
      label: 'GST Tax Summary',
      hotkey: 'G',
      hotkeyIndex: 0,
      action: () => onNavigate('report-gst-summary'),
      category: 'Reports'
    },
    // Utilities
    {
      id: 'reset-db',
      label: 'Reset System Database',
      hotkey: 'R',
      hotkeyIndex: 0,
      action: () => {
        if (confirm('Are you sure you want to reset all databases to factory defaults? All manual entries will be lost.')) {
          onResetDb();
        }
      },
      category: 'Utilities'
    },
    // Exit
    {
      id: 'quit-company',
      label: 'Quit / Select Company',
      hotkey: 'Q',
      hotkeyIndex: 0,
      action: () => onNavigate('company-selection'),
      category: 'Exit'
    }
  ];

  // Hotkey & Arrow Key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid firing hotkeys if focusing inside inputs (though there shouldn't be any here)
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        return;
      }

      const key = e.key.toUpperCase();

      // Check highlighted hotkey
      const match = menuItems.find((item) => item.hotkey === key);
      if (match) {
        e.preventDefault();
        match.action();
        return;
      }

      // Check arrows and Enter
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % menuItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + menuItems.length) % menuItems.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        menuItems[selectedIndex].action();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        // ESC acts as Back/Quit Company
        onNavigate('company-selection');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, menuItems, onNavigate]);

  const renderLabel = (label: string, hotkeyIndex: number) => {
    if (hotkeyIndex < 0 || hotkeyIndex >= label.length) return label;
    return (
      <>
        {label.substring(0, hotkeyIndex)}
        <span className="text-tally-amber font-extrabold underline decoration-tally-amber decoration-2">
          {label.charAt(hotkeyIndex)}
        </span>
        {label.substring(hotkeyIndex + 1)}
      </>
    );
  };

  // Group menu by category
  const categories: MenuItem['category'][] = ['Masters', 'Transactions', 'Reports', 'Utilities', 'Exit'];

  return (
    <div className="w-full max-w-5xl bg-tally-panel border border-tally-border rounded-lg shadow-2xl overflow-hidden flex flex-col md:flex-row animate-slide-up">
      
      {/* Left Column: Active Company Info */}
      <div className="w-full md:w-5/12 bg-tally-bg/40 p-6 border-b md:border-b-0 md:border-r border-tally-border flex flex-col gap-6 select-none font-mono">
        <div>
          <span className="text-[10px] text-tally-muted uppercase tracking-wider block mb-1">
            Current Active Company
          </span>
          <h2 className="text-xl font-black text-tally-teal-light tracking-wide flex items-center gap-2">
            <Landmark size={20} />
            {company.name}
          </h2>
          <span className="text-[11px] text-tally-text/80 block mt-1.5 opacity-90">
            GSTIN: <span className="text-white font-semibold">{company.gstin}</span>
          </span>
          <span className="text-[11px] text-tally-text/80 block mt-0.5 opacity-90">
            State: <span className="text-white font-semibold">{company.state}</span>
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-tally-border/30 pt-4">
          <div>
            <span className="text-[9px] text-tally-muted uppercase tracking-wider block">
              Financial Year
            </span>
            <span className="text-xs text-tally-text font-bold">
              {company.financialYearStart.split('-')[0]}-
              {parseInt(company.financialYearStart.split('-')[0]) + 1}
            </span>
          </div>
          <div>
            <span className="text-[9px] text-tally-muted uppercase tracking-wider block">
              System Active Date
            </span>
            <span className="text-xs text-tally-amber font-bold">{currentDate}</span>
          </div>
        </div>

        <div className="border-t border-tally-border/30 pt-4 flex flex-col gap-1 text-[11px] text-tally-muted">
          <span className="text-[9px] uppercase tracking-wider mb-1 block">Helpful Direct Keys:</span>
          <span className="flex justify-between">
            <span>F1: Change Company</span>
            <span className="text-tally-amber font-semibold">Press F1</span>
          </span>
          <span className="flex justify-between">
            <span>F2: Alter Date</span>
            <span className="text-tally-amber font-semibold">Press F2</span>
          </span>
          <span className="flex justify-between">
            <span>F4: Calculator</span>
            <span className="text-tally-amber font-semibold">Press F4</span>
          </span>
          <span className="flex justify-between">
            <span>ESC: Previous View</span>
            <span className="text-tally-amber font-semibold">Press ESC</span>
          </span>
        </div>
      </div>

      {/* Right Column: Menu Options */}
      <div className="w-full md:w-7/12 p-6 flex flex-col justify-between font-mono">
        <div>
          <h3 className="text-sm font-black border-b border-tally-border pb-2 tracking-widest text-center text-tally-text uppercase select-none">
            Gateway of SmartERP
          </h3>
          
          <div className="mt-4 flex flex-col">
            {categories.map((cat) => {
              const catItems = menuItems.filter((item) => item.category === cat);
              return (
                <div key={cat} className="mb-4">
                  <span className="text-[10px] text-tally-muted font-bold tracking-wider select-none uppercase block mb-1">
                    {cat}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    {catItems.map((item) => {
                      const itemGlobalIdx = menuItems.findIndex((mi) => mi.id === item.id);
                      const isSelected = selectedIndex === itemGlobalIdx;
                      return (
                        <div
                          key={item.id}
                          onClick={item.action}
                          onMouseEnter={() => setSelectedIndex(itemGlobalIdx)}
                          className={`flex items-center justify-between px-3 py-1.5 rounded transition-all cursor-pointer select-none text-xs ${
                            isSelected
                              ? 'bg-tally-teal text-white font-bold pl-5'
                              : 'text-tally-text/80 hover:bg-tally-border/20'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            {isSelected && <ArrowRight size={12} className="text-tally-amber animate-pulse" />}
                            {renderLabel(item.label, item.hotkeyIndex)}
                          </span>
                          <span className="text-[10px] text-tally-muted font-semibold">
                            [{item.hotkey}]
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t border-tally-border/30 pt-3 text-[10px] text-tally-muted flex justify-between select-none">
          <span>[Arrow Keys] Navigate menu</span>
          <span>[Enter / Highlight Key] Open</span>
        </div>
      </div>

    </div>
  );
}
