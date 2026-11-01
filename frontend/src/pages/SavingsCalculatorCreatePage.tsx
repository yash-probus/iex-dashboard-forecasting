import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Building,
  MapPin,
  Zap,
  Sliders,
  Activity,
  DollarSign,
  Clock,
  CheckCircle2,
  Info
} from 'lucide-react';
import { createSavingsEntry, CreateSavingsEntryDto } from '../api/savingsCalculator.api';
import { createSavingsNewEntry, SavingsCalculatorNewEntry } from '../api/savingsCalculatorNew.api';
import { getResourceData } from '../api/resourceCenter.api';
import { STATE_TARIFF_MOCK_DATA } from './resource-center/mockData/stateTariff.mock';
import { DISCOM_LIST_MOCK_DATA } from './resource-center/mockData/discomList.mock';

const TOTAL_STEPS = 5;

const STEP_METADATA = [
  { step: 1, label: 'Client Profile', title: 'Client & Facility Profile', desc: 'Identify the enterprise and physical manufacturing plant.', icon: Building },
  { step: 2, label: 'Grid & Utility', title: 'Location & DISCOM Grid', desc: 'Specify the state jurisdiction and local distribution licensee.', icon: MapPin },
  { step: 3, label: 'Tariff & Voltage', title: 'Tariff Category & Voltage', desc: 'Define customer classification and substation supply voltage.', icon: Sliders },
  { step: 4, label: 'Contract Capacity', title: 'Sanctioned Load & Power Factor', desc: 'Specify approved contract capacity for market energy allocations.', icon: Activity },
  { step: 5, label: 'Commercial & TOD', title: 'Commercial Margins & TOD Consumptions', desc: 'Set PROLT platform margins and slot-by-slot consumption demand.', icon: DollarSign },
];

interface SavingsCalculatorCreatePageProps {
  isAdvanced?: boolean;
}

export default function SavingsCalculatorCreatePage({ isAdvanced: isAdvancedProp }: SavingsCalculatorCreatePageProps = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const isAdvanced = isAdvancedProp ?? (location.pathname.includes('new') || location.search.includes('engine=advanced'));

  // Current Step (1-based: 1 to 5)
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Metadata for dropdowns
  const [tariffData, setTariffData] = useState<any[]>(STATE_TARIFF_MOCK_DATA);
  const [discomList, setDiscomList] = useState<any[]>(DISCOM_LIST_MOCK_DATA);

  // Form Fields
  // Step 1: Profile
  const [prefix, setPrefix] = useState('Mr.');
  const [clientName, setClientName] = useState('');
  const [industryName, setIndustryName] = useState('');
  const [address, setAddress] = useState('');

  // Step 2: Grid & Utility
  const [stateCode, setStateCode] = useState('Uttar Pradesh');
  const [discom, setDiscom] = useState('DVVNL');

  // Step 3: Tariff & Voltage
  const [consumerCategory, setConsumerCategory] = useState('HV-2 | Urban Schedule (Large & Heavy Power)');
  const [voltageLevel, setVoltageLevel] = useState('Up to 11 kV');
  const [supplyVoltageValue, setSupplyVoltageValue] = useState('11');

  // Step 4: Contract Load & PF
  const [sanctionedLoadKw, setSanctionedLoadKw] = useState('');
  const [sanctionedLoadKva, setSanctionedLoadKva] = useState('');
  const [powerFactor, setPowerFactor] = useState('0.99');
  const [billedDemandKv, setBilledDemandKv] = useState('');

  // Step 5: Commercial Margins & TOD Readings
  const [proltMargin, setProltMargin] = useState('0.05');
  const [traderMargin, setTraderMargin] = useState('0.02');
  const [meteringCharges, setMeteringCharges] = useState('0');
  const [applyElectricityDuty, setApplyElectricityDuty] = useState(true);
  const [arrearAmount, setArrearAmount] = useState('0');
  const [currentLpsc, setCurrentLpsc] = useState('0');

  // TOD Consumption Month & Slots (Default: 2025-08)
  const [billingMonth, setBillingMonth] = useState('2025-08');
  const [billingUnit, setBillingUnit] = useState<'kVAh' | 'kWh'>('kVAh');
  const [slot1, setSlot1] = useState(''); // 3:00-5:00
  const [slot2, setSlot2] = useState(''); // 19:00-3:00
  const [slot3, setSlot3] = useState(''); // 5:00-10:00
  const [slot4, setSlot4] = useState(''); // 10:00-19:00
  const [peakDemandKva, setPeakDemandKva] = useState('');

  // Load external resource center metadata
  useEffect(() => {
    getResourceData('state-tariff').then(r => { if (r?.success && r.data?.length) setTariffData(r.data); });
    getResourceData('discom-list').then(r => { if (r?.success && r.data?.length) setDiscomList(r.data); });
  }, []);

  // Filtered discoms based on state
  const availableDiscoms = useMemo(() => {
    const st = stateCode.toLowerCase();
    return discomList.filter(d =>
      d.stateCode?.toLowerCase() === st ||
      (st.includes('uttar') && (d.stateCode?.toLowerCase() === 'up' || d.stateName?.toLowerCase().includes('uttar')))
    );
  }, [discomList, stateCode]);

  // Sync kW -> kVA when kW or PF changes
  const handleKwChange = (val: string) => {
    setSanctionedLoadKw(val);
    const num = parseFloat(val);
    const pf = parseFloat(powerFactor) || 0.99;
    if (!isNaN(num) && num > 0) {
      setSanctionedLoadKva((num / pf).toFixed(2).replace(/\.00$/, ''));
    } else {
      setSanctionedLoadKva('');
    }
  };

  // Sync kVA -> kW when kVA changes
  const handleKvaChange = (val: string) => {
    setSanctionedLoadKva(val);
    const num = parseFloat(val);
    const pf = parseFloat(powerFactor) || 0.99;
    if (!isNaN(num) && num > 0) {
      setSanctionedLoadKw((num * pf).toFixed(2).replace(/\.00$/, ''));
    } else {
      setSanctionedLoadKw('');
    }
  };

  // Step Validation
  const validateCurrentStep = (): boolean => {
    setErrorMsg(null);
    if (currentStep === 1) {
      if (!clientName.trim()) {
        setErrorMsg('Please enter a valid Client Full Name.');
        return false;
      }
      if (!industryName.trim()) {
        setErrorMsg('Please specify the Industry / Plant name.');
        return false;
      }
      if (!address.trim()) {
        setErrorMsg('Please provide the physical site address.');
        return false;
      }
    } else if (currentStep === 2) {
      if (!stateCode.trim()) {
        setErrorMsg('Please select a State.');
        return false;
      }
      if (!discom.trim()) {
        setErrorMsg('Please select a DISCOM utility provider.');
        return false;
      }
    } else if (currentStep === 3) {
      if (!consumerCategory.trim()) {
        setErrorMsg('Please select a Consumer Category.');
        return false;
      }
      if (!voltageLevel.trim()) {
        setErrorMsg('Please select a Supply Voltage level.');
        return false;
      }
    } else if (currentStep === 4) {
      const kw = parseFloat(sanctionedLoadKw);
      if (isNaN(kw) || kw <= 0) {
        setErrorMsg('Sanctioned Load must be a positive number (kW).');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      if (currentStep < TOTAL_STEPS) {
        setCurrentStep(prev => prev + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handleBack = () => {
    setErrorMsg(null);
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Submit Final Payload
  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;

    try {
      setSubmitting(true);
      setErrorMsg(null);

      const fullName = prefix ? `${prefix} ${clientName.trim()}` : clientName.trim();
      const formattedVoltage = voltageLevel.trim()
        ? (supplyVoltageValue.trim() ? `${voltageLevel.trim()} - ${supplyVoltageValue.trim()}` : voltageLevel.trim())
        : undefined;

      // Construct TOD Consumption Data
      const todPayload: Record<string, Record<string, any>> = {};
      if (slot1 || slot2 || slot3 || slot4) {
        todPayload[billingMonth] = {
          '3:00-5:00': parseFloat(slot1) || 0,
          '19:00-3:00': parseFloat(slot2) || 0,
          '5:00-10:00': parseFloat(slot3) || 0,
          '10:00-19:00': parseFloat(slot4) || 0,
          'Peak Demand (kVA)': parseFloat(peakDemandKva) || 0,
          'Power Factor': parseFloat(powerFactor) || 0.99,
          'Billing Unit': billingUnit,
          'Billing Month': billingMonth,
          'Electricity Duty': applyElectricityDuty ? 'Yes' : 'No'
        };
      }

      if (isAdvanced) {
        const payload: Partial<SavingsCalculatorNewEntry> = {
          clientName: fullName,
          industryName: industryName.trim(),
          address: address.trim(),
          sanctionedLoadKw: parseFloat(sanctionedLoadKw) || 0,
          stateCode: stateCode.trim(),
          discom: discom.trim(),
          consumerCategory: consumerCategory.trim(),
          voltageLevel: formattedVoltage,
          powerFactor: parseFloat(powerFactor) || 0.99,
          proltMargin: parseFloat(proltMargin) || 0.05,
          traderMargin: parseFloat(traderMargin) || 0.02,
          meteringCharges: parseFloat(meteringCharges) || 0,
          applyElectricityDuty: applyElectricityDuty,
          arrearAmount: parseFloat(arrearAmount) || 0,
          currentLpsc: parseFloat(currentLpsc) || 0,
          billedDemandKv: billedDemandKv.trim() ? parseFloat(billedDemandKv) : undefined,
          todConsumptions: Object.keys(todPayload).length > 0 ? todPayload : undefined
        };

        const newEntry = await createSavingsNewEntry(payload);
        navigate(`/savings-calculator-new/view/${newEntry.id}`);
      } else {
        const payload: CreateSavingsEntryDto = {
          clientName: fullName,
          industryName: industryName.trim(),
          address: address.trim(),
          sanctionedLoadKw: parseFloat(sanctionedLoadKw),
          stateCode: stateCode.trim(),
          discom: discom.trim(),
          consumerCategory: consumerCategory.trim(),
          voltageLevel: formattedVoltage,
          powerFactor: parseFloat(powerFactor) || 0.99,
          proltMargin: parseFloat(proltMargin) || 0.05,
          traderMargin: parseFloat(traderMargin) || 0.02,
          meteringCharges: parseFloat(meteringCharges) || 0,
          applyElectricityDuty: applyElectricityDuty,
          arrearAmount: parseFloat(arrearAmount) || 0,
          currentLpsc: parseFloat(currentLpsc) || 0,
          billedDemandKv: billedDemandKv.trim() ? parseFloat(billedDemandKv) : undefined,
          todConsumptions: Object.keys(todPayload).length > 0 ? todPayload : undefined
        };

        const newEntry = await createSavingsEntry(payload);
        navigate(`/savings-calculator/view/${newEntry.id}`);
      }
    } catch (err: any) {
      console.error('Failed to create client:', err);
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to create client configuration. Please try again.');
      setSubmitting(false);
    }
  };

  const progressPercentage = Math.round((currentStep / TOTAL_STEPS) * 100);

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-[#070A12] text-slate-900 dark:text-slate-100 p-4 sm:p-6 lg:p-8 font-['Inter',sans-serif]">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* ========================================================================= */}
        {/* TOP NAVIGATION & STEP PROGRESS HEADER                                    */}
        {/* ========================================================================= */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate(isAdvanced ? '/savings-calculator-new' : '/savings-calculator')}
              className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{isAdvanced ? 'Back to Advanced Savings Calculator' : 'Back to All Clients'}</span>
            </button>
          </div>

          {/* Header Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#0B0F19] border border-slate-200/80 dark:border-white/10 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-sans">
                  {isAdvanced ? 'Add New Client Simulation (Advanced Engine)' : 'Add New Client Configuration'}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-normal font-sans">
                  Configure client profile, utility tariff schedule, and load parameters for IEX arbitrage calculation.
                </p>
              </div>

              {/* Progress Percentage */}
              <div className="flex flex-col items-end shrink-0">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium font-sans">
                  {progressPercentage}% Completed
                </span>
              </div>
            </div>

            {/* Smooth Progress Bar */}
            <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-600 via-indigo-600 to-emerald-500 transition-all duration-300 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>

            {/* Step Indicators Badges */}
            <div className="grid grid-cols-5 gap-1.5 sm:gap-3 pt-1">
              {STEP_METADATA.map((s) => {
                const isPassed = s.step < currentStep;
                const isCurrent = s.step === currentStep;

                return (
                  <button
                    key={s.step}
                    type="button"
                    onClick={() => {
                      if (s.step < currentStep) setCurrentStep(s.step);
                    }}
                    disabled={s.step > currentStep}
                    className={`flex items-center gap-2 p-2 sm:p-2.5 rounded-xl text-left transition-all cursor-pointer ${isCurrent
                        ? 'bg-violet-50 dark:bg-violet-950/40 border border-violet-500/30'
                        : isPassed
                          ? 'bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 hover:border-slate-300'
                          : 'opacity-40 cursor-not-allowed'
                      }`}
                  >
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs font-semibold ${isPassed
                        ? 'bg-emerald-500 text-white'
                        : isCurrent
                          ? 'bg-violet-600 text-white shadow-xs'
                          : 'bg-slate-200 dark:bg-white/10 text-slate-500'
                      }`}>
                      {isPassed ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.step}
                    </div>
                    <div className="hidden sm:block truncate">
                      <span className={`text-[11px] block truncate font-sans ${isCurrent ? 'text-violet-600 dark:text-violet-300 font-semibold' : 'text-slate-600 dark:text-slate-400 font-medium'
                        }`}>
                        {s.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ERROR NOTIFICATION BANNER                                                 */}
        {/* ========================================================================= */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2 animate-fade-in-up">
            <Info className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP CONTENT CONTAINER                                                    */}
        {/* ========================================================================= */}
        <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#0B0F19] border border-slate-200/80 dark:border-white/10 shadow-xs space-y-6">

          {/* Current Step Header */}
          <div className="pb-4 border-b border-slate-200/80 dark:border-white/10 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border border-violet-200/60 dark:border-violet-800/40 flex items-center justify-center shrink-0 mt-0.5">
              {React.createElement(STEP_METADATA[currentStep - 1].icon, { className: 'w-4 h-4' })}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight font-sans">
                {STEP_METADATA[currentStep - 1].title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-sans">
                {STEP_METADATA[currentStep - 1].desc}
              </p>
            </div>
          </div>

          {/* ───────────────────────────────────────────────────────────────────────── */}
          {/* STEP 1: CLIENT & FACILITY PROFILE                                         */}
          {/* ───────────────────────────────────────────────────────────────────────── */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fade-in-up">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                <div className="sm:col-span-3">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1.5">Prefix</label>
                  <select
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    className="w-full h-10 px-3 text-xs rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/90 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15 font-medium transition-all"
                  >
                    <option value="Mr.">Mr.</option>
                    <option value="Ms.">Ms.</option>
                    <option value="Mrs.">Mrs.</option>
                    <option value="Dr.">Dr.</option>
                    <option value="M/s">M/s</option>
                  </select>
                </div>

                <div className="sm:col-span-9">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1.5">Client Full Name *</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g. Rahul Jaglan"
                    className="w-full h-10 px-3.5 text-xs rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/90 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15 font-medium transition-all"
                  />
                </div>

                <div className="sm:col-span-12">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
                    Industry / Manufacturing Unit Name *
                  </label>
                  <input
                    type="text"
                    value={industryName}
                    onChange={(e) => setIndustryName(e.target.value)}
                    placeholder="e.g. Zydus Wellness Ltd"
                    className="w-full h-10 px-3.5 text-xs rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/90 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15 font-medium transition-all"
                  />
                </div>

                <div className="sm:col-span-12">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
                    Physical Site & Substation Address *
                  </label>
                  <textarea
                    rows={3}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Plot 45, Phase II, Industrial Area, Aligarh, Uttar Pradesh - 202001"
                    className="w-full p-3.5 text-xs rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/90 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15 font-medium transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────────────────── */}
          {/* STEP 2: LOCATION & DISCOM GRID                                            */}
          {/* ───────────────────────────────────────────────────────────────────────── */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-fade-in-up">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1.5">State Jurisdiction *</label>
                  <select
                    value={stateCode}
                    onChange={(e) => {
                      setStateCode(e.target.value);
                      if (e.target.value === 'Uttar Pradesh') setDiscom('DVVNL');
                      else setDiscom('');
                    }}
                    className="w-full h-10 px-3 text-xs rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/90 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15 font-medium transition-all"
                  >
                    <option value="Uttar Pradesh">Uttar Pradesh</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Gujarat">Gujarat</option>
                    <option value="Rajasthan">Rajasthan</option>
                    <option value="Haryana">Haryana</option>
                    <option value="Punjab">Punjab</option>
                    <option value="Madhya Pradesh">Madhya Pradesh</option>
                    <option value="Karnataka">Karnataka</option>
                    <option value="Tamil Nadu">Tamil Nadu</option>
                    <option value="Andhra Pradesh">Andhra Pradesh</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1.5">Local DISCOM Provider *</label>
                  <select
                    value={discom}
                    onChange={(e) => setDiscom(e.target.value)}
                    className="w-full h-10 px-3 text-xs rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/90 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15 font-medium transition-all"
                  >
                    {availableDiscoms.length > 0 ? (
                      availableDiscoms.map(d => (
                        <option key={d.code} value={d.code}>{d.code} - {d.legalName}</option>
                      ))
                    ) : (
                      <>
                        <option value="DVVNL">DVVNL - Dakshinanchal Vidyut Vitran Nigam</option>
                        <option value="PVVNL">PVVNL - Paschimanchal Vidyut Vitran Nigam</option>
                        <option value="MVVNL">MVVNL - Madhyanchal Vidyut Vitran Nigam</option>
                        <option value="PuVVNL">PuVVNL - Purvanchal Vidyut Vitran Nigam</option>
                        <option value="KESCO">KESCO - Kanpur Electricity Supply Company</option>
                        <option value="NPCL">NPCL - Noida Power Company Ltd</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Informative Note */}
              <div className="p-3.5 rounded-xl bg-violet-50/70 dark:bg-violet-950/20 border border-violet-500/20 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  State and DISCOM rules dictate applicable wheeling losses, Cross-Subsidy Surcharges (CSS), and Additional Surcharges (AS) under Open Access regulations.
                </p>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────────────────── */}
          {/* STEP 3: TARIFF CATEGORY & VOLTAGE LEVEL                                   */}
          {/* ───────────────────────────────────────────────────────────────────────── */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-fade-in-up">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
                  Consumer Tariff Category *
                </label>
                <select
                  value={consumerCategory}
                  onChange={(e) => setConsumerCategory(e.target.value)}
                  className="w-full h-10 px-3 text-xs rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/90 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15 font-medium transition-all"
                >
                  <option value="HV-2 | Urban Schedule (Large & Heavy Power)">HV-2 | Urban Schedule (Large & Heavy Power)</option>
                  <option value="HV-1 | Non-Industrial / Commercial Bulk">HV-1 | Non-Industrial / Commercial Bulk</option>
                  <option value="HV-3 | Railway Traction">HV-3 | Railway Traction</option>
                  <option value="LMV-1 | Domestic Light & Power">LMV-1 | Domestic Light & Power</option>
                  <option value="LMV-2 | Non-Domestic / Commercial">LMV-2 | Non-Domestic / Commercial</option>
                  <option value="LMV-6 | Small & Medium Industries">LMV-6 | Small & Medium Industries</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
                    Supply Voltage Bracket *
                  </label>
                  <select
                    value={voltageLevel}
                    onChange={(e) => setVoltageLevel(e.target.value)}
                    className="w-full h-10 px-3 text-xs rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/90 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15 font-medium transition-all"
                  >
                    <option value="Up to 11 kV">Up to 11 kV</option>
                    <option value="Above 11 kV & Up to 66 kV">Above 11 kV & Up to 66 kV</option>
                    <option value="Above 66 kV & Up to 132 kV">Above 66 kV & Up to 132 kV</option>
                    <option value="Above 132 kV">Above 132 kV</option>
                    <option value="Low Tension (LT)">Low Tension (LT)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
                    Operating Supply Value (kV)
                  </label>
                  <select
                    value={supplyVoltageValue}
                    onChange={(e) => setSupplyVoltageValue(e.target.value)}
                    className="w-full h-10 px-3 text-xs rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/90 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15 font-medium transition-all"
                  >
                    <option value="11">11 kV</option>
                    <option value="33">33 kV</option>
                    <option value="66">66 kV</option>
                    <option value="132">132 kV</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────────────────── */}
          {/* STEP 4: SANCTIONED LOAD & CAPACITY                                        */}
          {/* ───────────────────────────────────────────────────────────────────────── */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-fade-in-up">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
                    Sanctioned Load (kW) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={sanctionedLoadKw}
                    onChange={(e) => handleKwChange(e.target.value)}
                    placeholder="e.g. 1410.75"
                    className="w-full h-10 px-3.5 text-xs rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/90 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15 font-semibold transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
                    Sanctioned Load (kVA)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={sanctionedLoadKva}
                    onChange={(e) => handleKvaChange(e.target.value)}
                    placeholder="e.g. 1425"
                    className="w-full h-10 px-3.5 text-xs rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/90 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15 font-medium transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
                    Power Factor (PF)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.8"
                    max="1"
                    value={powerFactor}
                    onChange={(e) => setPowerFactor(e.target.value)}
                    className="w-full h-10 px-3.5 text-xs rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/90 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15 font-medium transition-all"
                  />
                </div>
              </div>

              {/* Floored Energy Info Card */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-violet-600 dark:text-violet-400 font-sans">
                  <Zap className="w-4 h-4" />
                  <span>IEX Market Allocation Rules</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-normal font-sans">
                  Market purchase bidding on IEX is constrained to <strong>1 decimal place in MW</strong>. For example, a contract load of <strong>{sanctionedLoadKw || '0'} kW</strong> translates to <strong>{(parseFloat(sanctionedLoadKw || '0') / 1000).toFixed(3)} MW</strong>, which is floored to <strong>{(Math.floor(parseFloat(sanctionedLoadKw || '0') / 100) / 10).toFixed(1)} MW</strong> during auction clearance.
                </p>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────────────────── */}
          {/* STEP 5: COMMERCIAL MARGINS & TOD CONSUMPTIONS                             */}
          {/* ───────────────────────────────────────────────────────────────────────── */}
          {currentStep === 5 && (
            <div className="space-y-6 animate-fade-in-up">

              {/* Commercial Parameters */}
              <div>
                <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5 font-sans">
                  <DollarSign className="w-3.5 h-3.5" />
                  Platform & Execution Margins
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1.5 font-sans">
                      PROLT Platform Margin (₹/kWh)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={proltMargin}
                      onChange={(e) => setProltMargin(e.target.value)}
                      className="w-full h-10 px-3.5 text-xs rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/90 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15 font-medium transition-all font-sans"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1.5 font-sans">
                      Trader Execution Margin (₹/kWh)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={traderMargin}
                      onChange={(e) => setTraderMargin(e.target.value)}
                      className="w-full h-10 px-3.5 text-xs rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/90 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15 font-medium transition-all font-sans"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1.5 font-sans">
                      Electricity Duty Applicable
                    </label>
                    <div className="flex items-center gap-3 pt-0.5">
                      <button
                        type="button"
                        onClick={() => setApplyElectricityDuty(true)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer border transition-all font-sans ${applyElectricityDuty
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : 'bg-slate-100 dark:bg-white/5 text-slate-400 border-transparent hover:bg-slate-200/60'
                          }`}
                      >
                        Yes (Applicable)
                      </button>
                      <button
                        type="button"
                        onClick={() => setApplyElectricityDuty(false)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer border transition-all font-sans ${!applyElectricityDuty
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                            : 'bg-slate-100 dark:bg-white/5 text-slate-400 border-transparent hover:bg-slate-200/60'
                          }`}
                      >
                        Exempted
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Time of Day (TOD) Consumptions */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-violet-500" />
                    <div>
                      <h4 className="text-xs font-semibold text-slate-900 dark:text-white font-sans">
                        Monthly TOD Consumption Readings
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-sans">
                        Enter slot-wise units from past electricity bill for automated arbitrage simulation.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 font-medium">Unit:</span>
                    <select
                      value={billingUnit}
                      onChange={(e) => setBillingUnit(e.target.value as 'kVAh' | 'kWh')}
                      className="px-2.5 py-1 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 font-bold text-violet-600 focus:outline-none"
                    >
                      <option value="kVAh">kVAh</option>
                      <option value="kWh">kWh</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1.5">
                      Slot 1: 03:00 - 05:00
                    </label>
                    <input
                      type="number"
                      value={slot1}
                      onChange={(e) => setSlot1(e.target.value)}
                      placeholder="e.g. 189690"
                      className="w-full h-10 px-3.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1.5">
                      Slot 2: 19:00 - 03:00
                    </label>
                    <input
                      type="number"
                      value={slot2}
                      onChange={(e) => setSlot2(e.target.value)}
                      placeholder="e.g. 190920"
                      className="w-full h-10 px-3.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1.5">
                      Slot 3: 05:00 - 10:00
                    </label>
                    <input
                      type="number"
                      value={slot3}
                      onChange={(e) => setSlot3(e.target.value)}
                      placeholder="e.g. 139145"
                      className="w-full h-10 px-3.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1.5">
                      Slot 4: 10:00 - 19:00
                    </label>
                    <input
                      type="number"
                      value={slot4}
                      onChange={(e) => setSlot4(e.target.value)}
                      placeholder="e.g. 7985"
                      className="w-full h-10 px-3.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1.5">
                      Peak Demand (kVA)
                    </label>
                    <input
                      type="number"
                      value={peakDemandKva}
                      onChange={(e) => setPeakDemandKva(e.target.value)}
                      placeholder="e.g. 1530"
                      className="w-full h-10 px-3.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1.5">
                      Billing Month Tag
                    </label>
                    <input
                      type="month"
                      value={billingMonth}
                      onChange={(e) => setBillingMonth(e.target.value)}
                      className="w-full h-10 px-3.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* BOTTOM STEP CONTROLS                                                      */}
          {/* ========================================================================= */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-200/80 dark:border-white/10">
            <button
              type="button"
              onClick={() => navigate(isAdvanced ? '/savings-calculator-new' : '/savings-calculator')}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer font-sans"
            >
              Cancel
            </button>

            <div className="flex items-center gap-3">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 transition-all cursor-pointer flex items-center gap-1.5 font-sans"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Previous Step</span>
                </button>
              )}

              {currentStep < TOTAL_STEPS ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-5 py-2.5 rounded-xl text-xs font-medium text-white bg-violet-600 hover:bg-violet-700 active:scale-95 shadow-sm transition-all flex items-center gap-2 cursor-pointer font-sans"
                >
                  <span>Continue to Step {currentStep + 1}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 active:scale-95 shadow-md shadow-violet-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 font-sans"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Creating Client Configuration...</span>
                    </>
                  ) : (
                    <span>Complete & Launch Simulation</span>
                  )}
                </button>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
