'use client';

import React, { useState, useEffect } from 'react';
import { Ledger, StockItem, Voucher, Company } from '@/types/database';
import { ArrowLeft, Landmark, FileText, CheckCircle, Calculator, Search } from 'lucide-react';

interface ReportsProps {
  company: Company;
  ledgers: Ledger[];
  stockItems: StockItem[];
  vouchers: Voucher[];
  onClose: () => void;
  initialReport?: 'balance-sheet' | 'profit-loss' | 'trial-balance' | 'stock-summary' | 'outstanding' | 'gst';
}

export default function Reports({
  company,
  ledgers,
  stockItems,
  vouchers,
  onClose,
  initialReport = 'balance-sheet'
}: ReportsProps) {
  const [activeTab, setActiveTab] = useState<
    'balance-sheet' | 'profit-loss' | 'trial-balance' | 'stock-summary' | 'outstanding' | 'gst'
  >(initialReport);

  const [selectedLedgerId, setSelectedLedgerId] = useState('');
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [showLedgerDropdown, setShowLedgerDropdown] = useState(false);

  const activeLedgers = ledgers.filter((l) => l.companyId === company.id);
  const activeStockItems = stockItems.filter((i) => i.companyId === company.id);
  const activeVouchers = vouchers.filter((v) => v.companyId === company.id);

  // Hook up ALT hotkeys for reports switching
  useEffect(() => {
    const handleReportKeys = (e: KeyboardEvent) => {
      // Don't intercept if writing inside inputs
      if (document.activeElement?.tagName === 'INPUT') return;

      if (e.altKey) {
        const key = e.key.toLowerCase();
        if (key === 'b') {
          e.preventDefault();
          setActiveTab('balance-sheet');
        } else if (key === 'p') {
          e.preventDefault();
          setActiveTab('profit-loss');
        } else if (key === 't') {
          e.preventDefault();
          setActiveTab('trial-balance');
        } else if (key === 'r' || key === 's') {
          e.preventDefault();
          setActiveTab('stock-summary');
        } else if (key === 'x') {
          e.preventDefault();
          setActiveTab('gst');
        } else if (key === 'o') {
          e.preventDefault();
          setActiveTab('outstanding');
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleReportKeys);
    return () => window.removeEventListener('keydown', handleReportKeys);
  }, [onClose]);

  // Report Computations
  
  // 1. Stock Valuation (Qty * Purchase price)
  const totalStockValuation = activeStockItems.reduce((acc, item) => {
    return acc + item.quantity * item.purchasePrice;
  }, 0);

  // Helper: Get ledger aggregated balances
  const getLedgersByGroup = (group: string) => {
    return activeLedgers.filter((l) => l.group === group);
  };

  const getGroupSum = (group: string) => {
    return getLedgersByGroup(group).reduce((acc, l) => acc + l.currentBalance, 0);
  };

  // Math for Balance Sheet
  // Liabilities
  const creditorsBal = Math.abs(getGroupSum('Sundry Creditors'));
  // Let's assume Capital Accounts is a mock representation
  const liabilitiesTotal = creditorsBal;

  // Assets
  const debtorsBal = Math.abs(getGroupSum('Sundry Debtors'));
  const bankBal = getGroupSum('Bank Accounts');
  const cashBal = getGroupSum('Cash-in-hand');
  const assetsTotal = debtorsBal + bankBal + cashBal + totalStockValuation;

  // Balancing difference represents Capital/Reserves/Profit
  const profitOrLossDifference = assetsTotal - liabilitiesTotal;

  // Math for Profit & Loss
  const totalSales = Math.abs(getGroupSum('Sales Accounts'));
  const totalPurchases = getGroupSum('Purchase Accounts');
  const totalExpenses = getGroupSum('Indirect Expenses');
  const totalIncome = Math.abs(getGroupSum('Indirect Incomes'));

  // Gross Profit = Sales + Closing Stock - Purchases
  // In our simple case, opening stock + purchases - sales = closing stock value
  // Let's calculate: Gross Profit = Sales - Purchases + (Closing Stock - Opening Stock Valuation)
  // Let's calculate opening stock valuation
  const totalOpeningStockValuation = activeStockItems.reduce((acc, item) => {
    return acc + item.openingStock * item.purchasePrice;
  }, 0);

  const grossProfit = totalSales - totalPurchases + (totalStockValuation - totalOpeningStockValuation);
  const netProfit = grossProfit - totalExpenses + totalIncome;

  // Math for Trial Balance
  const trialBalanceRows = activeLedgers.map((l) => {
    const bal = l.currentBalance;
    return {
      name: l.name,
      group: l.group,
      debit: bal >= 0 ? bal : 0,
      credit: bal < 0 ? Math.abs(bal) : 0
    };
  });

  // Also include stock summary as a debit item on trial balance (closing stock is asset)
  const totalDrSum = trialBalanceRows.reduce((acc, r) => acc + r.debit, 0) + totalStockValuation;
  // Wait, let's look at P&L differences to see if they balance. Standard Tally trial balance represents ledger accounts
  // before closing entries. Closing stock is not in ledgers. But the ledger accounts must balance:
  const totalCrSum = trialBalanceRows.reduce((acc, r) => acc + r.credit, 0);

  // Math for GST Report
  let outwardGstAmount = 0;
  let outwardTaxableValue = 0;
  let inwardGstAmount = 0;
  let inwardTaxableValue = 0;

  activeVouchers.forEach((v) => {
    if (v.type === 'Sales') {
      outwardTaxableValue += v.subtotal;
      outwardGstAmount += v.cgst + v.sgst + v.igst;
    } else {
      inwardTaxableValue += v.subtotal;
      inwardGstAmount += v.cgst + v.sgst + v.igst;
    }
  });

  // Math for Ledger statement
  const partyLedgersForStatement = activeLedgers.filter(
    (l) => l.group === 'Sundry Debtors' || l.group === 'Sundry Creditors'
  );

  const selectedLedger = activeLedgers.find((l) => l.id === selectedLedgerId);
  const ledgerTransactions = activeVouchers
    .filter((v) => v.partyLedgerId === selectedLedgerId)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Running balance generator
  const getRunningStatement = () => {
    if (!selectedLedger) return [];
    
    let bal = selectedLedger.openingBalance;
    const list = [
      {
        date: company.financialYearStart,
        particulars: 'Opening Balance',
        type: 'Opening',
        ref: '',
        debit: bal >= 0 ? bal : 0,
        credit: bal < 0 ? Math.abs(bal) : 0,
        runningBal: bal
      }
    ];

    ledgerTransactions.forEach((v) => {
      // Sales Voucher increases debit for Debtors, increases credit for Creditors
      // Purchases increases credit for Creditors, increases debit for Debtors (unusual, but standard accounts)
      const amt = v.totalAmount;
      let debit = 0;
      let credit = 0;

      if (v.type === 'Sales') {
        debit = amt;
        bal += amt;
      } else {
        credit = amt;
        bal -= amt;
      }

      list.push({
        date: v.date,
        particulars: v.type === 'Sales' ? 'Sales Billing' : 'Purchase Inward',
        type: v.type,
        ref: v.voucherNumber,
        debit,
        credit,
        runningBal: bal
      });
    });

    return list;
  };

  const statementRows = getRunningStatement();

  return (
    <div className="w-full max-w-5xl bg-tally-panel border border-tally-border rounded-lg shadow-2xl overflow-hidden font-mono animate-slide-up flex flex-col min-h-[500px]">
      
      {/* Title block */}
      <div className="bg-tally-header px-6 py-4 border-b border-tally-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="text-tally-teal-light" size={18} />
          <h2 className="text-sm font-bold uppercase tracking-wider text-tally-text">
            Financial & Tax Reports Registry
          </h2>
        </div>
        <button
          onClick={onClose}
          className="text-tally-muted hover:text-tally-text transition-colors flex items-center gap-1 text-xs uppercase"
        >
          <ArrowLeft size={14} /> Close [ESC]
        </button>
      </div>

      {/* Report Tabs */}
      <div className="flex bg-tally-bg/40 border-b border-tally-border select-none text-[11px] overflow-x-auto">
        {[
          { id: 'balance-sheet', label: 'Balance Sheet', key: 'B' },
          { id: 'profit-loss', label: 'Profit & Loss', key: 'P' },
          { id: 'trial-balance', label: 'Trial Balance', key: 'T' },
          { id: 'stock-summary', label: 'Stock Summary', key: 'S' },
          { id: 'outstanding', label: 'Ledger Statement', key: 'O' },
          { id: 'gst', label: 'GST Summary', key: 'X' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 font-bold border-r border-tally-border cursor-pointer transition-all ${
              activeTab === tab.id
                ? 'bg-tally-teal text-white border-b-2 border-b-tally-amber'
                : 'text-tally-muted hover:text-tally-text hover:bg-tally-bg/30'
            }`}
          >
            {tab.label}{' '}
            <span className="text-[9px] text-tally-amber font-normal font-sans ml-1">
              [ALT+{tab.key}]
            </span>
          </button>
        ))}
      </div>

      {/* Report Content */}
      <div className="p-6 flex-1 overflow-y-auto max-h-[500px]">
        {activeTab === 'balance-sheet' && (
          <div className="animate-fade-in flex flex-col gap-4">
            <h3 className="text-center font-bold text-sm text-tally-text border-b border-tally-border pb-1 uppercase select-none">
              Balance Sheet as of Date
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 border border-tally-border rounded overflow-hidden">
              {/* Liabilities Column */}
              <div className="border-r border-tally-border">
                <div className="bg-tally-header px-4 py-2 border-b border-tally-border font-bold text-[11px] text-tally-muted uppercase">
                  Liabilities
                </div>
                <div className="p-4 flex flex-col gap-3 text-xs">
                  <div className="flex justify-between font-semibold">
                    <span>Current Liabilities</span>
                    <span>₹{creditorsBal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="pl-4 flex justify-between text-tally-muted text-[11px]">
                    <span>Sundry Creditors (Suppliers)</span>
                    <span>₹{creditorsBal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>

                  {/* Profit difference representation */}
                  {profitOrLossDifference > 0 && (
                    <div className="flex justify-between font-semibold text-tally-emerald mt-4 border-t border-tally-border/20 pt-2">
                      <span>Profit & Loss A/c (Net Profit)</span>
                      <span>₹{profitOrLossDifference.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Assets Column */}
              <div>
                <div className="bg-tally-header px-4 py-2 border-b border-tally-border font-bold text-[11px] text-tally-muted uppercase">
                  Assets
                </div>
                <div className="p-4 flex flex-col gap-3 text-xs">
                  <div className="flex justify-between font-semibold">
                    <span>Current Assets</span>
                    <span>₹{assetsTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="pl-4 flex justify-between text-tally-muted text-[11px]">
                    <span>Sundry Debtors (Customers)</span>
                    <span>₹{debtorsBal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="pl-4 justify-between flex text-tally-muted text-[11px]">
                    <span>Closing Stock Valuation</span>
                    <span>₹{totalStockValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="pl-4 justify-between flex text-tally-muted text-[11px]">
                    <span>Bank Accounts Balance</span>
                    <span>₹{bankBal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="pl-4 justify-between flex text-tally-muted text-[11px]">
                    <span>Cash in Hand</span>
                    <span>₹{cashBal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>

                  {/* Loss difference representation */}
                  {profitOrLossDifference < 0 && (
                    <div className="flex justify-between font-semibold text-tally-rose mt-4 border-t border-tally-border/20 pt-2">
                      <span>Profit & Loss A/c (Net Loss)</span>
                      <span>₹{Math.abs(profitOrLossDifference).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Total Balance block */}
            <div className="flex border border-tally-border bg-tally-header/60 rounded overflow-hidden select-none font-bold">
              <div className="w-1/2 p-3 flex justify-between border-r border-tally-border text-tally-text">
                <span>TOTAL LIABILITIES & EQUITY</span>
                <span className="text-tally-amber">
                  ₹{(profitOrLossDifference > 0 ? liabilitiesTotal + profitOrLossDifference : liabilitiesTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="w-1/2 p-3 flex justify-between text-tally-text">
                <span>TOTAL ASSETS</span>
                <span className="text-tally-amber">
                  ₹{(profitOrLossDifference < 0 ? assetsTotal + Math.abs(profitOrLossDifference) : assetsTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'profit-loss' && (
          <div className="animate-fade-in flex flex-col gap-4">
            <h3 className="text-center font-bold text-sm text-tally-text border-b border-tally-border pb-1 uppercase select-none">
              Profit & Loss Account Statement
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 border border-tally-border rounded overflow-hidden text-xs">
              {/* Debit/Expenses column */}
              <div className="border-r border-tally-border">
                <div className="bg-tally-header px-4 py-2 border-b border-tally-border font-bold text-[11px] text-tally-muted uppercase">
                  Debit particulars
                </div>
                <div className="p-4 flex flex-col gap-3">
                  <div className="flex justify-between">
                    <span>Opening Stock Value</span>
                    <span>₹{totalOpeningStockValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between border-b border-tally-border/20 pb-2">
                    <span>Purchase Accounts</span>
                    <span>₹{totalPurchases.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>

                  <div className="flex justify-between font-semibold mt-2">
                    <span>Indirect Expenses</span>
                    <span>₹{totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  {getLedgersByGroup('Indirect Expenses').map((l) => (
                    <div key={l.id} className="pl-4 flex justify-between text-tally-muted text-[11px]">
                      <span>{l.name}</span>
                      <span>₹{l.currentBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}

                  {/* Net Profit indicator */}
                  {netProfit > 0 && (
                    <div className="flex justify-between font-bold text-tally-emerald border-t border-tally-border/30 pt-3 mt-4">
                      <span>Net Profit</span>
                      <span>₹{netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Credit/Sales column */}
              <div>
                <div className="bg-tally-header px-4 py-2 border-b border-tally-border font-bold text-[11px] text-tally-muted uppercase">
                  Credit particulars
                </div>
                <div className="p-4 flex flex-col gap-3">
                  <div className="flex justify-between">
                    <span>Sales Accounts</span>
                    <span>₹{totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between border-b border-tally-border/20 pb-2 text-tally-teal-light font-semibold">
                    <span>Closing Stock Value</span>
                    <span>₹{totalStockValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>

                  <div className="flex justify-between font-semibold mt-2">
                    <span>Indirect Incomes</span>
                    <span>₹{totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  {getLedgersByGroup('Indirect Incomes').map((l) => (
                    <div key={l.id} className="pl-4 flex justify-between text-tally-muted text-[11px]">
                      <span>{l.name}</span>
                      <span>₹{Math.abs(l.currentBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}

                  {/* Net Loss indicator */}
                  {netProfit < 0 && (
                    <div className="flex justify-between font-bold text-tally-rose border-t border-tally-border/30 pt-3 mt-4">
                      <span>Net Loss</span>
                      <span>₹{Math.abs(netProfit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Total Balance Block */}
            <div className="flex border border-tally-border bg-tally-header/60 rounded overflow-hidden select-none font-bold">
              <div className="w-1/2 p-3 flex justify-between border-r border-tally-border text-tally-text">
                <span>TOTAL DEBIT particulars</span>
                <span className="text-tally-amber">
                  ₹{Math.max(totalOpeningStockValuation + totalPurchases + totalExpenses + (netProfit > 0 ? netProfit : 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="w-1/2 p-3 flex justify-between text-tally-text">
                <span>TOTAL CREDIT particulars</span>
                <span className="text-tally-amber">
                  ₹{Math.max(totalSales + totalStockValuation + totalIncome + (netProfit < 0 ? Math.abs(netProfit) : 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'trial-balance' && (
          <div className="animate-fade-in flex flex-col gap-3">
            <h3 className="text-center font-bold text-sm text-tally-text border-b border-tally-border pb-1 uppercase select-none">
              Trial Balance Sheet
            </h3>

            <div className="border border-tally-border rounded overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-tally-header font-bold text-[10px] uppercase text-tally-muted border-b border-tally-border">
                  <tr>
                    <th className="p-3">Account Ledger Name</th>
                    <th className="p-3">Accounting Group</th>
                    <th className="p-3 text-right">Debit Balance (₹)</th>
                    <th className="p-3 text-right">Credit Balance (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-tally-border/20">
                  {trialBalanceRows.map((r, idx) => (
                    <tr key={idx} className="hover:bg-tally-bg/40">
                      <td className="p-3 font-semibold text-tally-text">{r.name}</td>
                      <td className="p-3 text-tally-teal-light">{r.group}</td>
                      <td className="p-3 text-right font-mono">{r.debit > 0 ? r.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>
                      <td className="p-3 text-right font-mono">{r.credit > 0 ? r.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>
                    </tr>
                  ))}
                  {/* Stock Summary as Asset debit line */}
                  <tr className="bg-tally-bg/30 font-semibold">
                    <td className="p-3 text-tally-teal-light">Closing Inventory (Valued Asset)</td>
                    <td className="p-3 text-tally-muted">Stock-in-hand</td>
                    <td className="p-3 text-right font-mono text-tally-emerald">{totalStockValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right font-mono">-</td>
                  </tr>
                </tbody>
                <tfoot className="bg-tally-header/60 font-bold border-t border-tally-border text-sm text-tally-text">
                  <tr>
                    <td colSpan={2} className="p-3">GRAND AUDIT TOTAL</td>
                    <td className="p-3 text-right font-mono text-tally-amber">₹{totalDrSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right font-mono text-tally-amber">₹{totalCrSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {Math.abs(totalDrSum - totalCrSum) > 0.05 && (
              <div className="p-2 bg-tally-rose/10 border border-tally-rose text-tally-rose rounded text-[10px] text-center font-bold">
                ⚠️ WARNING: Trial Balance is out of equilibrium by ₹{Math.abs(totalDrSum - totalCrSum).toFixed(2)}. Verify journal entries.
              </div>
            )}
          </div>
        )}

        {activeTab === 'stock-summary' && (
          <div className="animate-fade-in flex flex-col gap-4">
            <h3 className="text-center font-bold text-sm text-tally-text border-b border-tally-border pb-1 uppercase select-none">
              Stock Valuation Summary Report
            </h3>

            <div className="border border-tally-border rounded overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-tally-header font-bold text-[10px] uppercase text-tally-muted border-b border-tally-border">
                  <tr>
                    <th className="p-3">Item Name</th>
                    <th className="p-3">SKU Code</th>
                    <th className="p-3">HSN Code</th>
                    <th className="p-3 text-center">Unit</th>
                    <th className="p-3 text-right">Available Qty</th>
                    <th className="p-3 text-right">Purchase Rate (₹)</th>
                    <th className="p-3 text-right">Valuation (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-tally-border/20">
                  {activeStockItems.map((item) => (
                    <tr key={item.id} className="hover:bg-tally-bg/40">
                      <td className="p-3 font-semibold text-tally-text">{item.name}</td>
                      <td className="p-3 text-tally-teal-light font-mono">{item.sku}</td>
                      <td className="p-3 text-tally-muted font-mono">{item.hsn}</td>
                      <td className="p-3 text-center">{item.unit}</td>
                      <td className={`p-3 text-right font-mono font-bold ${item.quantity <= 5 ? 'text-tally-rose' : 'text-tally-emerald'}`}>
                        {item.quantity}
                      </td>
                      <td className="p-3 text-right font-mono">₹{item.purchasePrice.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right font-mono font-bold text-tally-text">
                        ₹{(item.quantity * item.purchasePrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-tally-header/60 font-bold border-t border-tally-border text-sm text-tally-text">
                  <tr>
                    <td colSpan={5} className="p-3">TOTAL INVENTORY STOCK VALUE</td>
                    <td colSpan={2} className="p-3 text-right font-mono text-tally-amber">
                      ₹{totalStockValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'outstanding' && (
          <div className="animate-fade-in flex flex-col gap-4">
            <h3 className="text-center font-bold text-sm text-tally-text border-b border-tally-border pb-1 uppercase select-none">
              Account Ledger running statement
            </h3>

            {/* Ledger Select Box */}
            <div className="relative w-full max-w-sm" onMouseLeave={() => setShowLedgerDropdown(false)}>
              <label className="text-tally-muted text-[10px] uppercase font-bold block mb-1">Select Customer/Supplier Ledger</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search ledger name..."
                  className="w-full bg-tally-bg border border-tally-border text-tally-text p-2 rounded focus:outline-hidden focus:border-tally-teal-light text-xs font-semibold"
                  value={ledgerSearch}
                  onChange={(e) => {
                    setLedgerSearch(e.target.value);
                    setShowLedgerDropdown(true);
                  }}
                  onFocus={() => setShowLedgerDropdown(true)}
                />
                <Search size={14} className="absolute right-2.5 top-2.5 text-tally-muted pointer-events-none" />
              </div>

              {showLedgerDropdown && (
                <div className="absolute top-12 left-0 right-0 max-h-40 bg-tally-panel border border-tally-border rounded shadow-xl overflow-y-auto z-40">
                  {partyLedgersForStatement
                    .filter((l) => l.name.toLowerCase().includes(ledgerSearch.toLowerCase()))
                    .map((l) => (
                      <div
                        key={l.id}
                        onClick={() => {
                          setSelectedLedgerId(l.id);
                          setLedgerSearch(l.name);
                          setShowLedgerDropdown(false);
                        }}
                        className="px-3 py-2 hover:bg-tally-teal hover:text-white cursor-pointer flex justify-between border-b border-tally-border/20 text-[11px]"
                      >
                        <span className="font-semibold">{l.name}</span>
                        <span className="text-tally-muted hover:text-white/80">({l.group})</span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {selectedLedger ? (
              <div className="flex flex-col gap-3">
                <div className="p-3 bg-tally-bg/40 border border-tally-border/50 rounded flex justify-between items-center text-xs">
                  <div>
                    <span className="text-[10px] text-tally-muted block">LEGER GROUP:</span>
                    <span className="font-bold text-tally-text">{selectedLedger.group}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-tally-muted block">GSTIN REGISTRY:</span>
                    <span className="font-bold text-tally-text">{selectedLedger.gstin || 'UNREGISTERED'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-tally-muted block text-right font-sans">OUTSTANDING DUES:</span>
                    <span className={`font-bold text-sm font-mono ${selectedLedger.currentBalance >= 0 ? 'text-tally-emerald' : 'text-tally-rose'}`}>
                      ₹{Math.abs(selectedLedger.currentBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      {selectedLedger.currentBalance >= 0 ? ' Dr' : ' Cr'}
                    </span>
                  </div>
                </div>

                <div className="border border-tally-border rounded overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-tally-header font-bold text-[10px] uppercase text-tally-muted border-b border-tally-border">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Particulars</th>
                        <th className="p-3">Voucher No.</th>
                        <th className="p-3 text-right">Debit (Dr)</th>
                        <th className="p-3 text-right">Credit (Cr)</th>
                        <th className="p-3 text-right">Running Balance (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-tally-border/20">
                      {statementRows.map((r, idx) => (
                        <tr key={idx} className="hover:bg-tally-bg/40">
                          <td className="p-3 text-tally-muted">{r.date}</td>
                          <td className="p-3 font-semibold text-tally-text">{r.particulars}</td>
                          <td className="p-3 text-tally-teal-light font-mono">{r.ref || '-'}</td>
                          <td className="p-3 text-right font-mono text-tally-emerald">{r.debit > 0 ? `₹${r.debit.toLocaleString('en-IN')}` : '-'}</td>
                          <td className="p-3 text-right font-mono text-tally-rose">{r.credit > 0 ? `₹${r.credit.toLocaleString('en-IN')}` : '-'}</td>
                          <td className="p-3 text-right font-mono font-bold text-tally-text">
                            ₹{Math.abs(r.runningBal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            <span className={r.runningBal >= 0 ? 'text-tally-emerald' : 'text-tally-rose'}>
                              {r.runningBal >= 0 ? ' Dr' : ' Cr'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-tally-muted border border-dashed border-tally-border rounded italic">
                Please select a Ledger Account above to display the running balance ledger card statement.
              </div>
            )}
          </div>
        )}

        {activeTab === 'gst' && (
          <div className="animate-fade-in flex flex-col gap-4">
            <h3 className="text-center font-bold text-sm text-tally-text border-b border-tally-border pb-1 uppercase select-none">
              GSTR summary Tax Audit Report
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Outward sales tax */}
              <div className="border border-tally-border rounded overflow-hidden text-xs">
                <div className="bg-tally-header px-4 py-2.5 border-b border-tally-border font-bold text-[10px] text-tally-muted uppercase">
                  Outward GSTR-1 Sales Grid
                </div>
                <div className="p-4 flex flex-col gap-3 font-mono">
                  <div className="flex justify-between border-b border-tally-border/20 pb-1.5 text-tally-text">
                    <span>Taxable Invoiced value</span>
                    <span>₹{outwardTaxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-tally-muted text-[11px]">
                    <span>Central GST (CGST)</span>
                    <span>₹{(outwardGstAmount / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-tally-muted text-[11px]">
                    <span>State GST (SGST)</span>
                    <span>₹{(outwardGstAmount / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-tally-muted text-[11px] border-b border-tally-border/10 pb-2">
                    <span>Integrated GST (IGST)</span>
                    <span>₹{outwardGstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-tally-teal-light pt-1.5">
                    <span>GST Collected (Liabilities)</span>
                    <span>₹{outwardGstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Inward purchase tax */}
              <div className="border border-tally-border rounded overflow-hidden text-xs">
                <div className="bg-tally-header px-4 py-2.5 border-b border-tally-border font-bold text-[10px] text-tally-muted uppercase">
                  Inward GSTR-2 ITC Purchase Grid
                </div>
                <div className="p-4 flex flex-col gap-3 font-mono">
                  <div className="flex justify-between border-b border-tally-border/20 pb-1.5 text-tally-text">
                    <span>Taxable Inward value</span>
                    <span>₹{inwardTaxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-tally-muted text-[11px]">
                    <span>Central GST Input</span>
                    <span>₹{(inwardGstAmount / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-tally-muted text-[11px]">
                    <span>State GST Input</span>
                    <span>₹{(inwardGstAmount / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-tally-muted text-[11px] border-b border-tally-border/10 pb-2">
                    <span>Integrated GST Input</span>
                    <span>₹{inwardGstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-tally-teal-light pt-1.5">
                    <span>ITC Tax Claimable (Asset)</span>
                    <span>₹{inwardGstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* GST Summary liability outcome */}
            <div className="bg-tally-bg/40 border border-tally-border p-4 rounded flex items-center justify-between text-xs font-bold">
              <span className="text-tally-text font-semibold uppercase tracking-wider">
                Net GST Treasury balance liability (Payable)
              </span>
              <span className={`text-sm font-mono ${outwardGstAmount - inwardGstAmount >= 0 ? 'text-tally-amber' : 'text-tally-emerald'}`}>
                ₹{(outwardGstAmount - inwardGstAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                {outwardGstAmount - inwardGstAmount >= 0 ? ' PAYABLE' : ' REFUNDABLE/ITC CARRY FORWARD'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Shortcuts Guide bottom line */}
      <div className="bg-tally-bg/50 px-6 py-2.5 text-[9px] text-tally-muted flex justify-between border-t border-tally-border/50">
        <span>ALT+B: Bal Sheet | ALT+P: P&L | ALT+T: Trial Bal | ALT+S: Stock</span>
        <span>ALT+O: Statement | ALT+X: GST Report | ESC: Exit</span>
      </div>

    </div>
  );
}
