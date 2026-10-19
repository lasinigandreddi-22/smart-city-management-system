import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Receipt, Building2, CheckCircle2, Clock, 
  ArrowUpRight, Printer, AlertTriangle, CreditCard, ShieldCheck 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Modal from '../../components/Modal';
import { StatusBadge } from '../../components/Badge';

export default function PropertyTaxPage() {
  const { user, role } = useAuth();
  const [properties, setProperties] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Payment modal state
  const [activeTaxRecord, setActiveTaxRecord] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('Simulated UPI');
  const [payerName, setPayerName] = useState(user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username || '');
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');
  const [paySuccess, setPaySuccess] = useState('');

  const loadData = async () => {
    try {
      const [propsData, paymentsData] = await Promise.all([
        api.tax.getProperties(),
        api.tax.getPayments(),
      ]);
      setProperties(propsData || []);
      setPayments(paymentsData || []);
    } catch (err) {
      console.error('Failed to load tax data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openPaymentModal = (taxRecord) => {
    setActiveTaxRecord(taxRecord);
    setPayAmount(taxRecord.outstanding_balance);
    setPayError('');
    setPaySuccess('');
  };

  const handleProcessPayment = async (e) => {
    e.preventDefault();
    if (!payAmount || Number(payAmount) <= 0) {
      setPayError('Please enter a valid payment amount greater than zero.');
      return;
    }

    if (Number(payAmount) > Number(activeTaxRecord.outstanding_balance)) {
      setPayError(`Payment amount cannot exceed outstanding balance of ₹${activeTaxRecord.outstanding_balance}.`);
      return;
    }

    setPaying(true);
    setPayError('');
    setPaySuccess('');

    try {
      const result = await api.tax.processPayment({
        tax_record_id: activeTaxRecord.id,
        amount: Number(payAmount),
        payment_mode: payMode,
        payer_name: payerName,
      });

      setPaySuccess(`Simulated Payment of ₹${payAmount} Successful! Txn Ref: ${result.payment.transaction_ref}`);
      setTimeout(() => {
        setActiveTaxRecord(null);
        setPaySuccess('');
        loadData();
      }, 1800);
    } catch (err) {
      setPayError(err.message || 'Payment processing failed.');
    } finally {
      setPaying(false);
    }
  };

  // Aggregated totals
  let totalAssessed = 0;
  let totalAnnualTax = 0;
  let totalPaid = 0;
  let totalOutstanding = 0;

  properties.forEach((p) => {
    totalAssessed += Number(p.assessed_value || 0);
    p.tax_records?.forEach((t) => {
      totalAnnualTax += Number(t.annual_tax || 0);
      totalPaid += Number(t.amount_paid || 0);
      totalOutstanding += Number(t.outstanding_balance || 0);
    });
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Property Tax & Civic Assessment</h1>
            <p className="text-xs text-slate-500">
              {role === 'ADMIN' ? 'All municipal property registrations and tax revenue records' : 'Registered properties, annual tax assessments & simulated payments'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl flex items-center">
            <ShieldCheck className="w-3.5 h-3.5 mr-1" />
            Simulated Sandbox Billing
          </span>
        </div>
      </div>

      {/* Simulated Notice */}
      <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center space-x-2 text-xs text-amber-800">
        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
        <span>
          <strong>Academic Demonstration Mode:</strong> All payments are processed in a safe sandbox environment. Balances update atomically in the database without connecting to external banking gateways.
        </span>
      </div>

      {/* Financial Metrics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-400 uppercase">Assessed Asset Value</p>
          <h3 className="text-xl font-bold text-slate-900 mt-1">₹{totalAssessed.toLocaleString('en-IN')}</h3>
          <p className="text-[11px] text-slate-400 mt-1">{properties.length} registered properties</p>
        </div>
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-400 uppercase">Annual Tax Demand</p>
          <h3 className="text-xl font-bold text-slate-900 mt-1">₹{totalAnnualTax.toLocaleString('en-IN')}</h3>
          <p className="text-[11px] text-slate-400 mt-1">FY 2025-2026 assessment</p>
        </div>
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-400 uppercase">Total Amount Paid</p>
          <h3 className="text-xl font-bold text-emerald-600 mt-1">₹{totalPaid.toLocaleString('en-IN')}</h3>
          <p className="text-[11px] text-slate-400 mt-1">Receipts verified</p>
        </div>
        <div className="p-5 bg-white rounded-xl border border-rose-100 bg-rose-50/20 shadow-xs">
          <p className="text-xs font-semibold text-rose-500 uppercase">Outstanding Balance</p>
          <h3 className="text-xl font-bold text-rose-600 mt-1">₹{totalOutstanding.toLocaleString('en-IN')}</h3>
          <p className="text-[11px] text-rose-400 mt-1">Due before end of financial year</p>
        </div>
      </div>

      {/* Properties & Tax Assessment Cards */}
      <div className="space-y-4">
        <h3 className="font-bold text-sm text-slate-900">Registered Properties & Annual Tax Bills</h3>

        {loading ? (
          <div className="py-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
          </div>
        ) : properties.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
            No properties registered under this account.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {properties.map((p) => (
              <div key={p.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="font-mono font-bold text-xs text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                      {p.property_ref}
                    </span>
                    <h4 className="font-bold text-sm text-slate-900 mt-2">{p.address}</h4>
                    <p className="text-xs text-slate-500">{p.property_type} • {p.built_up_area_sqft} sq.ft • {p.ward_number}</p>
                    {role === 'ADMIN' && (
                      <p className="text-[11px] text-slate-400 mt-0.5">Owner: <strong>{p.owner_name}</strong></p>
                    )}
                  </div>
                  <span className="text-xs font-bold text-slate-700">
                    Assessed: ₹{Number(p.assessed_value).toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Tax Bills under this property */}
                <div className="space-y-3">
                  {p.tax_records?.map((t) => (
                    <div key={t.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">FY {t.financial_year} Assessment</span>
                        <StatusBadge status={t.payment_status} />
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-[10px] text-slate-400">Annual Tax</p>
                          <p className="font-bold text-slate-800">₹{Number(t.annual_tax).toLocaleString('en-IN')}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400">Paid So Far</p>
                          <p className="font-bold text-emerald-600">₹{Number(t.amount_paid).toLocaleString('en-IN')}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400">Balance Due</p>
                          <p className="font-bold text-rose-600">₹{Number(t.outstanding_balance).toLocaleString('en-IN')}</p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400">Due by: {t.due_date}</span>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => navigate(`/property-tax/${t.id}`)}
                            className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center"
                          >
                            <Printer className="w-3 h-3 mr-1" />
                            Bill & Receipt
                          </button>
                          {Number(t.outstanding_balance) > 0 && (
                            <button
                              onClick={() => openPaymentModal(t)}
                              className="px-3 py-1 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 flex items-center shadow-xs"
                            >
                              <CreditCard className="w-3 h-3 mr-1" />
                              Pay Now (Demo)
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Demonstration Payment Records History Table */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="font-bold text-sm text-slate-900">Demonstration Payment Transactions History</h3>

        {payments.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">No payments recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Transaction Ref</th>
                  <th className="py-3 px-4">Property</th>
                  <th className="py-3 px-4">Year</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4">Payer</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {payments.map((pm) => (
                  <tr key={pm.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-mono font-bold text-emerald-700">{pm.transaction_ref}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{pm.property_ref}</td>
                    <td className="py-3 px-4">{pm.financial_year}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">₹{Number(pm.amount).toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 text-slate-500">{pm.payment_mode}</td>
                    <td className="py-3 px-4">{pm.payer_name}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {pm.payment_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{new Date(pm.payment_date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Demonstration Payment Modal */}
      <Modal
        isOpen={!!activeTaxRecord}
        onClose={() => setActiveTaxRecord(null)}
        title="Simulated Property Tax Payment (Demo)"
      >
        {activeTaxRecord && (
          <form onSubmit={handleProcessPayment} className="space-y-4 text-xs">
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-900">
              <p className="font-bold">Property: {activeTaxRecord.property_ref}</p>
              <p className="text-[11px] text-blue-700 mt-0.5">{activeTaxRecord.property_address}</p>
              <p className="text-xs font-semibold text-blue-800 mt-1">
                Outstanding Balance Due: <span className="font-bold text-rose-600">₹{Number(activeTaxRecord.outstanding_balance).toLocaleString('en-IN')}</span>
              </p>
            </div>

            {payError && (
              <div className="p-3 bg-red-50 text-red-700 rounded-xl border border-red-200">
                {payError}
              </div>
            )}
            {paySuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{paySuccess}</span>
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Payment Amount (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                max={activeTaxRecord.outstanding_balance}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                required
                className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white font-mono text-sm font-bold"
              />
              <p className="text-[10px] text-slate-400 mt-1">You can pay in full or enter a partial amount.</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Simulated Payment Mode
              </label>
              <select
                value={payMode}
                onChange={(e) => setPayMode(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="Simulated UPI">Simulated UPI (Google Pay / PhonePe / BHIM)</option>
                <option value="Simulated Net Banking">Simulated Net Banking (State Bank / HDFC / ICICI)</option>
                <option value="Simulated Credit Card">Simulated Credit Card</option>
                <option value="Simulated Debit Card">Simulated Debit Card</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Payer Full Name
              </label>
              <input
                type="text"
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                required
                className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-slate-500 text-[11px] leading-relaxed border border-slate-200">
              ⚡ This sandbox transaction will deduct the balance in the SQLite database and create an official demonstration tax receipt.
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveTaxRecord(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl hover:bg-slate-50 text-slate-700 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={paying}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold disabled:opacity-50 shadow-xs"
              >
                {paying ? 'Processing Sandbox Payment...' : `Confirm Payment of ₹${payAmount}`}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
