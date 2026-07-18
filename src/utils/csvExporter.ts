import { DayBreakdown, MonthlyCalculationResult, UserSettings, ExceptionEvent, Payment, Holiday } from '../types/salary';
import { calculateMonthlySalary } from './salaryCalculator';

/**
 * Exports the monthly salary and overtime report as a CSV file.
 * Prepend UTF-8 BOM (\uFEFF) to support Arabic characters in Excel.
 */
export function exportMonthToCSV(
  year: number,
  month: number,
  monthName: string,
  settings: UserSettings,
  calculationResult: MonthlyCalculationResult,
  dayBreakdowns: DayBreakdown[]
) {
  const daysOfWeek = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  
  // UTF-8 BOM
  let csvContent = '\uFEFF';

  // Summary Sections
  csvContent += `تقرير حساب الرواتب والعمل الإضافي - لشهر,"${monthName} ${year}"\n`;
  csvContent += `الراتب الأساسي الصافي,${calculationResult.baseSalary.toFixed(2)} TRY\n`;
  csvContent += `أجرة اليوم الواحد,${calculationResult.dailyWage.toFixed(2)} TRY\n`;
  csvContent += `أجرة الساعة العادية,${calculationResult.regularHourlyWage.toFixed(2)} TRY\n`;
  csvContent += `إجمالي أيام الغياب,${calculationResult.totalAbsenceDays} يوم\n`;
  csvContent += `خصم الغياب,-${calculationResult.totalAbsenceDeduction.toFixed(2)} TRY\n`;
  csvContent += `إجمالي ساعات التأخير,${calculationResult.totalDelayHours} ساعة\n`;
  csvContent += `خصم التأخير,-${calculationResult.totalDelayDeduction.toFixed(2)} TRY\n`;
  
  csvContent += `ساعات إضافي تغطية النقص (1x),${calculationResult.overtime1xHours.toFixed(1)} ساعة\n`;
  csvContent += `أجر إضافي تغطية النقص (1x),${calculationResult.overtime1xPay.toFixed(2)} TRY\n`;
  
  csvContent += `ساعات إضافي عادي/مسائي (1.5x),${calculationResult.overtime1_5xHours.toFixed(1)} ساعة\n`;
  csvContent += `أجر إضافي عادي/مسائي (1.5x),${calculationResult.overtime1_5xPay.toFixed(2)} TRY\n`;
  
  csvContent += `ساعات إضافي أحد/عطل (2.0x),${calculationResult.overtime2xHours.toFixed(1)} ساعة\n`;
  csvContent += `أجر إضافي أحد/عطل (2.0x),${calculationResult.overtime2xPay.toFixed(2)} TRY\n`;
  
  csvContent += `إجمالي مستحقات العمل الإضافي,${calculationResult.totalOvertimePay.toFixed(2)} TRY\n`;
  csvContent += `الراتب الصافي النهائي المتوقع,${calculationResult.netSalary.toFixed(2)} TRY\n`;
  csvContent += `إجمالي الدفعات المستلمة,${calculationResult.totalPaymentsReceived.toFixed(2)} TRY\n`;
  csvContent += `الرصيد المتبقي (مستحق للموظف / مستحق للشركة),${calculationResult.remainingBalance.toFixed(2)} TRY\n\n`;

  // Daily Grid Table Headers
  const headers = [
    'التاريخ',
    'اليوم',
    'عطلة رسمية',
    'اسم العطلة',
    'ساعات الدوام الافتراضية',
    'ساعات العمل الفعلية المنفذة',
    'الغياب',
    'التأخير (ساعات)',
    'إضافي بمعدل 1.0x (ساعات)',
    'إضافي بمعدل 1.5x (ساعات)',
    'إضافي بمعدل 2.0x (ساعات)'
  ];

  csvContent += headers.join(',') + '\n';

  // Day breakdown rows
  dayBreakdowns.forEach((day) => {
    // Parse date safely
    const [y, m, d] = day.date.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayName = daysOfWeek[dateObj.getDay()];

    const row = [
      day.date,
      dayName,
      day.isHoliday ? 'نعم' : 'لا',
      day.holidayName || '',
      day.defaultScheduledHours,
      day.actualWeekdayHoursWorked,
      day.absenceDays > 0 ? 'نعم' : 'لا',
      day.delayHours,
      day.flatOvertimeHours || 0,
      (day.weekdayOvertimeHours || 0) + (day.saturdayOvertimeHours || 0),
      day.sundayHolidayOvertimeHours || 0
    ];

    csvContent += row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',') + '\n';
  });

  // Download Trigger
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `تقرير_رواتب_${year}_${month + 1}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exports a range of months as a consolidated CSV report.
 */
export function exportRangeToCSV(
  startDateStr: string,
  endDateStr: string,
  settings: UserSettings,
  exceptions: ExceptionEvent[],
  holidays: Holiday[],
  monthlySalaries: { [key: string]: number },
  payments: Payment[]
) {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  
  // Find all year-month pairs in the range
  const monthsInRange: { year: number; month: number }[] = [];
  let curr = new Date(start.getFullYear(), start.getMonth(), 1);
  const targetEnd = new Date(end.getFullYear(), end.getMonth(), 1);
  
  while (curr <= targetEnd) {
    monthsInRange.push({
      year: curr.getFullYear(),
      month: curr.getMonth(),
    });
    curr.setMonth(curr.getMonth() + 1);
  }

  // Calculate each month
  let rangeBaseSalary = 0;
  let rangeOvertimePay = 0;
  let rangeDeductions = 0;
  let rangeNetSalary = 0;

  const monthRows: string[] = [];

  monthsInRange.forEach(({ year, month }) => {
    const key = `${year}-${month}`;
    const customSalary = monthlySalaries[key];
    const monthExceptions = exceptions.filter((e) => {
      const [ey, em] = e.date.split('-').map(Number);
      return ey === year && (em - 1) === month;
    });
    
    // Pass same holidays list (approximation)
    const monthRes = calculateMonthlySalary(year, month, settings, monthExceptions, holidays, customSalary);
    const monthDeductions = monthRes.totalAbsenceDeduction + monthRes.totalDelayDeduction;
    
    rangeBaseSalary += monthRes.baseSalary;
    rangeOvertimePay += monthRes.totalOvertimePay;
    rangeDeductions += monthDeductions;
    rangeNetSalary += monthRes.netSalary;

    const monthLabel = `${month + 1} / ${year}`;
    monthRows.push(`"${monthLabel}",${monthRes.baseSalary.toFixed(2)},${monthRes.totalOvertimePay.toFixed(2)},-${monthDeductions.toFixed(2)},${monthRes.netSalary.toFixed(2)}`);
  });

  // Payments in range
  const rangePayments = payments.filter((p) => {
    const pDate = new Date(p.date);
    return pDate >= start && pDate <= end;
  });
  const rangeTotalPaid = rangePayments.reduce((sum, p) => sum + p.amount, 0);
  const rangeBalance = rangeNetSalary - rangeTotalPaid;

  let csvContent = '\uFEFF'; // UTF-8 BOM
  csvContent += `تقرير مخصص لحساب الرواتب والعمل الإضافي,الفترة: من ${startDateStr} إلى ${endDateStr}\n\n`;
  csvContent += `ملخص الفترة المالية\n`;
  csvContent += `إجمالي الراتب الأساسي,${rangeBaseSalary.toFixed(2)} TRY\n`;
  csvContent += `إجمالي مستحقات العمل الإضافي,${rangeOvertimePay.toFixed(2)} TRY\n`;
  csvContent += `إجمالي الخصومات,-${rangeDeductions.toFixed(2)} TRY\n`;
  csvContent += `إجمالي صافي الراتب المستحق,${rangeNetSalary.toFixed(2)} TRY\n`;
  csvContent += `إجمالي الدفعات المستلمة,${rangeTotalPaid.toFixed(2)} TRY\n`;
  csvContent += `الرصيد المتبقي (${rangeBalance >= 0 ? 'مستحق لك' : 'مستحق عليك'}),${rangeBalance.toFixed(2)} TRY\n\n`;

  csvContent += `تفاصيل الأشهر في الفترة المحددة\n`;
  csvContent += `الشهر,الراتب الأساسي الصافي,مستحقات العمل الإضافي,الخصومات,صافي المستحقات\n`;
  monthRows.forEach(row => {
    csvContent += row + '\n';
  });
  csvContent += '\n';

  csvContent += `سجل الدفعات المقبوضة في هذه الفترة\n`;
  csvContent += `التاريخ,البيان / الملاحظة,المبلغ المستلم\n`;
  if (rangePayments.length === 0) {
    csvContent += `-,لا توجد دفعات مسجلة,-\n`;
  } else {
    rangePayments.forEach(p => {
      csvContent += `${p.date},"${p.note || ''}",${p.amount.toFixed(2)}\n`;
    });
  }

  // Download Trigger
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `تقرير_رواتب_مخصص_${startDateStr}_إلى_${endDateStr}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
