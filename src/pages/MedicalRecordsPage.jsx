import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Eye, Pencil, Printer, FileText, History } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatDate, formatDateTime, generateCode } from '../utils/formatters';
import { AlertBanner, EmptyState, LoadingSpinner, Modal, Pagination } from '../components/UI';

const PAGE_SIZE = 10;

const emptyForm = {
  patient_id: '',
  doctor_id: '',
  symptoms: '',
  diagnosis: '',
  treatment: '',
  prescription: '',
  notes: '',
  follow_up_date: '',
};

export default function MedicalRecordsPage() {
  const [records, setRecords] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState({ type: '', message: '' });

  const [viewRecord, setViewRecord] = useState(null);
  const [historyPatient, setHistoryPatient] = useState(null);

  const fetchAll = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [recRes, patRes, docRes] = await Promise.all([
      supabase
        .from('medical_records')
        .select('*, patients(id, patient_code, full_name), doctors(id, doctor_code, full_name, specialization)')
        .order('created_at', { ascending: false }),
      supabase.from('patients').select('id, patient_code, full_name').order('full_name'),
      supabase.from('doctors').select('id, doctor_code, full_name, specialization').eq('is_active', true).order('full_name'),
    ]);

    if (recRes.error) setBanner({ type: 'error', message: recRes.error.message });
    setRecords(recRes.data || []);
    setPatients(patRes.data || []);
    setDoctors(docRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setBanner({ type: '', message: '' });

    try {
      const payload = {
        patient_id: form.patient_id,
        doctor_id: form.doctor_id,
        symptoms: form.symptoms.trim(),
        diagnosis: form.diagnosis.trim(),
        treatment: form.treatment.trim(),
        prescription: form.prescription.trim(),
        notes: form.notes.trim(),
        follow_up_date: form.follow_up_date || null,
      };

      if (editingId) {
        const { error } = await supabase.from('medical_records').update(payload).eq('id', editingId);
        if (error) throw error;
        setBanner({ type: 'success', message: 'Medical record updated (audit log recorded).' });
      } else {
        payload.record_code = generateCode('REC');
        const { error } = await supabase.from('medical_records').insert([payload]);
        if (error) throw error;
        setBanner({ type: 'success', message: `Medical record ${payload.record_code} created.` });
      }

      setModalOpen(false);
      await fetchAll();
    } catch (err) {
      setBanner({ type: 'error', message: err.message || 'Failed to save medical record.' });
    } finally {
      setSaving(false);
    }
  };

  const filtered = records.filter((r) => {
    const q = search.trim().toLowerCase();
    return (
      !q ||
      r.record_code?.toLowerCase().includes(q) ||
      r.patients?.full_name?.toLowerCase().includes(q) ||
      r.doctors?.full_name?.toLowerCase().includes(q) ||
      r.diagnosis?.toLowerCase().includes(q)
    );
  });

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const patientHistoryRecords = historyPatient
    ? records.filter((r) => r.patient_id === historyPatient.id)
    : [];

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
          <h2 className="text-lg font-semibold text-slate-900">Medical Records</h2>
          <p className="text-sm text-slate-500">
            Clinical notes, diagnoses, treatments, and prescriptions (audit-logged)
          </p>
        </div>
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
          Add Medical Record
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by Record ID, patient name, doctor, or diagnosis..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <LoadingSpinner label="Loading medical records..." />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No medical records found"
            description="Create a new medical record for a patient consultation."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-medium">Record ID</th>
                    <th className="px-4 py-3 font-medium">Patient</th>
                    <th className="px-4 py-3 font-medium">Doctor</th>
                    <th className="px-4 py-3 font-medium">Diagnosis</th>
                    <th className="px-4 py-3 font-medium">Treatment Date</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginated.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{r.record_code}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{r.patients?.full_name || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">Dr. {r.doctors?.full_name || '—'}</td>
                      <td className="px-4 py-3 text-slate-700 max-w-[220px] truncate">{r.diagnosis}</td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(r.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setViewRecord(r)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#2563EB] hover:bg-blue-50"
                            title="View & Print Record"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setHistoryPatient(r.patients)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#0D9488] hover:bg-teal-50"
                            title="Patient Medical History"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(r.id);
                              setForm({
                                patient_id: r.patient_id,
                                doctor_id: r.doctor_id,
                                symptoms: r.symptoms || '',
                                diagnosis: r.diagnosis || '',
                                treatment: r.treatment || '',
                                prescription: r.prescription || '',
                                notes: r.notes || '',
                                follow_up_date: r.follow_up_date || '',
                              });
                              setModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50"
                            title="Edit Record"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
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

      {/* Add / Edit Medical Record Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Medical Record' : 'Add Medical Record'}
        size="xl"
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
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Symptoms</label>
            <textarea
              rows={2}
              value={form.symptoms}
              onChange={(e) => setForm({ ...form, symptoms: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Diagnosis <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.diagnosis}
              onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Treatment Details</label>
            <textarea
              rows={2}
              value={form.treatment}
              onChange={(e) => setForm({ ...form, treatment: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Prescription</label>
            <textarea
              rows={3}
              placeholder="Medicine name, dosage, duration..."
              value={form.prescription}
              onChange={(e) => setForm({ ...form, prescription: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Follow-up Date</label>
              <input
                type="date"
                value={form.follow_up_date}
                onChange={(e) => setForm({ ...form, follow_up_date: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Additional Notes</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
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
              {saving ? 'Saving...' : editingId ? 'Update Record' : 'Save Record'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View & Print Record Modal */}
      <Modal
        open={Boolean(viewRecord)}
        onClose={() => setViewRecord(null)}
        title={viewRecord ? `Medical Record ${viewRecord.record_code}` : ''}
        size="lg"
      >
        {viewRecord && (
          <div className="space-y-4 text-sm">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <div>
                <p className="font-semibold text-slate-900">{viewRecord.patients?.full_name}</p>
                <p className="text-xs text-slate-500">
                  Attending: Dr. {viewRecord.doctors?.full_name} ({viewRecord.doctors?.specialization})
                </p>
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 no-print"
              >
                <Printer className="w-3.5 h-3.5" />
                Print
              </button>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase">Diagnosis</span>
              <p className="text-slate-900 font-medium mt-0.5">{viewRecord.diagnosis}</p>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase">Symptoms</span>
              <p className="text-slate-700 mt-0.5">{viewRecord.symptoms || '—'}</p>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase">Treatment</span>
              <p className="text-slate-700 mt-0.5">{viewRecord.treatment || '—'}</p>
            </div>
            <div className="p-3.5 rounded-lg bg-blue-50 border border-blue-100">
              <span className="text-xs font-semibold text-blue-700 uppercase">Prescription</span>
              <p className="text-blue-950 whitespace-pre-line mt-1">{viewRecord.prescription || '—'}</p>
            </div>
            <div className="flex justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span>Recorded: {formatDateTime(viewRecord.created_at)}</span>
              <span>Follow-up: {viewRecord.follow_up_date ? formatDate(viewRecord.follow_up_date) : 'None'}</span>
            </div>
          </div>
        )}
      </Modal>

      {/* Patient Chronological History Modal */}
      <Modal
        open={Boolean(historyPatient)}
        onClose={() => setHistoryPatient(null)}
        title={historyPatient ? `Medical History: ${historyPatient.full_name}` : ''}
        size="xl"
      >
        <div className="space-y-4">
          {patientHistoryRecords.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">No history records found.</p>
          ) : (
            patientHistoryRecords.map((rec) => (
              <div key={rec.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">{rec.diagnosis}</span>
                  <span className="text-xs text-slate-500">
                    {formatDate(rec.created_at)} • Dr. {rec.doctors?.full_name}
                  </span>
                </div>
                <p className="text-slate-600">
                  <strong>Symptoms:</strong> {rec.symptoms || '—'}
                </p>
                <p className="text-slate-600">
                  <strong>Treatment:</strong> {rec.treatment || '—'}
                </p>
                {rec.prescription && (
                  <p className="text-blue-800">
                    <strong>Prescription:</strong> {rec.prescription}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
}
