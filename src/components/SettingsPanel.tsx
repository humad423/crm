import React, { useState, useEffect } from 'react';
import { useSalary } from '../context/SalaryContext';
import { Settings, Info, RefreshCw, X, ShieldAlert, Check } from 'lucide-react';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const { 
    settings, 
    updateSettings, 
    clearAllData, 
    calculationResult,
    year,
    month,
    updateMonthlySalary,
    clearMonthlySalary
  } = useSalary();
  
  const [baseSalary, setBaseSalary] = useState(settings.baseSalary);
  const [multiplierWeekdaySat, setMultiplierWeekdaySat] = useState(settings.multiplierWeekdaySat);
  const [multiplierSundayHoliday, setMultiplierSundayHoliday] = useState(settings.multiplierSundayHoliday);
  const [googleApiKey, setGoogleApiKey] = useState(settings.googleApiKey);
  const [showSavedToast, setShowSavedToast] = useState(false);

  // Custom Monthly Salary state
  const [hasCustomSalary, setHasCustomSalary] = useState(calculationResult.customMonthSalary !== undefined);
  const [customSalaryVal, setCustomSalaryVal] = useState(calculationResult.customMonthSalary || settings.baseSalary);

  // Sync state with selected month/year context changes
  useEffect(() => {
    setHasCustomSalary(calculationResult.customMonthSalary !== undefined);
    setCustomSalaryVal(calculationResult.customMonthSalary || settings.baseSalary);
    setBaseSalary(settings.baseSalary);
  }, [calculationResult.customMonthSalary, settings.baseSalary, year, month]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Save global settings
    await updateSettings({
      baseSalary: Number(baseSalary),
      multiplierWeekdaySat: Number(multiplierWeekdaySat),
      multiplierSundayHoliday: Number(multiplierSundayHoliday),
      googleApiKey: googleApiKey.trim(),
    });

    // Save custom monthly salary override
    if (hasCustomSalary) {
      await updateMonthlySalary(Number(customSalaryVal));
    } else {
      await clearMonthlySalary();
    }

    setShowSavedToast(true);
    setTimeout(() => {
      setShowSavedToast(false);
      onClose();
    }, 1500);
  };

  const handleReset = () => {
    if (window.confirm('هل أنت متأكد من رغبتك في مسح كافة البيانات المسجلة والعودة للإعدادات الافتراضية؟')) {
      clearAllData();
      // Reload page to reset states completely
      window.location.reload();
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 2,
    }).format(val);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
      <div className="absolute inset-0 overflow-hidden">
        {/* Overlay backdrop */}
        <div className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm transition-opacity duration-300" onClick={onClose}></div>

        <div className="pointer-events-none fixed inset-y-0 left-0 flex max-w-full pl-0 md:pl-10">
          <div className="pointer-events-auto w-screen max-w-md transform transition-transform duration-300 ease-in-out translate-x-0">
            <form onSubmit={handleSave} className="flex h-full flex-col bg-white dark:bg-slate-900 shadow-2xl border-r border-slate-100 dark:border-slate-800">
              {/* Header */}
              <div className="px-6 py-5 bg-gradient-to-r from-indigo-500 to-indigo-600 dark:from-slate-850 dark:to-slate-800 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Settings className="w-5 h-5 animate-spin-slow" />
                  <h2 className="text-lg font-bold tracking-wide" id="slide-over-title">لوحة الإعدادات</h2>
                </div>
                <button
                  type="button"
                  className="rounded-lg p-1.5 hover:bg-white/10 text-white transition-colors"
                  onClick={onClose}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body Content */}
              <div className="relative flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Real-time Base Wage Calculations Card */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850">
                  <h3 className="text-xs font-bold text-slate-455 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Info className="w-4 h-4 text-indigo-500" />
                    حسابات الأجور التلقائية
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <span className="text-slate-455 dark:text-slate-500">أجرة اليوم الواحد:</span>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {formatCurrency(calculationResult.dailyWage)}
                      </p>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 block">(الراتب ÷ 30 يوماً)</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-slate-455 dark:text-slate-500">أجرة الساعة العادية:</span>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {formatCurrency(calculationResult.regularHourlyWage)}
                      </p>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 block">(الراتب ÷ 225 ساعة)</span>
                    </div>
                  </div>
                </div>

                {/* Base Salary Input */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block">
                    الراتب الأساسي الصافي الافتراضي (TRY)
                  </label>
                  <input
                    type="number"
                    value={baseSalary}
                    onChange={(e) => setBaseSalary(Number(e.target.value))}
                    min="0"
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-500/30 transition-all font-semibold"
                  />
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    الراتب الافتراضي العام الذي يُعتمد لكافة أشهر السنة ما لم يتم تخصيصه لشهر معين.
                  </p>
                </div>

                {/* Custom Month Salary Override Toggle & Input */}
                <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer" htmlFor="toggle-custom-salary">
                      تحديد راتب مخصص لهذا الشهر فقط ({month + 1} / {year})
                    </label>
                    <input
                      id="toggle-custom-salary"
                      type="checkbox"
                      checked={hasCustomSalary}
                      onChange={(e) => setHasCustomSalary(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>
                  
                  {hasCustomSalary && (
                    <div className="space-y-2 animate-fade-in">
                      <input
                        type="number"
                        value={customSalaryVal}
                        onChange={(e) => setCustomSalaryVal(Number(e.target.value))}
                        min="0"
                        required
                        placeholder="الراتب المخصص لهذا الشهر"
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-semibold text-sm"
                      />
                      <p className="text-[10px] text-amber-600 dark:text-amber-400">
                        سيتم تطبيق هذا الراتب فقط على شهر {month + 1} من عام {year}. بقية الأشهر ستعتمد الراتب الافتراضي.
                      </p>
                    </div>
                  )}
                </div>

                {/* Overtime Multiplier Weekday/Sat */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block">
                    معامل ضرب العمل الإضافي (الأيام العادية والسبت)
                  </label>
                  <input
                    type="number"
                    value={multiplierWeekdaySat}
                    onChange={(e) => setMultiplierWeekdaySat(Number(e.target.value))}
                    step="0.1"
                    min="1.0"
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-500/30 transition-all font-semibold"
                  />
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    الافتراضي حسب القانون التركي هو 1.5x (أو زيادة بنسبة 50%).
                  </p>
                </div>

                {/* Overtime Multiplier Sunday/Holiday */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block">
                    معامل ضرب الأحد والعطل الرسمية
                  </label>
                  <input
                    type="number"
                    value={multiplierSundayHoliday}
                    onChange={(e) => setMultiplierSundayHoliday(Number(e.target.value))}
                    step="0.1"
                    min="1.0"
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-500/30 transition-all font-semibold"
                  />
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    الافتراضي هو 2.0x (أو زيادة بنسبة 100% / ضعف الأجر).
                  </p>
                </div>

                {/* Google Calendar API Key */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block">
                    مفتاح Google Calendar API (اختياري)
                  </label>
                  <input
                    type="password"
                    value={googleApiKey}
                    onChange={(e) => setGoogleApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-500/30 transition-all"
                  />
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
                    يُستخدم لجلب "العطل الرسمية في تركيا" تلقائياً. في حال عدم إدخاله، سيقوم التطبيق بالاعتماد على قاعدة بيانات داخلية لعام 2026.
                  </p>
                </div>

                {/* Reset Section */}
                <div className="border-t border-slate-150 dark:border-slate-800 pt-6 space-y-3">
                  <h4 className="text-sm font-bold text-red-650 dark:text-red-400 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" />
                    منطقة خطر
                  </h4>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-red-200 hover:bg-red-50 dark:border-red-950/40 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl transition-all text-xs font-bold"
                  >
                    <RefreshCw className="w-4 h-4" />
                    مسح كافة البيانات وإعادة التعيين
                  </button>
                </div>

              </div>

              {/* Action Buttons Footer */}
              <div className="border-t border-slate-150 dark:border-slate-800 p-6 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all"
                >
                  <Check className="w-5 h-5" />
                  حفظ الإعدادات
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-3 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-950/30 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Success Toast */}
        {showSavedToast && (
          <div className="fixed bottom-6 left-6 z-50 flex items-center gap-2 px-4 py-3 bg-emerald-500 text-white rounded-xl shadow-xl animate-fade-in font-bold text-sm">
            <Check className="w-4 h-4" />
            تم حفظ الإعدادات بنجاح!
          </div>
        )}
      </div>
    </div>
  );
}
