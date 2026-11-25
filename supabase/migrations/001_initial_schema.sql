-- ============================================================================
-- MediCare – Hospital Management System
-- Supabase PostgreSQL Schema, Indexes, Triggers, Transactions & RLS Policies
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. TABLES
-- ============================================================================

-- 1.1 Profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'receptionist', 'doctor')) DEFAULT 'receptionist',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.2 Hospitals (Hospital & Application Settings)
CREATE TABLE IF NOT EXISTS public.hospitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'MediCare Clinic & Hospital',
  logo_url TEXT DEFAULT '',
  address TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  website TEXT DEFAULT '',
  gst_number TEXT DEFAULT '',
  currency TEXT NOT NULL DEFAULT 'INR',
  date_format TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
  time_format TEXT NOT NULL DEFAULT '12-hour',
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.3 Patients
CREATE TABLE IF NOT EXISTS public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_code TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
  blood_group TEXT CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown')) DEFAULT 'Unknown',
  phone TEXT NOT NULL,
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  emergency_contact TEXT DEFAULT '',
  allergies TEXT DEFAULT '',
  existing_conditions TEXT DEFAULT '',
  registration_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.4 Doctors
CREATE TABLE IF NOT EXISTS public.doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_code TEXT UNIQUE NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('Male', 'Female', 'Other')) DEFAULT 'Male',
  specialization TEXT NOT NULL,
  qualification TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL,
  email TEXT DEFAULT '',
  consultation_fee NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (consultation_fee >= 0),
  availability TEXT NOT NULL DEFAULT 'Mon - Sat, 09:00 AM - 05:00 PM',
  available_days TEXT[] NOT NULL DEFAULT ARRAY['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  available_time TEXT NOT NULL DEFAULT '09:00 AM - 05:00 PM',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.5 Appointments
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_code TEXT UNIQUE NOT NULL,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE RESTRICT,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  notes TEXT DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('Scheduled', 'Confirmed', 'Completed', 'Cancelled', 'No Show')) DEFAULT 'Scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.6 Medical Records
CREATE TABLE IF NOT EXISTS public.medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_code TEXT UNIQUE NOT NULL DEFAULT ('REC-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 8))),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE RESTRICT,
  symptoms TEXT NOT NULL DEFAULT '',
  diagnosis TEXT NOT NULL,
  treatment TEXT NOT NULL DEFAULT '',
  prescription TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  follow_up_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.7 Bills
CREATE TABLE IF NOT EXISTS public.bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_code TEXT UNIQUE NOT NULL,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  consultation_fee NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (consultation_fee >= 0),
  medicine_charges NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (medicine_charges >= 0),
  laboratory_charges NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (laboratory_charges >= 0),
  other_charges NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (other_charges >= 0),
  total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  paid_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  balance NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  status TEXT NOT NULL CHECK (status IN ('Paid', 'Partially Paid', 'Unpaid')) DEFAULT 'Unpaid',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.8 Payments
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_code TEXT UNIQUE NOT NULL DEFAULT ('PAY-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 8))),
  bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE RESTRICT,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('Cash', 'UPI', 'Card', 'Bank Transfer')),
  transaction_reference TEXT DEFAULT '',
  payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.9 Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  details JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. INDEXES & CONSTRAINTS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_patients_code ON public.patients(patient_code);
CREATE INDEX IF NOT EXISTS idx_patients_name ON public.patients(full_name);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON public.patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_reg_date ON public.patients(registration_date);

CREATE INDEX IF NOT EXISTS idx_doctors_code ON public.doctors(doctor_code);
CREATE INDEX IF NOT EXISTS idx_doctors_specialization ON public.doctors(specialization);
CREATE INDEX IF NOT EXISTS idx_doctors_profile ON public.doctors(profile_id);

CREATE INDEX IF NOT EXISTS idx_appointments_patient ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON public.appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);

-- Prevent duplicate active appointment bookings for same doctor, date, and time
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_doctor_slot
  ON public.appointments (doctor_id, appointment_date, appointment_time)
  WHERE status NOT IN ('Cancelled', 'No Show');

CREATE INDEX IF NOT EXISTS idx_medical_records_patient ON public.medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_doctor ON public.medical_records(doctor_id);

CREATE INDEX IF NOT EXISTS idx_bills_patient ON public.bills(patient_id);
CREATE INDEX IF NOT EXISTS idx_bills_status ON public.bills(status);
CREATE INDEX IF NOT EXISTS idx_bills_created_at ON public.bills(created_at);

CREATE INDEX IF NOT EXISTS idx_payments_bill ON public.payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_payments_patient ON public.payments(patient_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments(payment_date);

CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON public.audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ============================================================================
-- 3. HELPER FUNCTIONS & TRIGGERS
-- ============================================================================

-- 3.1 Auto-create profile when a new user signs up in Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INTEGER;
  assigned_role TEXT;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  IF user_count = 0 THEN
    assigned_role := 'admin';
  ELSE
    assigned_role := COALESCE(NEW.raw_user_meta_data->>'role', 'receptionist');
    IF assigned_role NOT IN ('admin', 'receptionist', 'doctor') THEN
      assigned_role := 'receptionist';
    END IF;
  END IF;

  INSERT INTO public.profiles (id, full_name, email, role, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email,
    assigned_role,
    TRUE
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3.2 Update timestamp & audit log trigger for medical_records
CREATE OR REPLACE FUNCTION public.audit_medical_record_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.updated_at := NOW();
  END IF;

  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, details)
  VALUES (
    auth.uid(),
    TG_OP,
    'medical_records',
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object(
      'patient_id', COALESCE(NEW.patient_id, OLD.patient_id),
      'doctor_id', COALESCE(NEW.doctor_id, OLD.doctor_id),
      'diagnosis', COALESCE(NEW.diagnosis, OLD.diagnosis)
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_medical_records ON public.medical_records;
CREATE TRIGGER trg_audit_medical_records
  AFTER INSERT OR UPDATE OR DELETE ON public.medical_records
  FOR EACH ROW EXECUTE FUNCTION public.audit_medical_record_changes();

-- 3.3 Transactional RPC for recording a payment against a bill
CREATE OR REPLACE FUNCTION public.record_bill_payment(
  p_bill_id UUID,
  p_amount NUMERIC,
  p_payment_method TEXT,
  p_transaction_reference TEXT DEFAULT ''
)
RETURNS public.payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bill public.bills%ROWTYPE;
  v_new_paid NUMERIC(10, 2);
  v_new_balance NUMERIC(10, 2);
  v_new_status TEXT;
  v_payment public.payments%ROWTYPE;
  v_caller_role TEXT;
BEGIN
  -- Verify caller authorization
  SELECT role INTO v_caller_role
  FROM public.profiles
  WHERE id = auth.uid() AND is_active = TRUE;

  IF v_caller_role NOT IN ('admin', 'receptionist') THEN
    RAISE EXCEPTION 'Unauthorized: only admin or receptionist can record payments';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;

  -- Lock bill row for update to guarantee transactional consistency
  SELECT * INTO v_bill
  FROM public.bills
  WHERE id = p_bill_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bill not found';
  END IF;

  IF p_amount > v_bill.balance THEN
    RAISE EXCEPTION 'Payment amount (%) exceeds outstanding balance (%)', p_amount, v_bill.balance;
  END IF;

  v_new_paid := v_bill.paid_amount + p_amount;
  v_new_balance := v_bill.total_amount - v_new_paid;

  IF v_new_balance <= 0 THEN
    v_new_balance := 0;
    v_new_status := 'Paid';
  ELSIF v_new_paid > 0 THEN
    v_new_status := 'Partially Paid';
  ELSE
    v_new_status := 'Unpaid';
  END IF;

  INSERT INTO public.payments (
    bill_id,
    patient_id,
    amount,
    payment_method,
    transaction_reference,
    payment_date
  )
  VALUES (
    v_bill.id,
    v_bill.patient_id,
    p_amount,
    p_payment_method,
    COALESCE(p_transaction_reference, ''),
    NOW()
  )
  RETURNING * INTO v_payment;

  UPDATE public.bills
  SET
    paid_amount = v_new_paid,
    balance = v_new_balance,
    status = v_new_status
  WHERE id = v_bill.id;

  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, details)
  VALUES (
    auth.uid(),
    'PAYMENT_RECORDED',
    'payments',
    v_payment.id,
    jsonb_build_object(
      'bill_id', v_bill.id,
      'amount', p_amount,
      'method', p_payment_method,
      'new_balance', v_new_balance
    )
  );

  RETURN v_payment;
END;
$$;

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() AND is_active = TRUE;
$$;

CREATE OR REPLACE FUNCTION public.is_active_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_active = TRUE
  );
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.current_user_role() = 'admin');

CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY "Admins can update profiles"
  ON public.profiles FOR UPDATE
  USING (public.current_user_role() = 'admin' OR auth.uid() = id);

-- Hospitals policies
CREATE POLICY "Active staff can view hospital settings"
  ON public.hospitals FOR SELECT
  USING (public.is_active_staff());

CREATE POLICY "Admins can manage hospital settings"
  ON public.hospitals FOR ALL
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- Patients policies
CREATE POLICY "Active staff can view patients"
  ON public.patients FOR SELECT
  USING (public.is_active_staff());

CREATE POLICY "Admin and receptionist can insert patients"
  ON public.patients FOR INSERT
  WITH CHECK (public.current_user_role() IN ('admin', 'receptionist'));

CREATE POLICY "Admin and receptionist can update patients"
  ON public.patients FOR UPDATE
  USING (public.current_user_role() IN ('admin', 'receptionist'));

CREATE POLICY "Only admin can delete patients"
  ON public.patients FOR DELETE
  USING (public.current_user_role() = 'admin');

-- Doctors policies
CREATE POLICY "Active staff can view doctors"
  ON public.doctors FOR SELECT
  USING (public.is_active_staff());

CREATE POLICY "Only admin can insert doctors"
  ON public.doctors FOR INSERT
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY "Only admin can update doctors"
  ON public.doctors FOR UPDATE
  USING (public.current_user_role() = 'admin');

CREATE POLICY "Only admin can delete doctors"
  ON public.doctors FOR DELETE
  USING (public.current_user_role() = 'admin');

-- Appointments policies
CREATE POLICY "Active staff can view appointments"
  ON public.appointments FOR SELECT
  USING (public.is_active_staff());

CREATE POLICY "Admin and receptionist can insert appointments"
  ON public.appointments FOR INSERT
  WITH CHECK (public.current_user_role() IN ('admin', 'receptionist'));

CREATE POLICY "Staff can update appointments"
  ON public.appointments FOR UPDATE
  USING (public.current_user_role() IN ('admin', 'receptionist', 'doctor'));

CREATE POLICY "Admin and receptionist can delete appointments"
  ON public.appointments FOR DELETE
  USING (public.current_user_role() IN ('admin', 'receptionist'));

-- Medical records policies (Strictly Admin & Doctor only)
CREATE POLICY "Only admin and doctor can view medical records"
  ON public.medical_records FOR SELECT
  USING (public.current_user_role() IN ('admin', 'doctor'));

CREATE POLICY "Only admin and doctor can insert medical records"
  ON public.medical_records FOR INSERT
  WITH CHECK (public.current_user_role() IN ('admin', 'doctor'));

CREATE POLICY "Only admin and doctor can update medical records"
  ON public.medical_records FOR UPDATE
  USING (public.current_user_role() IN ('admin', 'doctor'));

CREATE POLICY "Only admin can delete medical records"
  ON public.medical_records FOR DELETE
  USING (public.current_user_role() = 'admin');

-- Bills policies
CREATE POLICY "Active staff can view bills"
  ON public.bills FOR SELECT
  USING (public.is_active_staff());

CREATE POLICY "Admin and receptionist can insert bills"
  ON public.bills FOR INSERT
  WITH CHECK (public.current_user_role() IN ('admin', 'receptionist'));

CREATE POLICY "Admin and receptionist can update bills"
  ON public.bills FOR UPDATE
  USING (public.current_user_role() IN ('admin', 'receptionist'));

CREATE POLICY "Admin and receptionist can delete unpaid draft bills"
  ON public.bills FOR DELETE
  USING (
    public.current_user_role() IN ('admin', 'receptionist')
    AND status = 'Unpaid'
    AND paid_amount = 0
  );

-- Payments policies (Append-only for financial integrity)
CREATE POLICY "Active staff can view payments"
  ON public.payments FOR SELECT
  USING (public.is_active_staff());

CREATE POLICY "Admin and receptionist can insert payments"
  ON public.payments FOR INSERT
  WITH CHECK (public.current_user_role() IN ('admin', 'receptionist'));

-- Audit logs policies
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.current_user_role() = 'admin');

CREATE POLICY "Active staff can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (public.is_active_staff());

-- ============================================================================
-- 5. DEFAULT HOSPITAL RECORD
-- ============================================================================
INSERT INTO public.hospitals (name, address, phone, email, currency, date_format, time_format, timezone)
SELECT
  'MediCare Hospital & Clinic',
  '120 Health Avenue, Bengaluru, Karnataka 560001',
  '+91 80 4123 4567',
  'contact@medicare-hms.in',
  'INR',
  'DD/MM/YYYY',
  '12-hour',
  'Asia/Kolkata'
WHERE NOT EXISTS (SELECT 1 FROM public.hospitals);
