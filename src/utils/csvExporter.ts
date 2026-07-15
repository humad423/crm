import { DayBreakdown, MonthlyCalculationResult, UserSettings } from '../types/salary';

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
  csvContent += `الراتب الصافي النهائي المتوقع,${calculationResult.netSalary.toFixed(2)} TRY\n\n`;

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
