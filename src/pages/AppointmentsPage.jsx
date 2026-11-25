import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  Calendar as CalendarIcon,
  List,
  CheckCircle2,
  XCircle,
  Clock,
  Pencil,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatTime12h, generateCode, getTodayISO } from '../utils/formatters';
import {
  AlertBanner,
  EmptyState,
  LoadingSpinner,
  Modal,
  Pagination,
  StatusBadge,
} from '../components/UI';

const STATUSES = ['Scheduled', 'Confirmed', 'Completed', 'Cancelled', 'No Show'];
const PAGE_SIZE = 10;

const emptyForm = {
  patient_id: '',
  doctor_id: '',
  appointment_date: getTodayISO(),
  appointment_time: '10:00',
  reason: '',
  notes: '',
  status: 'Scheduled',
};

export default function AppointmentsPage() {
  const { role } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar'
  const [calendarMode, setCalendarMode] = useState('daily'); // 'daily' | 'weekly' | 'monthly'
  const [selectedDate, setSelectedDate] = useState(getTodayISO());

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [doctorFilter, setDoctorFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState({ type: '', message: '' });

  const canBook = ['admin', 'receptionist'].includes(role);

  const fetchAll = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [apptRes, patRes, docRes] = await Promise.all([
      supabase
        .from('appointments')
        .select('*, patients(patient_code, full_name), doctors(doctor_code, full_name, specialization)')
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: true }),
      supabase.from('patients').select('id, patient_code, full_name').order('full_name'),
      supabase
        .from('doctors')
        .select('id, doctor_code, full_name, specialization, available_days, is_active')
        .eq('is_active', true)
        .order('full_name'),
    ]);

    if (apptRes.error) setBanner({ type: 'error', message: apptRes.error.message });
    setAppointments(apptRes.data || []);
    setPatients(patRes.data || []);
    setDoctors(docRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (searchParams.get('action') === 'new' && canBook) {
      setEditingId(null);
      setForm({ ...emptyForm, appointment_date: getTodayISO() });
      setModalOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, canBook]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setBanner({ type: '', message: '' });

    try {
      const today = getTodayISO();
      if (!editingId && form.appointment_date < today) {
        throw new Error('Appointment date cannot be in the past.');
      }

      // Check doctor availability on selected day of week
      const doc = doctors.find((d) => d.id === form.doctor_id);
      if (doc && Array.isArray(doc.available_days) && doc.available_days.length > 0) {
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const chosenDay = dayNames[new Date(`${form.appointment_date}T00:00:00`).getDay()];
        if (!doc.available_days.includes(chosenDay)) {
          throw new Error(`Dr. ${doc.full_name} is not available on ${chosenDay}.`);
        }
      }

      // Check double booking
      const timeFormatted = form.appointment_time.length === 5 ? `${form.appointment_time}:00` : form.appointment_time;
      let conflictQuery = supabase
        .from('appointments')
        .select('id, appointment_code')
        .eq('doctor_id', form.doctor_id)
        .eq('appointment_date', form.appointment_date)
        .eq('appointment_time', timeFormatted)
        .not('status', 'in', '("Cancelled","No Show")');

      if (editingId) {
        conflictQuery = conflictQuery.neq('id', editingId);
      }

      const { data: conflicts } = await conflictQuery;
      if (conflicts && conflicts.length > 0) {
        throw new Error('Double booking prevented: this doctor already has an appointment at this date and time.');
      }

      const payload = {
        patient_id: form.patient_id,
        doctor_id: form.doctor_id,
        appointment_date: form.appointment_date,
        appointment_time: timeFormatted,
        reason: form.reason.trim(),
        notes: form.notes.trim(),
        status: form.status,
      };

      if (editingId) {
        const { error } = await supabase.from('appointments').update(payload).eq('id', editingId);
        if (error) throw error;
        setBanner({ type: 'success', message: 'Appointment updated successfully.' });
      } else {
        payload.appointment_code = generateCode('APT');
        const { error } = await supabase.from('appointments').insert([payload]);
        if (error) throw error;
        setBanner({ type: 'success', message: `Appointment booked (${payload.appointment_code}).` });
      }

      setModalOpen(false);
      await fetchAll();
    } catch (err) {
      setBanner({ type: 'error', message: err.message || 'Failed to save appointment.' });
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (appt, newStatus) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', appt.id);
    if (error) {
      setBanner({ type: 'error', message: error.message });
    } else {
      setBanner({ type: 'success', message: `Appointment ${appt.appointment_code} marked as ${newStatus}.` });
      fetchAll();
    }
  };

  const filtered = appointments.filter((a) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      a.appointment_code?.toLowerCase().includes(q) ||
      a.patients?.full_name?.toLowerCase().includes(q) ||
      a.doctors?.full_name?.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'All' || a.status === statusFilter;
    const matchesDoctor = doctorFilter === 'All' || a.doctor_id === doctorFilter;
    const matchesDate = !dateFilter || a.appointment_date === dateFilter;
    return matchesSearch && matchesStatus && matchesDoctor && matchesDate;
  });

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Calendar filtering helper
  const getCalendarAppointments = () => {
    if (calendarMode === 'daily') {
      return appointments.filter((a) => a.appointment_date === selectedDate);
    }
    if (calendarMode === 'weekly') {
      const base = new Date(`${selectedDate}T00:00:00`);
      const day = base.getDay();
      const start = new Date(base);
      start.setDate(base.getDate() - day);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      const startISO = start.toISOString().slice(0, 10);
      const endISO = end.toISOString().slice(0, 10);
      return appointments.filter((a) => a.appointment_date >= startISO && a.appointment_date <= endISO);
    }
    const monthPrefix = selectedDate.slice(0, 7);
    return appointments.filter((a) => a.appointment_date?.startsWith(monthPrefix));
  };

  const calendarAppts = getCalendarAppointments();

  return (
    <div className="space-y-5">
      {banner.message && (
        <AlertBanner
          type={banner.type}
          message={banner.message}
          onClose={() => setBanner({ type: '', message: '' })}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Appointments</h2>
          <p className="text-sm text-slate-500">Schedule, reschedule, and track patient visits</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md ${
                viewMode === 'list' ? 'bg-[#2563EB] text-white' : 'text-slate-600'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              List
            </button>
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md ${
                viewMode === 'calendar' ? 'bg-[#2563EB] text-white' : 'text-slate-600'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              Calendar
            </button>
          </div>
          {canBook && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm({ ...emptyForm, appointment_date: getTodayISO() });
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#2563EB] rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Book Appointment
            </button>
          )}
        </div>
      </div>

      {viewMode === 'list' ? (
        <>
          <div className="bg-white p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search ID, patient, doctor..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
            <select
              value={doctorFilter}
              onChange={(e) => {
                setDoctorFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              <option value="All">All Doctors</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  Dr. {d.full_name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              <option value="All">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {loading ? (
              <LoadingSpinner label="Loading appointments..." />
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={CalendarIcon}
                title="No appointments found"
                description="Book a new appointment or clear your filters."
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 font-medium">Appt ID</th>
                        <th className="px-4 py-3 font-medium">Patient</th>
                        <th className="px-4 py-3 font-medium">Doctor</th>
                        <th className="px-4 py-3 font-medium">Date</th>
                        <th className="px-4 py-3 font-medium">Time</th>
                        <th className="px-4 py-3 font-medium">Reason</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginated.map((a) => (
                        <tr key={a.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono text-xs text-slate-600">
                            {a.appointment_code}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {a.patients?.full_name || '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            Dr. {a.doctors?.full_name || '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{formatDate(a.appointment_date)}</td>
                          <td className="px-4 py-3 text-slate-600">{formatTime12h(a.appointment_time)}</td>
                          <td className="px-4 py-3 text-slate-500 max-w-[180px] truncate">
                            {a.reason || '—'}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={a.status} />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-1">
                              {a.status !== 'Completed' && a.status !== 'Cancelled' && (
                                <button
                                  type="button"
                                  onClick={() => updateStatus(a, 'Completed')}
                                  className="p-1.5 rounded-lg text-green-600 hover:bg-green-50"
                                  title="Mark Completed"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                              )}
                              {canBook && a.status !== 'Cancelled' && a.status !== 'Completed' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingId(a.id);
                                      setForm({
                                        patient_id: a.patient_id,
                                        doctor_id: a.doctor_id,
                                        appointment_date: a.appointment_date,
                                        appointment_time: (a.appointment_time || '').slice(0, 5),
                                        reason: a.reason || '',
                                        notes: a.notes || '',
                                        status: a.status,
                                      });
                                      setModalOpen(true);
                                    }}
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50"
                                    title="Edit / Reschedule"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateStatus(a, 'No Show')}
                                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
                                    title="Mark No Show"
                                  >
                                    <Clock className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateStatus(a, 'Cancelled')}
                                    className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                                    title="Cancel Appointment"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
              </>
            )}
          </div>
        </>
      ) : (
        /* Calendar View */
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div className="flex items-center gap-2">
              {['daily', 'weekly', 'monthly'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setCalendarMode(mode)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize ${
                    calendarMode === mode
                      ? 'bg-[#2563EB] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {mode} View
                </button>
              ))}
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
            />
          </div>

          {calendarAppts.length === 0 ? (
            <EmptyState
              icon={CalendarIcon}
              title="No appointments in this period"
              description={`No appointments found for the selected ${calendarMode} window.`}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {calendarAppts.map((a) => (
                <div
                  key={a.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-slate-500">{a.appointment_code}</span>
                    <StatusBadge status={a.status} />
                  </div>
                  <p className="font-semibold text-slate-900">{a.patients?.full_name}</p>
                  <p className="text-xs text-slate-600">Dr. {a.doctors?.full_name}</p>
                  <p className="text-xs font-medium text-[#2563EB]">
                    {formatDate(a.appointment_date)} • {formatTime12h(a.appointment_time)}
                  </p>
                  {a.reason && <p className="text-xs text-slate-500 truncate">{a.reason}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Book / Reschedule Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit / Reschedule Appointment' : 'Book New Appointment'}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Patient <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={form.patient_id}
                onChange={(e) => setForm({ ...form, patient_id: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="">Select Patient</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} ({p.patient_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Doctor <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={form.doctor_id}
                onChange={(e) => setForm({ ...form, doctor_id: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="">Select Doctor</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    Dr. {d.full_name} ({d.specialization})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Appointment Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={form.appointment_date}
                onChange={(e) => setForm({ ...form, appointment_date: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Appointment Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                required
                value={form.appointment_time}
                onChange={(e) => setForm({ ...form, appointment_time: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reason for Visit</label>
            <input
              type="text"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="e.g., Routine checkup, fever, follow-up"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>

          {editingId && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-[#2563EB] rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingId ? 'Update Appointment' : 'Book Appointment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
