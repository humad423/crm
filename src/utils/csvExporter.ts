import { DayBreakdown, MonthlyCalculationResult, UserSettings, ExceptionEvent, Payment, Holiday } from '../types/salary';
import { calculateMonthlySalary } from './salaryCalculator';
import { ReportLang, reportTranslations } from './translations';

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
  dayBreakdowns: DayBreakdown[],
  lang: ReportLang = 'ar'
) {
  const t = reportTranslations[lang];
  let csvContent = '\uFEFF'; // UTF-8 BOM
  
  // Summary Section
  csvContent += `"${t.reportTitleMonthly} - ${monthName} ${year}"\n`;
  csvContent += `"${t.baseSalary}",${calculationResult.baseSalary.toFixed(2)} TRY\n`;
  csvContent += `"${t.totalDeductions}",-${(calculationResult.totalAbsenceDeduction + calculationResult.totalDelayDeduction).toFixed(2)} TRY\n`;
  csvContent += `"${t.totalOvertimePay}",${calculationResult.totalOvertimePay.toFixed(2)} TRY\n`;
  csvContent += `"${t.netSalaryDue}",${calculationResult.netSalary.toFixed(2)} TRY\n`;
  csvContent += `"${t.totalReceived}",${calculationResult.totalPaymentsReceived.toFixed(2)} TRY\n`;
  csvContent += `"${t.totalRemainingBalance}",${calculationResult.remainingBalance.toFixed(2)} TRY\n\n`;

  // Daily details Headers
  csvContent += `"${t.dailyAttendanceLog}"\n`;
  csvContent += `"${t.date}","${t.day}","${t.dayType}","${t.scheduledHours}","${t.actualHours}","${t.exceptionsAndOvertime}"\n`;

  const daysOfWeekAr = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const daysOfWeekEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const daysOfWeekTr = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  const daysOfWeek = lang === 'ar' ? daysOfWeekAr : (lang === 'tr' ? daysOfWeekTr : daysOfWeekEn);

  dayBreakdowns.forEach((day) => {
    const [y, m, d] = day.date.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayName = daysOfWeek[dateObj.getDay()];

    let dayTypeLabel = t.regularDay;
    if (day.isHoliday) dayTypeLabel = `${t.holidayDay}: ${day.holidayName || ''}`;
    else if (dateObj.getDay() === 0 || dateObj.getDay() === 6) dayTypeLabel = t.weekendDay;

    let exceptionLabel = '-';
    if (day.absenceDays > 0) exceptionLabel = t.absenceDay;
    else if (day.delayHours > 0) exceptionLabel = `${t.delayDay} ${day.delayHours}${t.hours}`;
    else if (day.flatOvertimeHours > 0) exceptionLabel = `${t.overtimeDay} ${day.flatOvertimeHours}${t.hours} (1.0x)`;
    else if ((day.weekdayOvertimeHours + day.saturdayOvertimeHours) > 0) {
      exceptionLabel = `${t.overtimeDay} ${(day.weekdayOvertimeHours + day.saturdayOvertimeHours)}${t.hours} (1.5x)`;
    } else if (day.sundayHolidayOvertimeHours > 0) {
      exceptionLabel = `${t.overtimeDay} ${day.sundayHolidayOvertimeHours}${t.hours} (2.0x)`;
    }

    const row = [
      `${d}/${m}/${y}`,
      dayName,
      dayTypeLabel,
      `${day.defaultScheduledHours}${t.hours}`,
      `${day.actualWeekdayHoursWorked}${t.hours}`,
      exceptionLabel
    ];

    csvContent += row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',') + '\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `salary_report_${year}_${month + 1}_${lang}.csv`);
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
  payments: Payment[],
  lang: ReportLang = 'ar'
) {
  const t = reportTranslations[lang];
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
  csvContent += `"${t.reportTitleRange}",${t.selectedRange}: ${startDateStr} - ${endDateStr}\n\n`;
  csvContent += `"${t.financialReconciliation}"\n`;
  csvContent += `"${t.totalBaseSalaries}",${rangeBaseSalary.toFixed(2)} TRY\n`;
  csvContent += `"${t.totalOvertimePay}",${rangeOvertimePay.toFixed(2)} TRY\n`;
  csvContent += `"${t.totalDeductions}",-${rangeDeductions.toFixed(2)} TRY\n`;
  csvContent += `"${t.totalNetDueEarned}",${rangeNetSalary.toFixed(2)} TRY\n`;
  csvContent += `"${t.totalPaymentsPaid}",${rangeTotalPaid.toFixed(2)} TRY\n`;
  csvContent += `"${t.totalRemainingBalance} (${rangeBalance >= 0 ? t.netRemainingToYou : t.netRemainingFromYou})",${rangeBalance.toFixed(2)} TRY\n\n`;

  csvContent += `"${t.reportTitleRange}"\n`;
  csvContent += `"${t.month}","${t.baseSalary}","${t.overtimePay}","${t.totalDeductions}","${t.netSalaryDue}"\n`;
  monthRows.forEach(row => {
    csvContent += row + '\n';
  });
  csvContent += '\n';

  csvContent += `"${t.advancesReceived}"\n`;
  csvContent += `"${t.date}","${t.description}","${t.amount}"\n`;
  if (rangePayments.length === 0) {
    csvContent += `-,${t.noPayments},-\n`;
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
  link.setAttribute('download', `salary_report_range_${startDateStr}_to_${endDateStr}_${lang}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
