# ⚡ KINESIS — Sports Club Management System

> **24-Hour Hackathon MVP Project**  
> Modern, reliable sports club operations replacing WhatsApp, Excel spreadsheets, and paper records.

---

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Architecture & Data Flow](#architecture--data-flow)
- [Core Business Rules & Logic](#core-business-rules--logic)
- [Database Schema & Seed Data](#database-schema--seed-data)
- [Project Directory Structure](#project-directory-structure)
- [Quick Start Guide](#quick-start-guide)
- [Supabase Setup (Optional Live DB)](#supabase-setup-optional-live-db)
- [Jury Presentation & Demo Walkthrough](#jury-presentation--demo-walkthrough)

---

## 🎯 Project Overview

**Kinesis** is an all-in-one Sports Club Operating System designed for racket clubs, fitness centers, and athletic complexes. It replaces fragmented WhatsApp chats and manual Excel books with a centralized web application covering:

1. **Membership Management**: Tier-based privileges (**Gold**, **Silver**, **Junior**), expiry tracking, and renewal workflows.
2. **Interactive Court Booking**: Conflict-free court scheduler (Tennis Clay/Hard, Squash, Badminton, Padel) with 30-minute start slots and 1-hour durations.
3. **Dynamic Tier-Based Pricing**: Centralized pricing engine that automatically deducts membership discounts from court and pro shop rates.
4. **Member Daily Limits**: Automatic enforcement of daily booking quotas (e.g., max 2 bookings/day for Gold/Silver, 1 for Junior).
5. **Pro Shop Inventory & POS**: Real-time stock tracking with low-stock alerts and automatic stock deduction upon POS checkout.
6. **Executive Dashboard & Analytics**: Live court utilization %, weekly revenue trends (Courts vs. Shop), and member distribution charts.

---

## 🏛️ Architecture & Data Flow

Kinesis follows a clean, single-responsibility architecture without unnecessary backend boilerplate or overengineering:

```text
React 19 + Vite (Frontend SPA)
      ↓
Frontend Pages & Components (Dashboard, Members, Bookings, Inventory)
      ↓
Service Layer (bookingService.js, memberService.js, inventoryService.js)
      ↓
Supabase Client / Resilient Hybrid Fallback Store
      ↓
PostgreSQL Database
```

- **Frontend**: React 19, Vite, Vanilla CSS Design System, Lucide Icons, Recharts.
- **Backend / Services**: Plain JavaScript business-rule functions directly orchestrating Supabase queries.
- **Resilient Zero-Config Fallback**: If Supabase keys are not provided in `.env`, Kinesis runs in **Demo Mode** backed by `localStorage` and pre-populated seed data, guaranteeing **zero crashes and 100% reliability** during live jury presentations.

---

## ⚖️ Core Business Rules & Code Mapping

All rules requested by the jury are strictly enforced in the service layer:

### 1. Court Booking Rules (`backend/services/bookingService.js`)
- **No Overlapping Bookings**: `checkCourtAvailability()` verifies that no existing non-cancelled booking occupies the interval `[startTime, endTime)` on that court.
- **30-Min Start Slots, 1-Hour Duration**: Bookings can start on any half-hour interval (`09:00`, `09:30`, `10:00`, etc.) and automatically lock the court for exactly 60 minutes.
- **Member Daily Quota**: `checkMemberDailyLimit()` counts confirmed bookings on that date against the plan's limit (`daily_booking_limit`: 2 for Gold/Silver, 1 for Junior).
- **Centralized Price Engine**: `calculateBookingPrice()` calculates:
  $$\text{Final Price} = \text{Court Hourly Rate} \times \left(1 - \frac{\text{Plan Court Discount \%}}{100}\right)$$
- **Cancelled Bookings Free Courts**: `cancelBooking()` marks status as `cancelled`; cancelled bookings do not block availability or consume daily quota.
- **Inactive/Expired Member Rules**: Members with status `expired` or `inactive` receive 0% active discount and cannot book courts.

### 2. Inventory & POS Rules (`backend/services/inventoryService.js`)
- **Auto Stock Deduction**: Every sale immediately decreases product `stock_quantity`.
- **Non-Negative Stock Guard**: Purchases exceeding available stock are rejected before execution.
- **Low Stock Threshold Alert**: Products with `stock_quantity <= low_stock_threshold` trigger amber warning badges and dashboard alerts.
- **Member Shop Discounts**: Active members get automatic discounts on pro shop items (Gold: 20%, Junior: 15%, Silver: 10%, Walk-ins: 0%).

---

## 🗄️ Database Schema & Seed Data

The database is built on PostgreSQL / Supabase in `database/schema.sql` and `database/seed.sql`:

1. `membership_plans`: `id`, `name`, `monthly_price`, `court_discount`, `shop_discount`, `bar_discount`, `daily_booking_limit`
2. `members`: `id`, `name`, `email`, `phone`, `plan_id`, `start_date`, `expiry_date`, `status`, `created_at`
3. `courts`: `id`, `name`, `sport`, `hourly_rate`, `status`
4. `bookings`: `id`, `member_id`, `court_id`, `booking_date`, `start_time`, `end_time`, `price`, `status`, `created_at`
5. `products`: `id`, `name`, `category`, `price`, `stock_quantity`, `low_stock_threshold`, `created_at`
6. `sales`: `id`, `product_id`, `member_id`, `quantity`, `unit_price`, `total`, `created_at`

---

## 📂 Project Directory Structure

```text
Kinesis/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx         # Status bar, date & reset seed action
│   │   │   ├── Sidebar.jsx        # Navigation & live badge counts
│   │   │   ├── StatCard.jsx       # Metric cards with glow styling
│   │   │   └── Modal.jsx          # Accessible blurred dialogs
│   │   │
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx      # Overview metrics, charts & court feed
│   │   │   ├── Members.jsx        # Member list, tiers, add/edit/renew
│   │   │   ├── Bookings.jsx       # Timeline grid, clash prevention, POS
│   │   │   └── Inventory.jsx      # Stock catalog, low-stock warnings, POS
│   │   │
│   │   ├── App.jsx                # Layout & active tab state
│   │   ├── main.jsx               # React DOM entry point
│   │   ├── index.css              # Custom sports club design system
│   │   └── supabase.js            # Frontend Supabase proxy
│   │
│   ├── index.html                 # HTML template with Plus Jakarta Sans
│   ├── vite.config.js             # Vite aliases & server config
│   ├── package.json
│   └── .env.example
│
├── backend/
│   ├── services/
│   │   ├── memberService.js       # CRUD & tier benefit logic
│   │   ├── bookingService.js      # Collision checks & pricing engine
│   │   ├── inventoryService.js    # Stock control & sale discounts
│   │   ├── initialData.js         # Realistic seed data mirroring SQL
│   │   ├── supabaseClient.js      # Dual-mode Supabase/Local store
│   │   └── index.js
│   │
│   └── package.json
│
├── database/
│   ├── schema.sql                 # DDL, indexes, and stock triggers
│   └── seed.sql                   # Realistic sample data
│
├── README.md
└── .gitignore
```

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)

### 1. Install Dependencies
```bash
cd frontend
npm install --legacy-peer-deps
```

### 2. Start the Development Server
```bash
npm run dev
```

Open `http://localhost:5173` in your browser. The app runs immediately with pre-loaded demo data!

---

## 🔌 Supabase Setup (Optional Live DB)

To connect Kinesis to your live Supabase cloud project:

1. Create a new project in [Supabase](https://supabase.com).
2. Go to the **SQL Editor** tab in your Supabase dashboard.
3. Paste the contents of `database/schema.sql` and click **Run**.
4. Paste the contents of `database/seed.sql` and click **Run**.
5. Copy your **Project URL** and **anon public key** from Project Settings > API.
6. Create `frontend/.env`:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```
7. Restart `npm run dev`. The top navbar badge will illuminate green: **`🟢 Supabase Live`**.

---

## 🏆 Jury Presentation & Demo Walkthrough

When presenting to the hackathon jury, follow this 3-minute sequence:

1. **Dashboard Overview**:
   - Point out **Active Members**, **Today's Bookings**, **Court Utilization %**, and **Shop Revenue**.
   - Show the **Low Stock Alert Banner** identifying items requiring reordering.
   - Highlight the **Recharts visual analytics** comparing court revenue vs. shop merchandise.

2. **Membership & Tier Privileges**:
   - Navigate to **Memberships**.
   - Explain the 3 tiers: **Gold** (50% court discount, 20% shop discount), **Silver** (25% court, 10% shop), and **Junior** (35% court, 15% shop).
   - Demonstrate adding a new member and notice how the expiry date and privileges calculate automatically.

3. **Court Availability & Centralized Pricing**:
   - Navigate to **Court Bookings** and toggle the **Timeline Grid**.
   - Click an available slot on Tennis Court 1 at `14:00`.
   - Select a **Gold member**: notice the price automatically drops from $40.00 to **$20.00** (50% discount).
   - Try to book a slot that is already reserved or exceeds daily limits: notice the instant conflict prevention warning!
   - Cancel a booking and observe that the slot immediately reopens on the timeline.

4. **Pro Shop POS & Inventory**:
   - Navigate to **Pro Shop & Stock**.
   - Show the visual **Stock Health** tags (`In Stock`, `Low Stock (2 left)`).
   - Click **New POS Checkout**, pick an item (e.g. Dunlop Squash Balls), select a member, and watch the member discount auto-apply.
   - Complete the checkout: notice the inventory stock count drops immediately and appears in **Sales History**.
