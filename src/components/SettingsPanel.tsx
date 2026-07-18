import React, { useState, useEffect } from 'react';
import { useSalary } from '../context/SalaryContext';
import { Settings, Info, RefreshCw, X, ShieldAlert, Check, Calendar, FileText, Download } from 'lucide-react';
import { exportRangeToCSV } from '../utils/csvExporter';
import { exportRangeToPDF } from '../utils/pdfExporter';

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
    monthlySalaries,
    updateMonthlySalary,
    clearMonthlySalary,
    exceptions,
    holidays,
    payments
  } = useSalary();
  
  const [baseSalary, setBaseSalary] = useState(settings.baseSalary);
  const [multiplierWeekdaySat, setMultiplierWeekdaySat] = useState(settings.multiplierWeekdaySat);
  const [multiplierSundayHoliday, setMultiplierSundayHoliday] = useState(settings.multiplierSundayHoliday);
  const [googleApiKey, setGoogleApiKey] = useState(settings.googleApiKey);
  const [showSavedToast, setShowSavedToast] = useState(false);

  // Range and annual report date states
  const [reportStart, setReportStart] = useState(`${year}-01-01`);
  const [reportEnd, setReportEnd] = useState(`${year}-12-31`);

  // Local state to store monthly overrides for the year
  const [localMonthlySalaries, setLocalMonthlySalaries] = useState<{ [key: string]: number }>({});

  const monthNames = [
    '1 - كانون الثاني',
    '2 - شباط',
    '3 - آذار',
    '4 - نيسان',
    '5 - أيار',
    '6 - حزيران',
    '7 - تموز',
    '8 - آب',
    '9 - أيلول',
    '10 - تشرين الأول',
    '11 - تشرين الثاني',
    '12 - كانون الأول',
  ];

  // Sync state with selected month/year context changes
  useEffect(() => {
    setLocalMonthlySalaries({ ...monthlySalaries });
    setBaseSalary(settings.baseSalary);
  }, [monthlySalaries, settings.baseSalary, year, month]);

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

    // Save custom monthly salaries for all 12 months of the current year
    for (let mIdx = 0; mIdx < 12; mIdx++) {
      const key = `${year}-${mIdx}`;
      const localVal = localMonthlySalaries[key];
      const remoteVal = monthlySalaries[key];
      
      if (localVal !== remoteVal) {
        if (localVal === undefined || isNaN(localVal)) {
          await clearMonthlySalary(year, mIdx);
        } else {
          await updateMonthlySalary(Number(localVal), year, mIdx);
        }
      }
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

                {/* Custom Salaries List for the Selected Year */}
                <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-850 space-y-4">
                  <h3 className="text-xs font-bold text-slate-455 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-500" />
                    رواتب أشهر سنة {year} المخصصة
                  </h3>
                  
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
                    يمكنك تحديد راتب مخصص لكل شهر من أشهر السنة منفصلاً. ترك الحقل فارغاً سيعتمد الراتب الافتراضي العام أعلاه تلقائياً.
                  </p>

                  <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                    {monthNames.map((mName, mIdx) => {
                      const key = `${year}-${mIdx}`;
                      const hasCustom = localMonthlySalaries[key] !== undefined;
                      const currentVal = hasCustom ? localMonthlySalaries[key] : '';
                      
                      return (
                        <div key={mIdx} className="flex items-center gap-2.5 justify-between">
                          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 w-1/3">
                            {mName}
                          </span>
                          
                          <div className="flex-1 flex items-center gap-1">
                            <input
                              type="number"
                              value={currentVal}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '') {
                                  const updated = { ...localMonthlySalaries };
                                  delete updated[key];
                                  setLocalMonthlySalaries(updated);
                                } else {
                                  setLocalMonthlySalaries({
                                    ...localMonthlySalaries,
                                    [key]: Number(val),
                                  });
                                }
                              }}
                              placeholder={`${baseSalary} TRY`}
                              min="0"
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-semibold text-[11px] text-left"
                            />
                            
                            {hasCustom && (
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = { ...localMonthlySalaries };
                                  delete updated[key];
                                  setLocalMonthlySalaries(updated);
                                }}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 rounded transition-colors"
                                title="إعادة تعيين للافتراضي"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
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

                {/* Custom Range Export Section */}
                <div className="border-t border-slate-150 dark:border-slate-800 pt-6 space-y-4">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-500" />
                    تصدير التقارير المخصصة والسنوية
                  </h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
                    حدد تاريخ البدء والنهاية لتصدير كشف حساب موحد يجمع تفاصيل الأشهر والدفعات المستلمة في هذه الفترة.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-455 dark:text-slate-500 uppercase">تاريخ البدء</label>
                      <input
                        type="date"
                        value={reportStart}
                        onChange={(e) => setReportStart(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-semibold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-455 dark:text-slate-500 uppercase">تاريخ النهاية</label>
                      <input
                        type="date"
                        value={reportEnd}
                        onChange={(e) => setReportEnd(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-semibold"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => exportRangeToCSV(reportStart, reportEnd, settings, exceptions, holidays, monthlySalaries, payments)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      تصدير كـ CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => exportRangeToPDF(reportStart, reportEnd, settings, exceptions, holidays, monthlySalaries, payments)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/30 text-indigo-650 dark:text-indigo-400 rounded-xl text-xs font-bold transition-all border border-indigo-100 dark:border-indigo-900/30 shadow-sm"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      طباعة تقرير PDF
                    </button>
                  </div>
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
