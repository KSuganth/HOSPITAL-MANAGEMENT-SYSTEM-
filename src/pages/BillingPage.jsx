import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, Eye, Pencil, Trash2, Printer, Receipt } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate, generateCode } from '../utils/formatters';
import {
  AlertBanner,
  EmptyState,
  LoadingSpinner,
  Modal,
  Pagination,
  StatusBadge,
} from '../components/UI';

const PAGE_SIZE = 10;

const emptyForm = {
  patient_id: '',
  appointment_id: '',
  consultation_fee: '500',
  medicine_charges: '0',
  laboratory_charges: '0',
  other_charges: '0',
};

export default function BillingPage() {
  const { hospital } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [bills, setBills] = useState([]);
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState({ type: '', message: '' });

  const [invoiceBill, setInvoiceBill] = useState(null);
  const [invoicePayments, setInvoicePayments] = useState([]);

  const fetchAll = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [billRes, patRes, apptRes] = await Promise.all([
      supabase
        .from('bills')
        .select('*, patients(patient_code, full_name, phone, address)')
        .order('created_at', { ascending: false }),
      supabase.from('patients').select('id, patient_code, full_name').order('full_name'),
      supabase
        .from('appointments')
        .select('id, appointment_code, patient_id, doctors(full_name, consultation_fee)')
        .order('appointment_date', { ascending: false })
        .limit(100),
    ]);

    if (billRes.error) setBanner({ type: 'error', message: billRes.error.message });
    setBills(billRes.data || []);
    setPatients(patRes.data || []);
    setAppointments(apptRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setEditingBill(null);
      setForm(emptyForm);
      setModalOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const subtotal =
    Number(form.consultation_fee || 0) +
    Number(form.medicine_charges || 0) +
    Number(form.laboratory_charges || 0) +
    Number(form.other_charges || 0);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setBanner({ type: '', message: '' });

    try {
      const paidSoFar = editingBill ? Number(editingBill.paid_amount || 0) : 0;
      if (subtotal < paidSoFar) {
        throw new Error(`Total amount (${formatCurrency(subtotal)}) cannot be less than already paid amount (${formatCurrency(paidSoFar)}).`);
      }
      const balance = Math.max(0, subtotal - paidSoFar);
      const status = balance === 0 ? 'Paid' : paidSoFar > 0 ? 'Partially Paid' : 'Unpaid';

      const payload = {
        patient_id: form.patient_id,
        appointment_id: form.appointment_id || null,
        consultation_fee: Number(form.consultation_fee || 0),
        medicine_charges: Number(form.medicine_charges || 0),
        laboratory_charges: Number(form.laboratory_charges || 0),
        other_charges: Number(form.other_charges || 0),
        total_amount: subtotal,
        paid_amount: paidSoFar,
        balance,
        status,
      };

      if (editingBill) {
        const { error } = await supabase.from('bills').update(payload).eq('id', editingBill.id);
        if (error) throw error;
        setBanner({ type: 'success', message: `Bill ${editingBill.bill_code} updated.` });
      } else {
        payload.bill_code = generateCode('INV');
        const { error } = await supabase.from('bills').insert([payload]);
        if (error) throw error;
        setBanner({ type: 'success', message: `Bill ${payload.bill_code} generated.` });
      }

      setModalOpen(false);
      await fetchAll();
    } catch (err) {
      setBanner({ type: 'error', message: err.message || 'Failed to save bill.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDraft = async (bill) => {
    if (bill.status !== 'Unpaid' || Number(bill.paid_amount) > 0) {
      setBanner({ type: 'error', message: 'Only unpaid draft bills with zero payments can be deleted.' });
      return;
    }
    if (!window.confirm(`Delete draft bill ${bill.bill_code}?`)) return;
    const { error } = await supabase.from('bills').delete().eq('id', bill.id);
    if (error) {
      setBanner({ type: 'error', message: error.message });
    } else {
      setBanner({ type: 'success', message: 'Draft bill deleted.' });
      fetchAll();
    }
  };

  const openInvoice = async (bill) => {
    setInvoiceBill(bill);
    if (!supabase) return;
    const { data } = await supabase
      .from('payments')
      .select('*')
      .eq('bill_id', bill.id)
      .order('payment_date', { ascending: true });
    setInvoicePayments(data || []);
  };

  const filtered = bills.filter((b) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      b.bill_code?.toLowerCase().includes(q) ||
      b.patients?.full_name?.toLowerCase().includes(q) ||
      b.patients?.patient_code?.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'All' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
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

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Billing &amp; Invoices</h2>
          <p className="text-sm text-slate-500">Generate itemized hospital bills and printable invoices</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingBill(null);
            setForm(emptyForm);
            setModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#2563EB] rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Generate Bill
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-3 no-print">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by Bill ID or Patient Name..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
        >
          <option value="All">All Statuses</option>
          <option value="Paid">Paid</option>
          <option value="Partially Paid">Partially Paid</option>
          <option value="Unpaid">Unpaid</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden no-print">
        {loading ? (
          <LoadingSpinner label="Loading bills..." />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Receipt} title="No bills found" description="Generate a new bill for a patient." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-medium">Bill ID</th>
                    <th className="px-4 py-3 font-medium">Patient</th>
                    <th className="px-4 py-3 font-medium">Bill Date</th>
                    <th className="px-4 py-3 font-medium">Total</th>
                    <th className="px-4 py-3 font-medium">Paid</th>
                    <th className="px-4 py-3 font-medium">Balance</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginated.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{b.bill_code}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{b.patients?.full_name || '—'}</td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(b.created_at)}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{formatCurrency(b.total_amount)}</td>
                      <td className="px-4 py-3 text-green-700">{formatCurrency(b.paid_amount)}</td>
                      <td className="px-4 py-3 font-semibold text-amber-700">{formatCurrency(b.balance)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={b.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openInvoice(b)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#2563EB] hover:bg-blue-50"
                            title="View / Print Invoice"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingBill(b);
                              setForm({
                                patient_id: b.patient_id,
                                appointment_id: b.appointment_id || '',
                                consultation_fee: String(b.consultation_fee),
                                medicine_charges: String(b.medicine_charges),
                                laboratory_charges: String(b.laboratory_charges),
                                other_charges: String(b.other_charges),
                              });
                              setModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50"
                            title="Edit Bill"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {b.status === 'Unpaid' && Number(b.paid_amount) === 0 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteDraft(b)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50"
                              title="Delete Draft Bill"
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

      {/* Generate / Edit Bill Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingBill ? `Edit Bill ${editingBill.bill_code}` : 'Generate New Bill'}
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
                Linked Appointment (optional)
              </label>
              <select
                value={form.appointment_id}
                onChange={(e) => {
                  const apptId = e.target.value;
                  const appt = appointments.find((a) => a.id === apptId);
                  setForm((prev) => ({
                    ...prev,
                    appointment_id: apptId,
                    consultation_fee: appt?.doctors?.consultation_fee
                      ? String(appt.doctors.consultation_fee)
                      : prev.consultation_fee,
                  }));
                }}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="">None</option>
                {appointments
                  .filter((a) => !form.patient_id || a.patient_id === form.patient_id)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.appointment_code} (Dr. {a.doctors?.full_name})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Consultation Fee (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.consultation_fee}
                onChange={(e) => setForm({ ...form, consultation_fee: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Medicine Charges (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.medicine_charges}
                onChange={(e) => setForm({ ...form, medicine_charges: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Laboratory Charges (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.laboratory_charges}
                onChange={(e) => setForm({ ...form, laboratory_charges: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Other Charges (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.other_charges}
                onChange={(e) => setForm({ ...form, other_charges: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600">Total Bill Amount</span>
            <span className="text-xl font-bold text-slate-900">{formatCurrency(subtotal)}</span>
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
              {saving ? 'Saving...' : editingBill ? 'Update Bill' : 'Generate Bill'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Printable Invoice Modal */}
      <Modal
        open={Boolean(invoiceBill)}
        onClose={() => setInvoiceBill(null)}
        title="Hospital Invoice"
        size="lg"
      >
        {invoiceBill && (
          <div className="space-y-6 text-sm">
            <div className="flex justify-between items-start pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{hospital?.name || 'MediCare Hospital'}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{hospital?.address}</p>
                <p className="text-xs text-slate-500">
                  {hospital?.phone} • {hospital?.email}
                </p>
                {hospital?.gst_number && (
                  <p className="text-xs text-slate-500">GSTIN: {hospital.gst_number}</p>
                )}
              </div>
              <div className="text-right">
                <p className="font-mono font-bold text-base text-[#2563EB]">{invoiceBill.bill_code}</p>
                <p className="text-xs text-slate-500">Date: {formatDate(invoiceBill.created_at)}</p>
                <div className="mt-1">
                  <StatusBadge status={invoiceBill.status} />
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-xs font-semibold text-slate-400 uppercase">Billed To</p>
              <p className="font-semibold text-slate-900 mt-0.5">{invoiceBill.patients?.full_name}</p>
              <p className="text-xs text-slate-600">
                Patient ID: {invoiceBill.patients?.patient_code} • Phone: {invoiceBill.patients?.phone}
              </p>
            </div>

            <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
                <tr>
                  <th className="px-4 py-2.5 text-left">Description</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-4 py-2.5">Consultation Fee</td>
                  <td className="px-4 py-2.5 text-right">{formatCurrency(invoiceBill.consultation_fee)}</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5">Medicine Charges</td>
                  <td className="px-4 py-2.5 text-right">{formatCurrency(invoiceBill.medicine_charges)}</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5">Laboratory Charges</td>
                  <td className="px-4 py-2.5 text-right">{formatCurrency(invoiceBill.laboratory_charges)}</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5">Other Charges</td>
                  <td className="px-4 py-2.5 text-right">{formatCurrency(invoiceBill.other_charges)}</td>
                </tr>
              </tbody>
              <tfoot className="bg-slate-50 font-semibold">
                <tr className="border-t border-slate-200">
                  <td className="px-4 py-2.5">Total Amount</td>
                  <td className="px-4 py-2.5 text-right">{formatCurrency(invoiceBill.total_amount)}</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-green-700">Paid Amount</td>
                  <td className="px-4 py-2 text-right text-green-700">
                    {formatCurrency(invoiceBill.paid_amount)}
                  </td>
                </tr>
                <tr className="border-t border-slate-200">
                  <td className="px-4 py-2.5 text-amber-700">Balance Due</td>
                  <td className="px-4 py-2.5 text-right text-amber-700">
                    {formatCurrency(invoiceBill.balance)}
                  </td>
                </tr>
              </tfoot>
            </table>

            {invoicePayments.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1.5">Payment History</p>
                <div className="text-xs text-slate-600 space-y-1">
                  {invoicePayments.map((p) => (
                    <div key={p.id} className="flex justify-between">
                      <span>
                        {formatDate(p.payment_date)} • {p.payment_method}{' '}
                        {p.transaction_reference ? `(${p.transaction_reference})` : ''}
                      </span>
                      <span className="font-medium">{formatCurrency(p.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 no-print">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#2563EB] rounded-lg hover:bg-blue-700"
              >
                <Printer className="w-4 h-4" />
                Print / Save PDF
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
