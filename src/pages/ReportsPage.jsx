import { useEffect, useState, useCallback, useMemo } from 'react';
import { Download, Printer } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { supabase } from '../lib/supabase';
import { exportToCSV, formatCurrency, formatDate, getTodayISO } from '../utils/formatters';
import { LoadingSpinner, StatusBadge } from '../components/UI';

const REPORT_TYPES = [
  { id: 'daily_patient', label: '1. Daily Patient Report' },
  { id: 'monthly_patient', label: '2. Monthly Patient Report' },
  { id: 'doctor_appt', label: '3. Doctor Appointment Report' },
  { id: 'completed_appt', label: '4. Completed Appointment Report' },
  { id: 'cancelled_appt', label: '5. Cancelled Appointment Report' },
  { id: 'daily_revenue', label: '6. Daily Revenue Report' },
  { id: 'monthly_revenue', label: '7. Monthly Revenue Report' },
  { id: 'outstanding_payment', label: '8. Outstanding Payment Report' },
  { id: 'patient_reg', label: '9. Patient Registration Report' },
];

const PIE_COLORS = ['#16A34A', '#F59E0B', '#DC2626'];

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [bills, setBills] = useState([]);
  const [payments, setPayments] = useState([]);

  const today = getTodayISO();
  const [reportType, setReportType] = useState('daily_patient');
  const [startDate, setStartDate] = useState(`${today.slice(0, 7)}-01`);
  const [endDate, setEndDate] = useState(today);
  const [doctorId, setDoctorId] = useState('All');
  const [apptStatus, setApptStatus] = useState('All');
  const [paymentStatus, setPaymentStatus] = useState('All');

  const fetchAll = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [pRes, dRes, aRes, bRes, payRes] = await Promise.all([
      supabase.from('patients').select('*').order('registration_date', { ascending: false }),
      supabase.from('doctors').select('id, full_name, specialization').order('full_name'),
      supabase
        .from('appointments')
        .select('*, patients(patient_code, full_name), doctors(full_name)')
        .order('appointment_date', { ascending: false }),
      supabase
        .from('bills')
        .select('*, patients(patient_code, full_name)')
        .order('created_at', { ascending: false }),
      supabase
        .from('payments')
        .select('*, bills(bill_code), patients(full_name)')
        .order('payment_date', { ascending: false }),
    ]);

    setPatients(pRes.data || []);
    setDoctors(dRes.data || []);
    setAppointments(aRes.data || []);
    setBills(bRes.data || []);
    setPayments(payRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Charts derived from actual DB data
  const monthlyPatientsChart = useMemo(() => {
    const counts = {};
    patients.forEach((p) => {
      const m = (p.registration_date || '').slice(0, 7);
      if (m) counts[m] = (counts[m] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, count]) => ({ month, count }));
  }, [patients]);

  const dailyApptsChart = useMemo(() => {
    const counts = {};
    appointments.forEach((a) => {
      const d = a.appointment_date;
      if (d) counts[d] = (counts[d] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-7)
      .map(([date, count]) => ({ date: date.slice(5), count }));
  }, [appointments]);

  const monthlyRevenueChart = useMemo(() => {
    const totals = {};
    payments.forEach((p) => {
      const m = (p.payment_date || '').slice(0, 7);
      if (m) totals[m] = (totals[m] || 0) + Number(p.amount || 0);
    });
    return Object.entries(totals)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, revenue]) => ({ month, revenue }));
  }, [payments]);

  const paymentStatusPie = useMemo(() => {
    const counts = { Paid: 0, 'Partially Paid': 0, Unpaid: 0 };
    bills.forEach((b) => {
      if (counts[b.status] !== undefined) counts[b.status] += 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [bills]);

  // Filtered table rows for selected report
  const reportData = useMemo(() => {
    const inRange = (d) => {
      const ds = (d || '').slice(0, 10);
      return (!startDate || ds >= startDate) && (!endDate || ds <= endDate);
    };

    switch (reportType) {
      case 'daily_patient':
      case 'monthly_patient':
      case 'patient_reg': {
        const list = patients.filter((p) =>
          reportType === 'daily_patient'
            ? p.registration_date === endDate
            : inRange(p.registration_date)
        );
        return {
          headers: ['Patient ID', 'Full Name', 'Gender', 'Blood Group', 'Phone', 'Registration Date'],
          rows: list.map((p) => [
            p.patient_code,
            p.full_name,
            p.gender,
            p.blood_group,
            p.phone,
            formatDate(p.registration_date),
          ]),
        };
      }

      case 'doctor_appt':
      case 'completed_appt':
      case 'cancelled_appt': {
        const list = appointments.filter((a) => {
          if (!inRange(a.appointment_date)) return false;
          if (doctorId !== 'All' && a.doctor_id !== doctorId) return false;
          if (reportType === 'completed_appt') return a.status === 'Completed';
          if (reportType === 'cancelled_appt') return a.status === 'Cancelled';
          if (apptStatus !== 'All') return a.status === apptStatus;
          return true;
        });
        return {
          headers: ['Appt ID', 'Date', 'Patient', 'Doctor', 'Status'],
          rows: list.map((a) => [
            a.appointment_code,
            formatDate(a.appointment_date),
            a.patients?.full_name || '—',
            `Dr. ${a.doctors?.full_name || '—'}`,
            a.status,
          ]),
        };
      }

      case 'daily_revenue':
      case 'monthly_revenue': {
        const list = payments.filter((p) =>
          reportType === 'daily_revenue'
            ? (p.payment_date || '').slice(0, 10) === endDate
            : inRange(p.payment_date)
        );
        return {
          headers: ['Payment ID', 'Bill ID', 'Patient', 'Method', 'Date', 'Amount'],
          rows: list.map((p) => [
            p.payment_code,
            p.bills?.bill_code || '—',
            p.patients?.full_name || '—',
            p.payment_method,
            formatDate(p.payment_date),
            formatCurrency(p.amount),
          ]),
        };
      }

      case 'outstanding_payment':
      default: {
        const list = bills.filter((b) => {
          if (!inRange(b.created_at)) return false;
          if (paymentStatus !== 'All' && b.status !== paymentStatus) return false;
          return Number(b.balance) > 0;
        });
        return {
          headers: ['Bill ID', 'Patient', 'Total', 'Paid', 'Balance', 'Status'],
          rows: list.map((b) => [
            b.bill_code,
            b.patients?.full_name || '—',
            formatCurrency(b.total_amount),
            formatCurrency(b.paid_amount),
            formatCurrency(b.balance),
            b.status,
          ]),
        };
      }
    }
  }, [reportType, startDate, endDate, doctorId, apptStatus, paymentStatus, patients, appointments, bills, payments]);

  if (loading) return <LoadingSpinner label="Loading analytics & reports..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Reports &amp; Analytics</h2>
          <p className="text-sm text-slate-500">Real-time operational, clinical, and financial insights</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => exportToCSV(`${reportType}-${today}.csv`, reportData.headers, reportData.rows)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#2563EB] rounded-lg hover:bg-blue-700"
          >
            <Printer className="w-4 h-4" />
            Print PDF
          </button>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 no-print">
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Monthly Patient Registrations</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyPatientsChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Daily Appointments (Last 7 Active Days)</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyApptsChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#0D9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Monthly Revenue (INR)</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyRevenueChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Bar dataKey="revenue" fill="#16A34A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Payment Status Distribution</h3>
          <div className="h-56 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={paymentStatusPie} dataKey="value" nameKey="name" outerRadius={80} label>
                  {paymentStatusPie.map((entry, idx) => (
                    <Cell key={entry.name} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Report Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 no-print">
        <div className="lg:col-span-2">
          <label className="block text-xs font-medium text-slate-500 mb-1">Report Type</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
          >
            {REPORT_TYPES.map((rt) => (
              <option key={rt.id} value={rt.id}>
                {rt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Doctor</label>
          <select
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
          >
            <option value="All">All Doctors</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                Dr. {d.full_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Status Filter</label>
          {reportType === 'outstanding_payment' ? (
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              <option value="All">All Unpaid/Partial</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Unpaid">Unpaid</option>
            </select>
          ) : (
            <select
              value={apptStatus}
              onChange={(e) => setApptStatus(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              <option value="All">All Statuses</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
              <option value="No Show">No Show</option>
            </select>
          )}
        </div>
      </div>

      {/* Report Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">
            {REPORT_TYPES.find((r) => r.id === reportType)?.label}
          </h3>
          <span className="text-xs text-slate-500">{reportData.rows.length} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
              <tr>
                {reportData.headers.map((h) => (
                  <th key={h} className="px-4 py-3 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reportData.rows.length === 0 ? (
                <tr>
                  <td colSpan={reportData.headers.length} className="px-4 py-8 text-center text-slate-500">
                    No matching records for this report filter.
                  </td>
                </tr>
              ) : (
                reportData.rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-4 py-3 text-slate-700">
                        {reportData.headers[cIdx] === 'Status' ? <StatusBadge status={cell} /> : cell}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
