import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, Eye, Pencil, Trash2, Stethoscope, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate, formatTime12h, generateCode, validatePhone } from '../utils/formatters';
import {
  AlertBanner,
  EmptyState,
  LoadingSpinner,
  Modal,
  Pagination,
  StatusBadge,
} from '../components/UI';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const PAGE_SIZE = 10;

const emptyForm = {
  full_name: '',
  gender: 'Male',
  specialization: '',
  qualification: '',
  phone: '',
  email: '',
  consultation_fee: '500',
  available_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  available_time: '09:00 AM - 05:00 PM',
  is_active: true,
};

export default function DoctorsPage() {
  const { role } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [specFilter, setSpecFilter] = useState('All');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState({ type: '', message: '' });

  const [profileDoctor, setProfileDoctor] = useState(null);
  const [doctorAppts, setDoctorAppts] = useState([]);

  const isAdmin = role === 'admin';

  const fetchDoctors = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('doctors')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setBanner({ type: 'error', message: error.message });
    } else {
      setDoctors(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  useEffect(() => {
    if (searchParams.get('action') === 'new' && isAdmin) {
      setEditingId(null);
      setForm(emptyForm);
      setModalOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, isAdmin]);

  const openProfile = async (doc) => {
    setProfileDoctor(doc);
    if (!supabase) return;
    const { data } = await supabase
      .from('appointments')
      .select('*, patients(full_name)')
      .eq('doctor_id', doc.id)
      .order('appointment_date', { ascending: false })
      .limit(20);
    setDoctorAppts(data || []);
  };

  const toggleDay = (day) => {
    setForm((prev) => ({
      ...prev,
      available_days: prev.available_days.includes(day)
        ? prev.available_days.filter((d) => d !== day)
        : [...prev.available_days, day],
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validatePhone(form.phone)) {
      setBanner({ type: 'error', message: 'Please enter a valid 10-15 digit phone number.' });
      return;
    }

    setSaving(true);
    setBanner({ type: '', message: '' });

    try {
      const daysText = form.available_days.join(', ');
      const payload = {
        full_name: form.full_name.trim(),
        gender: form.gender,
        specialization: form.specialization.trim(),
        qualification: form.qualification.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        consultation_fee: Number(form.consultation_fee || 0),
        available_days: form.available_days,
        available_time: form.available_time.trim(),
        availability: `${daysText} (${form.available_time.trim()})`,
        is_active: form.is_active,
      };

      if (editingId) {
        const { error } = await supabase.from('doctors').update(payload).eq('id', editingId);
        if (error) throw error;
        setBanner({ type: 'success', message: 'Doctor updated successfully.' });
      } else {
        payload.doctor_code = generateCode('DOC');
        const { error } = await supabase.from('doctors').insert([payload]);
        if (error) throw error;
        setBanner({ type: 'success', message: `Doctor added with ID ${payload.doctor_code}.` });
      }

      setModalOpen(false);
      await fetchDoctors();
    } catch (err) {
      setBanner({ type: 'error', message: err.message || 'Failed to save doctor.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Delete Dr. ${doc.full_name}?`)) return;
    const { error } = await supabase.from('doctors').delete().eq('id', doc.id);
    if (error) {
      setBanner({ type: 'error', message: error.message });
    } else {
      setBanner({ type: 'success', message: 'Doctor deleted.' });
      fetchDoctors();
    }
  };

  const specializations = ['All', ...new Set(doctors.map((d) => d.specialization).filter(Boolean))];

  const filtered = doctors.filter((d) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      d.full_name?.toLowerCase().includes(q) ||
      d.doctor_code?.toLowerCase().includes(q) ||
      d.specialization?.toLowerCase().includes(q);
    const matchesSpec = specFilter === 'All' || d.specialization === specFilter;
    return matchesSearch && matchesSpec;
  });

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
          <h2 className="text-lg font-semibold text-slate-900">Doctors &amp; Specialists</h2>
          <p className="text-sm text-slate-500">Manage doctor profiles, consultation fees, and schedules</p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setForm(emptyForm);
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#2563EB] rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Doctor
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by Doctor ID, name, or specialization..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={specFilter}
          onChange={(e) => {
            setSpecFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {specializations.map((s) => (
            <option key={s} value={s}>
              {s === 'All' ? 'All Specializations' : s}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <LoadingSpinner label="Loading doctors..." />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Stethoscope}
            title="No doctors found"
            description="No doctors match your search criteria."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-medium">Doctor ID</th>
                    <th className="px-4 py-3 font-medium">Doctor Name</th>
                    <th className="px-4 py-3 font-medium">Specialization</th>
                    <th className="px-4 py-3 font-medium">Phone</th>
                    <th className="px-4 py-3 font-medium">Fee</th>
                    <th className="px-4 py-3 font-medium">Availability</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginated.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{d.doctor_code}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">Dr. {d.full_name}</td>
                      <td className="px-4 py-3 text-slate-600">{d.specialization}</td>
                      <td className="px-4 py-3 text-slate-600">{d.phone}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {formatCurrency(d.consultation_fee)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 max-w-[200px] truncate">
                        {d.availability}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={d.is_active ? 'Active' : 'Inactive'} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openProfile(d)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#2563EB] hover:bg-blue-50"
                            title="View Profile & Schedule"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingId(d.id);
                                  setForm({
                                    full_name: d.full_name || '',
                                    gender: d.gender || 'Male',
                                    specialization: d.specialization || '',
                                    qualification: d.qualification || '',
                                    phone: d.phone || '',
                                    email: d.email || '',
                                    consultation_fee: String(d.consultation_fee ?? '500'),
                                    available_days: d.available_days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
                                    available_time: d.available_time || '09:00 AM - 05:00 PM',
                                    is_active: d.is_active !== false,
                                  });
                                  setModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50"
                                title="Edit Doctor"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(d)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50"
                                title="Delete Doctor"
                              >
                                <Trash2 className="w-4 h-4" />
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

      {/* Add / Edit Doctor Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Doctor' : 'Add New Doctor'}
        size="xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
              <select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Specialization <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Cardiology, Pediatrics"
                value={form.specialization}
                onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Qualification</label>
              <input
                type="text"
                placeholder="e.g., MBBS, MD"
                value={form.qualification}
                onChange={(e) => setForm({ ...form, qualification: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Consultation Fee (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={form.consultation_fee}
                onChange={(e) => setForm({ ...form, consultation_fee: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Available Time</label>
              <input
                type="text"
                placeholder="09:00 AM - 05:00 PM"
                value={form.available_time}
                onChange={(e) => setForm({ ...form, available_time: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Available Days</label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day) => {
                const active = form.available_days.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      active
                        ? 'bg-[#2563EB] text-white border-[#2563EB]'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              id="doc-active"
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="w-4 h-4 rounded border-slate-300 text-[#2563EB]"
            />
            <label htmlFor="doc-active" className="text-sm text-slate-700">
              Doctor is active and available for appointments
            </label>
          </div>

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
              {saving ? 'Saving...' : editingId ? 'Update Doctor' : 'Add Doctor'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Doctor Profile & Schedule Modal */}
      <Modal
        open={Boolean(profileDoctor)}
        onClose={() => setProfileDoctor(null)}
        title={profileDoctor ? `Dr. ${profileDoctor.full_name}` : ''}
        subtitle={profileDoctor ? `${profileDoctor.specialization} • ${profileDoctor.doctor_code}` : ''}
        size="lg"
      >
        {profileDoctor && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm">
              <div>
                <span className="text-xs text-slate-400 block">Qualification</span>
                <span className="font-medium text-slate-800">{profileDoctor.qualification || '—'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Consultation Fee</span>
                <span className="font-medium text-slate-800">
                  {formatCurrency(profileDoctor.consultation_fee)}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Phone</span>
                <span className="font-medium text-slate-800">{profileDoctor.phone}</span>
              </div>
              <div className="col-span-2 sm:col-span-3">
                <span className="text-xs text-slate-400 block">Working Schedule</span>
                <span className="font-medium text-slate-800">{profileDoctor.availability}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                <p className="text-xs text-blue-700">Assigned Appointments</p>
                <p className="text-xl font-bold text-blue-900">{doctorAppts.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-green-50 border border-green-100">
                <p className="text-xs text-green-700">Completed Appointments</p>
                <p className="text-xl font-bold text-green-900">
                  {doctorAppts.filter((a) => a.status === 'Completed').length}
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#2563EB]" />
                Recent &amp; Upcoming Appointments
              </h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Time</th>
                      <th className="px-3 py-2">Patient</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {doctorAppts.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-4 text-center text-slate-500">
                          No appointments assigned.
                        </td>
                      </tr>
                    ) : (
                      doctorAppts.map((a) => (
                        <tr key={a.id}>
                          <td className="px-3 py-2">{formatDate(a.appointment_date)}</td>
                          <td className="px-3 py-2">{formatTime12h(a.appointment_time)}</td>
                          <td className="px-3 py-2">{a.patients?.full_name || '—'}</td>
                          <td className="px-3 py-2">
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
        )}
      </Modal>
    </div>
  );
}
