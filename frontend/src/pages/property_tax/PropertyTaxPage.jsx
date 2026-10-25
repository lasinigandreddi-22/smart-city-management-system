import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Receipt, Building2, CheckCircle2, Clock, 
  ArrowUpRight, Printer, AlertTriangle, CreditCard, ShieldCheck,
  Filter, Layers, Droplets, Zap, Sparkles, HelpCircle, FileText
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Modal from '../../components/Modal';
import { StatusBadge } from '../../components/Badge';

export default function PropertyTaxPage() {
  const { user, role } = useAuth();
  const [properties, setProperties] = useState([]);
  const [payments, setPayments] = useState([]);
  const [wardSummaries, setWardSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const dept = (user?.profile?.department_name || '').toLowerCase();
  const isTaxEmployee = (role === 'EMPLOYEE' || role === 'SERVICE_DEPARTMENT') && (dept.includes('tax') || dept.includes('bill'));
  const isAdmin = role === 'ADMIN';
  const isAdminOrStaff = isAdmin || isTaxEmployee;
  const userAssignedWard = user?.profile?.assigned_zone || 'Ward 1';

  const [selectedWardFilter, setSelectedWardFilter] = useState(isTaxEmployee ? userAssignedWard : 'All');

  // Payment modal state
  const [activeTaxRecord, setActiveTaxRecord] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('Simulated UPI');
  const [payerName, setPayerName] = useState(
    user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username || ''
  );
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');
  const [paySuccess, setPaySuccess] = useState('');

  const loadData = async () => {
    try {
      const promises = [
        api.tax.getProperties(),
        api.tax.getPayments(),
      ];
      if (isAdminOrStaff) {
        promises.push(api.tax.getWardTaxSummary().catch(() => []));
      }
      const results = await Promise.all(promises);
      setProperties(results[0] || []);
      setPayments(results[1] || []);
      if (isAdminOrStaff && results[2]) {
        setWardSummaries(results[2] || []);
      }
    } catch (err) {
      console.error('Failed to load tax data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (isTaxEmployee) {
      setSelectedWardFilter(userAssignedWard);
    }
  }, [isAdminOrStaff, userAssignedWard, isTaxEmployee]);

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

  // Filtered properties for Admin or Staff view
  const filteredProperties = properties.filter((p) => {
    if (selectedWardFilter === 'All') return true;
    return p.ward_number?.toLowerCase() === selectedWardFilter.toLowerCase();
  });

  // Ward specific calculations for Property Tax employee
  let wardTotalAssessed = 0;
  let wardTotalAnnualTax = 0;
  let wardTotalPaid = 0;
  let wardTotalOutstanding = 0;

  filteredProperties.forEach((p) => {
    wardTotalAssessed += Number(p.assessed_value || 0);
    p.tax_records?.forEach((t) => {
      wardTotalAnnualTax += Number(t.annual_tax || 0);
      wardTotalPaid += Number(t.amount_paid || 0);
      wardTotalOutstanding += Number(t.outstanding_balance || 0);
    });
  });

  const wardCollectionRate = wardTotalAnnualTax > 0 
    ? ((wardTotalPaid / wardTotalAnnualTax) * 100).toFixed(1) 
    : '0.0';

  // Ward filtered payments
  const wardFilteredPayments = payments.filter((pm) => {
    if (!isTaxEmployee) return true;
    const prop = properties.find((p) => p.property_ref === pm.property_ref);
    if (!prop) return true;
    return prop.ward_number?.toLowerCase() === userAssignedWard.toLowerCase();
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
            <h1 className="text-xl font-bold text-slate-900">
              {isAdmin 
                ? 'Property Tax & Civic Revenue Management' 
                : isTaxEmployee 
                  ? `Property Tax Operations — ${userAssignedWard}`
                  : 'Property Tax & Civic Assessment'}
            </h1>
            <p className="text-xs text-slate-500">
              {isAdmin 
                ? 'City-wide municipal property registrations, ward revenue collections & financial ledgers' 
                : isTaxEmployee 
                  ? `Respective ward civic assessments, annual tax demands, payments received, and collection balance for ${userAssignedWard}`
                  : 'Your registered civic properties, annual municipal taxes, and utility bills'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {isTaxEmployee && (
            <span className="text-xs font-bold px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl">
              Assigned: {userAssignedWard}
            </span>
          )}
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

      {/* ========================================================================= */}
      {/* CITIZEN VIEW: Personal taxes, clear valuation distinction, monthly bills */}
      {/* ========================================================================= */}
      {!isAdminOrStaff ? (
        <>
          {/* Assessed Property Value vs Actual Tax Demand Clarification */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start space-x-3 text-xs text-blue-900 shadow-2xs">
            <Building2 className="w-5 h-5 shrink-0 text-blue-600 mt-0.5" />
            <div>
              <strong className="font-bold text-blue-950">Important Tax Notice — Assessed Value vs Tax Demand:</strong>
              <p className="mt-0.5 text-blue-800 leading-relaxed">
                Assessed property value is the <em>valuation benchmark</em> used to calculate municipal property tax. 
                <strong> It is NOT the amount you owe.</strong> Your actual annual tax demand, payments made so far, and remaining balance due are shown separately below.
              </p>
            </div>
          </div>

          {/* Why Citizens Pay Explanation */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-start space-x-3 text-xs text-emerald-900">
            <HelpCircle className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
            <div>
              <strong className="font-bold text-emerald-950">Why Do Citizens Pay Municipal Property Tax?</strong>
              <p className="mt-0.5 text-emerald-800 leading-relaxed">
                Municipal property taxes fund vital public infrastructure and services across your ward: local road resurfacing, street lighting maintenance, clean water distribution pipelines, stormwater drainage, and daily sanitation upkeep.
              </p>
            </div>
          </div>

          {/* Citizen Financial Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
              <p className="text-xs font-semibold text-slate-400 uppercase">Registered Properties</p>
              <h3 className="text-xl font-bold text-slate-900 mt-1">{properties.length}</h3>
              <p className="text-[11px] text-slate-400 mt-1">Under your civic account</p>
            </div>
            <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
              <p className="text-xs font-semibold text-slate-400 uppercase">Annual Tax Demand</p>
              <h3 className="text-xl font-bold text-slate-900 mt-1">₹{totalAnnualTax.toLocaleString('en-IN')}</h3>
              <p className="text-[11px] text-slate-400 mt-1">Assessment Year: FY 2025-2026</p>
            </div>
            <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
              <p className="text-xs font-semibold text-slate-400 uppercase">Amount Paid So Far</p>
              <h3 className="text-xl font-bold text-emerald-600 mt-1">₹{totalPaid.toLocaleString('en-IN')}</h3>
              <p className="text-[11px] text-slate-400 mt-1">Receipts recorded & verified</p>
            </div>
            <div className="p-5 bg-white rounded-xl border border-rose-100 bg-rose-50/20 shadow-xs">
              <p className="text-xs font-semibold text-rose-500 uppercase">Remaining Balance Due</p>
              <h3 className="text-xl font-bold text-rose-600 mt-1">₹{totalOutstanding.toLocaleString('en-IN')}</h3>
              <p className="text-[11px] text-rose-400 mt-1">Due before end of financial year</p>
            </div>
          </div>

          {/* Annual Municipal Property Tax Demands */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900">Annual Municipal Property Tax Demands</h3>
                <p className="text-xs text-slate-500">
                  Annual property tax assessments linked to your registered residential or commercial properties
                </p>
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
              </div>
            ) : properties.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
                No registered properties found for your citizen account.
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
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Assessment Benchmark</span>
                        <span className="text-xs font-bold text-slate-700">
                          ₹{Number(p.assessed_value).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <strong>Tax Coverage:</strong> Annual municipal property tax covers road maintenance, streetlights, ward sanitation, and emergency civic services.
                    </div>

                    {/* Tax Bills under this property */}
                    <div className="space-y-3">
                      {p.tax_records?.map((t) => (
                        <div key={t.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800">
                              Assessment Year: <strong className="text-slate-900">FY {t.financial_year}</strong>
                            </span>
                            <StatusBadge status={t.payment_status} />
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            <div className="bg-white p-2.5 rounded-lg border border-slate-200/60">
                              <p className="text-[10px] text-slate-400 font-semibold">Assessed Value</p>
                              <p className="font-semibold text-slate-700">₹{Number(p.assessed_value).toLocaleString('en-IN')}</p>
                              <span className="text-[9px] text-blue-600 font-medium">(Benchmark only)</span>
                            </div>
                            <div className="bg-white p-2.5 rounded-lg border border-slate-200/60">
                              <p className="text-[10px] text-slate-400 font-semibold">Annual Tax Due</p>
                              <p className="font-bold text-slate-900">₹{Number(t.annual_tax).toLocaleString('en-IN')}</p>
                              <span className="text-[9px] text-slate-500 font-medium">(Actual Demand)</span>
                            </div>
                            <div className="bg-white p-2.5 rounded-lg border border-slate-200/60">
                              <p className="text-[10px] text-slate-400 font-semibold">Amount Paid</p>
                              <p className="font-bold text-emerald-600">₹{Number(t.amount_paid).toLocaleString('en-IN')}</p>
                              <span className="text-[9px] text-emerald-600 font-medium">(Receipted)</span>
                            </div>
                            <div className="bg-white p-2.5 rounded-lg border border-slate-200/60">
                              <p className="text-[10px] text-slate-400 font-semibold">Remaining Balance</p>
                              <p className="font-bold text-rose-600">₹{Number(t.outstanding_balance).toLocaleString('en-IN')}</p>
                              <span className="text-[9px] text-rose-500 font-medium">({t.payment_status})</span>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                            <span className="text-[11px] text-slate-500">
                              Due Date: <strong className="text-slate-700">{t.due_date}</strong>
                            </span>
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

          {/* Monthly Civic & Utility Bills Section */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Monthly Civic & Utility Bills</h3>
                <p className="text-xs text-slate-500">
                  Monthly municipal service charges, metered utility bills, and ward maintenance fees
                </p>
              </div>
              <span className="text-xs font-medium text-slate-500">
                Billing Cycle: <strong>October 2026</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Water Bill Card */}
              <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/30 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                      <Droplets className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">Water Supply & Sewerage</h4>
                      <p className="text-[10px] text-slate-400">Department of Water Works</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Paid
                  </span>
                </div>
                <div className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200/60 space-y-1">
                  <p className="font-semibold text-slate-800">Reason for Bill:</p>
                  <p className="text-[11px] text-slate-500">Monthly metered water consumption and feeder pipeline pressure maintenance.</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Total Due:</span>
                    <span className="font-bold text-slate-800">₹350.00</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Balance:</span>
                    <span className="font-bold text-emerald-600">₹0.00</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Period:</span>
                    <span className="text-slate-700 text-[11px]">Oct 2026</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Due Date:</span>
                    <span className="text-slate-700 text-[11px]">31 Oct 2026</span>
                  </div>
                </div>
              </div>

              {/* Electricity Bill Card */}
              <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/30 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">Power Grid & Electricity</h4>
                      <p className="text-[10px] text-slate-400">Department of Power & Energy</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Paid
                  </span>
                </div>
                <div className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200/60 space-y-1">
                  <p className="font-semibold text-slate-800">Reason for Bill:</p>
                  <p className="text-[11px] text-slate-500">Monthly metered electric usage, transformer upkeep, and street lighting contribution.</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Total Due:</span>
                    <span className="font-bold text-slate-800">₹820.00</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Balance:</span>
                    <span className="font-bold text-emerald-600">₹0.00</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Period:</span>
                    <span className="text-slate-700 text-[11px]">Oct 2026</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Due Date:</span>
                    <span className="text-slate-700 text-[11px]">31 Oct 2026</span>
                  </div>
                </div>
              </div>

              {/* Sanitation & Drainage Fee Card */}
              <div className="p-4 rounded-xl border border-teal-100 bg-teal-50/30 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">Sanitation & Waste Cleanup</h4>
                      <p className="text-[10px] text-slate-400">Department of Road & Sanitation</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Paid
                  </span>
                </div>
                <div className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200/60 space-y-1">
                  <p className="font-semibold text-slate-800">Reason for Bill:</p>
                  <p className="text-[11px] text-slate-500">Daily door-to-door solid waste collection, drain desilting, and ward sanitization.</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Total Due:</span>
                    <span className="font-bold text-slate-800">₹150.00</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Balance:</span>
                    <span className="font-bold text-emerald-600">₹0.00</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Period:</span>
                    <span className="text-slate-700 text-[11px]">Oct 2026</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Due Date:</span>
                    <span className="text-slate-700 text-[11px]">31 Oct 2026</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* ========================================================================= */
        /* ADMIN & PROPERTY TAX EMPLOYEE VIEW: Respective Ward Data & Financial Ledger */
        /* ========================================================================= */
        <>
          {/* Assessment Benchmark Clarity Banner for Staff/Employee */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start space-x-3 text-xs text-blue-900 shadow-2xs">
            <Building2 className="w-5 h-5 shrink-0 text-blue-600 mt-0.5" />
            <div>
              <strong className="font-bold text-blue-950">Assessment Benchmark & Tax Demand Clarity:</strong>
              <p className="mt-0.5 text-blue-800 leading-relaxed">
                Assessed property value is the valuation benchmark used to calculate municipal property tax. 
                <strong> It is NOT the amount owed.</strong> The total annual tax demanded, actual amount paid, and remaining balance due are tracked separately below for each property.
              </p>
            </div>
          </div>

          {/* Reason for Tax Banner */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-start space-x-3 text-xs text-emerald-900">
            <HelpCircle className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
            <div>
              <strong className="font-bold text-emerald-950">Civic Purpose & Reason for Payment:</strong>
              <p className="mt-0.5 text-emerald-800 leading-relaxed">
                Municipal property taxes fund vital public works across the ward: road resurfacing, street lighting maintenance, clean water delivery, storm drainage, and neighborhood sanitation services.
              </p>
            </div>
          </div>

          {/* Metrics Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
              <p className="text-xs font-semibold text-slate-400 uppercase">
                {isTaxEmployee ? `Registered Properties (${selectedWardFilter})` : 'Total Assessed Assets'}
              </p>
              <h3 className="text-xl font-bold text-slate-900 mt-1">
                {isTaxEmployee ? filteredProperties.length : `₹${totalAssessed.toLocaleString('en-IN')}`}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                {isTaxEmployee ? `In ${selectedWardFilter}` : `${properties.length} registered properties`}
              </p>
            </div>
            <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
              <p className="text-xs font-semibold text-slate-400 uppercase">
                {isTaxEmployee ? `Total Amount Needed Annually` : 'Annual Tax Demand'}
              </p>
              <h3 className="text-xl font-bold text-slate-900 mt-1">
                ₹{(isTaxEmployee ? wardTotalAnnualTax : totalAnnualTax).toLocaleString('en-IN')}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">FY 2025-2026 assessment</p>
            </div>
            <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
              <p className="text-xs font-semibold text-slate-400 uppercase">Total Amount Paid</p>
              <h3 className="text-xl font-bold text-emerald-600 mt-1">
                ₹{(isTaxEmployee ? wardTotalPaid : totalPaid).toLocaleString('en-IN')}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">Verified receipts recorded</p>
            </div>
            <div className="p-5 bg-white rounded-xl border border-rose-100 bg-rose-50/20 shadow-xs">
              <p className="text-xs font-semibold text-rose-500 uppercase">Remaining Balance Due</p>
              <h3 className="text-xl font-bold text-rose-600 mt-1">
                ₹{(isTaxEmployee ? wardTotalOutstanding : totalOutstanding).toLocaleString('en-IN')}
              </h3>
              <p className="text-[11px] text-rose-400 mt-1">
                {isTaxEmployee ? `Collection rate: ${wardCollectionRate}%` : 'Due before end of financial year'}
              </p>
            </div>
          </div>

          {/* Section: Ward-Level Financial Summary (For Admin Only) */}
          {isAdmin && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-base text-slate-900">City-Wide Ward Financial Summary</h3>
                  <p className="text-xs text-slate-500">
                    Comprehensive revenue assessment, tax demand, collected receipts, and recovery rates across all 6 wards
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
                  Assessment Period: FY 2025-2026
                </span>
              </div>

              {/* 6 Ward Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {wardSummaries.map((w) => (
                  <div key={w.ward} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900">{w.ward}</span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {w.collection_rate}% Collected
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Tax Demanded:</span>
                        <span className="font-bold text-slate-800">₹{w.total_demanded.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Received So Far:</span>
                        <span className="font-bold text-emerald-600">₹{w.total_received.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Outstanding:</span>
                        <span className="font-bold text-rose-600">₹{w.total_outstanding.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-emerald-600 h-1.5 rounded-full" 
                        style={{ width: `${Math.min(100, w.collection_rate)}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/60">
                      <span>{w.properties_count} Properties Registered</span>
                      <span>{w.tax_records_count} Tax Assessments</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Respective Ward Property Tax Records Ledger */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  {isTaxEmployee 
                    ? `Respective Ward Property Tax Ledger — ${selectedWardFilter}` 
                    : 'Municipal Property Tax Ledger'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isTaxEmployee 
                    ? `Detailed property tax accounts, payment statuses, annual amounts, balances, and payment reasons for ${selectedWardFilter}`
                    : 'Individual property tax accounts with valuation benchmarks, payment statuses, and tax assessments'}
                </p>
              </div>

              {/* Ward Filter (Admin can filter any ward, Employee can switch or inspect their ward) */}
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-600 font-medium">Ward:</span>
                <select
                  value={selectedWardFilter}
                  onChange={(e) => setSelectedWardFilter(e.target.value)}
                  className="text-xs border border-slate-300 rounded-lg px-2.5 py-1 bg-white font-medium"
                >
                  {isAdmin && <option value="All">All Wards</option>}
                  <option value="Ward 1">Ward 1</option>
                  <option value="Ward 2">Ward 2</option>
                  <option value="Ward 3">Ward 3</option>
                  <option value="Ward 4">Ward 4</option>
                  <option value="Ward 5">Ward 5</option>
                  <option value="Ward 6">Ward 6</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
              </div>
            ) : filteredProperties.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                No properties registered in {selectedWardFilter}.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-3">Property Ref & Address</th>
                      <th className="py-3 px-3">Citizen / Owner</th>
                      <th className="py-3 px-3">Ward</th>
                      <th className="py-3 px-3 text-right">Assessed Value (Benchmark)</th>
                      <th className="py-3 px-3 text-right">Total Amount Needed Annually</th>
                      <th className="py-3 px-3 text-right">Amount Paid</th>
                      <th className="py-3 px-3 text-right">Remaining Balance</th>
                      <th className="py-3 px-3 text-center">Paid or Not</th>
                      <th className="py-3 px-3">Reason for Payment</th>
                      <th className="py-3 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredProperties.map((p) => {
                      const latestTax = p.tax_records?.[0];
                      const isPaid = latestTax?.payment_status === 'Paid';
                      const isPartiallyPaid = latestTax?.payment_status === 'Partially Paid';
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/60">
                          <td className="py-3 px-3">
                            <span className="font-mono font-bold text-emerald-700 block">{p.property_ref}</span>
                            <span className="text-[11px] text-slate-500 block max-w-xs">{p.address}</span>
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-900">{p.owner_name}</td>
                          <td className="py-3 px-3 font-medium text-slate-700">{p.ward_number}</td>
                          <td className="py-3 px-3 text-right font-medium text-slate-600">
                            ₹{Number(p.assessed_value).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-slate-900">
                            ₹{Number(latestTax?.annual_tax || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-3 text-right font-semibold text-emerald-600">
                            ₹{Number(latestTax?.amount_paid || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-rose-600">
                            ₹{Number(latestTax?.outstanding_balance || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isPaid ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                              isPartiallyPaid ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                              'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}>
                              {isPaid ? 'Fully Paid' : isPartiallyPaid ? 'Partially Paid' : 'Unpaid (Due)'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-[11px] text-slate-500 max-w-xs leading-relaxed">
                            Annual municipal tax covers road maintenance, streetlights, ward sanitation, and emergency civic services.
                          </td>
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            {latestTax && (
                              <button
                                onClick={() => navigate(`/property-tax/${latestTax.id}`)}
                                className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
                              >
                                View Bill
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Payment Transactions History Table (Demonstration Sandbox) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="font-bold text-sm text-slate-900">
          {isAdmin 
            ? 'City-Wide Payment Transactions Ledger' 
            : isTaxEmployee 
              ? `Payment Receipts & Transactions History — ${userAssignedWard}`
              : 'My Payment Receipts & Transaction History'}
        </h3>

        {wardFilteredPayments.length === 0 ? (
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
                {wardFilteredPayments.map((pm) => (
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
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(pm.payment_date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
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
              ⚡ This sandbox transaction will deduct the balance in the database and create an official demonstration tax receipt.
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
