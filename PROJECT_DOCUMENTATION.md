# MediCare – Hospital Management System (Full Project Documentation)

## 1. Project Overview

**MediCare – Hospital Management System (HMS)** is a modern, lightweight, role-based web application designed for small hospitals and clinics to manage patients, doctors, appointments, medical records, billing, payments, and analytics from a single unified dashboard.

- **Live Hosted URL**: `https://fast-zephyr-86a2cft.tmp.now` (Vercel Project: `spryzen1/fast-zephyr-86a2cft`)
- **Database & Auth Backend**: Supabase (`https://retkvvscptitwasfcqxf.supabase.co`)
- **Primary Stack**: React 18, Vite 6, Tailwind CSS 3, Lucide React, Recharts, Supabase JS v2
- **Supplementary Academic Module**: Standalone C11 Data Structures & Algorithms module (`/c-data-structures/`)

---

## 2. Architecture & Technology Stack

### Frontend
- **Framework**: React (`react` ^18.3.1, `react-dom` ^18.3.1)
- **Routing**: `react-router-dom` (^6.28.0) with role-based `<ProtectedRoute>` guards
- **Build Tool**: Vite (^6.0.0)
- **Styling**: Tailwind CSS (^3.4.17) + PostCSS + Autoprefixer
- **Icons**: `lucide-react` (^0.468.0)
- **Charts**: `recharts` (^2.14.1)

### Backend & Security (Supabase)
- **Database**: PostgreSQL with UUID primary keys, foreign keys, indexes, and partial unique constraints
- **Authentication**: Supabase Auth (`signInWithPassword`, `resetPasswordForEmail`, `updateUser`, automatic session restoration)
- **Authorization**: Database-level Row Level Security (RLS) on all 9 tables, paired with frontend route and UI guards
- **Financial Atomicity**: PostgreSQL `SECURITY DEFINER` RPC (`record_bill_payment`) using row-level locking (`FOR UPDATE`)

### Hosting & Deployment
- **Platform**: Vercel
- **SPA Routing**: Configured in `vercel.json` (`"source": "/(.*)"` → `"destination": "/index.html"`)

---

## 3. UI/UX Design System

- **Color Palette**:
  - Primary: `#2563EB`
  - Secondary: `#0D9488`
  - Background: `#F8FAFC`
  - Cards: `#FFFFFF`
  - Text: `#1E293B`
  - Muted Text: `#64748B`
  - Success: `#16A34A` | Warning: `#F59E0B` | Danger: `#DC2626`
- **Layout**:
  - Collapsible Sidebar (`250px` expanded, `75px` collapsed on desktop, slide-over drawer on mobile)
  - Sticky Topbar (`70px` height) with page title, live global search (patients & doctors), notifications dropdown, IST date display, and user profile dropdown
  - Print-optimized stylesheets (`@media print` hiding `.no-print` elements for invoices, receipts, patient profiles, medical records, and reports)
- **Regional Formatting (`src/utils/formatters.js`)**:
  - Currency: INR (`₹`) via `Intl.NumberFormat('en-IN')`
  - Date Format: `DD/MM/YYYY` (`en-GB`, `Asia/Kolkata`)
  - Time Format: 12-hour (`AM`/`PM`)

---

## 4. User Roles & Permissions

| Module / Capability | Admin | Receptionist | Doctor |
| :--- | :---: | :---: | :---: |
| **Dashboard** | Full | Full | Full |
| **Patients (View / Search / Export)** | Yes | Yes | Yes |
| **Patients (Add / Edit)** | Yes | Yes | No |
| **Patients (Delete)** | Yes | No | No |
| **Doctors (View / Schedule)** | Yes | Yes | Yes |
| **Doctors (Add / Edit / Delete)** | Yes | No | No |
| **Appointments (Book / Edit / Cancel)** | Yes | Yes | Status Update |
| **Medical Records (View / Add / Edit)** | Yes | **Blocked (UI + RLS)** | Yes |
| **Medical Records (Delete)** | Yes | No | No |
| **Billing & Payments** | Yes | Yes | **Blocked (UI)** |
| **Reports & CSV/PDF Export** | Yes | Yes | **Blocked (UI)** |
| **Settings (Profile & Password)** | Yes | Yes | Yes |
| **Settings (Hospital Info & User Management)** | Yes | No | No |

---

## 5. Application Modules & File Map

| Module | File Path | Key Features |
| :--- | :--- | :--- |
| **Entry & Routing** | `src/App.jsx`, `src/main.jsx` | Protected routes, role guards, active-user check |
| **Auth Context** | `src/context/AuthContext.jsx` | Session restoration, `signIn`, `signOut`, `resetPassword`, hospital & profile state |
| **Layout Shell** | `src/components/Layout.jsx` | Sidebar, mobile drawer, topbar, global search, notifications, profile menu |
| **Shared UI** | `src/components/UI.jsx` | `StatusBadge`, `Modal`, `Pagination`, `LoadingSpinner`, `EmptyState`, `AlertBanner` |
| **Login** | `src/pages/LoginPage.jsx` | Email/password login, Remember Me, password visibility toggle, Forgot Password modal |
| **Dashboard** | `src/pages/DashboardPage.jsx` | 6 live KPIs, Appointment Overview, Revenue Analytics, Recent Patients, Today's Schedule, Quick Actions |
| **Patients** | `src/pages/PatientsPage.jsx` | Search/filter/paginate, auto `PAT-` ID, DOB age calculation, phone validation, duplicate prevention, CSV export |
| **Patient Profile** | `src/pages/PatientProfilePage.jsx` | Demographics, appointment history, medical history, prescriptions, billing & payment history, Print Profile |
| **Doctors** | `src/pages/DoctorsPage.jsx` | Doctor CRUD (Admin), specialization filter, available days/times, Doctor Profile & Schedule modal |
| **Appointments** | `src/pages/AppointmentsPage.jsx` | List View + Daily/Weekly/Monthly Calendar Views, double-booking & day-availability validation |
| **Medical Records** | `src/pages/MedicalRecordsPage.jsx` | Clinical notes, diagnosis, treatment, prescriptions, chronological patient history, Print Record |
| **Billing** | `src/pages/BillingPage.jsx` | Itemized bill generator, draft bill deletion, printable hospital invoice with GST & payment history |
| **Payments** | `src/pages/PaymentsPage.jsx` | Full/partial payment collection via `record_bill_payment` RPC, outstanding bills tab, printable receipts |
| **Reports** | `src/pages/ReportsPage.jsx` | 9 report types, date/doctor/status filters, 4 Recharts visualizations, CSV & printable PDF export |
| **Settings** | `src/pages/SettingsPage.jsx` | Profile update, password change, hospital branding/contact settings, staff user creation & role assignment |

---

## 6. Database Schema & Security (`supabase/migrations/001_initial_schema.sql`)

### Tables (9)
1. **`profiles`**: `id` (UUID, PK → `auth.users`), `full_name`, `email`, `role` (`admin` | `receptionist` | `doctor`), `is_active`, `created_at`
2. **`hospitals`**: `id`, `name`, `logo_url`, `address`, `phone`, `email`, `website`, `gst_number`, `currency`, `date_format`, `time_format`, `timezone`, `created_at`
3. **`patients`**: `id`, `patient_code`, `full_name`, `date_of_birth`, `gender`, `blood_group`, `phone`, `email`, `address`, `emergency_contact`, `allergies`, `existing_conditions`, `registration_date`, `created_at`
4. **`doctors`**: `id`, `doctor_code`, `profile_id`, `full_name`, `gender`, `specialization`, `qualification`, `phone`, `email`, `consultation_fee`, `availability`, `available_days`, `available_time`, `is_active`, `created_at`
5. **`appointments`**: `id`, `appointment_code`, `patient_id`, `doctor_id`, `appointment_date`, `appointment_time`, `reason`, `notes`, `status` (`Scheduled` | `Confirmed` | `Completed` | `Cancelled` | `No Show`), `created_at`
6. **`medical_records`**: `id`, `record_code`, `patient_id`, `doctor_id`, `symptoms`, `diagnosis`, `treatment`, `prescription`, `notes`, `follow_up_date`, `created_at`, `updated_at`
7. **`bills`**: `id`, `bill_code`, `patient_id`, `appointment_id`, `consultation_fee`, `medicine_charges`, `laboratory_charges`, `other_charges`, `total_amount`, `paid_amount`, `balance`, `status` (`Paid` | `Partially Paid` | `Unpaid`), `created_at`
8. **`payments`**: `id`, `payment_code`, `bill_id`, `patient_id`, `amount`, `payment_method` (`Cash` | `UPI` | `Card` | `Bank Transfer`), `transaction_reference`, `payment_date`, `created_at`
9. **`audit_logs`**: `id`, `user_id`, `action`, `table_name`, `record_id`, `details` (JSONB), `created_at`

### Key Database Safeguards
- **Double-Booking Prevention**: Unique partial index `idx_unique_doctor_slot` on `(doctor_id, appointment_date, appointment_time) WHERE status NOT IN ('Cancelled', 'No Show')`.
- **Auto-Role Assignment**: Trigger `on_auth_user_created` → `handle_new_user()` assigns `admin` to the first registered user and `receptionist` (or metadata role) to subsequent users.
- **Medical Audit Trail**: Trigger `trg_audit_medical_records` → `audit_medical_record_changes()` logs every insert/update/delete on `medical_records` into `audit_logs`.
- **Atomic Payments**: `record_bill_payment(p_bill_id, p_amount, p_payment_method, p_transaction_reference)` locks the bill row (`FOR UPDATE`), blocks overpayments (`p_amount > v_bill.balance`), inserts an immutable payment row, updates `paid_amount`/`balance`/`status`, and logs to `audit_logs`.

---

## 7. C Data Structures & Algorithms Module (`/c-data-structures/`)

> **Highlighted Module Overview**
>
> The `/c-data-structures/` directory is a standalone, portable **C11** implementation demonstrating how core hospital operations—patient registry, appointment queuing, action undo history, fast patient lookup, and clinical record sorting—map directly onto classic **Data Structures and Algorithms**. Every structure uses explicit heap allocation (`malloc`/`free`) with strict bounds-safe string formatting (`snprintf`), null-pointer guards, and complete memory cleanup.

### 7.1 Core Entity Structures

| Entity | Files | Fields & Design |
| :--- | :--- | :--- |
| **`Patient`** | `patient.h` / `patient.c` | `id` (`int`), `name` (`char[100]`), `age` (`int`), `gender` (`char[16]`), `blood_group` (`char[8]`), `phone` (`char[20]`). Constructed via `create_patient(...)` and formatted via `print_patient(...)`. |
| **`Doctor`** | `doctor.h` / `doctor.c` | `id` (`int`), `name` (`char[100]`), `specialization` (`char[64]`), `consultation_fee` (`double`), `is_available` (`int`). Constructed via `create_doctor(...)` and formatted via `print_doctor(...)`. |
| **`Appointment`** | `appointment.h` / `appointment.c` | `id`, `patient_id`, `doctor_id`, `date` (`YYYY-MM-DD` for lexicographical sorting), `time` (`HH:MM`), `status` (`Scheduled`, `Completed`, `Cancelled`). |

---

### 7.2 Detailed Data Structures Breakdown

#### 1. Singly Linked List — Dynamic Patient Registry (`linked_list.h` / `linked_list.c`)
- **Hospital Use Case**: Dynamically maintains an unbounded list of active patients without fixed array limits.
- **Structure**: `PatientList` holds a `head` pointer (`PatientNode *`) and an integer `count`. Each `PatientNode` stores a `Patient` struct and `next` pointer.
- **Operations & Complexity**:
  - `list_insert(list, patient)` — $O(1)$ head insertion using `malloc`.
  - `list_delete_by_id(list, patient_id)` — $O(n)$ traversal, unlinks target node and calls `free(curr)`.
  - `list_find_by_id(list, patient_id)` — $O(n)$ linear lookup returning `Patient *`.
  - `list_traverse(list)` — $O(n)$ prints all patient records.
  - `list_free(list)` — $O(n)$ frees every node and resets `head = NULL`, `count = 0`.

#### 2. FIFO Queue — Appointment Scheduling (`queue.h` / `queue.c`)
- **Hospital Use Case**: Models first-come, first-served patient consultation scheduling.
- **Structure**: `AppointmentQueue` maintains `front` and `rear` pointers (`QueueNode *`) and `size`.
- **Operations & Complexity**:
  - `queue_enqueue(q, appointment)` — $O(1)$ appends new appointment to `rear`.
  - `queue_dequeue(q, &out)` — $O(1)$ removes and returns the next appointment from `front`, freeing the node.
  - `queue_display(q)` — $O(n)$ lists waiting appointments from `front` to `rear`.
  - `queue_free(q)` — $O(n)$ releases all queued nodes.

#### 3. LIFO Stack — Undo Operations (`stack.h` / `stack.c`)
- **Hospital Use Case**: Tracks recent administrative actions (`UndoAction` storing `action_type` and `record_id`, e.g., `"ADD_PATIENT"`, `"BOOK_APPOINTMENT"`) so the most recent operation can be undone.
- **Structure**: `UndoStack` maintains a `top` pointer (`StackNode *`) and `size`.
- **Operations & Complexity**:
  - `stack_push(s, action_type, record_id)` — $O(1)$ pushes an action onto `top`.
  - `stack_pop(s, &out)` — $O(1)$ pops and frees the most recent action.
  - `stack_free(s)` — $O(n)$ frees all remaining stack nodes.

#### 4. Binary Search Tree (BST) — Ordered Patient Indexing (`bst.h` / `bst.c`)
- **Hospital Use Case**: Maintains patients ordered by `patient.id` for sorted reporting and logarithmic search.
- **Structure**: `BSTNode` stores `Patient data`, `left`, and `right` child pointers.
- **Operations & Complexity**:
  - `bst_insert(root, patient)` — $O(h)$ recursive insertion ($O(\log n)$ average, $O(n)$ worst-case); updates in place if `id` already exists.
  - `bst_search(root, patient_id)` — $O(h)$ recursive search by ID.
  - `bst_delete(root, patient_id)` — $O(h)$ handles leaf, single-child, and two-child (inorder successor `find_min`) deletion safely.
  - `bst_inorder(root)` — $O(n)$ prints all patients in ascending `id` order.
  - `bst_free(root)` — $O(n)$ post-order traversal freeing all nodes.

#### 5. Hash Table — $O(1)$ Patient ID Lookup (`hash_table.h` / `hash_table.c`)
- **Hospital Use Case**: Provides instant constant-time average lookup of a patient record by numeric ID.
- **Structure**: `PatientHashTable` uses separate chaining with `HASH_TABLE_SIZE = 31` buckets (`HashEntry *buckets[31]`) and modular hashing (`abs(id) % 31`).
- **Operations & Complexity**:
  - `ht_insert(ht, patient)` — $O(1)$ average; inserts or updates existing key in bucket chain.
  - `ht_lookup(ht, patient_id)` — $O(1)$ average lookup returning `Patient *`.
  - `ht_delete(ht, patient_id)` — $O(1)$ average removal with `free()`.
  - `ht_free(ht)` — $O(n + B)$ frees all chained entries across all 31 buckets.

---

### 7.3 Sorting & Searching Algorithms (`algorithms.h`, `sorting.c`, `searching.c`)

| Algorithm | Function | Complexity | Purpose in HMS |
| :--- | :--- | :--- | :--- |
| **Merge Sort** | `sort_patients_by_name(arr, n)` | $O(n \log n)$ | Alphabetically sorts patients by `name` using `strcmp` and heap-allocated temporary merge buffers (`malloc`/`free`). |
| **Insertion Sort** | `sort_patients_by_id(arr, n)` | $O(n^2)$ | Sorts patient array by `id` as a prerequisite for Binary Search. |
| **Selection Sort** | `sort_appointments_by_date(arr, n)` | $O(n^2)$ | Chronologically orders appointments by `date` (`YYYY-MM-DD`) and tie-breaks by `time` (`HH:MM`). |
| **Linear Search** | `linear_search_patient_by_name(arr, n, name)` | $O(n)$ | Finds a patient's array index by exact name match. |
| **Binary Search** | `binary_search_patient_by_id(arr, n, target_id)` | $O(\log n)$ | Fast lookup on an ID-sorted patient array. |

---

### 7.4 Compilation, Memory Safety & Test Driver (`main.c`, `Makefile`)

- **Build Command**:
  ```bash
  cd c-data-structures
  gcc -Wall -Wextra -std=c11 -O2 main.c patient.c doctor.c appointment.c linked_list.c queue.c stack.c bst.c hash_table.c sorting.c searching.c -o medicare_ds
  ./medicare_ds
  ```
  *(Or simply run `make && ./medicare_ds` using the included `Makefile`.)*
- **Memory Safety**: Every `malloc` is checked for `NULL`, every string copy uses `snprintf` to prevent buffer overflows, and `main.c` explicitly calls `list_free`, `queue_free`, `stack_free`, `bst_free`, and `ht_free` before exiting.
- **Test Coverage in `main.c`**: Exercises 4 sample patients (`PAT-0101` to `PAT-0104`), 1 doctor (`DOC-0201`), linked list insert/delete/traverse, queue enqueue/dequeue, stack push/pop, BST inorder traversal & search, hash table lookup, Merge Sort, Linear Search, Binary Search, and appointment date sorting.

---

## 8. Verification Summary

- **Production Build**: `npm run build` passed (exit code `0`, Vite 6.4.6).
- **Local Dev Server**: Verified HTTP `200` on `/`, `127.0.0.1:5173`, and `/login`.
- **Supabase REST API**: Verified HTTP `200` on `/rest/v1/patients` with public anon key; verified Admin user creation & auto-profile trigger.
- **Live Vercel Deployment**: Deployed and verified HTTP `200` on `https://fast-zephyr-86a2cft.tmp.now`, claimed under Vercel project `spryzen1/fast-zephyr-86a2cft`.
- **C Module**: Compiled with `gcc -Wall -Wextra -std=c11 -O2` via WSL with zero warnings and passed all runtime tests (`exit code 0`).
