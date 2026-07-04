'use client';

import React, { useState, useEffect, useRef } from 'react';
import { StockItem, UnitType } from '@/types/database';
import { ArrowLeft, Plus, Edit3, Trash2, List, BarChart4 } from 'lucide-react';

interface StockItemFormProps {
  companyId: string;
  stockItems: StockItem[];
  onSaveStockItem: (item: Omit<StockItem, 'id' | 'companyId'> & { id?: string }) => void;
  onDeleteStockItem: (id: string) => void;
  onClose: () => void;
  initialMode?: 'create' | 'list';
}

const UNITS: UnitType[] = ['PCS', 'KG', 'BOX', 'LTR', 'MTR'];
const GST_RATES = [0, 5, 12, 18, 28];

export default function StockItemForm({
  companyId,
  stockItems,
  onSaveStockItem,
  onDeleteStockItem,
  onClose,
  initialMode = 'create'
}: StockItemFormProps) {
  const [mode, setMode] = useState<'create' | 'list' | 'edit'>(initialMode);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(0);
  const [unit, setUnit] = useState<UnitType>('PCS');
  const [gstPercentage, setGstPercentage] = useState<number>(18);
  const [hsn, setHsn] = useState('');
  const [error, setError] = useState('');

  // List view search & key index
  const [search, setSearch] = useState('');
  const [listIndex, setListIndex] = useState(0);

  const formRefs = useRef<(HTMLInputElement | HTMLSelectElement | HTMLButtonElement | null)[]>([]);

  const activeItems = stockItems.filter((i) => i.companyId === companyId);
  const filteredItems = activeItems.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.sku.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    // ESC listener
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

  // List arrow keys
  useEffect(() => {
    if (mode !== 'list') return;

    const handleListKeys = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setListIndex((prev) => (filteredItems.length ? (prev + 1) % filteredItems.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setListIndex((prev) => (filteredItems.length ? (prev - 1 + filteredItems.length) % filteredItems.length : 0));
      } else if (e.key === 'Enter') {
        if (filteredItems[listIndex]) {
          e.preventDefault();
          handleEdit(filteredItems[listIndex]);
        }
      }
    };
    window.addEventListener('keydown', handleListKeys);
    return () => window.removeEventListener('keydown', handleListKeys);
  }, [mode, filteredItems, listIndex]);

  const resetForm = () => {
    setName('');
    setSku('');
    setPurchasePrice(0);
    setSellingPrice(0);
    setQuantity(0);
    setUnit('PCS');
    setGstPercentage(18);
    setHsn('');
    setError('');
    setSelectedItemId(null);
  };

  const handleEdit = (item: StockItem) => {
    setSelectedItemId(item.id);
    setName(item.name);
    setSku(item.sku);
    setPurchasePrice(item.purchasePrice);
    setSellingPrice(item.sellingPrice);
    setQuantity(item.quantity);
    setUnit(item.unit);
    setGstPercentage(item.gstPercentage);
    setHsn(item.hsn);

    setMode('edit');
    setError('');
    setTimeout(() => formRefs.current[0]?.focus(), 50);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Item Name is required');
      formRefs.current[0]?.focus();
      return;
    }
    if (!sku.trim()) {
      setError('SKU code is required');
      formRefs.current[1]?.focus();
      return;
    }
    if (!hsn.trim() || hsn.length < 4) {
      setError('A valid HSN Code is required for GST tax audits');
      formRefs.current[6]?.focus();
      return;
    }
    if (purchasePrice < 0 || sellingPrice < 0) {
      setError('Rates cannot be negative values');
      return;
    }

    onSaveStockItem({
      id: selectedItemId || undefined,
      name,
      sku: sku.toUpperCase(),
      purchasePrice,
      sellingPrice,
      quantity,
      unit,
      gstPercentage,
      hsn,
      openingStock: selectedItemId ? activeItems.find(i => i.id === selectedItemId)?.openingStock || 0 : quantity
    });

    resetForm();
    if (initialMode === 'list') {
      setMode('list');
    } else {
      onClose();
    }
  };

  return (
    <div className="w-full max-w-4xl bg-tally-panel border border-tally-border rounded-lg shadow-2xl overflow-hidden font-mono animate-slide-up">
      {/* Header */}
      <div className="bg-tally-header px-6 py-3.5 border-b border-tally-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart4 size={18} className="text-tally-teal-light" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-tally-text">
            {mode === 'create' && 'Stock Item Creation Master'}
            {mode === 'edit' && `Alter Stock Item: ${name}`}
            {mode === 'list' && 'Stock Items Registry'}
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
              <Plus size={14} /> [ALT+S] Create New
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
        /* List View */
        <div className="p-6">
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by product name, SKU, etc..."
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
                  <th className="p-3">Item Name</th>
                  <th className="p-3">SKU</th>
                  <th className="p-3">HSN Code</th>
                  <th className="p-3 text-center">Unit</th>
                  <th className="p-3 text-right">Purchase (₹)</th>
                  <th className="p-3 text-right">Selling (₹)</th>
                  <th className="p-3 text-center">GST Rate</th>
                  <th className="p-3 text-right">Available Qty</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tally-border/30 bg-tally-bg/20">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-tally-muted italic">
                      No matching products found. Press ALT+S to create one.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, idx) => {
                    const isSelected = listIndex === idx;
                    return (
                      <tr
                        key={item.id}
                        onClick={() => handleEdit(item)}
                        className={`hover:bg-tally-teal/10 cursor-pointer select-none transition-colors ${
                          isSelected ? 'bg-tally-teal/20 text-white font-semibold' : 'text-tally-text'
                        }`}
                      >
                        <td className="p-3 font-semibold">{item.name}</td>
                        <td className="p-3 text-tally-teal-light font-mono font-medium">{item.sku}</td>
                        <td className="p-3 text-tally-muted">{item.hsn}</td>
                        <td className="p-3 text-center">{item.unit}</td>
                        <td className="p-3 text-right font-mono">{item.purchasePrice.toLocaleString('en-IN')}</td>
                        <td className="p-3 text-right font-mono">{item.sellingPrice.toLocaleString('en-IN')}</td>
                        <td className="p-3 text-center font-bold text-tally-amber">{item.gstPercentage}%</td>
                        <td className={`p-3 text-right font-mono font-bold ${item.quantity <= 5 ? 'text-tally-rose font-black' : 'text-tally-emerald'}`}>
                          {item.quantity} {item.unit}
                          {item.quantity <= 5 && <span className="text-[9px] block text-tally-amber font-normal font-sans">LOW STOCK</span>}
                        </td>
                        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-center gap-1.5">
                            <button
                              onClick={() => handleEdit(item)}
                              className="p-1 text-tally-muted hover:text-tally-amber hover:bg-tally-bg rounded transition-colors"
                              title="Edit Item details"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
                                  onDeleteStockItem(item.id);
                                }
                              }}
                              className="p-1 text-tally-muted hover:text-tally-rose hover:bg-tally-bg rounded transition-colors"
                              title="Delete Item"
                            >
                              <Trash2 size={13} />
                            </button>
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
            {/* Left Column: Core Description */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-tally-muted">Stock Item Name *</label>
                <input
                  ref={(el) => { formRefs.current[0] = el; }}
                  type="text"
                  placeholder="e.g. Dell Latitude 7420 Laptop"
                  className="bg-tally-bg border border-tally-border text-tally-text p-2 rounded focus:outline-hidden focus:border-tally-teal-light text-xs font-semibold"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-tally-muted">SKU / Code *</label>
                <input
                  ref={(el) => { formRefs.current[1] = el; }}
                  type="text"
                  placeholder="e.g. DELL-LAT-7420"
                  className="bg-tally-bg border border-tally-border text-tally-text p-2 rounded focus:outline-hidden focus:border-tally-teal-light text-xs font-mono"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-tally-muted">Unit of Measure *</label>
                <select
                  ref={(el) => { formRefs.current[2] = el as HTMLSelectElement | null; }}
                  className="bg-tally-bg border border-tally-border text-tally-text p-2 rounded focus:outline-hidden focus:border-tally-teal-light text-xs"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as UnitType)}
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-tally-muted">Opening Stock Quantity</label>
                <input
                  ref={(el) => { formRefs.current[3] = el; }}
                  type="number"
                  min="0"
                  placeholder="0"
                  disabled={mode === 'edit'} // Disable editing quantity directly from here in Edit mode to preserve audit trail
                  className="bg-tally-bg border border-tally-border text-tally-text p-2 rounded focus:outline-hidden focus:border-tally-teal-light text-xs font-mono disabled:opacity-50"
                  value={quantity || ''}
                  onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                />
                {mode === 'edit' && (
                  <span className="text-[10px] text-tally-amber">
                    Stock adjustments should be entered via Vouchers (Sales/Purchase)
                  </span>
                )}
              </div>
            </div>

            {/* Right Column: Pricing & Taxation */}
            <div className="flex flex-col gap-3 p-4 bg-tally-bg/40 border border-tally-border/40 rounded">
              <div className="text-[10px] text-tally-teal-light font-bold uppercase tracking-wider mb-1 border-b border-tally-border pb-1">
                Pricing & GST Parameters
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-tally-muted">Standard Purchase Price (₹)</label>
                <input
                  ref={(el) => { formRefs.current[4] = el; }}
                  type="number"
                  min="0"
                  placeholder="0.00"
                  className="bg-tally-bg border border-tally-border text-tally-text p-2 rounded focus:outline-hidden focus:border-tally-teal-light text-xs font-mono"
                  value={purchasePrice || ''}
                  onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-tally-muted">Standard Selling Price (₹)</label>
                <input
                  ref={(el) => { formRefs.current[5] = el; }}
                  type="number"
                  min="0"
                  placeholder="0.00"
                  className="bg-tally-bg border border-tally-border text-tally-text p-2 rounded focus:outline-hidden focus:border-tally-teal-light text-xs font-mono"
                  value={sellingPrice || ''}
                  onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-tally-muted">HSN Code *</label>
                <input
                  ref={(el) => { formRefs.current[6] = el; }}
                  type="text"
                  placeholder="e.g. 84713010"
                  className="bg-tally-bg border border-tally-border text-tally-text p-2 rounded focus:outline-hidden focus:border-tally-teal-light text-xs font-mono"
                  value={hsn}
                  onChange={(e) => setHsn(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-tally-muted">GST Slab Percentage *</label>
                <select
                  ref={(el) => { formRefs.current[7] = el as HTMLSelectElement | null; }}
                  className="bg-tally-bg border border-tally-border text-tally-text p-2 rounded focus:outline-hidden focus:border-tally-teal-light text-xs font-bold"
                  value={gstPercentage}
                  onChange={(e) => setGstPercentage(parseInt(e.target.value) || 0)}
                >
                  {GST_RATES.map((rate) => (
                    <option key={rate} value={rate}>
                      {rate}%
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Action buttons */}
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
              {mode === 'create' ? 'Create Stock Item' : 'Save Alterations'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
