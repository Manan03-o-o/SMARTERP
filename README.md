# SmartERP — Billing, Inventory & Accounting Management System

A modern, cloud-based ERP platform inspired by TallyPrime, built with Next.js and Node.js. Manages accounting, inventory, billing, GST, and business reporting through a keyboard-first web interface.

---

## Features

### MVP (Current Scope)
- **Ledgers** — Customer, Supplier, and Stock Item ledgers with outstanding balance tracking
- **Sales voucher** — Customer billing with auto GST calculation and stock decrement
- **Purchase voucher** — Supplier invoice entry with automatic stock increment
- **GST compliance** — CGST / SGST / IGST breakdown on every transaction
- **Dashboard** — Live receivable, payable, and stock summary

### Full Scope
- Contra, Payment, Receipt, Journal, Credit Note, and Debit Note vouchers
- Inventory management — stock in/out, transfers, valuation, low stock alerts
- Financial reports — Balance Sheet, P&L, Trial Balance, Cash Flow
- GST reports — GSTR summary, tax register
- Banking module — reconciliation, cheque management, fund transfers
- Multi-company support (up to 5 companies per account)
- Role-based access control
- PDF invoice generation and print
- Keyboard-only navigation with full shortcut coverage

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React 18, Tailwind CSS, ShadCN UI |
| Tables | TanStack Table v8 |
| Forms | React Hook Form + Zod |
| Backend | Node.js, Express.js |
| Database | PostgreSQL (Supabase) |
| Auth | JWT / Supabase Auth |
| PDF | PDFKit |
| Excel export | ExcelJS |
| Frontend deploy | Vercel |
| Backend deploy | Railway / Render |

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 15+ (or a Supabase project)
- npm or yarn

### 1. Clone the repo

```bash
git clone https://github.com/your-username/smarterp.git
cd smarterp
```

### 2. Install dependencies

```bash
# Frontend
cd client
npm install

# Backend
cd ../server
npm install
```

### 3. Configure environment variables

**client/.env.local**
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**server/.env**
```env
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/smarterp
JWT_SECRET=your_jwt_secret_here
NODE_ENV=development
```

### 4. Set up the database

```bash
cd server
npm run db:migrate
npm run db:seed       # optional — loads sample data
```

### 5. Run the development servers

```bash
# Terminal 1 — backend
cd server
npm run dev

# Terminal 2 — frontend
cd client
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Structure

```
smarterp/
├── client/                     # Next.js frontend
│   ├── app/
│   │   ├── (auth)/             # Login, register pages
│   │   ├── (app)/
│   │   │   ├── company/        # Company selection and setup
│   │   │   ├── dashboard/      # Gateway / home
│   │   │   ├── masters/
│   │   │   │   ├── customers/
│   │   │   │   ├── suppliers/
│   │   │   │   └── stock/
│   │   │   ├── vouchers/
│   │   │   │   ├── sales/
│   │   │   │   ├── purchase/
│   │   │   │   ├── receipt/
│   │   │   │   └── payment/
│   │   │   └── reports/
│   ├── components/
│   │   ├── ui/                 # ShadCN base components
│   │   ├── ledger/
│   │   ├── voucher/
│   │   └── layout/
│   └── lib/
│       ├── api.ts
│       ├── hooks/
│       └── utils/
│
└── server/                     # Express backend
    ├── src/
    │   ├── routes/
    │   │   ├── auth.ts
    │   │   ├── companies.ts
    │   │   ├── ledgers.ts
    │   │   ├── vouchers.ts
    │   │   ├── stock.ts
    │   │   └── reports.ts
    │   ├── controllers/
    │   ├── middleware/
    │   │   ├── auth.ts
    │   │   └── validate.ts
    │   ├── models/
    │   └── db/
    │       ├── migrations/
    │       └── seed/
    └── index.ts
```

---

## Keyboard Shortcuts

### Global
| Key | Action |
|---|---|
| `F1` | Company selection |
| `F2` | Change financial year |
| `ESC` | Back to gateway |
| `Ctrl + K` | Command search |
| `Ctrl + Q` | Logout |

### Vouchers
| Key | Action |
|---|---|
| `F8` | New sales voucher |
| `F9` | New purchase voucher |
| `F6` | Receipt voucher |
| `F7` | Journal voucher |
| `Alt + F8` | Credit note |
| `Alt + F9` | Debit note |

### Masters
| Key | Action |
|---|---|
| `Alt + C` | Customers |
| `Alt + S` | Suppliers |
| `Alt + I` | Stock items |
| `Alt + L` | Create ledger |
| `Alt + G` | Create group |

### Reports
| Key | Action |
|---|---|
| `Alt + B` | Balance sheet |
| `Alt + P` | Profit & loss |
| `Alt + T` | Trial balance |
| `Alt + X` | GST report |
| `Alt + R` | Stock summary |

---

## Database Schema (Core Tables)

```
users            — auth credentials, role
companies        — company profile, GST, financial year
ledgers          — customer / supplier / expense accounts
stock_items      — products with rates, GST, HSN
units            — PCS, KG, BOX, LTR, etc.
vouchers         — sales, purchase, receipt, payment, journal
voucher_lines    — individual items within a voucher
inventory_txns   — stock in / stock out log
gst_records      — CGST, SGST, IGST per transaction
audit_logs       — who changed what and when
```

---

## API Overview

```
POST   /api/auth/login
POST   /api/auth/register

GET    /api/companies
POST   /api/companies

GET    /api/ledgers?type=customer|supplier
POST   /api/ledgers
PUT    /api/ledgers/:id
DELETE /api/ledgers/:id

GET    /api/stock
POST   /api/stock
PUT    /api/stock/:id

GET    /api/vouchers?type=sales|purchase
POST   /api/vouchers
GET    /api/vouchers/:id
DELETE /api/vouchers/:id

GET    /api/reports/balance-sheet
GET    /api/reports/profit-loss
GET    /api/reports/gst-summary
GET    /api/reports/stock-summary
```

---

## GST Handling

Every sales and purchase voucher automatically computes:

- **Intra-state** → CGST + SGST (split 50/50 of the GST rate)
- **Inter-state** → IGST (full GST rate)

GST slab options: 0%, 5%, 12%, 18%, 28%

Each item carries an HSN code that maps to the correct slab in the master.

---

## Roadmap

- [x] Customer, Supplier, Stock item ledgers
- [x] Sales and Purchase vouchers
- [x] Live GST calculation
- [ ] Receipt and Payment vouchers
- [ ] PDF invoice download (PDFKit)
- [ ] GSTR-1 and GSTR-3B summary export
- [ ] Multi-branch support
- [ ] Barcode scanner integration
- [ ] Mobile app (React Native)
- [ ] AI business insights
- [ ] Bank statement reconciliation via API
- [ ] WhatsApp invoice sharing
- [ ] OCR bill scanning




Inspired by [TallyPrime](https://tallysolutions.com) — the accounting software used by millions of Indian businesses. SmartERP brings the same keyboard-first workflow to the modern web.
