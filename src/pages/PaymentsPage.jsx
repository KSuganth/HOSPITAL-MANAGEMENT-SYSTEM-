import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Printer, CreditCard } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import {
  AlertBanner,
  EmptyState,
  LoadingSpinner,
  Modal,
  Pagination,
  StatusBadge,
} from '../components/UI';

const METHODS = ['Cash', 'UPI', 'Card', 'Bank Transfer'];
const PAGE_SIZE = 10;

export default function PaymentsPage() {
  const { hospital } = useAuth();

  const [payments, setPayments] = useState([]);
  const [outstandingBills, setOutstandingBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('history'); // 'history' | 'outstanding'
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBillId, setSelectedBillId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Cash');
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState({ type: '', message: '' });

  const [receiptPayment, setReceiptPayment] = useState(null);

  const fetchAll = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [payRes, billRes] = await Promise.all([
      supabase
        .from('payments')
        .select('*, bills(bill_code, total_amount, balance), patients(patient_code, full_name)')
        .order('payment_date', { ascending: false }),
      supabase
        .from('bills')
        .select('*, patients(patient_code, full_name)')
        .gt('balance', 0)
        .order('created_at', { ascending: false }),
    ]);

    if (payRes.error) setBanner({ type: 'error', message: payRes.error.message });
    setPayments(payRes.data || []);
    setOutstandingBills(billRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const selectedBill = outstandingBills.find((b) => b.id === selectedBillId);

  const openPayModal = (bill = null) => {
    setSelectedBillId(bill ? bill.id : '');
    setAmount(bill ? String(bill.balance) : '');
    setMethod('Cash');
    setReference('');
    setModalOpen(true);
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!selectedBill) {
      setBanner({ type: 'error', message: 'Please select a bill.' });
      return;
    }
    if (Number.isNaN(numAmount) || numAmount <= 0) {
      setBanner({ type: 'error', message: 'Payment amount must be greater than zero.' });
      return;
    }
    if (numAmount > Number(selectedBill.balance)) {
      setBanner({
        type: 'error',
        message: `Payment amount cannot exceed outstanding balance (${formatCurrency(selectedBill.balance)}).`,
      });
      return;
    }

    setSaving(true);
    setBanner({ type: '', message: '' });

    try {
      const { error } = await supabase.rpc('record_bill_payment', {
        p_bill_id: selectedBill.id,
        p_amount: numAmount,
        p_payment_method: method,
        p_transaction_reference: reference.trim(),
      });

      if (error) throw error;

      setBanner({
        type: 'success',
        message: `Payment of ${formatCurrency(numAmount)} recorded for ${selectedBill.bill_code}.`,
      });
      setModalOpen(false);
      await fetchAll();
    } catch (err) {
      setBanner({ type: 'error', message: err.message || 'Failed to record payment.' });
    } finally {
      setSaving(false);
    }
  };

  const filteredPayments = payments.filter((p) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      p.payment_code?.toLowerCase().includes(q) ||
      p.bills?.bill_code?.toLowerCase().includes(q) ||
      p.patients?.full_name?.toLowerCase().includes(q) ||
      p.transaction_reference?.toLowerCase().includes(q);
    const matchesDate = !dateFilter || (p.payment_date || '').slice(0, 10) === dateFilter;
    return matchesSearch && matchesDate;
  });

  const paginatedPayments = filteredPayments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
          <h2 className="text-lg font-semibold text-slate-900">Payment Management</h2>
          <p className="text-sm text-slate-500">
            Record full or partial payments and track immutable transaction history
          </p>
        </div>
        <button
          type="button"
          onClick={() => openPayModal(null)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#2563EB] rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Record Payment
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 no-print">
        <button
          type="button"
          onClick={() => setTab('history')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'history'
              ? 'border-[#2563EB] text-[#2563EB]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Payment History ({payments.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('outstanding')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'outstanding'
              ? 'border-[#2563EB] text-[#2563EB]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Outstanding Bills ({outstandingBills.length})
        </button>
      </div>

      {tab === 'history' ? (
        <>
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
                placeholder="Search by Payment ID, Bill ID, patient, or reference..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg"
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
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden no-print">
            {loading ? (
              <LoadingSpinner label="Loading payments..." />
            ) : filteredPayments.length === 0 ? (
              <EmptyState
                icon={CreditCard}
                title="No payments found"
                description="Recorded payments will appear here."
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 font-medium">Payment ID</th>
                        <th className="px-4 py-3 font-medium">Bill ID</th>
                        <th className="px-4 py-3 font-medium">Patient</th>
                        <th className="px-4 py-3 font-medium">Date</th>
                        <th className="px-4 py-3 font-medium">Method</th>
                        <th className="px-4 py-3 font-medium">Amount</th>
                        <th className="px-4 py-3 font-medium">Reference</th>
                        <th className="px-4 py-3 font-medium text-right">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedPayments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono text-xs text-slate-600">{p.payment_code}</td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-600">
                            {p.bills?.bill_code || '—'}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {p.patients?.full_name || '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-500">{formatDateTime(p.payment_date)}</td>
                          <td className="px-4 py-3">{p.payment_method}</td>
                          <td className="px-4 py-3 font-semibold text-green-700">
                            {formatCurrency(p.amount)}
                          </td>
                          <td className="px-4 py-3 text-slate-500">{p.transaction_reference || '—'}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => setReceiptPayment(p)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-[#2563EB] hover:bg-blue-50"
                              title="Generate Payment Receipt"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  page={page}
                  pageSize={PAGE_SIZE}
                  total={filteredPayments.length}
                  onPageChange={setPage}
                />
              </>
            )}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden no-print">
          {outstandingBills.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No outstanding bills"
              description="All generated bills are fully paid."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-medium">Bill ID</th>
                    <th className="px-4 py-3 font-medium">Patient</th>
                    <th className="px-4 py-3 font-medium">Total</th>
                    <th className="px-4 py-3 font-medium">Paid</th>
                    <th className="px-4 py-3 font-medium">Balance Due</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {outstandingBills.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs">{b.bill_code}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{b.patients?.full_name}</td>
                      <td className="px-4 py-3">{formatCurrency(b.total_amount)}</td>
                      <td className="px-4 py-3 text-green-700">{formatCurrency(b.paid_amount)}</td>
                      <td className="px-4 py-3 font-semibold text-amber-700">{formatCurrency(b.balance)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={b.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openPayModal(b)}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-[#0D9488] rounded-lg hover:bg-teal-700"
                        >
                          Collect Payment
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Record Payment Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Record Payment"
        subtitle="Payments are atomically logged and cannot exceed the bill balance."
        size="md"
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Select Unpaid / Partially Paid Bill <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={selectedBillId}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedBillId(id);
                const b = outstandingBills.find((x) => x.id === id);
                if (b) setAmount(String(b.balance));
              }}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              <option value="">Select Bill</option>
              {outstandingBills.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.bill_code} — {b.patients?.full_name} (Due: {formatCurrency(b.balance)})
                </option>
              ))}
            </select>
          </div>

          {selectedBill && (
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs flex justify-between">
              <span>Total: {formatCurrency(selectedBill.total_amount)}</span>
              <span>Paid: {formatCurrency(selectedBill.paid_amount)}</span>
              <span className="font-semibold text-amber-700">
                Balance: {formatCurrency(selectedBill.balance)}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Payment Amount (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                max={selectedBill ? selectedBill.balance : undefined}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Transaction Reference (UPI ID / Card Ref / Cheque)
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Optional reference number"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
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
              {saving ? 'Recording...' : 'Confirm Payment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Printable Payment Receipt */}
      <Modal
        open={Boolean(receiptPayment)}
        onClose={() => setReceiptPayment(null)}
        title="Payment Receipt"
        size="md"
      >
        {receiptPayment && (
          <div className="space-y-4 text-sm">
            <div className="text-center pb-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">{hospital?.name || 'MediCare Hospital'}</h3>
              <p className="text-xs text-slate-500">{hospital?.address}</p>
              <p className="text-xs font-semibold text-[#0D9488] mt-1">OFFICIAL PAYMENT RECEIPT</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Receipt No:</span>
                <span className="font-mono font-semibold">{receiptPayment.payment_code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Bill No:</span>
                <span className="font-mono">{receiptPayment.bills?.bill_code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Patient:</span>
                <span className="font-medium">{receiptPayment.patients?.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Date:</span>
                <span>{formatDateTime(receiptPayment.payment_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Method:</span>
                <span>{receiptPayment.payment_method}</span>
              </div>
              {receiptPayment.transaction_reference && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Reference:</span>
                  <span>{receiptPayment.transaction_reference}</span>
                </div>
              )}
              <div className="flex justify-between pt-3 border-t border-slate-200 text-base font-bold">
                <span>Amount Paid:</span>
                <span className="text-green-700">{formatCurrency(receiptPayment.amount)}</span>
              </div>
            </div>
            <div className="flex justify-end pt-3 no-print">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#2563EB] rounded-lg hover:bg-blue-700"
              >
                <Printer className="w-4 h-4" />
                Print Receipt
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
