import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useIncome } from '../../context/IncomeContext';
import { X, Calendar, DollarSign, ArrowRight, ArrowLeft, CheckCircle2, Save, FastForward } from 'lucide-react';

interface IncomeBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function IncomeBatchModal({ isOpen, onClose }: IncomeBatchModalProps) {
  const { sources, addEntry, usdExchangeRate } = useIncome();
  const activeSources = sources.filter(s => s.isActive);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Step -1 is Setup, Step 0 to N-1 is for activeSources, Step N is Review/Saving
  const [step, setStep] = useState<number>(-1);
  const [globalDate, setGlobalDate] = useState<string>('');
  const [globalRate, setGlobalRate] = useState<string>('');
  
  // Data for the current step (source)
  const [grossAmount, setGrossAmount] = useState<string>('');
  const [taxAmount, setTaxAmount] = useState<string>('');
  const [netAmount, setNetAmount] = useState<string>('');
  const [taxRateInput, setTaxRateInput] = useState<string>('0');
  const [note, setNote] = useState<string>('');
  
  // USD Helper
  const [showUsdHelper, setShowUsdHelper] = useState<boolean>(false);
  const [usdHelperAmount, setUsdHelperAmount] = useState<string>('');

  // Collected entries
  const [entriesData, setEntriesData] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      setStep(-1);
      setEntriesData([]);
      const today = new Date();
      const lastDayOfPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      const y = lastDayOfPrevMonth.getFullYear();
      const m = String(lastDayOfPrevMonth.getMonth() + 1).padStart(2, '0');
      const d = String(lastDayOfPrevMonth.getDate()).padStart(2, '0');
      setGlobalDate(`${y}-${m}-${d}`);
      setGlobalRate(usdExchangeRate.toString());
      resetForm();
    }
  }, [isOpen, usdExchangeRate]);

  const resetForm = () => {
    setGrossAmount('');
    setTaxAmount('');
    setNetAmount('');
    setTaxRateInput('0');
    setNote('');
    setShowUsdHelper(false);
    setUsdHelperAmount('');
  };

  const loadSourceDefaults = (source: any) => {
    setTaxRateInput(source.taxRate.toString());
  };

  const saveCurrentStepData = () => {
    if (step >= 0 && step < activeSources.length) {
      const grossVal = parseFloat(grossAmount);
      const netVal = parseFloat(netAmount);
      const currentSource = activeSources[step];
      
      setEntriesData(prev => {
        let newArr = [...prev];
        if ((!isNaN(grossVal) && grossVal > 0) || (!isNaN(netVal) && netVal > 0)) {
          const finalGross = (!isNaN(grossVal) && grossVal > 0) ? grossVal : netVal;
          const finalNet = (!isNaN(netVal) && netVal > 0) ? netVal : finalGross;
          const taxVal = parseFloat(taxAmount) || 0;
          const entry = {
            sourceId: currentSource.id,
            date: globalDate,
            netAmount: finalNet,
            grossAmount: finalGross,
            taxAmount: taxVal,
            taxRateUsed: parseFloat(taxRateInput) || 0,
            exchangeRateUsed: parseFloat(globalRate) || usdExchangeRate,
            note,
            status: 'received' as const
          };
          const existingIdx = newArr.findIndex(e => e.sourceId === currentSource.id);
          if (existingIdx >= 0) {
            newArr[existingIdx] = entry;
          } else {
            newArr.push(entry);
          }
        } else {
          // If empty, remove it
          newArr = newArr.filter(e => e.sourceId !== currentSource.id);
        }
        return newArr;
      });
    }
  };

  const populateFromExisting = (sourceId: string, defaultSource: any) => {
    const existing = entriesData.find(e => e.sourceId === sourceId);
    if (existing) {
      setNetAmount(existing.netAmount.toString());
      setGrossAmount(existing.grossAmount.toString());
      setTaxAmount(existing.taxAmount.toString());
      setTaxRateInput(existing.taxRateUsed.toString());
      setNote(existing.note || '');
    } else {
      resetForm();
      if (defaultSource) {
        loadSourceDefaults(defaultSource);
      }
    }
  };

  const handleNext = () => {
    if (step === -1) {
      if (!globalDate || !globalRate) return;
      setStep(0);
      populateFromExisting(activeSources[0].id, activeSources[0]);
    } else if (step >= 0 && step < activeSources.length) {
      saveCurrentStepData();
      const nextStep = step + 1;
      setStep(nextStep);
      if (nextStep < activeSources.length) {
        populateFromExisting(activeSources[nextStep].id, activeSources[nextStep]);
      }
    }
  };

  const handlePrev = () => {
    if (step === 0) {
      saveCurrentStepData();
      setStep(-1);
    } else if (step > 0 && step <= activeSources.length) {
      if (step < activeSources.length) {
        saveCurrentStepData();
      }
      const prevStep = step - 1;
      setStep(prevStep);
      populateFromExisting(activeSources[prevStep].id, activeSources[prevStep]);
    }
  };

  const handleSaveAll = async () => {
    // Add all valid collected entries sequentially
    for (const entry of entriesData) {
      await addEntry(entry);
    }
    onClose();
  };

  // Calculation helpers for current form
  const taxRate = parseFloat(taxRateInput) || 0;
  const currentRate = parseFloat(globalRate) || usdExchangeRate;

  const handleGrossChange = (val: string) => {
    setGrossAmount(val);
    const grossVal = parseFloat(val);
    if (!isNaN(grossVal) && grossVal > 0) {
      const calculatedTax = (grossVal * taxRate) / 100;
      const calculatedNet = grossVal - calculatedTax;
      setTaxAmount(calculatedTax.toFixed(2));
      setNetAmount(calculatedNet.toFixed(2));
    } else {
      setTaxAmount('');
      setNetAmount('');
    }
  };

  const handleNetChange = (val: string) => {
    setNetAmount(val);
    const netVal = parseFloat(val);
    if (!isNaN(netVal) && netVal > 0) {
      if (taxRate > 0) {
        const grossVal = netVal / (1 - taxRate / 100);
        const calculatedTax = grossVal - netVal;
        setGrossAmount(grossVal.toFixed(2));
        setTaxAmount(calculatedTax.toFixed(2));
      } else {
        setGrossAmount(netVal.toFixed(2));
        setTaxAmount('0');
      }
    }
  };

  const handleUsdHelperChange = (val: string) => {
    setUsdHelperAmount(val);
    const usdVal = parseFloat(val);
    const rate = parseFloat(globalRate) || usdExchangeRate;
    if (!isNaN(usdVal) && usdVal > 0 && rate > 0) {
      handleGrossChange((usdVal * rate).toFixed(2));
    } else {
      handleGrossChange('');
    }
  };

  // Ensure tax calculation updates when tax rate changes
  const handleTaxRateChange = (val: string) => {
    setTaxRateInput(val);
    const newTaxRate = parseFloat(val) || 0;
    const grossVal = parseFloat(grossAmount);
    if (!isNaN(grossVal) && grossVal > 0) {
      const calculatedTax = (grossVal * newTaxRate) / 100;
      const calculatedNet = grossVal - calculatedTax;
      setTaxAmount(calculatedTax.toFixed(2));
      setNetAmount(calculatedNet.toFixed(2));
    }
  };

  if (!isOpen || !mounted) return null;

  const totalSteps = activeSources.length;
  const progressPct = step === -1 ? 0 : step === totalSteps ? 100 : ((step + 1) / totalSteps) * 100;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg flex items-center gap-2">
            <FastForward className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            تسجيل دخل الشهر (بالترتيب)
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div 
            className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="text-center text-xs font-bold text-slate-400 dark:text-slate-500">
          {step === -1 ? 'إعدادات الشهر' : step === totalSteps ? 'المراجعة النهائية' : `المصدر ${step + 1} من ${totalSteps}`}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleNext(); }} className="space-y-4">
          
          {step === -1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-xl text-sm font-semibold border border-emerald-100 dark:border-emerald-800/30">
                سيقوم النظام بعرض مصادر الدخل الخاصة بك بالترتيب لتتمكن من إدخال المبالغ المستلمة في هذا الشهر دفعة واحدة. المصادر التي تتركها فارغة سيتم تخطيها.
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  تاريخ الاستلام الموحد *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <Calendar className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="date" lang="en-GB" dir="ltr"
                    required
                    value={globalDate}
                    onChange={(e) => setGlobalDate(e.target.value)}
                    className="w-full pr-10 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  سعر صرف اليوم ($1 = TRY) *
                </label>
                <input
                  type="text" inputMode="decimal" lang="en"
                  step="0.01"
                  required
                  value={globalRate}
                  onChange={(e) => setGlobalRate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  dir="ltr"
                />
              </div>
            </div>
          )}

          {step >= 0 && step < totalSteps && (
            <div className="space-y-4 animate-fade-in" key={activeSources[step].id}>
              {/* Source Display (Read-Only) */}
              <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: activeSources[step].color }} />
                <span className="font-bold text-lg text-slate-800 dark:text-slate-100">
                  {activeSources[step].name}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 mr-auto">
                  (ضريبة {activeSources[step].taxRate}%)
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                {/* USD Helper Toggle & Input */}
                <div className="col-span-2 flex flex-col gap-2 mb-2 pb-3 border-b border-slate-200 dark:border-slate-700/50">
                  <div className="flex justify-between items-center">
                    <button 
                      type="button"
                      onClick={() => setShowUsdHelper(!showUsdHelper)}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      {showUsdHelper ? 'إخفاء حاسبة الدولار' : 'إدخال المبلغ بالدولار بدلاً من التركي'}
                    </button>
                    {showUsdHelper && (
                      <span className="text-[10px] text-slate-400">سعر الصرف المعتمد: {globalRate}</span>
                    )}
                  </div>
                  
                  {showUsdHelper && (
                    <div className="animate-fade-in mt-1">
                      <label className="block text-[10px] font-bold text-indigo-500 mb-1">
                        القيمة بالدولار (USD) - سيتم تحويلها للتركي تلقائياً
                      </label>
                      <input
                        type="text" inputMode="decimal" lang="en"
                        step="0.01"
                        placeholder="أدخل المبلغ بالدولار..."
                        value={usdHelperAmount}
                        onChange={(e) => handleUsdHelperChange(e.target.value)}
                        className="w-full px-3 py-2 bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800/50 rounded-xl text-indigo-700 dark:text-indigo-300 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        dir="ltr"
                        autoFocus
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1 truncate" title="الإجمالي قبل الضريبة">
                    الإجمالي (Gross TRY) *
                  </label>
                  <input
                    type="text" inputMode="decimal" lang="en"
                    step="0.01"
                    placeholder="فارغ = تخطي"
                    value={grossAmount}
                    onChange={(e) => handleGrossChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-emerald-700 dark:text-emerald-400 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    dir="ltr"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 truncate" title="الصافي المستلم">
                    الصافي (Net TRY)
                  </label>
                  <input
                    type="text" inputMode="decimal" lang="en"
                    step="0.01"
                    placeholder="اختياري"
                    value={netAmount}
                    onChange={(e) => handleNetChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    dir="ltr"
                  />
                </div>
                
                <div className="col-span-2 flex items-center justify-between text-xs mt-2 border-t border-slate-200 dark:border-slate-700 pt-3">
                  <label className="font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    نسبة الضريبة المعتمدة: 
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="text" inputMode="decimal" lang="en"
                      value={taxRateInput}
                      onChange={(e) => handleTaxRateChange(e.target.value)}
                      className="w-16 px-2 py-1 text-center bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 rounded text-rose-600 dark:text-rose-400 font-bold focus:outline-none focus:ring-1 focus:ring-rose-500"
                      dir="ltr"
                    />
                    <span className="text-rose-500 font-bold">%</span>
                  </div>
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-sm">
                  ملاحظات أو تفاصيل السجل
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="ملاحظات اختيارية..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Preview */}
              {netAmount && (
                <div className="flex items-center justify-between font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 text-sm">
                  <span>الصافي (Net USD):</span>
                  <span>${currentRate > 0 ? (parseFloat(netAmount) / currentRate).toFixed(2) : '0.00'} USD</span>
                </div>
              )}
            </div>
          )}

          {step === totalSteps && (
            <div className="space-y-4 animate-fade-in text-center">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-slate-800 dark:text-slate-100 text-lg">
                تم الانتهاء من إدخال البيانات!
              </h4>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                سيتم إضافة <span className="font-bold text-emerald-600 dark:text-emerald-400">{entriesData.length}</span> سجلات جديدة في تاريخ {globalDate}.
              </p>
              
              <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden mt-4 text-sm text-right">
                {entriesData.map((entry, idx) => {
                  const src = activeSources.find(s => s.id === entry.sourceId);
                  return (
                    <div key={idx} className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-700 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: src?.color }} />
                        <span className="font-bold text-slate-700 dark:text-slate-200">{src?.name}</span>
                      </div>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {entry.netAmount} TRY
                      </span>
                    </div>
                  );
                })}
                {entriesData.length > 0 && (
                  <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 border-t-2 border-emerald-200 dark:border-emerald-800">
                    <span className="font-bold text-emerald-800 dark:text-emerald-300">إجمالي الصافي (Net)</span>
                    <div className="flex flex-col items-end">
                      <span className="font-extrabold text-emerald-700 dark:text-emerald-400">
                        {entriesData.reduce((acc, e) => acc + e.netAmount, 0).toFixed(2)} TRY
                      </span>
                      {currentRate > 0 && (
                        <span className="text-xs font-bold text-indigo-500">
                          ~ ${(entriesData.reduce((acc, e) => acc + e.netAmount, 0) / currentRate).toFixed(2)} USD
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {entriesData.length === 0 && (
                  <div className="p-4 text-slate-500 text-center">لم يتم إدخال أي مبالغ.</div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 mt-6">
            <button
              type="button"
              onClick={step === -1 ? onClose : handlePrev}
              className="flex items-center gap-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-all"
            >
              {step === -1 ? (
                <span>إلغاء</span>
              ) : (
                <>
                  <ArrowRight className="w-4 h-4" />
                  <span>السابق</span>
                </>
              )}
            </button>
            
            {step < totalSteps ? (
              <button
                type="submit"
                className="flex items-center gap-1 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-500/10 transition-all"
              >
                <span>التالي</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSaveAll}
                disabled={entriesData.length === 0}
                className={`flex items-center gap-1 px-6 py-2 rounded-xl font-bold shadow-md transition-all ${
                  entriesData.length > 0 
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/10' 
                  : 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Save className="w-4 h-4" />
                <span>حفظ الجميع</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
