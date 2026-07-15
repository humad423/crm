import React from 'react';
import { useSalary } from '../context/SalaryContext';
import { getDaysInMonth, formatDateStr } from '../utils/salaryCalculator';
import { Calendar as CalendarIcon, ShieldAlert, CheckCircle, Clock, Plus, Trash2, CalendarDays } from 'lucide-react';

interface SalaryCalendarProps {
  onSelectDate: (dateStr: string) => void;
}

export default function SalaryCalendar({ onSelectDate }: SalaryCalendarProps) {
  const { year, month, exceptions, holidays, calculationResult, deleteExceptionByDate } = useSalary();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfMonth = new Date(year, month, 1);
  
  // getDay() is 0 for Sunday, 1 for Monday...
  // In Turkey/Arabic calendar, week starts on Monday.
  // Map Sun (0) -> 6, Mon (1) -> 0, Tue (2) -> 1, ..., Sat (6) -> 5
  const firstDayOfWeekIndex = firstDayOfMonth.getDay();
  const startOffset = firstDayOfWeekIndex === 0 ? 6 : firstDayOfWeekIndex - 1;

  const weekdays = ['الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'];
  const weekdaysShort = ['إث', 'ثل', 'أر', 'خم', 'جم', 'سب', 'أح'];
  const monthNames = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

  // Helper to format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Generate calendar days
  const calendarCells = [];
  
  // Empty slots for previous month padding
  for (let i = 0; i < startOffset; i++) {
    calendarCells.push({ key: `empty-${i}`, day: null, dateStr: '' });
  }

  // Active days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = new Date(year, month, day);
    const dateStr = formatDateStr(currentDate);
    calendarCells.push({
      key: `day-${day}`,
      day,
      dateStr,
      dayOfWeek: currentDate.getDay(),
    });
  }

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* Calendar Grid Section - Full Width */}
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-lg">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              تقويم شهر {monthNames[month]} / {year}
            </h2>
          </div>
          <span className="text-[10px] sm:text-xs font-semibold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-550 dark:text-slate-400 rounded-full">
            الدوام الافتراضي: 9س / إثنين-جمعة
          </span>
        </div>

        {/* Days of the Week Headers */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center text-xs font-semibold text-slate-400 dark:text-slate-500">
          {weekdays.map((wd, idx) => (
            <div key={wd} className="py-2">
              <span className="hidden sm:inline">{wd}</span>
              <span className="sm:hidden">{weekdaysShort[idx]}</span>
            </div>
          ))}
        </div>

        {/* Calendar Days Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {calendarCells.map((cell) => {
            if (!cell.day) {
              return (
                <div
                  key={cell.key}
                  className="aspect-square bg-slate-50/50 dark:bg-slate-950/20 rounded-xl border border-dashed border-slate-100 dark:border-slate-900/35"
                />
              );
            }

            const { day, dateStr, dayOfWeek } = cell;
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            
            // Check public holidays
            const holiday = holidays.find((h) => h.date === dateStr);
            const isHoliday = !!holiday;

            // Gather exceptions
            const dayExceptions = exceptions.filter((e) => e.date === dateStr);
            const absence = dayExceptions.find((e) => e.type === 'absence');
            const delay = dayExceptions.find((e) => e.type === 'delay');
            const overtimes = dayExceptions.filter((e) => e.type === 'overtime');

            // Determine border color and styles based on exceptions
            let borderStyle = 'border-slate-100 dark:border-slate-800';
            let bgStyle = 'bg-slate-50/30 dark:bg-slate-900/20';
            let textStyle = 'text-slate-700 dark:text-slate-350';

            if (isHoliday) {
              borderStyle = 'border-purple-200 dark:border-purple-900/40';
              bgStyle = 'bg-purple-50/30 dark:bg-purple-950/10';
              textStyle = 'text-purple-700 dark:text-purple-400';
            } else if (isWeekend) {
              borderStyle = 'border-slate-200 dark:border-slate-800/80';
              bgStyle = 'bg-slate-100/50 dark:bg-slate-950/40';
              textStyle = 'text-slate-400 dark:text-slate-500';
            }

            // Exceptions override base styles
            if (absence) {
              borderStyle = 'border-red-200 dark:border-red-900/50';
              bgStyle = 'bg-red-50/40 dark:bg-red-950/20';
            } else if (delay) {
              borderStyle = 'border-amber-200 dark:border-amber-900/50';
              bgStyle = 'bg-amber-50/40 dark:bg-amber-950/20';
            } else if (overtimes.length > 0) {
              borderStyle = 'border-emerald-200 dark:border-emerald-900/50';
              bgStyle = 'bg-emerald-50/40 dark:bg-emerald-950/20';
            }

            return (
              <div
                key={cell.key}
                onClick={() => onSelectDate(dateStr)}
                className={`relative aspect-square flex flex-col justify-between p-1 sm:p-2 rounded-2xl border ${borderStyle} ${bgStyle} cursor-pointer group hover:scale-[1.02] hover:shadow-sm transition-all duration-200`}
              >
                {/* Day Header: number & holiday name indicator */}
                <div className="flex items-start justify-between">
                  <span className={`text-xs sm:text-sm font-bold ${textStyle}`}>
                    {day}
                  </span>
                  
                  {/* Delete Exception quick action if exists */}
                  {dayExceptions.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteExceptionByDate(dateStr);
                      }}
                      className="hidden sm:group-hover:block p-1 bg-slate-100 hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-950/40 text-slate-400 hover:text-red-500 rounded-md transition-colors"
                      title="حذف الاستثناء"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}

                  {isHoliday && !dayExceptions.length && (
                    <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" title={holiday.localName} />
                  )}
                </div>

                {/* Holiday Label if present */}
                {isHoliday && (
                  <div className="absolute top-6 left-0.5 right-0.5 text-[8px] sm:text-[9px] font-semibold text-purple-600 dark:text-purple-400 truncate bg-purple-100/50 dark:bg-purple-950/30 px-1 rounded text-center">
                    {holiday.localName}
                  </div>
                )}

                {/* Day status display */}
                <div className="flex flex-wrap gap-0.5 mt-auto w-full">
                  {absence && (
                    <span className="text-[10px] font-bold px-1 sm:px-1.5 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-1 w-full justify-center text-center">
                      <span className="hidden sm:inline">غياب كامل</span>
                      <span className="sm:hidden text-[9px]">غياب</span>
                    </span>
                  )}
                  {delay && (
                    <span className="text-[10px] font-bold px-1 sm:px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-lg flex items-center gap-1 w-full justify-center text-center">
                      <span className="hidden sm:inline">تأخير {delay.hours}س</span>
                      <span className="sm:hidden text-[9px]">-{delay.hours}س</span>
                    </span>
                  )}
                  {overtimes.map((ot, oIdx) => (
                    <span
                      key={oIdx}
                      className="text-[10px] font-bold px-1 sm:px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center gap-1 w-full justify-center text-center"
                    >
                      <span className="hidden sm:inline">
                        إضافي {ot.hours}س ({ot.overtimeType === 'weekday' ? 'مسائي' : ot.overtimeType === 'saturday' ? 'سبت' : ot.overtimeType === 'sunday' ? 'أحد' : 'عطلة'})
                      </span>
                      <span className="sm:hidden text-[9px]">
                        +{ot.hours}س
                      </span>
                    </span>
                  ))}
                  
                  {/* Default active display if no exception and regular work day */}
                  {!dayExceptions.length && !isWeekend && !isHoliday && (
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 w-full text-center group-hover:text-slate-500">
                      <span className="hidden sm:inline">9 ساعات (تلقائي)</span>
                      <span className="sm:hidden text-slate-450/70">9س</span>
                    </span>
                  )}

                  {!dayExceptions.length && isWeekend && !isHoliday && (
                    <span className="text-[9px] text-slate-450 dark:text-slate-550 w-full text-center">
                      <span className="hidden sm:inline">عطلة أسبوعية</span>
                      <span className="sm:hidden text-slate-450/50">عطلة</span>
                    </span>
                  )}
                </div>

                {/* FAB Overlay Hover effect indicator */}
                <div className="absolute inset-0 bg-indigo-500/5 dark:bg-indigo-500/10 opacity-0 group-hover:opacity-100 rounded-2xl border-2 border-indigo-500/20 dark:border-indigo-500/40 pointer-events-none transition-opacity duration-200 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-indigo-600 dark:text-indigo-400 opacity-80" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Weekly Breakdown (Weekly Equalization / Denkleştirme) - Bottom Section */}
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            حساب المقاصة الأسبوعية (Denkleştirme)
          </h2>
        </div>

        <p className="text-xs text-slate-400 dark:text-slate-500 mb-6 leading-relaxed">
          وفقاً لقانون العمل التركي، يتم ترحيل ساعات الغياب والتأخير لتغطية ساعات العمل الإضافية أولاً بمعدل (1x) حتى نصل للنصاب الأسبوعي (45 ساعة)، وما زاد عنها يُحتسب بمعامل الضرب المعتمد (1.5x أو 2x).
        </p>

        {/* Horizontal scrollable or multi-column grid below calendar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {calculationResult.weeklyBreakdowns.map((week) => {
            const hasDeficit = week.deficitHours > 0;
            const hasOvertimes = (week.weekdayOvertimeHours + week.saturdayOvertimeHours + week.sundayHolidayOvertimeHours) > 0;

            return (
              <div
                key={week.weekIndex}
                className={`p-4 rounded-xl border flex flex-col justify-between transition-colors ${
                  hasDeficit && hasOvertimes
                    ? 'border-amber-200 dark:border-amber-900/30 bg-amber-50/10 dark:bg-amber-950/5'
                    : 'border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-950/10'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-slate-700 dark:text-slate-350">
                      {week.weekLabel}
                    </h3>
                    {week.deficitHours > 0 ? (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-md">
                        نقص: {week.deficitHours}س
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-md">
                        مكتمل (45س)
                      </span>
                    )}
                  </div>

                  {/* Week Metrics Grid */}
                  <div className="grid grid-cols-1 gap-1 text-[11px] text-slate-450 dark:text-slate-450 mb-3 border-b border-slate-50 dark:border-slate-800/50 pb-2">
                    <div>العمل: <span className="font-semibold text-slate-700 dark:text-slate-300">{week.actualWeekdayHours}س / {week.expectedHours}س</span></div>
                    <div>الغياب: <span className="font-semibold text-slate-700 dark:text-slate-300">{week.absenceDeductions} يوم</span> | التأخير: <span className="font-semibold text-slate-700 dark:text-slate-300">{week.delayHours}س</span></div>
                    <div>الإضافي الفعلي: <span className="font-semibold text-slate-750 dark:text-slate-300">{(week.weekdayOvertimeHours + week.saturdayOvertimeHours + week.sundayHolidayOvertimeHours)}س</span></div>
                  </div>
                </div>

                {/* Equalization Output */}
                <div className="space-y-1 mt-auto">
                  <h4 className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                    النتائج المحتسبة:
                  </h4>
                  {week.overtimeHours1x > 0 && (
                    <div className="flex justify-between text-[11px] text-amber-650 dark:text-amber-400 font-semibold bg-amber-100/30 dark:bg-amber-950/20 px-1.5 py-0.5 rounded">
                      <span>لتغطية النقص (1.0x):</span>
                      <span>{week.overtimeHours1x}س</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[11px] text-slate-550 dark:text-slate-400">
                    <span>إضافي بمعدل (1.5x):</span>
                    <span className={week.overtimeHours1_5x > 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : ''}>
                      {week.overtimeHours1_5x}س
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-550 dark:text-slate-400">
                    <span>إضافي بمعدل (2.0x):</span>
                    <span className={week.overtimeHours2x > 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : ''}>
                      {week.overtimeHours2x}س
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
