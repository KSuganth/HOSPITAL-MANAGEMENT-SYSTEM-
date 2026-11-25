import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Phone, Mail, MapPin, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
  calculateAge,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatTime12h,
} from '../utils/formatters';
import { LoadingSpinner, StatusBadge, AlertBanner } from '../components/UI';

export default function PatientProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useAuth();

  const [patient, setPatient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [records, setRecords] = useState([]);
  const [bills, setBills] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const canViewMedical = ['admin', 'doctor'].includes(role);

  const loadProfile = useCallback(async () => {
    if (!supabase || !id) return;
    setLoading(true);
    setError('');
    try {
      const { data: pat, error: patErr } = await supabase
        .from('patients')
        .select('*')
        .eq('id', id)
        .single();

      if (patErr) throw patErr;
      setPatient(pat);

      const [apptRes, billRes, payRes] = await Promise.all([
        supabase
          .from('appointments')
          .select('*, doctors(full_name, specialization)')
          .eq('patient_id', id)
          .order('appointment_date', { ascending: false }),
        supabase
          .from('bills')
          .select('*')
          .eq('patient_id', id)
          .order('created_at', { ascending: false }),
        supabase
          .from('payments')
          .select('*, bills(bill_code)')
          .eq('patient_id', id)
          .order('payment_date', { ascending: false }),
      ]);

      setAppointments(apptRes.data || []);
      setBills(billRes.data || []);
      setPayments(payRes.data || []);

      if (canViewMedical) {
        const { data: recData } = await supabase
          .from('medical_records')
          .select('*, doctors(full_name)')
          .eq('patient_id', id)
          .order('created_at', { ascending: false });
        setRecords(recData || []);
      }
    } catch (err) {
      setError(err.message || 'Unable to load patient profile.');
    } finally {
      setLoading(false);
    }
  }, [id, canViewMedical]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  if (loading) return <LoadingSpinner label="Loading patient profile..." />;
  if (error || !patient) {
    return (
      <div className="space-y-4">
        <AlertBanner type="error" message={error || 'Patient not found.'} />
        <button
          type="button"
          onClick={() => navigate('/patients')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#2563EB] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Patients
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <button
          type="button"
          onClick={() => navigate('/patients')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Patients
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
        >
          <Printer className="w-4 h-4" />
          Print Profile
        </button>
      </div>

      {/* Patient Personal Info Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-100 text-[#2563EB] flex items-center justify-center text-xl font-bold">
              {patient.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-slate-900">{patient.full_name}</h2>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {patient.patient_code}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                {calculateAge(patient.date_of_birth)} years • {patient.gender} • Blood Group:{' '}
                <span className="font-semibold text-red-600">{patient.blood_group || 'Unknown'}</span>
              </p>
            </div>
          </div>
          <div className="text-sm text-slate-500">
            Registered on <span className="font-medium text-slate-700">{formatDate(patient.registration_date)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-5 text-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <Phone className="w-4 h-4 text-slate-400" />
            <span>{patient.phone}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <Mail className="w-4 h-4 text-slate-400" />
            <span>{patient.email || 'No email'}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <MapPin className="w-4 h-4 text-slate-400" />
            <span>{patient.address || 'No address'}</span>
          </div>
        </div>

        {(patient.allergies || patient.existing_conditions || patient.emergency_contact) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100 text-sm">
            <div>
              <span className="text-xs font-medium text-slate-400 uppercase block">Allergies</span>
              <span className="text-slate-700 flex items-center gap-1 mt-0.5">
                {patient.allergies ? (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                    {patient.allergies}
                  </>
                ) : (
                  'None reported'
                )}
              </span>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-400 uppercase block">Existing Conditions</span>
              <span className="text-slate-700 mt-0.5 block">{patient.existing_conditions || 'None reported'}</span>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-400 uppercase block">Emergency Contact</span>
              <span className="text-slate-700 mt-0.5 block">{patient.emergency_contact || '—'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Appointment History */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="text-base font-semibold text-slate-900">Appointment History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Date &amp; Time</th>
                <th className="px-4 py-3">Doctor</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {appointments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    No appointments recorded.
                  </td>
                </tr>
              ) : (
                appointments.map((a) => (
                  <tr key={a.id}>
                    <td className="px-4 py-3 font-mono text-xs">{a.appointment_code}</td>
                    <td className="px-4 py-3">
                      {formatDate(a.appointment_date)} at {formatTime12h(a.appointment_time)}
                    </td>
                    <td className="px-4 py-3">{a.doctors?.full_name || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{a.reason || '—'}</td>
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

      {/* Medical History & Prescriptions (Admin / Doctor only) */}
      {canViewMedical && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="text-base font-semibold text-slate-900">Medical History &amp; Prescriptions</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {records.length === 0 ? (
              <p className="px-5 py-6 text-sm text-center text-slate-500">No medical records found.</p>
            ) : (
              records.map((r) => (
                <div key={r.id} className="p-5 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900">{r.diagnosis}</span>
                    <span className="text-xs text-slate-500">
                      {formatDateTime(r.created_at)} • Dr. {r.doctors?.full_name || '—'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">
                    <strong>Symptoms:</strong> {r.symptoms || '—'}
                  </p>
                  <p className="text-sm text-slate-600">
                    <strong>Treatment:</strong> {r.treatment || '—'}
                  </p>
                  {r.prescription && (
                    <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-100 text-sm text-blue-900">
                      <strong>Prescription:</strong> {r.prescription}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Billing & Payment History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="text-base font-semibold text-slate-900">Billing History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3">Bill ID</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Balance</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bills.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                      No bills found.
                    </td>
                  </tr>
                ) : (
                  bills.map((b) => (
                    <tr key={b.id}>
                      <td className="px-4 py-3 font-mono text-xs">{b.bill_code}</td>
                      <td className="px-4 py-3">{formatCurrency(b.total_amount)}</td>
                      <td className="px-4 py-3 font-medium">{formatCurrency(b.balance)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={b.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="text-base font-semibold text-slate-900">Payment History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Bill</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                      No payments recorded.
                    </td>
                  </tr>
                ) : (
                  payments.map((pay) => (
                    <tr key={pay.id}>
                      <td className="px-4 py-3 text-slate-600">{formatDate(pay.payment_date)}</td>
                      <td className="px-4 py-3 font-mono text-xs">{pay.bills?.bill_code || '—'}</td>
                      <td className="px-4 py-3">{pay.payment_method}</td>
                      <td className="px-4 py-3 font-medium text-green-700">{formatCurrency(pay.amount)}</td>
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
