# Paridhan Uniforms - Billing & Inventory Management System

[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![SQLite](https://img.shields.io/badge/SQLite-WAL--Mode-lightblue.svg)](https://sqlite.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-38bdf8.svg)](https://tailwindcss.com/)
[![License: ISC](https://img.shields.io/badge/License-ISC-amber.svg)](https://opensource.org/licenses/ISC)

A complete, production-ready, POS-style Billing, Invoicing, and Inventory Management web application built for uniform vendor **"Paridhan Uniforms"**. Designed for fast retail counters, school uniform catalog management, server-side PDF tax invoice generation, instant WhatsApp click-to-chat sharing, and integrated CRM Service Diagnostics for remote system health management and error fixing.

---

## Repository
```bash
git clone https://github.com/Sudhanshubhoyar18/Paridhan-Services.git
cd Paridhan-Services
```

---

## ⚡ Quick Start: 1-Click Windows Launchers

If you are on Windows, simply double-click any of these files directly from the root folder or your desktop:

| File | What it does |
| :--- | :--- |
| **`Start-Paridhan.bat`** | **Primary 1-Click Launch**: Frees port 5000, builds production assets if needed, starts the unified Express server, opens the local counter (`http://localhost:5000`), and launches Cloudflare Tunnel for phone & internet access. |
| **`Stop-Paridhan.bat`** | **Safe Shutdown**: Cleanly stops the background server and frees port 5000 while ensuring all SQLite WAL transactions are safely saved. |
| **`start-production.bat`** | Builds the frontend bundle and runs a unified single server on `http://localhost:5000` (and on your local Wi-Fi). |
| **`start-tunnel.bat`** | Launches an encrypted Cloudflare Tunnel giving you an instant public HTTPS link (`https://....trycloudflare.com`) to open the app on **ANY phone anywhere in the world**! |

---

## 🔑 Default Admin Credentials

- **Username**: `admin`
- **Password**: `admin123`

*(A reminder banner displays on first login to change your password in the Settings tab).*

---

## 💻 Cross-Platform Setup & Running Commands

### 1. Fast Setup (Single Command)
```bash
npm run setup
```
*(This automatically installs backend and frontend packages, copies `.env`, and seeds sample uniform items and admin credentials).*

---

### 2. Manual Step-by-Step Setup

#### Step 1: Install Dependencies
```bash
# Install backend dependencies
npm --prefix backend install

# Install frontend dependencies
npm --prefix frontend install
```

#### Step 2: Configure Environment Variables
```bash
# On Windows (PowerShell)
Copy-Item backend\.env.example backend\.env

# On macOS / Linux
cp backend/.env.example backend/.env
```

#### Step 3: Seed Database with Initial Catalog & Admin
```bash
npm --prefix backend run seed
```

#### Step 4: Run the Application

**Option A: Development Mode (Vite Hot-Reload)**
In two separate terminal windows:
```bash
# Terminal 1: Backend Server (Port 5000)
npm --prefix backend run dev

# Terminal 2: Frontend Dev Server (Port 5173)
npm --prefix frontend run dev
```
Open your browser at: **`http://localhost:5173`**

**Option B: Single-Server Production Mode (Fast & Lightweight)**
Run the frontend build and start the Express server (serves both API and frontend on port 5000):
```bash
# Build frontend
npm --prefix frontend run build

# Start production server
npm --prefix backend start
```
Open your browser at: **`http://localhost:5000`**

---

### 3. Running Automated Integration Tests
Verify all 11 backend integration tests (health check, login, atomic stock deduction, PDF generation, public WhatsApp streaming, CRM & system diagnostics health check, and bill cancellation stock restoration):
```bash
npm test
```
*(or `node backend/test_suite.js`)*

---

### 4. Cleaning Data for Fresh Store Onboarding
Wipe all test transactions, payments, and customers clean with a single command (preserves catalog products, stock baseline, and admin settings):
```bash
npm run clean-data
```

---

## 📂 Complete Project Architecture & File Breakdown

```
Paridhan-Services/
├── .env.example              # Sample environment configuration template
├── .gitignore                # Git ignore rules (node_modules, .env, db, dist)
├── package.json              # Root npm automation scripts (setup, start, dev, test)
├── README.md                 # Complete documentation, setup & deployment guide
├── start-dev.bat             # 1-click Windows launcher (development mode)
├── start-production.bat      # 1-click Windows launcher (production mode)
├── start-tunnel.bat          # 1-click Cloudflare tunnel (access anywhere)
│
├── backend/
│   ├── .env                  # Active environment variables (git-ignored)
│   ├── .env.example          # Environment variables template
│   ├── clean_data.js         # Fresh onboarding database transaction cleanup utility
│   ├── package.json          # Backend dependencies & scripts
│   ├── test_suite.js         # Automated end-to-end integration test suite
│   ├── data/                 # SQLite database storage directory (.gitkeep)
│   └── src/
│       ├── server.js         # Express app entry, static build serving & error handler
│       ├── config/
│       │   └── db.js         # SQLite connection with WAL mode & atomic transactions
│       ├── database/
│       │   ├── schema.js     # Table schemas & indexes (users, products, bills, etc.)
│       │   └── seed.js       # Default admin, store settings & school uniform catalog
│       ├── middleware/
│       │   ├── auth.js       # JWT authentication & route protection
│       │   └── errorHandler.js # Centralized error handler & persistent error logging
│       ├── routes/
│       │   ├── auth.js       # Login, profile, password change
│       │   ├── products.js   # Product CRUD, stock adjust, CSV import/export, safe deletion
│       │   ├── customers.js  # Customer CRUD, history & search
│       │   ├── bills.js      # Atomic billing, PDF generation & WhatsApp
│       │   ├── dashboard.js  # Sales metrics, inventory values & chart analytics
│       │   ├── reports.js    # Sales, stock, and customer dues reports (CSV/PDF)
│       │   ├── settings.js   # Store details, invoice prefix & tax rules
│       │   ├── system.js     # CRM service diagnostics, error logs, repairs & backups
│       │   └── public.js     # Unauthenticated invoice PDF streaming for WhatsApp
│       └── utils/
│           ├── logger.js     # Persistent file & in-memory event/error logger
│           ├── invoicePdf.js # PDFKit A4 tax invoice generator
│           ├── numberToWords.js # Indian numbering currency in words (Rupees/Paise)
│           ├── whatsapp.js   # wa.me Click-to-Chat deep links generator
│           └── reportPdf.js  # PDF financial & stock reports generator
│
└── frontend/
    ├── index.html            # HTML5 shell with PWA manifest & mobile meta tags
    ├── vite.config.js        # Vite configuration (host 0.0.0.0 for LAN access)
    ├── tailwind.config.js    # Tailwind styling tokens & millennial color palette
    ├── package.json          # React, Vite, Tailwind, Recharts dependencies
    ├── public/
    │   ├── manifest.json     # PWA standalone mobile app manifest
    │   └── icon.svg          # Brand icon for mobile home screen
    └── src/
        ├── main.jsx          # React DOM entry
        ├── App.jsx           # Routes & navigation structure
        ├── index.css         # Base typography & design system tokens
        ├── api/client.js     # Axios API wrapper with error toast handler
        ├── context/
        │   ├── AuthContext.jsx  # Authentication state & session provider
        │   └── ToastContext.jsx # Toast notification system
        ├── components/
        │   ├── Layout/       # Navbar, Mobile bottom navigation, AppLayout
        │   ├── Common/       # Stat cards, badges, modals, pagination, tables
        │   └── Modals/       # Customer, Product, StockAdjust, WhatsApp modals
        ├── pages/
        │   ├── Login.jsx     # Admin authentication
        │   ├── Dashboard.jsx # Live metrics, low stock alerts, charts
        │   ├── BillingPOS.jsx# Fast POS counter with 1-tap school/item filters
        │   ├── BillsList.jsx # Sales invoices history, payment, PDF/WhatsApp
        │   ├── BillDetails.jsx# Detailed invoice view & payment ledger
        │   ├── Inventory.jsx # Stock inventory, CSV import/export, adjustments
        │   ├── Customers.jsx # Customer list & school directory
        │   ├── CustomerDetails.jsx # Customer history & outstanding dues
        │   ├── Reports.jsx   # Financial, Stock valuation, Dues reports
        │   └── Settings.jsx  # Store profile, CRM diagnostics & logs, Phone access
        └── utils/
            └── formatters.js # INR currency (₹) & date formatting
```

---

## 🚀 Key Modules & Feature Highlights

### 1. Fast POS Billing Counter
- **1-Tap School Chips Filter**: Quick filter for **DPS**, **St. Xavier's**, **Army Public**, or **General** uniforms.
- **1-Tap "Walk-in" Customer**: Click Walk-in to bill immediately without typing.
- **Quick Cash Presets**: `Exact`, `₹500`, `₹1000`, `₹2000` buttons auto-fill received amounts and calculate balance.
- **Barcode & SKU Search (F2)**: Press `F2` to focus the search bar instantly.
- **Atomic Stock Protection**: Sales are executed inside SQLite transactions; sales are blocked if inventory is insufficient.
- **Post-Sale Actions**: Instant Print, PDF Download, and WhatsApp share buttons.

### 2. Uniform Inventory & Stock Management
- **Safe Product Deletion**: Delete any uniform product even if it was invoiced in the past. Existing bills preserve historical line items and prices.
- **Stock Movements Ledger**: Tracks every stock addition, reduction, sale deduction, and cancellation return.
- **Low Stock Alerts**: Visual alert badges for items below threshold.
- **CSV Import & Export**: Bulk import uniform variants and export current stock valuations.

### 3. Server-Side PDF Tax Invoices
- **A4 Format**: Clean layout with Paridhan Uniforms header, GSTIN, customer details, CGST/SGST tax split, and total amount in Indian words.
- **Public Share Links**: Customers can view and download invoices from WhatsApp links without needing an account.
- **Cancellation & Stock Restoration**: Cancelling a bill restores stock automatically inside a DB transaction.

### 4. WhatsApp Click-to-Chat (`wa.me`)
- Generates `https://wa.me/<cleaned_phone>?text=<encoded_message>` links with no third-party WhatsApp API costs.
- Automatically cleans phone numbers and prepends the India country code `+91`.
- Includes direct public PDF download links and switchable templates (Invoice Sent vs Payment Due Reminder).

### 5. CRM Support Diagnostics & Error Management Console
- **Service Provider Health Dashboard**: Check database file size, SQLite WAL journal status, foreign key integrity, and anomaly scans (`PRAGMA integrity_check`).
- **Persistent Error & Event Logger**: Centralized logger capturing uncaught API errors with timestamp, endpoint, IP, and stack trace in `data/logs/system.log`.
- **1-Click Raw Database Snapshot (`.sqlite`)**: Download full live backups instantly directly from the UI for offsite preservation or disaster recovery.
- **Auto-Repair & Self-Healing**: Automated VACUUM, REINDEX, and negative stock clamping tools.
- **Fresh Slate Reset (`npm run clean-data`)**: Clean all transactional records (bills, items, payments, customers) with one click when onboarding a new retail store.

### 6. Interactive Dashboard & Financial Reports
- **Real-Time KPIs**: Today's sales, monthly revenue, pending customer dues, inventory valuation at retail and cost, low stock counts.
- **Visual Analytics**: 30-day sales trend line chart, top 10 fast-moving items bar chart, revenue by category donut chart, and stock by category bar chart.
- **Exportable Reports**: Filterable Sales Report, Stock Valuation Report, and Customer Dues Report — all exportable to CSV and PDF.

---

## 📱 Mobile Phone Access & PWA Installation

### Option 1: On Your Local Wi-Fi (Instant)
1. Connect your phone to the same Wi-Fi network as your host computer.
2. In the app's top navigation bar, click **"Phone Access"** and scan the QR code, or open:
   ```
   http://<YOUR_COMPUTER_IP>:5173   (or http://<YOUR_COMPUTER_IP>:5000 in production)
   ```
3. **Install as a Phone App (PWA):**
   - **iPhone (Safari):** Tap the **Share** button &rarr; tap **"Add to Home Screen"**.
   - **Android (Chrome):** Tap the **Three Dots** &rarr; tap **"Add to Home screen"** or **"Install app"**.
   The app will launch full-screen with an app icon just like a native mobile app!

### Option 2: Worldwide Access via Cloudflare Tunnel
Double-click `start-tunnel.bat` or run:
```bash
npx cloudflared tunnel --url http://localhost:5000
```
This gives you an instant, secure public HTTPS URL (e.g. `https://....trycloudflare.com`) that can be opened on ANY phone anywhere in the world without router configuration!

---

## ☁️ Cloud Deployment (Render / Railway)

1. Push this repository to GitHub: `https://github.com/Sudhanshubhoyar18/Paridhan-Services.git`
2. Create a **New Web Service** on [Render.com](https://render.com) or [Railway.app](https://railway.app).
3. Connect your GitHub repository.
4. Deployment settings:
   - **Build Command:** `npm run setup && npm run build`
   - **Start Command:** `npm start`
   - **Environment Variables:**
     - `NODE_ENV`: `production`
     - `PORT`: `5000`
     - `JWT_SECRET`: `your_random_jwt_secret_key`

---

## 🛠️ CRM Service & Remote Maintenance Guide

If you provide this software as a managed service to retail stores, you can remotely diagnose and fix store issues:
1. **Accessing Diagnostics**: In the app, navigate to **Settings** &rarr; **CRM & System Support**.
2. **Checking System Health**: View SQLite integrity status, active record counts, database disk size, and memory usage.
3. **Inspecting Live Errors**: Open the built-in terminal log viewer to read the last 50 error events with full stack traces.
4. **Taking Live Backups**: Click **"Download DB Snapshot"** to save `paridhan-backup-YYYY-MM-DD.sqlite`.
5. **Fresh Store Setup**: When handing the system to a new client, click **"Clean Transaction Data"** or run `npm run clean-data` to wipe all demo bills and customers while keeping their uniform catalog intact.

---

## 📜 License
This project is open-source and available under the [ISC License](LICENSE).
