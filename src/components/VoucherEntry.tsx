'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Ledger, StockItem, Voucher, VoucherItem } from '@/types/database';
import { Plus, Trash2, ArrowLeft, RefreshCw, AlertTriangle, Printer, Sparkles } from 'lucide-react';

interface VoucherEntryProps {
  companyId: string;
  companyState: string;
  ledgers: Ledger[];
  stockItems: StockItem[];
  vouchers: Voucher[];
  currentDate: string;
  onSaveVoucher: (voucher: Omit<Voucher, 'id' | 'companyId'>) => void;
  onClose: () => void;
}

interface LineItem {
  stockItemId: string;
  qty: number;
  rate: number;
}

export default function VoucherEntry({
  companyId,
  companyState,
  ledgers,
  stockItems,
  vouchers,
  currentDate,
  onSaveVoucher,
  onClose
}: VoucherEntryProps) {
  const [voucherType, setVoucherType] = useState<'Sales' | 'Purchase'>('Sales');
  const [partyLedgerId, setPartyLedgerId] = useState('');
  const [narration, setNarration] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([{ stockItemId: '', qty: 0, rate: 0 }]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [error, setError] = useState('');

  // Autocomplete & search helpers
  const [partySearch, setPartySearch] = useState('');
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const [itemSearchText, setItemSearchText] = useState<string[]>(['']);
  const [showItemDropdown, setShowItemDropdown] = useState<number | null>(null);

  // References
  const formRefs = useRef<(HTMLInputElement | HTMLSelectElement | HTMLButtonElement | null)[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter parties based on voucher type
  // Sales = Sundry Debtors, Cash, Bank
  // Purchase = Sundry Creditors, Cash, Bank
  const availableParties = ledgers.filter((l) => {
    if (l.companyId !== companyId) return false;
    if (voucherType === 'Sales') {
      return l.group === 'Sundry Debtors' || l.group === 'Cash-in-hand' || l.group === 'Bank Accounts';
    } else {
      return l.group === 'Sundry Creditors' || l.group === 'Cash-in-hand' || l.group === 'Bank Accounts';
    }
  });

  const filteredParties = availableParties.filter((p) =>
    p.name.toLowerCase().includes(partySearch.toLowerCase())
  );

  const activeStockItems = stockItems.filter((i) => i.companyId === companyId);

  // Auto-generate invoice/voucher number on type/vouchers length changes
  useEffect(() => {
    const nextNum = vouchers.filter((v) => v.companyId === companyId && v.type === voucherType).length + 1;
    const prefix = voucherType === 'Sales' ? 'SAL' : 'PUR';
    setInvoiceNumber(`${prefix}-${String(nextNum).padStart(3, '0')}`);
  }, [voucherType, vouchers, companyId]);

  // Global keys (F8: Sales, F9: Purchase, ESC: close)
  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (e.key === 'F8') {
        e.preventDefault();
        setVoucherType('Sales');
        resetVoucherFields();
      } else if (e.key === 'F9') {
        e.preventDefault();
        setVoucherType('Purchase');
        resetVoucherFields();
      } else if (e.key === 'Escape') {
        // Only trigger close if no autocomplete lists are visible
        if (!showPartyDropdown && showItemDropdown === null) {
          e.preventDefault();
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [showPartyDropdown, showItemDropdown, onClose]);

  // Click outside listener for dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowPartyDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const resetVoucherFields = () => {
    setPartyLedgerId('');
    setPartySearch('');
    setNarration('');
    setLineItems([{ stockItemId: '', qty: 0, rate: 0 }]);
    setItemSearchText(['']);
    setError('');
  };

  const handleSelectParty = (ledger: Ledger) => {
    setPartyLedgerId(ledger.id);
    setPartySearch(ledger.name);
    setShowPartyDropdown(false);
    setError('');
  };

  const handleSelectItem = (index: number, item: StockItem) => {
    const newItems = [...lineItems];
    newItems[index] = {
      ...newItems[index],
      stockItemId: item.id,
      // Autofill price based on voucher type
      rate: voucherType === 'Sales' ? item.sellingPrice : item.purchasePrice
    };
    setLineItems(newItems);

    const newSearchText = [...itemSearchText];
    newSearchText[index] = item.name;
    setItemSearchText(newSearchText);

    setShowItemDropdown(null);
    setError('');
  };

  const handleLineItemChange = (index: number, field: keyof LineItem, val: string | number) => {
    const newItems = [...lineItems];
    newItems[index] = {
      ...newItems[index],
      [field]: val
    };
    setLineItems(newItems);
    setError('');
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { stockItemId: '', qty: 0, rate: 0 }]);
    setItemSearchText([...itemSearchText, '']);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
    setItemSearchText(itemSearchText.filter((_, i) => i !== index));
  };

  // Perform invoice math computations
  const computeTotals = () => {
    let subtotal = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;
    let igstTotal = 0;

    const party = ledgers.find((l) => l.id === partyLedgerId);
    
    // Determine CGST+SGST vs IGST rules
    // Intrastate = Party state matches Company state OR Party is Cash/Bank
    const isIntrastate = !party || !party.state || party.state === companyState;

    const voucherItems: VoucherItem[] = [];

    lineItems.forEach((line) => {
      if (!line.stockItemId) return;
      const item = stockItems.find((si) => si.id === line.stockItemId);
      if (!item) return;

      const amount = line.qty * line.rate;
      subtotal += amount;

      const taxRate = item.gstPercentage;
      const taxAmount = (amount * taxRate) / 100;

      if (isIntrastate) {
        cgstTotal += taxAmount / 2;
        sgstTotal += taxAmount / 2;
      } else {
        igstTotal += taxAmount;
      }

      voucherItems.push({
        stockItemId: line.stockItemId,
        name: item.name,
        qty: line.qty,
        rate: line.rate,
        amount,
        gstPercentage: taxRate,
        hsn: item.hsn
      });
    });

    const totalAmount = subtotal + cgstTotal + sgstTotal + igstTotal;

    return {
      subtotal,
      cgst: Math.round(cgstTotal * 100) / 100,
      sgst: Math.round(sgstTotal * 100) / 100,
      igst: Math.round(igstTotal * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      voucherItems
    };
  };

  const totals = computeTotals();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyLedgerId) {
      setError('Please select a valid Party Account / Ledger.');
      return;
    }

    if (totals.voucherItems.length === 0) {
      setError('Invoice must contain at least one valid stock item.');
      return;
    }

    // Validation: Check if there's any invalid qty or rate
    const hasZeroQty = lineItems.some(item => item.stockItemId && item.qty <= 0);
    if (hasZeroQty) {
      setError('Quantity must be greater than zero for entered lines.');
      return;
    }

    // Validation: Check stock level warning (insufficient stock for sales)
    if (voucherType === 'Sales') {
      for (const line of lineItems) {
        if (!line.stockItemId) continue;
        const item = stockItems.find((s) => s.id === line.stockItemId);
        if (item && line.qty > item.quantity) {
          setError(`Insufficient inventory for "${item.name}". Current Available: ${item.quantity} ${item.unit}.`);
          return;
        }
      }
    }

    const party = ledgers.find((l) => l.id === partyLedgerId)!;

    onSaveVoucher({
      type: voucherType,
      voucherNumber: invoiceNumber,
      date: currentDate,
      partyLedgerId,
      partyName: party.name,
      items: totals.voucherItems,
      subtotal: totals.subtotal,
      cgst: totals.cgst,
      sgst: totals.sgst,
      igst: totals.igst,
      totalAmount: totals.totalAmount,
      narration: narration.trim()
    });

    resetVoucherFields();
    onClose();
  };

  return (
    <div className="w-full max-w-5xl bg-tally-panel border border-tally-border rounded-lg shadow-2xl overflow-hidden font-mono animate-slide-up">
      {/* Header bar */}
      <div className="bg-tally-header px-6 py-3 border-b border-tally-border flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex gap-1.5">
            <button
              onClick={() => {
                setVoucherType('Sales');
                resetVoucherFields();
              }}
              className={`px-4 py-1 text-xs font-bold rounded cursor-pointer transition-all ${
                voucherType === 'Sales'
                  ? 'bg-tally-teal text-white shadow-md'
                  : 'bg-tally-bg text-tally-muted hover:text-tally-text'
              }`}
            >
              Sales Invoice [F8]
            </button>
            <button
              onClick={() => {
                setVoucherType('Purchase');
                resetVoucherFields();
              }}
              className={`px-4 py-1 text-xs font-bold rounded cursor-pointer transition-all ${
                voucherType === 'Purchase'
                  ? 'bg-tally-teal text-white shadow-md'
                  : 'bg-tally-bg text-tally-muted hover:text-tally-text'
              }`}
            >
              Purchase Entry [F9]
            </button>
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-tally-muted hover:text-tally-text transition-colors flex items-center gap-1 text-xs uppercase"
        >
          <ArrowLeft size={14} /> Escape [ESC]
        </button>
      </div>

      {/* Main Voucher form */}
      <form onSubmit={handleSave} className="p-6 flex flex-col gap-5 text-xs">
        {error && (
          <div className="p-3 bg-tally-rose/10 border border-tally-rose text-tally-rose rounded flex items-center gap-2">
            <AlertTriangle size={14} />
            <span>{error}</span>
          </div>
        )}

        {/* Voucher Info Panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-tally-bg/40 p-4 border border-tally-border rounded">
          <div className="flex flex-col gap-1">
            <label className="text-tally-muted uppercase text-[9px] tracking-wider">Voucher Number</label>
            <span className="text-sm font-bold text-tally-amber">{invoiceNumber}</span>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-tally-muted uppercase text-[9px] tracking-wider">Date of Entry</label>
            <span className="text-sm font-bold text-tally-text">{currentDate}</span>
          </div>

          <div className="flex flex-col gap-1 relative" ref={dropdownRef}>
            <label className="text-tally-muted uppercase text-[9px] tracking-wider">
              {voucherType === 'Sales' ? 'Party A/c Name (Debtor/Cash/Bank) *' : 'Party A/c Name (Creditor/Cash/Bank) *'}
            </label>
            <input
              type="text"
              placeholder="Search or Select Account Ledger..."
              className="bg-tally-bg border border-tally-border text-tally-text p-2 rounded focus:outline-hidden focus:border-tally-teal-light text-xs font-semibold"
              value={partySearch}
              onChange={(e) => {
                setPartySearch(e.target.value);
                setShowPartyDropdown(true);
                if (!e.target.value) setPartyLedgerId('');
              }}
              onFocus={() => setShowPartyDropdown(true)}
            />
            {showPartyDropdown && (
              <div className="absolute top-12 left-0 right-0 max-h-40 bg-tally-panel border border-tally-border rounded shadow-xl overflow-y-auto z-50">
                {filteredParties.length === 0 ? (
                  <div className="p-3 text-tally-muted text-center italic">No matching accounts found</div>
                ) : (
                  filteredParties.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => handleSelectParty(p)}
                      className="px-3 py-2 hover:bg-tally-teal hover:text-white cursor-pointer flex justify-between border-b border-tally-border/20 text-[11px]"
                    >
                      <span className="font-semibold">{p.name}</span>
                      <span className="text-tally-muted hover:text-white/80">({p.group})</span>
                    </div>
                  ))
                )}
              </div>
            )}
            {partyLedgerId && (
              <span className="text-[10px] text-tally-teal-light mt-0.5 block">
                Selected: {ledgers.find(l => l.id === partyLedgerId)?.name} 
                {ledgers.find(l => l.id === partyLedgerId)?.state ? ` | State: ${ledgers.find(l => l.id === partyLedgerId)?.state}` : ''}
              </span>
            )}
          </div>
        </div>

        {/* Columnar Items entry table */}
        <div className="border border-tally-border rounded overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-tally-header border-b border-tally-border text-tally-muted font-bold text-[10px] uppercase">
              <tr>
                <th className="p-3 w-5/12">Name of Stock Item</th>
                <th className="p-3 w-2/12 text-center font-mono">Qty</th>
                <th className="p-3 w-2/12 text-right">Rate (₹)</th>
                <th className="p-3 w-2/12 text-right">Amount (₹)</th>
                <th className="p-3 w-1/12 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tally-border/20 bg-tally-bg/10">
              {lineItems.map((line, index) => {
                const selectedItem = activeStockItems.find((si) => si.id === line.stockItemId);
                return (
                  <tr key={index} className="relative hover:bg-tally-bg/30">
                    
                    {/* Product Name Autocomplete */}
                    <td className="p-2.5 relative">
                      <input
                        type="text"
                        placeholder="Select stock product..."
                        className="w-full bg-tally-bg border border-tally-border text-tally-text p-2 rounded focus:outline-hidden focus:border-tally-teal-light text-xs font-semibold"
                        value={itemSearchText[index] || ''}
                        onChange={(e) => {
                          const newSearchText = [...itemSearchText];
                          newSearchText[index] = e.target.value;
                          setItemSearchText(newSearchText);
                          setShowItemDropdown(index);
                          
                          // If search is cleared, reset item association
                          if (!e.target.value) {
                            const newItems = [...lineItems];
                            newItems[index] = { ...newItems[index], stockItemId: '', rate: 0 };
                            setLineItems(newItems);
                          }
                        }}
                        onFocus={() => setShowItemDropdown(index)}
                      />

                      {showItemDropdown === index && (
                        <div className="absolute top-12 left-2 right-2 max-h-40 bg-tally-panel border border-tally-border rounded shadow-xl overflow-y-auto z-40">
                          {activeStockItems
                            .filter((item) =>
                              item.name.toLowerCase().includes((itemSearchText[index] || '').toLowerCase())
                            )
                            .map((item) => (
                              <div
                                key={item.id}
                                onClick={() => handleSelectItem(index, item)}
                                className="px-3 py-2 hover:bg-tally-teal hover:text-white cursor-pointer flex justify-between border-b border-tally-border/20 text-[11px]"
                              >
                                <span className="font-semibold">{item.name}</span>
                                <span className="text-[10px] text-tally-amber">
                                  Bal: {item.quantity} {item.unit}
                                </span>
                              </div>
                            ))}
                        </div>
                      )}

                      {/* Display current inventory level details */}
                      {selectedItem && (
                        <div className="text-[10px] text-tally-muted mt-1 px-1 flex justify-between">
                          <span>HSN: {selectedItem.hsn} | GST: {selectedItem.gstPercentage}%</span>
                          <span className={selectedItem.quantity <= 5 ? 'text-tally-rose font-bold' : 'text-tally-emerald'}>
                            Available: {selectedItem.quantity} {selectedItem.unit}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Qty Input */}
                    <td className="p-2.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          className="w-full bg-tally-bg border border-tally-border text-tally-text p-2 rounded focus:outline-hidden focus:border-tally-teal-light text-center font-mono text-xs font-semibold"
                          value={line.qty || ''}
                          onChange={(e) =>
                            handleLineItemChange(index, 'qty', parseFloat(e.target.value) || 0)
                          }
                        />
                        <span className="text-tally-muted text-[10px]">{selectedItem?.unit || 'PCS'}</span>
                      </div>
                      {/* Check if warning needs to be displayed */}
                      {voucherType === 'Sales' && selectedItem && line.qty > selectedItem.quantity && (
                        <span className="text-[9px] text-tally-rose block text-center font-semibold mt-1">
                          EXCEEDS STOCK
                        </span>
                      )}
                    </td>

                    {/* Rate Input */}
                    <td className="p-2.5">
                      <input
                        type="number"
                        min="0"
                        placeholder="0.00"
                        className="w-full bg-tally-bg border border-tally-border text-tally-text p-2 rounded focus:outline-hidden focus:border-tally-teal-light text-right font-mono text-xs font-semibold"
                        value={line.rate || ''}
                        onChange={(e) =>
                          handleLineItemChange(index, 'rate', parseFloat(e.target.value) || 0)
                        }
                      />
                    </td>

                    {/* Total Amount Output */}
                    <td className="p-2.5 text-right font-mono text-xs font-bold text-tally-text select-none">
                      {(line.qty * line.rate).toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </td>

                    {/* Remove Action */}
                    <td className="p-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => removeLineItem(index)}
                        disabled={lineItems.length === 1}
                        className="p-1.5 text-tally-muted hover:text-tally-rose rounded hover:bg-tally-bg/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Add Line button */}
          <div className="bg-tally-bg/20 p-2 flex justify-start border-t border-tally-border/20">
            <button
              type="button"
              onClick={addLineItem}
              className="px-3 py-1 bg-tally-panel border border-tally-border hover:bg-tally-teal/20 text-tally-teal-light hover:border-tally-teal-light rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95"
            >
              <Plus size={12} /> Add Item Row
            </button>
          </div>
        </div>

        {/* Computations Summary Panel & Narration */}
        <div className="flex flex-col md:flex-row gap-6 mt-2">
          {/* Left: Narration notes */}
          <div className="w-full md:w-1/2 flex flex-col gap-2 bg-tally-bg/20 p-4 border border-tally-border/30 rounded">
            <label className="text-tally-muted uppercase text-[9px] tracking-wider font-bold">Narration / Notes</label>
            <textarea
              rows={3}
              placeholder="Provide a detailed description of the invoice transaction..."
              className="bg-tally-bg border border-tally-border text-tally-text p-2 rounded focus:outline-hidden focus:border-tally-teal-light font-sans text-xs"
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
            />
          </div>

          {/* Right: Calculations Breakdowns */}
          <div className="w-full md:w-1/2 bg-tally-panel border border-tally-border p-4 rounded flex flex-col gap-2 font-mono text-xs select-none">
            <div className="flex justify-between text-tally-muted border-b border-tally-border/20 pb-1.5">
              <span>Gross Subtotal</span>
              <span className="font-bold text-tally-text">
                ₹{totals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {totals.cgst > 0 && (
              <div className="flex justify-between text-tally-muted">
                <span>Central CGST Tax</span>
                <span>₹{totals.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            )}

            {totals.sgst > 0 && (
              <div className="flex justify-between text-tally-muted border-b border-tally-border/10 pb-1">
                <span>State SGST Tax</span>
                <span>₹{totals.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            )}

            {totals.igst > 0 && (
              <div className="flex justify-between text-tally-muted border-b border-tally-border/10 pb-1">
                <span>Integrated IGST Tax</span>
                <span>₹{totals.igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            )}

            <div className="flex justify-between text-tally-teal-light text-sm font-bold pt-1 border-t border-tally-border/30 mt-1">
              <span>Total Invoice Bill</span>
              <span className="text-tally-amber font-extrabold text-[15px]">
                ₹{totals.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 border-t border-tally-border pt-4 mt-2">
          <button
            type="button"
            onClick={() => {
              resetVoucherFields();
              onClose();
            }}
            className="px-5 py-2 border border-tally-border hover:bg-tally-border text-tally-text font-bold rounded uppercase tracking-wider transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-7 py-2 bg-tally-teal hover:bg-tally-teal-light text-white font-bold rounded uppercase tracking-wider transition-all cursor-pointer shadow-lg hover:shadow-tally-teal/20"
          >
            Post Voucher
          </button>
        </div>
      </form>
    </div>
  );
}
