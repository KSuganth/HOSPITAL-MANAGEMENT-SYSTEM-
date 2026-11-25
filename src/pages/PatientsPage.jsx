import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  Download,
  Eye,
  Pencil,
  Trash2,
  Users,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
  calculateAge,
  exportToCSV,
  formatDate,
  generateCode,
  getTodayISO,
  validatePhone,
} from '../utils/formatters';
import {
  AlertBanner,
  EmptyState,
  LoadingSpinner,
  Modal,
  Pagination,
} from '../components/UI';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];
const PAGE_SIZE = 10;

const emptyForm = {
  full_name: '',
  date_of_birth: '',
  gender: 'Male',
  blood_group: 'Unknown',
  phone: '',
  email: '',
  address: '',
  emergency_contact: '',
  registration_date: getTodayISO(),
  allergies: '',
  existing_conditions: '',
};

export default function PatientsPage() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState('All');
  const [bloodFilter, setBloodFilter] = useState('All');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState({ type: '', message: '' });

  const canManage = ['admin', 'receptionist'].includes(role);
  const canDelete = role === 'admin';

  const fetchPatients = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setBanner({ type: 'error', message: error.message });
    } else {
      setPatients(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  useEffect(() => {
    if (searchParams.get('action') === 'new' && canManage) {
      setEditingId(null);
      setForm({ ...emptyForm, registration_date: getTodayISO() });
      setModalOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, canManage]);

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...emptyForm, registration_date: getTodayISO() });
    setModalOpen(true);
  };

  const openEdit = (p) => {
    setEditingId(p.id);
    setForm({
      full_name: p.full_name || '',
      date_of_birth: p.date_of_birth || '',
      gender: p.gender || 'Male',
      blood_group: p.blood_group || 'Unknown',
      phone: p.phone || '',
      email: p.email || '',
      address: p.address || '',
      emergency_contact: p.emergency_contact || '',
      registration_date: p.registration_date || getTodayISO(),
      allergies: p.allergies || '',
      existing_conditions: p.existing_conditions || '',
    });
    setModalOpen(true);
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
      // Prevent duplicate registration (same full_name + phone)
      if (!editingId) {
        const { data: existing } = await supabase
          .from('patients')
          .select('id, patient_code')
          .ilike('full_name', form.full_name.trim())
          .eq('phone', form.phone.trim())
          .maybeSingle();

        if (existing) {
          setBanner({
            type: 'error',
            message: `Duplicate patient detected (${existing.patient_code}). A patient with this name and phone number already exists.`,
          });
          setSaving(false);
          return;
        }
      }

      const payload = {
        full_name: form.full_name.trim(),
        date_of_birth: form.date_of_birth,
        gender: form.gender,
        blood_group: form.blood_group,
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        emergency_contact: form.emergency_contact.trim(),
        registration_date: form.registration_date,
        allergies: form.allergies.trim(),
        existing_conditions: form.existing_conditions.trim(),
      };

      if (editingId) {
        const { error } = await supabase.from('patients').update(payload).eq('id', editingId);
        if (error) throw error;
        setBanner({ type: 'success', message: 'Patient updated successfully.' });
      } else {
        payload.patient_code = generateCode('PAT');
        const { error } = await supabase.from('patients').insert([payload]);
        if (error) throw error;
        setBanner({ type: 'success', message: `Patient registered with ID ${payload.patient_code}.` });
      }

      setModalOpen(false);
      await fetchPatients();
    } catch (err) {
      setBanner({ type: 'error', message: err.message || 'Failed to save patient.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (patient) => {
    if (!window.confirm(`Delete patient ${patient.full_name} (${patient.patient_code})?`)) return;
    const { error } = await supabase.from('patients').delete().eq('id', patient.id);
    if (error) {
      setBanner({ type: 'error', message: error.message });
    } else {
      setBanner({ type: 'success', message: 'Patient deleted.' });
      fetchPatients();
    }
  };

  const filtered = patients.filter((p) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      p.full_name?.toLowerCase().includes(q) ||
      p.patient_code?.toLowerCase().includes(q) ||
      p.phone?.toLowerCase().includes(q);
    const matchesGender = genderFilter === 'All' || p.gender === genderFilter;
    const matchesBlood = bloodFilter === 'All' || p.blood_group === bloodFilter;
    return matchesSearch && matchesGender && matchesBlood;
  });

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleExport = () => {
    exportToCSV(
      `patients-${getTodayISO()}.csv`,
      ['Patient ID', 'Full Name', 'Age', 'Gender', 'Blood Group', 'Phone', 'Email', 'Registration Date'],
      filtered.map((p) => [
        p.patient_code,
        p.full_name,
        calculateAge(p.date_of_birth),
        p.gender,
        p.blood_group,
        p.phone,
        p.email,
        formatDate(p.registration_date),
      ])
    );
  };

  return (
    <div className="space-y-5">
      {banner.message && (
        <AlertBanner
          type={banner.type}
          message={banner.message}
          onClose={() => setBanner({ type: '', message: '' })}
        />
      )}

      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Patients Directory</h2>
          <p className="text-sm text-slate-500">Manage patient registrations, demographics, and profiles</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          {canManage && (
            <button
              type="button"
              onClick={openAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#2563EB] rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Add Patient
            </button>
          )}
        </div>
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
            placeholder="Search by Patient ID, name, or phone..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={genderFilter}
          onChange={(e) => {
            setGenderFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="All">All Genders</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>
        <select
          value={bloodFilter}
          onChange={(e) => {
            setBloodFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="All">All Blood Groups</option>
          {BLOOD_GROUPS.map((bg) => (
            <option key={bg} value={bg}>
              {bg}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <LoadingSpinner label="Loading patients..." />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No patients found"
            description="Try adjusting your search or register a new patient."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-medium">Patient ID</th>
                    <th className="px-4 py-3 font-medium">Patient Name</th>
                    <th className="px-4 py-3 font-medium">Age</th>
                    <th className="px-4 py-3 font-medium">Gender</th>
                    <th className="px-4 py-3 font-medium">Phone</th>
                    <th className="px-4 py-3 font-medium">Blood Group</th>
                    <th className="px-4 py-3 font-medium">Registered</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginated.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{p.patient_code}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{p.full_name}</td>
                      <td className="px-4 py-3 text-slate-600">{calculateAge(p.date_of_birth)} yrs</td>
                      <td className="px-4 py-3 text-slate-600">{p.gender}</td>
                      <td className="px-4 py-3 text-slate-600">{p.phone}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-0.5 rounded bg-red-50 text-red-700 text-xs font-medium">
                          {p.blood_group || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(p.registration_date)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => navigate(`/patients/${p.id}`)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#2563EB] hover:bg-blue-50"
                            title="View Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => openEdit(p)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50"
                              title="Edit Patient"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDelete(p)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50"
                              title="Delete Patient"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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

      {/* Add / Edit Patient Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Patient' : 'Register New Patient'}
        subtitle="Fill in personal and clinical intake details."
        size="xl"
      >
        <form onSubmit={handleSave} className="space-y-5">
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
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Date of Birth <span className="text-red-500">*</span>
                {form.date_of_birth && (
                  <span className="ml-2 text-xs font-normal text-[#0D9488]">
                    (Age: {calculateAge(form.date_of_birth)} yrs)
                  </span>
                )}
              </label>
              <input
                type="date"
                required
                max={getTodayISO()}
                value={form.date_of_birth}
                onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Gender <span className="text-red-500">*</span>
              </label>
              <select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Blood Group</label>
              <select
                value={form.blood_group}
                onChange={(e) => setForm({ ...form, blood_group: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                required
                placeholder="+91 9876543210"
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Emergency Contact</label>
              <input
                type="text"
                placeholder="Name & phone"
                value={form.emergency_contact}
                onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Registration Date</label>
              <input
                type="date"
                required
                value={form.registration_date}
                onChange={(e) => setForm({ ...form, registration_date: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
            <textarea
              rows={2}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Allergies (optional)</label>
              <input
                type="text"
                placeholder="e.g., Penicillin, Peanuts"
                value={form.allergies}
                onChange={(e) => setForm({ ...form, allergies: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Existing Conditions (optional)
              </label>
              <input
                type="text"
                placeholder="e.g., Diabetes, Hypertension"
                value={form.existing_conditions}
                onChange={(e) => setForm({ ...form, existing_conditions: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
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
              {saving ? 'Saving...' : editingId ? 'Update Patient' : 'Register Patient'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
