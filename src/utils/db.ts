import { DatabaseState, Company, Ledger, StockItem, Voucher } from '@/types/database';

const LOCAL_STORAGE_KEY = 'smarterp_db_state';

const DEFAULT_COMPANIES: Company[] = [
  {
    id: 'co-1',
    name: 'Alpha Tech Solutions Ltd',
    address: 'Plot 45, MIDC Industrial Area, Andheri East, Mumbai',
    gstin: '27AAAAA1111A1Z1',
    state: 'Maharashtra',
    financialYearStart: '2026-04-01',
    phone: '9876543210',
    email: 'info@alphatech.com'
  },
  {
    id: 'co-2',
    name: 'Beta Retailers Enterprise',
    address: '12, MG Road, Ashok Nagar, Bengaluru',
    gstin: '29BBBBB2222B2Z2',
    state: 'Karnataka',
    financialYearStart: '2026-04-01',
    phone: '9876543211',
    email: 'contact@betaretail.in'
  }
];

const createDefaultState = (): DatabaseState => {
  const co1Id = 'co-1';
  const co2Id = 'co-2';

  const defaultLedgers: Ledger[] = [
    // Alpha Tech Ledgers
    {
      id: 'led-cash-1',
      companyId: co1Id,
      name: 'Cash',
      group: 'Cash-in-hand',
      openingBalance: 50000,
      currentBalance: 50000
    },
    {
      id: 'led-bank-1',
      companyId: co1Id,
      name: 'HDFC Bank A/c',
      group: 'Bank Accounts',
      openingBalance: 250000,
      currentBalance: 250000
    },
    {
      id: 'led-debtor-1',
      companyId: co1Id,
      name: 'Indo Traders',
      group: 'Sundry Debtors',
      gstin: '27ABCDE1234F1ZA',
      state: 'Maharashtra', // Intrastate (CGST + SGST)
      address: 'Shop No 5, Apex Tower, Vashi, Navi Mumbai',
      phone: '9123456789',
      openingBalance: 0,
      currentBalance: 259600 // Reflects pre-loaded sale
    },
    {
      id: 'led-creditor-1',
      companyId: co1Id,
      name: 'Bangalore Tech Wholesalers',
      group: 'Sundry Creditors',
      gstin: '29FGHIJ5678K2ZB',
      state: 'Karnataka', // Interstate (IGST)
      address: '22, Industrial Layout, Koramangala, Bengaluru',
      phone: '8123456789',
      openingBalance: 0,
      currentBalance: -472000 // Negative balance representing Credit/Due to supplier
    },
    {
      id: 'led-sales-1',
      companyId: co1Id,
      name: 'Sales Account',
      group: 'Sales Accounts',
      openingBalance: 0,
      currentBalance: -220000 // Sales increases Credit balance
    },
    {
      id: 'led-purchases-1',
      companyId: co1Id,
      name: 'Purchase Account',
      group: 'Purchase Accounts',
      openingBalance: 0,
      currentBalance: 400000 // Purchases increases Debit balance
    },
    {
      id: 'led-rent-1',
      companyId: co1Id,
      name: 'Office Rent Expense',
      group: 'Indirect Expenses',
      openingBalance: 0,
      currentBalance: 12000 // Debit balance
    },

    // Beta Retailers Ledgers
    {
      id: 'led-cash-2',
      companyId: co2Id,
      name: 'Cash',
      group: 'Cash-in-hand',
      openingBalance: 30000,
      currentBalance: 30000
    },
    {
      id: 'led-bank-2',
      companyId: co2Id,
      name: 'SBI Bank A/c',
      group: 'Bank Accounts',
      openingBalance: 120000,
      currentBalance: 120000
    }
  ];

  const defaultStockItems: StockItem[] = [
    // Alpha Tech Stock Items
    {
      id: 'item-1',
      companyId: co1Id,
      name: 'Dell XPS 15 Laptop',
      sku: 'DELL-XPS-15',
      purchasePrice: 80000,
      sellingPrice: 110000,
      quantity: 15, // 12 opening + 5 purchased - 2 sold
      unit: 'PCS',
      gstPercentage: 18,
      hsn: '84713010',
      openingStock: 12
    },
    {
      id: 'item-2',
      companyId: co1Id,
      name: 'Logitech MX Master 3S Mouse',
      sku: 'LOGI-MX3S',
      purchasePrice: 5000,
      sellingPrice: 7500,
      quantity: 45,
      unit: 'PCS',
      gstPercentage: 18,
      hsn: '84716060',
      openingStock: 45
    },
    {
      id: 'item-3',
      companyId: co1Id,
      name: 'Samsung 32" Curved Monitor',
      sku: 'SAMP-32-MON',
      purchasePrice: 18000,
      sellingPrice: 25000,
      quantity: 8,
      unit: 'PCS',
      gstPercentage: 18,
      hsn: '85285900',
      openingStock: 8
    }
  ];

  const defaultVouchers: Voucher[] = [
    // Alpha Tech Historical Vouchers
    {
      id: 'vouch-1',
      companyId: co1Id,
      type: 'Purchase',
      voucherNumber: 'PUR-001',
      date: '2026-06-05',
      partyLedgerId: 'led-creditor-1',
      partyName: 'Bangalore Tech Wholesalers',
      items: [
        {
          stockItemId: 'item-1',
          name: 'Dell XPS 15 Laptop',
          qty: 5,
          rate: 80000,
          amount: 400000,
          gstPercentage: 18,
          hsn: '84713010'
        }
      ],
      subtotal: 400000,
      cgst: 0,
      sgst: 0,
      igst: 72000, // Interstate purchase (Maharashtra <- Karnataka)
      totalAmount: 472000,
      narration: 'Purchase of 5 Dell laptops for stock'
    },
    {
      id: 'vouch-2',
      companyId: co1Id,
      type: 'Sales',
      voucherNumber: 'SAL-001',
      date: '2026-06-15',
      partyLedgerId: 'led-debtor-1',
      partyName: 'Indo Traders',
      items: [
        {
          stockItemId: 'item-1',
          name: 'Dell XPS 15 Laptop',
          qty: 2,
          rate: 110000,
          amount: 220000,
          gstPercentage: 18,
          hsn: '84713010'
        }
      ],
      subtotal: 220000,
      cgst: 19800, // Intrastate sale (Maharashtra -> Maharashtra: 9%)
      sgst: 19800, // Intrastate sale (9%)
      igst: 0,
      totalAmount: 259600,
      narration: 'Sold 2 Dell XPS Laptops on credit'
    }
  ];

  return {
    companies: DEFAULT_COMPANIES,
    ledgers: defaultLedgers,
    stockItems: defaultStockItems,
    vouchers: defaultVouchers,
    activeCompanyId: co1Id,
    currentDate: '2026-06-26'
  };
};

export const getDatabaseState = (): DatabaseState => {
  if (typeof window === 'undefined') {
    return {
      companies: DEFAULT_COMPANIES,
      ledgers: [],
      stockItems: [],
      vouchers: [],
      activeCompanyId: null,
      currentDate: '2026-06-26'
    };
  }

  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!stored) {
    const defaultState = createDefaultState();
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaultState));
    return defaultState;
  }

  try {
    return JSON.parse(stored);
  } catch (e) {
    console.error('Failed to parse SmartERP DB state, resetting database', e);
    const defaultState = createDefaultState();
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaultState));
    return defaultState;
  }
};

export const saveDatabaseState = (state: DatabaseState): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  }
};

export const resetDatabase = (): DatabaseState => {
  const defaultState = createDefaultState();
  saveDatabaseState(defaultState);
  return defaultState;
};
