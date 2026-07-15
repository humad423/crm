import React, { useState, useEffect } from 'react';
import { useSalary } from '../context/SalaryContext';
import { ExceptionType, OvertimeType, ExceptionEvent } from '../types/salary';
import { X, Calendar, Clock, AlertTriangle, Trash2, Check, FileText } from 'lucide-react';

interface ExceptionModalProps {
  dateStr: string | null;
  onClose: () => void;
}

export default function ExceptionModal({ dateStr, onClose }: ExceptionModalProps) {
  const { exceptions, addException, deleteExceptionByDate, holidays } = useSalary();
  
  const [eventType, setEventType] = useState<ExceptionType>('overtime');
  const [hours, setHours] = useState<number>(3);
  const [overtimeType, setOvertimeType] = useState<OvertimeType>('weekday');
  const [multiplier, setMultiplier] = useState<number>(1.5);
  const [note, setNote] = useState<string>('');

  // Find if there is an existing exception for this date
  const existingExceptions = dateStr ? exceptions.filter((e) => e.date === dateStr) : [];
  const holiday = dateStr ? holidays.find((h) => h.date === dateStr) : null;
  const isHoliday = !!holiday;

  // Determine weekday index to pre-select appropriate overtime type
  useEffect(() => {
    if (dateStr) {
      const [y, m, d] = dateStr.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      const dayVal = date.getDay(); // 0 = Sunday, 6 = Saturday, 1-5 = Weekday
      
      // Auto-set Overtime Type based on day of week / holiday status
      let autoOtType: OvertimeType = 'weekday';
      if (isHoliday) {
        autoOtType = 'holiday';
      } else if (dayVal === 6) {
        autoOtType = 'saturday';
      } else if (dayVal === 0) {
        autoOtType = 'sunday';
      } else {
        autoOtType = 'weekday';
      }
      setOvertimeType(autoOtType);

      // If there's an existing exception, populate the inputs
      if (existingExceptions.length > 0) {
        const primary = existingExceptions[0];
        setEventType(primary.type);
        setHours(primary.hours || (autoOtType === 'saturday' || autoOtType === 'sunday' || autoOtType === 'holiday' ? 8 : 3));
        setOvertimeType(primary.overtimeType || autoOtType);
        
        let initialMult = primary.multiplier;
        if (initialMult === undefined) {
          const typeToCheck = primary.overtimeType || autoOtType;
          initialMult = typeToCheck === 'holiday' ? 1.0 : (typeToCheck === 'sunday' ? 2.0 : 1.5);
        }
        setMultiplier(initialMult);
        setNote(primary.note || '');
      } else {
        setEventType('overtime');
        setHours(autoOtType === 'saturday' || autoOtType === 'sunday' || autoOtType === 'holiday' ? 8 : 3);
        setMultiplier(autoOtType === 'holiday' ? 1.0 : (autoOtType === 'sunday' ? 2.0 : 1.5));
        setNote('');
      }
    }
  }, [dateStr, isHoliday]);

  if (!dateStr) return null;

  const getDayNameInArabic = (dateString: string) => {
    const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const date = new Date(dateString);
    return days[date.getDay()];
  };

  const formatDateLabel = (dateString: string) => {
    const [y, m, d] = dateString.split('-');
    return `${d}/${m}/${y}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    addException({
      date: dateStr,
      type: eventType,
      hours: eventType === 'absence' ? undefined : Number(hours),
      overtimeType: eventType === 'overtime' ? overtimeType : undefined,
      multiplier: eventType === 'overtime' ? Number(multiplier) : undefined,
      note: note.trim() || undefined,
    });
    
    onClose();
  };

  const handleDelete = () => {
    deleteExceptionByDate(dateStr);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Modal Box */}
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-2xl p-6 overflow-hidden animate-scale-up">
        {/* Top Glow decoration */}
        <div className={`absolute top-0 inset-x-0 h-1.5 ${
          existingExceptions.length > 0 ? 'bg-indigo-500' : 'bg-indigo-600'
        }`} />

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-lg">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-850 dark:text-slate-100">
                تسجيل حالة استثنائية
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                يوم {getDayNameInArabic(dateStr)} - {formatDateLabel(dateStr)}
                {isHoliday && <span className="text-purple-650 dark:text-purple-400 font-bold ml-1.5">({holiday.localName})</span>}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850/60 hover:text-slate-600 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Existing Log Notice */}
        {existingExceptions.length > 0 && (
          <div className="mb-4 p-3 rounded-xl bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-200/50 dark:border-indigo-900/30 text-xs text-indigo-700 dark:text-indigo-400 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <span className="font-bold">ملاحظة:</span> هذا اليوم يحتوي بالفعل على استثناء مسجل. سيقوم حفظ هذا النموذج بتعديل السجل الحالي.
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Event Type Select */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider block">
              نوع الاستثناء
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'overtime', label: 'عمل إضافي' },
                { value: 'absence', label: 'غياب يوم كامل' },
                { value: 'delay', label: 'ساعات تأخير' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setEventType(opt.value as ExceptionType)}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all ${
                    eventType === opt.value
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-655 dark:text-indigo-400'
                      : 'border-slate-150 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850/30'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conditional Options */}
          {eventType === 'overtime' && (
            <div className="space-y-4 animate-fade-in">
              {/* Overtime Type */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider block">
                  موقع وتاريخ العمل الإضافي
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'weekday', label: 'مسائي (إثنين - جمعة)', defaultHours: 3 },
                    { value: 'saturday', label: 'يوم السبت', defaultHours: 8 },
                    { value: 'sunday', label: 'يوم الأحد', defaultHours: 8 },
                    { value: 'holiday', label: 'عطلة رسمية', defaultHours: 8 },
                  ].map((ot) => (
                    <button
                      key={ot.value}
                      type="button"
                      onClick={() => {
                        setOvertimeType(ot.value as OvertimeType);
                        setHours(ot.defaultHours);
                        const defaultMult = ot.value === 'holiday' ? 1.0 : (ot.value === 'sunday' ? 2.0 : 1.5);
                        setMultiplier(defaultMult);
                      }}
                      className={`py-2 px-3 text-xs font-semibold rounded-xl border text-center transition-all ${
                        overtimeType === ot.value
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-405'
                          : 'border-slate-150 dark:border-slate-800 text-slate-550 dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-850/30'
                      }`}
                    >
                      {ot.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Overtime Multiplier */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider block">
                  مضاعف ساعات العمل الإضافي (Multiplier)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 1.0, label: 'x1.0' },
                    { value: 1.5, label: 'x1.5' },
                    { value: 2.0, label: 'x2.0' },
                  ].map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setMultiplier(m.value)}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all ${
                        multiplier === m.value
                          ? 'border-indigo-500 bg-indigo-500/10 text-indigo-655 dark:text-indigo-400'
                          : 'border-slate-150 dark:border-slate-800 text-slate-550 dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-850/30'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Overtime Hours */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider block">
                  عدد ساعات العمل الإضافية
                </label>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-slate-400" />
                  <input
                    type="number"
                    value={hours}
                    onChange={(e) => setHours(Math.max(0.5, Number(e.target.value)))}
                    step="0.5"
                    min="0.5"
                    max="24"
                    required
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-500/30 transition-all font-semibold"
                  />
                  <span className="text-sm font-bold text-slate-500 dark:text-slate-400">ساعة</span>
                </div>
                {/* Quick-select hours shortcuts */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {overtimeType === 'saturday' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setHours(8)}
                        className={`px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-all ${
                          hours === 8
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                            : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850/30'
                        }`}
                      >
                        8 ساعات (حتى 16:30)
                      </button>
                      <button
                        type="button"
                        onClick={() => setHours(9)}
                        className={`px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-all ${
                          hours === 9
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                            : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850/30'
                        }`}
                      >
                        9 ساعات (حتى 17:30)
                      </button>
                    </>
                  )}
                  {(overtimeType === 'sunday' || overtimeType === 'holiday') && (
                    <>
                      {[8, 9, 10, 12].map((h) => (
                        <button
                          key={h}
                          type="button"
                          onClick={() => setHours(h)}
                          className={`px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-all ${
                            hours === h
                              ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                              : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850/30'
                          }`}
                        >
                          {h} ساعات
                        </button>
                      ))}
                    </>
                  )}
                  {overtimeType === 'weekday' && (
                    <>
                      {[2, 3, 4].map((h) => (
                        <button
                          key={h}
                          type="button"
                          onClick={() => setHours(h)}
                          className={`px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-all ${
                            hours === h
                              ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                              : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850/30'
                          }`}
                        >
                          {h} ساعات
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {eventType === 'delay' && (
            <div className="space-y-2 animate-fade-in">
              <label className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider block">
                عدد ساعات التأخير
              </label>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-slate-400" />
                <input
                  type="number"
                  value={hours}
                  onChange={(e) => setHours(Math.max(0.5, Number(e.target.value)))}
                  step="0.5"
                  min="0.5"
                  max="9"
                  required
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-500/30 transition-all font-semibold"
                />
                <span className="text-sm font-bold text-slate-500 dark:text-slate-400">ساعة</span>
              </div>
            </div>
          )}

          {eventType === 'absence' && (
            <div className="p-4 rounded-2xl bg-rose-500/5 dark:bg-rose-500/10 border border-rose-200/50 dark:border-rose-900/30 text-rose-700 dark:text-rose-400 flex items-start gap-2.5 animate-fade-in">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <span className="font-bold">تنبيه الغياب:</span>
                <p className="leading-relaxed">
                  سيتم خصم يوم عمل كامل (1/30 من الراتب الصافي) مباشرة في حسابات هذا الشهر.
                </p>
              </div>
            </div>
          )}

          {/* Notes Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider block">
              ملاحظات (اختياري)
            </label>
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-slate-400 mt-2.5" />
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="تفاصيل إضافية (السبب، التكليف...)"
                rows={2}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-500/30 transition-all text-sm resize-none"
              />
            </div>
          </div>

          {/* Buttons Footer */}
          <div className="flex gap-3 border-t border-slate-100 dark:border-slate-800 pt-5">
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md transition-all"
            >
              <Check className="w-4 h-4" />
              حفظ
            </button>
            
            {existingExceptions.length > 0 && (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center justify-center gap-2 px-4 py-2.5 border border-red-200 hover:bg-red-50 text-red-650 dark:border-red-950/40 dark:hover:bg-red-950/20 dark:text-red-400 rounded-xl text-sm font-bold transition-all"
              >
                <Trash2 className="w-4 h-4" />
                حذف
              </button>
            )}
            
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 rounded-xl text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-850/30 transition-all"
            >
              إلغاء
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
