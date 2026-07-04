export type LedgerGroup =
  | 'Sundry Debtors'   // Customers
  | 'Sundry Creditors'  // Suppliers
  | 'Sales Accounts'
  | 'Purchase Accounts'
  | 'Bank Accounts'
  | 'Cash-in-hand'
  | 'Indirect Expenses'
  | 'Indirect Incomes';

export interface Company {
  id: string;
  name: string;
  address: string;
  gstin: string;
  state: string; // e.g. "Maharashtra", "Karnataka", "Delhi"
  financialYearStart: string; // YYYY-MM-DD
  phone: string;
  email?: string;
}

export interface Ledger {
  id: string;
  companyId: string;
  name: string;
  group: LedgerGroup;
  gstin?: string;
  state?: string;
  address?: string;
  phone?: string;
  openingBalance: number; // Positive = Debit, Negative = Credit
  currentBalance: number;
}

export type UnitType = 'PCS' | 'KG' | 'BOX' | 'LTR' | 'MTR';

export interface StockItem {
  id: string;
  companyId: string;
  name: string;
  sku: string;
  purchasePrice: number;
  sellingPrice: number;
  quantity: number; // Current stock qty
  unit: UnitType;
  gstPercentage: number; // e.g., 5, 12, 18, 28
  hsn: string;
  openingStock: number;
}

export interface VoucherItem {
  stockItemId: string;
  name: string;
  qty: number;
  rate: number;
  amount: number; // qty * rate
  gstPercentage: number;
  hsn: string;
}

export interface Voucher {
  id: string;
  companyId: string;
  type: 'Sales' | 'Purchase';
  voucherNumber: string; // e.g., "SAL-001" or "PUR-001"
  date: string; // YYYY-MM-DD
  partyLedgerId: string; // Refers to Ledger ID (Sundry Debtor or Creditor)
  partyName: string;
  items: VoucherItem[];
  subtotal: number;
  cgst: number; // Central GST (if within same state)
  sgst: number; // State GST (if within same state)
  igst: number; // Integrated GST (if interstate)
  totalAmount: number;
  narration: string;
}

export interface DatabaseState {
  companies: Company[];
  ledgers: Ledger[];
  stockItems: StockItem[];
  vouchers: Voucher[];
  activeCompanyId: string | null;
  currentDate: string; // YYYY-MM-DD representing system active date
}
