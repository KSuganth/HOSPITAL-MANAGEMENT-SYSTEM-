# MediCare – Hospital Management System

A modern, lightweight, role-based Hospital Management System built with **React, Vite, Tailwind CSS, and Supabase (PostgreSQL + Auth + Row Level Security)**, accompanied by a standalone **C Data Structures demonstration module** in `/c-data-structures/`.

---

## Features

- **Authentication & RBAC**: Supabase Auth with session restoration, password reset, and database-enforced Row Level Security for **Admin**, **Receptionist**, and **Doctor** roles.
- **Dashboard**: Real-time KPIs (Total Patients, Total Doctors, Today's Appointments, Completed/Pending Appointments, Today's Revenue), Today's Schedule, Recent Patients, Revenue Analytics, and Quick Actions.
- **Patient Management**: Auto-generated Patient IDs (`PAT-...`), age calculation from DOB, phone validation, duplicate prevention, CSV export, and printable Patient Profiles.
- **Doctor Management**: Specializations, consultation fees, weekly availability, and Doctor Schedule modal.
- **Appointment Management**: Double-booking prevention (UI + PostgreSQL unique partial index), doctor day-availability validation, List View, and Daily/Weekly/Monthly Calendar Views.
- **Medical Records**: Restricted to Admin & Doctor via RLS, chronological patient medical history, printable records, and automatic PostgreSQL audit logging (`audit_logs`).
- **Billing & Payments**: Itemized bill generation, printable hospital invoices, atomic partial/full payments via `record_bill_payment` PostgreSQL RPC (prevents overpayment), and printable payment receipts.
- **Reports & Analytics**: 9 report types with date/doctor/status filters, Recharts visualizations, CSV export, and printable PDF.
- **Settings**: Profile & password management, hospital branding/contact info, and Admin user role/status management.
- **C Data Structures Module**: Pure C11 implementations of Linked List, Queue, Stack, Binary Search Tree, Hash Table, Merge/Insertion/Selection Sort, and Linear/Binary Search.

---

## 1. Local Development Setup

### Prerequisites
- Node.js 18+ and npm
- A free [Supabase](https://supabase.com) project
- (Optional) GCC compiler for the C Data Structures module

### Install & Run
```bash
npm install
cp .env.example .env
```
Edit `.env` and add your public Supabase credentials (never use the `service_role` key in the frontend):
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```
Start the development server:
```bash
npm run dev
```

---

## 2. Supabase Database Setup

1. Open your Supabase Dashboard → **SQL Editor**.
2. Copy the entire contents of `supabase/migrations/001_initial_schema.sql` and run it.
3. This creates all 9 tables (`profiles`, `hospitals`, `patients`, `doctors`, `appointments`, `medical_records`, `bills`, `payments`, `audit_logs`), indexes, unique booking constraint, `handle_new_user` trigger, `audit_medical_record_changes` trigger, `record_bill_payment` RPC, and Row Level Security policies.
4. Create your first user in **Authentication → Users** (or via sign-up). The first user created automatically receives the `admin` role in `public.profiles`.

---

## 3. C Data Structures Module (`/c-data-structures/`)

Compile and run using GCC:
```bash
cd c-data-structures
gcc -Wall -Wextra -std=c11 -O2 main.c patient.c doctor.c appointment.c linked_list.c queue.c stack.c bst.c hash_table.c sorting.c searching.c -o medicare_ds
./medicare_ds
```
Or using `make`:
```bash
cd c-data-structures
make
./medicare_ds
```

---

## 4. Vercel Deployment

1. Push this repository to GitHub.
2. Import the repository into [Vercel](https://vercel.com).
3. Framework Preset: **Vite** (`npm run build`, output directory `dist`).
4. Add Environment Variables in Vercel Project Settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. `vercel.json` is already configured for SPA routing rewrites (`/(.*) -> /index.html`).
6. Deploy!

---

## 5. Production Testing Checklist

- [ ] Login, session persistence on refresh, password reset, and logout work.
- [ ] Role-based access: Receptionist cannot access Medical Records; Doctor can view/edit Medical Records; Admin has full access.
- [ ] Patients: Add, edit, delete (Admin), search, filter, export CSV, and view/print profile.
- [ ] Doctors: Add, edit, delete (Admin), filter by specialization, and view schedule.
- [ ] Appointments: Book, reschedule, cancel, mark completed/no-show, and verify double-booking is blocked.
- [ ] Medical Records: Add/edit records and verify `audit_logs` entries in Supabase.
- [ ] Billing & Payments: Generate bill, collect partial payment, verify balance updates atomically, and print invoice/receipt.
- [ ] Reports: Switch between all 9 report types, apply filters, and export CSV.
