import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Stethoscope,
  Calendar,
  CheckCircle2,
  Clock,
  IndianRupee,
  UserPlus,
  CalendarPlus,
  Receipt,
  ArrowUpRight,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
  calculateAge,
  formatCurrency,
  formatDate,
  formatTime12h,
  getTodayISO,
} from '../utils/formatters';
import { LoadingSpinner, StatusBadge, AlertBanner } from '../components/UI';

export default function DashboardPage() {
  const { role } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [kpis, setKpis] = useState({
    totalPatients: 0,
    totalDoctors: 0,
    todaysAppointments: 0,
    completedAppointments: 0,
    pendingAppointments: 0,
    todaysRevenue: 0,
  });
  const [apptOverview, setApptOverview] = useState({
    today: 0,
    upcoming: 0,
    completed: 0,
    cancelled: 0,
  });
  const [recentPatients, setRecentPatients] = useState([]);
  const [todaysSchedule, setTodaysSchedule] = useState([]);
  const [revenue, setRevenue] = useState({
    daily: 0,
    monthly: 0,
    totalCollected: 0,
    pendingPayments: 0,
  });

  const loadDashboard = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const today = getTodayISO();
      const monthStart = `${today.slice(0, 7)}-01`;

      const [
        patientsCountRes,
        doctorsCountRes,
        apptsRes,
        recentPatientsRes,
        todaysScheduleRes,
        paymentsRes,
        billsRes,
      ] = await Promise.all([
        supabase.from('patients').select('id', { count: 'exact', head: true }),
        supabase.from('doctors').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('appointments').select('id, appointment_date, status'),
        supabase
          .from('patients')
          .select('id, patient_code, full_name, date_of_birth, gender, phone, registration_date')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('appointments')
          .select('id, appointment_time, status, patients(full_name), doctors(full_name)')
          .eq('appointment_date', today)
          .order('appointment_time', { ascending: true })
          .limit(8),
        supabase.from('payments').select('amount, payment_date'),
        supabase.from('bills').select('balance'),
      ]);

      const appts = apptsRes.data || [];
      const todayAppts = appts.filter((a) => a.appointment_date === today);
      const upcomingAppts = appts.filter(
        (a) => a.appointment_date > today && ['Scheduled', 'Confirmed'].includes(a.status)
      );
      const completedAppts = appts.filter((a) => a.status === 'Completed');
      const cancelledAppts = appts.filter((a) => a.status === 'Cancelled');
      const pendingAppts = appts.filter((a) => ['Scheduled', 'Confirmed'].includes(a.status));

      const payments = paymentsRes.data || [];
      const dailyRev = payments
        .filter((p) => (p.payment_date || '').slice(0, 10) === today)
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const monthlyRev = payments
        .filter((p) => (p.payment_date || '').slice(0, 10) >= monthStart)
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const pendingPayments = (billsRes.data || []).reduce(
        (sum, b) => sum + Number(b.balance || 0),
        0
      );

      setKpis({
        totalPatients: patientsCountRes.count || 0,
        totalDoctors: doctorsCountRes.count || 0,
        todaysAppointments: todayAppts.length,
        completedAppointments: completedAppts.length,
        pendingAppointments: pendingAppts.length,
        todaysRevenue: dailyRev,
      });

      setApptOverview({
        today: todayAppts.length,
        upcoming: upcomingAppts.length,
        completed: completedAppts.length,
        cancelled: cancelledAppts.length,
      });

      setRecentPatients(recentPatientsRes.data || []);
      setTodaysSchedule(todaysScheduleRes.data || []);
      setRevenue({
        daily: dailyRev,
        monthly: monthlyRev,
        totalCollected,
        pendingPayments,
      });
    } catch (err) {
      setError(err.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (loading) return <LoadingSpinner label="Loading hospital dashboard..." />;

  const kpiCards = [
    {
      title: 'Total Patients',
      value: kpis.totalPatients,
      sub: 'Registered records',
      icon: Users,
      color: 'bg-blue-50 text-[#2563EB]',
    },
    {
      title: 'Total Doctors',
      value: kpis.totalDoctors,
      sub: 'Active practitioners',
      icon: Stethoscope,
      color: 'bg-teal-50 text-[#0D9488]',
    },
    {
      title: "Today's Appointments",
      value: kpis.todaysAppointments,
      sub: 'Scheduled for today',
      icon: Calendar,
      color: 'bg-indigo-50 text-indigo-600',
    },
    {
      title: 'Completed Appointments',
      value: kpis.completedAppointments,
      sub: 'All-time completed',
      icon: CheckCircle2,
      color: 'bg-green-50 text-[#16A34A]',
    },
    {
      title: 'Pending Appointments',
      value: kpis.pendingAppointments,
      sub: 'Scheduled / Confirmed',
      icon: Clock,
      color: 'bg-amber-50 text-[#F59E0B]',
    },
    {
      title: "Today's Revenue",
      value: formatCurrency(kpis.todaysRevenue),
      sub: 'Collected today',
      icon: IndianRupee,
      color: 'bg-emerald-50 text-emerald-600',
    },
  ];

  return (
    <div className="space-y-6">
      {error && <AlertBanner type="error" message={error} onClose={() => setError('')} />}

      {/* E. Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Quick Actions</h2>
          <p className="text-xs text-slate-500">Fast access to common hospital workflows</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {['admin', 'receptionist'].includes(role) && (
            <button
              type="button"
              onClick={() => navigate('/patients?action=new')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-white bg-[#2563EB] rounded-lg hover:bg-blue-700 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Add Patient
            </button>
          )}
          {role === 'admin' && (
            <button
              type="button"
              onClick={() => navigate('/doctors?action=new')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-white bg-[#0D9488] rounded-lg hover:bg-teal-700 transition-colors"
            >
              <Stethoscope className="w-4 h-4" />
              Add Doctor
            </button>
          )}
          {['admin', 'receptionist'].includes(role) && (
            <>
              <button
                type="button"
                onClick={() => navigate('/appointments?action=new')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <CalendarPlus className="w-4 h-4" />
                Book Appointment
              </button>
              <button
                type="button"
                onClick={() => navigate('/billing?action=new')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <Receipt className="w-4 h-4" />
                Generate Bill
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="bg-white rounded-xl border border-slate-200 p-5 flex items-start justify-between hover:shadow-sm transition-shadow"
            >
              <div>
                <p className="text-sm font-medium text-slate-500">{card.title}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{card.value}</p>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                  {card.sub}
                </p>
              </div>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${card.color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* A. Appointment Overview & D. Revenue Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-900">Appointment Overview</h3>
            <button
              type="button"
              onClick={() => navigate('/appointments')}
              className="text-xs font-medium text-[#2563EB] hover:underline"
            >
              View all
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-lg bg-blue-50/70 border border-blue-100">
              <p className="text-xs font-medium text-blue-700">Today&apos;s Appointments</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">{apptOverview.today}</p>
            </div>
            <div className="p-4 rounded-lg bg-teal-50/70 border border-teal-100">
              <p className="text-xs font-medium text-teal-700">Upcoming</p>
              <p className="text-2xl font-bold text-teal-900 mt-1">{apptOverview.upcoming}</p>
            </div>
            <div className="p-4 rounded-lg bg-green-50/70 border border-green-100">
              <p className="text-xs font-medium text-green-700">Completed</p>
              <p className="text-2xl font-bold text-green-900 mt-1">{apptOverview.completed}</p>
            </div>
            <div className="p-4 rounded-lg bg-red-50/70 border border-red-100">
              <p className="text-xs font-medium text-red-700">Cancelled</p>
              <p className="text-2xl font-bold text-red-900 mt-1">{apptOverview.cancelled}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-900">Revenue Analytics</h3>
            {['admin', 'receptionist'].includes(role) && (
              <button
                type="button"
                onClick={() => navigate('/reports')}
                className="text-xs font-medium text-[#2563EB] hover:underline"
              >
                Full reports
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-xs font-medium text-slate-500">Daily Revenue</p>
              <p className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(revenue.daily)}</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-xs font-medium text-slate-500">Monthly Revenue</p>
              <p className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(revenue.monthly)}</p>
            </div>
            <div className="p-4 rounded-lg bg-emerald-50/70 border border-emerald-100">
              <p className="text-xs font-medium text-emerald-700">Total Collected</p>
              <p className="text-xl font-bold text-emerald-900 mt-1">
                {formatCurrency(revenue.totalCollected)}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-amber-50/70 border border-amber-100">
              <p className="text-xs font-medium text-amber-700">Pending Payments</p>
              <p className="text-xl font-bold text-amber-900 mt-1">
                {formatCurrency(revenue.pendingPayments)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* B. Recent Patients & C. Today's Schedule */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent Patients */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">Recent Patients</h3>
            <button
              type="button"
              onClick={() => navigate('/patients')}
              className="text-xs font-medium text-[#2563EB] hover:underline"
            >
              View all
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Patient ID</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Age / Gender</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentPatients.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No patients registered yet.
                    </td>
                  </tr>
                ) : (
                  recentPatients.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => navigate(`/patients/${p.id}`)}
                      className="hover:bg-slate-50 cursor-pointer"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{p.patient_code}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{p.full_name}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {calculateAge(p.date_of_birth)}y / {p.gender}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{p.phone}</td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(p.registration_date)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Today's Schedule */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">Today&apos;s Schedule</h3>
            <button
              type="button"
              onClick={() => navigate('/appointments')}
              className="text-xs font-medium text-[#2563EB] hover:underline"
            >
              Manage schedule
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Patient</th>
                  <th className="px-4 py-3 font-medium">Doctor</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {todaysSchedule.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                      No appointments scheduled for today.
                    </td>
                  </tr>
                ) : (
                  todaysSchedule.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {formatTime12h(a.appointment_time)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{a.patients?.full_name || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{a.doctors?.full_name || '—'}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={a.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
