import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, Printer, Building2, CheckCircle2, 
  Receipt, ShieldCheck, CreditCard, AlertTriangle 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Modal from '../../components/Modal';
import { StatusBadge } from '../../components/Badge';

export default function TaxBillDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [taxRecord, setTaxRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Payment modal state
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('Simulated UPI');
  const [payerName, setPayerName] = useState(user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username || '');
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');
  const [paySuccess, setPaySuccess] = useState('');

  const loadBill = async () => {
    try {
      const data = await api.tax.getTaxRecordDetail(id);
      setTaxRecord(data);
      setPayAmount(data.outstanding_balance);
    } catch (err) {
      setError(err.message || 'Unable to load tax assessment bill.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBill();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const handleProcessPayment = async (e) => {
    e.preventDefault();
    if (!payAmount || Number(payAmount) <= 0) {
      setPayError('Please enter a valid amount.');
      return;
    }

    setPaying(true);
    setPayError('');
    setPaySuccess('');

    try {
      const result = await api.tax.processPayment({
        tax_record_id: taxRecord.id,
        amount: Number(payAmount),
        payment_mode: payMode,
        payer_name: payerName,
      });

      setPaySuccess(`Simulated Payment of ₹${payAmount} Successful! Txn Ref: ${result.payment.transaction_ref}`);
      setTimeout(() => {
        setShowPayModal(false);
        setPaySuccess('');
        loadBill();
      }, 1800);
    } catch (err) {
      setPayError(err.message || 'Payment failed.');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
      </div>
    );
  }

  if (error || !taxRecord) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center max-w-md mx-auto">
        <p className="text-sm text-red-600">{error || 'Bill not found.'}</p>
        <Link to="/property-tax" className="inline-block mt-4 text-xs font-bold text-blue-600 hover:underline">
          Return to Property Tax
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Action Bar (Hidden when printing) */}
      <div className="no-print flex items-center justify-between">
        <Link
          to="/property-tax"
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Tax Overview
        </Link>

        <div className="flex items-center space-x-2">
          {Number(taxRecord.outstanding_balance) > 0 && (
            <button
              onClick={() => setShowPayModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center"
            >
              <CreditCard className="w-3.5 h-3.5 mr-1.5" />
              Pay Balance (Demo)
            </button>
          )}
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs flex items-center"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            Print Official Bill
          </button>
        </div>
      </div>

      {/* Official Tax Assessment Bill Document */}
      <div className="bg-white p-8 sm:p-12 rounded-2xl border border-slate-200 shadow-sm space-y-8 print:p-0 print:border-none print:shadow-none">
        {/* Document Header */}
        <div className="border-b-2 border-slate-900 pb-6 flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-900 text-white rounded-xl flex items-center justify-center font-bold text-lg">
              SC
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                Smart City Municipal Corporation
              </h1>
              <p className="text-xs text-slate-500">Revenue & Property Taxation Department</p>
              <p className="text-[10px] text-slate-400">Civil Center, Sector 1, City Central • ISO 9001:2026 Certified</p>
            </div>
          </div>

          <div className="text-right">
            <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded">
              FY {taxRecord.financial_year}
            </span>
            <div className="mt-2">
              <StatusBadge status={taxRecord.payment_status} />
            </div>
          </div>
        </div>

        {/* Bill Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs">
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Property ID</p>
            <p className="font-mono font-bold text-slate-900">{taxRecord.property_ref}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Assessed Owner</p>
            <p className="font-bold text-slate-900">{taxRecord.owner_name}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Property Category</p>
            <p className="font-bold text-slate-900">{taxRecord.property_type}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Payment Due Date</p>
            <p className="font-bold text-slate-900">{taxRecord.due_date}</p>
          </div>
        </div>

        <div>
          <p className="text-[10px] text-slate-400 uppercase font-semibold">Property Address</p>
          <p className="text-xs font-semibold text-slate-800 mt-0.5">{taxRecord.property_address}</p>
        </div>

        {/* Assessment Breakdown Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase">
              <tr>
                <th className="py-3 px-4">Assessment Component</th>
                <th className="py-3 px-4 text-right">Rate / Basis</th>
                <th className="py-3 px-4 text-right">Computed Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              <tr>
                <td className="py-3 px-4">General Municipal Property Tax</td>
                <td className="py-3 px-4 text-right">Annual Base Value Rate</td>
                <td className="py-3 px-4 text-right font-mono">₹{(Number(taxRecord.annual_tax) * 0.7).toFixed(2)}</td>
              </tr>
              <tr>
                <td className="py-3 px-4">Water & Sewerage Drainage Cess</td>
                <td className="py-3 px-4 text-right">15% of Base Tax</td>
                <td className="py-3 px-4 text-right font-mono">₹{(Number(taxRecord.annual_tax) * 0.15).toFixed(2)}</td>
              </tr>
              <tr>
                <td className="py-3 px-4">Streetlight & Public Works Maintenance Surcharge</td>
                <td className="py-3 px-4 text-right">10% of Base Tax</td>
                <td className="py-3 px-4 text-right font-mono">₹{(Number(taxRecord.annual_tax) * 0.1).toFixed(2)}</td>
              </tr>
              <tr>
                <td className="py-3 px-4">Solid Waste Management & Sanitation Fee</td>
                <td className="py-3 px-4 text-right">5% Fixed City Cess</td>
                <td className="py-3 px-4 text-right font-mono">₹{(Number(taxRecord.annual_tax) * 0.05).toFixed(2)}</td>
              </tr>
            </tbody>
            <tfoot className="bg-slate-50 font-bold text-xs border-t-2 border-slate-200">
              <tr>
                <td colSpan={2} className="py-3 px-4 text-right uppercase">Total Annual Demand</td>
                <td className="py-3 px-4 text-right font-mono text-sm">₹{Number(taxRecord.annual_tax).toLocaleString('en-IN')}</td>
              </tr>
              <tr>
                <td colSpan={2} className="py-2 px-4 text-right uppercase text-emerald-700">Total Amount Paid</td>
                <td className="py-2 px-4 text-right font-mono text-emerald-700">₹{Number(taxRecord.amount_paid).toLocaleString('en-IN')}</td>
              </tr>
              <tr className="bg-slate-100 text-rose-700">
                <td colSpan={2} className="py-3 px-4 text-right uppercase text-sm">Outstanding Net Balance</td>
                <td className="py-3 px-4 text-right font-mono text-base font-extrabold text-rose-600">
                  ₹{Number(taxRecord.outstanding_balance).toLocaleString('en-IN')}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Payment History Receipts */}
        {taxRecord.payments?.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-slate-200">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">
              Receipt of Prior Payments
            </h4>
            <div className="space-y-2">
              {taxRecord.payments.map((pm) => (
                <div key={pm.id} className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono font-bold text-emerald-800">{pm.transaction_ref}</span>
                    <p className="text-[10px] text-slate-500 mt-0.5">{pm.payment_mode} • Payer: {pm.payer_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-700">₹{Number(pm.amount).toLocaleString('en-IN')}</p>
                    <p className="text-[10px] text-slate-400">{new Date(pm.payment_date).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Verification Footer */}
        <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-400 gap-2">
          <p>Digitally signed by Municipal Corporation Revenue Authority.</p>
          <p className="font-mono">Bill Hash: SHA256-SCMS-{taxRecord.id}-FY2526</p>
        </div>
      </div>

      {/* Pay Modal */}
      <Modal
        isOpen={showPayModal}
        onClose={() => setShowPayModal(false)}
        title="Simulated Bill Payment"
      >
        <form onSubmit={handleProcessPayment} className="space-y-4 text-xs">
          {payError && <div className="p-3 bg-red-50 text-red-700 rounded-xl border border-red-200">{payError}</div>}
          {paySuccess && (
            <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{paySuccess}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Amount to Pay (₹)</label>
            <input
              type="number"
              step="0.01"
              max={taxRecord.outstanding_balance}
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              required
              className="w-full p-2.5 border border-slate-300 rounded-xl font-mono text-sm font-bold"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Simulated Payment Mode</label>
            <select
              value={payMode}
              onChange={(e) => setPayMode(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
            >
              <option value="Simulated UPI">Simulated UPI</option>
              <option value="Simulated Net Banking">Simulated Net Banking</option>
              <option value="Simulated Card">Simulated Credit/Debit Card</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Payer Name</label>
            <input
              type="text"
              value={payerName}
              onChange={(e) => setPayerName(e.target.value)}
              required
              className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowPayModal(false)}
              className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={paying}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold disabled:opacity-50"
            >
              {paying ? 'Processing...' : `Confirm ₹${payAmount}`}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
