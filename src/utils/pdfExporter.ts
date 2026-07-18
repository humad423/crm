import { DayBreakdown, MonthlyCalculationResult, UserSettings, ExceptionEvent, Payment, Holiday } from '../types/salary';
import { calculateMonthlySalary } from './salaryCalculator';
import { ReportLang, reportTranslations } from './translations';

/**
 * Generates and prints a professional PDF report of the monthly salary calculation.
 */
export function exportMonthToPDF(
  year: number,
  month: number,
  monthName: string,
  settings: UserSettings,
  calculationResult: MonthlyCalculationResult,
  dayBreakdowns: DayBreakdown[],
  exceptions: ExceptionEvent[],
  lang: ReportLang = 'ar'
) {
  const t = reportTranslations[lang];
  const isRtl = lang === 'ar';
  
  const daysOfWeekAr = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const daysOfWeekEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const daysOfWeekTr = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  const daysOfWeek = lang === 'ar' ? daysOfWeekAr : (lang === 'tr' ? daysOfWeekTr : daysOfWeekEn);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 2,
    }).format(val);
  };

  const totalDeductions = calculationResult.totalAbsenceDeduction + calculationResult.totalDelayDeduction;
  const totalOvertimeHours = calculationResult.overtime1xHours + calculationResult.overtime1_5xHours + calculationResult.overtime2xHours;

  const isCustomSalary = calculationResult.customMonthSalary !== undefined;
  const remaining = calculationResult.remainingBalance;

  let remainingTitle = t.remainingBalanceSettled;
  let remainingBg = '#f8fafc';
  let remainingBorder = '#e2e8f0';
  let remainingTextColor = '#0f172a';
  
  if (remaining > 0) {
    remainingTitle = t.remainingBalanceToYou;
    remainingBg = '#f0fdf4';
    remainingBorder = '#6ee7b7';
    remainingTextColor = '#15803d';
  } else if (remaining < 0) {
    remainingTitle = t.remainingBalanceFromYou;
    remainingBg = '#fef2f2';
    remainingBorder = '#fca5a5';
    remainingTextColor = '#b91c1c';
  }

  // Create iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) return;

  // Generate Daily Logs HTML rows
  let dailyRowsHtml = '';
  dayBreakdowns.forEach((day) => {
    const [y, m, d] = day.date.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayName = daysOfWeek[dateObj.getDay()];
    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

    let dayTypeLabel = t.regularDay;
    if (day.isHoliday) dayTypeLabel = `${t.holidayDay}: ${day.holidayName || ''}`;
    else if (isWeekend) dayTypeLabel = t.weekendDay;

    let exceptionLabel = '-';
    if (day.absenceDays > 0) exceptionLabel = t.absenceDay;
    else if (day.delayHours > 0) exceptionLabel = `${t.delayDay} ${day.delayHours}${t.hours}`;
    else if (day.flatOvertimeHours > 0) exceptionLabel = `${t.flatOvertimeHours}${t.hours} (1.0x)`;
    else if ((day.weekdayOvertimeHours + day.saturdayOvertimeHours) > 0) {
      exceptionLabel = `${(day.weekdayOvertimeHours + day.saturdayOvertimeHours)}${t.hours} (1.5x)`;
    } else if (day.sundayHolidayOvertimeHours > 0) {
      exceptionLabel = `${day.sundayHolidayOvertimeHours}${t.hours} (2.0x)`;
    }

    // Retrieve note from exception events of this day
    const dayExceptions = exceptions.filter((e) => e.date === day.date);
    const noteText = dayExceptions.map(e => e.note).filter(Boolean).join(' | ') || '-';

    const rowBg = day.absenceDays > 0 ? '#fef2f2' : (day.isHoliday ? '#faf5ff' : (isWeekend ? '#f8fafc' : '#ffffff'));

    dailyRowsHtml += `
      <tr style="background-color: ${rowBg}; text-align: center;">
        <td style="padding: 6px; border: 1px solid #e2e8f0; font-weight: 600;">${d}/${m}/${y}</td>
        <td style="padding: 6px; border: 1px solid #e2e8f0;">${dayName}</td>
        <td style="padding: 6px; border: 1px solid #e2e8f0; font-size: 10px; color: #475569;">${dayTypeLabel}</td>
        <td style="padding: 6px; border: 1px solid #e2e8f0;">${day.defaultScheduledHours}${t.hours}</td>
        <td style="padding: 6px; border: 1px solid #e2e8f0; font-weight: 500;">${day.actualWeekdayHoursWorked}${t.hours}</td>
        <td style="padding: 6px; border: 1px solid #e2e8f0; font-size: 11px; font-weight: bold; color: ${day.absenceDays > 0 ? '#e11d48' : (day.delayHours > 0 ? '#d97706' : '#10b981')};">${exceptionLabel}</td>
        <td style="padding: 6px; border: 1px solid #e2e8f0; font-size: 10px; color: #64748b;">${noteText}</td>
      </tr>
    `;
  });

  // Generate Weekly Breakdown HTML cards
  let weeklyHtml = '';
  calculationResult.weeklyBreakdowns.forEach((week) => {
    weeklyHtml += `
      <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; background-color: #f8fafc; font-size: 11px;">
        <div style="font-weight: bold; color: #1e293b; margin-bottom: 5px; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; display: flex; justify-content: space-between;">
          <span>${t.week} ${week.weekIndex}</span>
          <span style="color: ${week.deficitHours > 0 ? '#d97706' : '#10b981'}">${week.deficitHours > 0 ? `${t.deficit}: ${week.deficitHours}${t.hours}` : t.completed}</span>
        </div>
        <div style="margin-bottom: 4px;">${t.actualHoursLabel}: <b>${week.actualWeekdayHours}${t.hours} / ${week.expectedHours}${t.hours}</b></div>
        <div style="margin-bottom: 4px;">${t.absences}/${t.delays}: <b>${week.absenceDeductions} غ | ${week.delayHours}${t.hours}</b></div>
        <div style="border-top: 1px dashed #cbd5e1; padding-top: 4px; margin-top: 4px;">
          <div>1.0x: <b>${week.overtimeHours1x}س</b></div>
          <div>1.5x: <b>${week.overtimeHours1_5x}س</b></div>
          <div>2.0x: <b>${week.overtimeHours2x}س</b></div>
        </div>
      </div>
    `;
  });

  // Generate Payments list HTML rows
  let paymentsRowsHtml = '';
  const paymentsList = calculationResult.currentMonthPayments || [];
  if (paymentsList.length === 0) {
    paymentsRowsHtml = `
      <tr>
        <td colspan="3" style="padding: 10px; border: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 11px;">
          ${t.noPaymentsMonthly}
        </td>
      </tr>
    `;
  } else {
    paymentsList.forEach((p) => {
      const [y, m, d] = p.date.split('-').map(Number);
      paymentsRowsHtml += `
        <tr style="text-align: center; font-size: 11px;">
          <td style="padding: 6px; border: 1px solid #e2e8f0; font-weight: 600;">${d}/${m}/${y}</td>
          <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: ${isRtl ? 'right' : 'left'};">${p.note || '-'}</td>
          <td style="padding: 6px; border: 1px solid #e2e8f0; font-weight: bold; color: #059669;">${formatCurrency(p.amount)}</td>
        </tr>
      `;
    });
  }

  // Write content
  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html dir="${isRtl ? 'rtl' : 'ltr'}" lang="${lang}">
    <head>
      <meta charset="utf-8">
      <title>${t.reportTitleMonthly} - ${monthName} ${year}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
      <style>
        body {
          font-family: ${isRtl ? "'Cairo', sans-serif" : "'Inter', sans-serif"};
          margin: 0;
          padding: 20px;
          color: #0f172a;
          background-color: #ffffff;
        }
        @media print {
          body {
            padding: 0;
          }
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #cbd5e1;
          padding-bottom: 15px;
          margin-bottom: 20px;
        }
        .title {
          font-size: 20px;
          font-weight: 700;
          color: #1e3a8a;
          margin: 0;
        }
        .meta-text {
          font-size: 11px;
          color: #475569;
          margin: 2px 0;
        }
        .summary-footer {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 20px;
          padding-top: 14px;
          border-top: 2px solid #e2e8f0;
        }
        .summary-pill {
          display: flex;
          flex-direction: column;
          align-items: center;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 6px 12px;
          background-color: #f8fafc;
          min-width: 100px;
          flex: 1;
        }
        .pill-label {
          font-size: 9px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          margin-bottom: 3px;
        }
        .pill-value {
          font-size: 12px;
          font-weight: 700;
          color: #0f172a;
        }
        .section-title {
          font-size: 13px;
          font-weight: 700;
          color: #1e293b;
          border-${isRtl ? 'right' : 'left'}: 3px solid #6366f1;
          padding-${isRtl ? 'right' : 'left'}: 8px;
          margin: 20px 0 10px 0;
        }
        .table-container {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
        }
        .table-container th {
          background-color: #0f172a;
          color: #ffffff;
          font-weight: bold;
          padding: 8px;
          border: 1px solid #1e3a8a;
        }

      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1 class="title">${t.reportTitleMonthly}</h1>
          <p class="meta-text" style="font-weight: bold;">${t.accountingPeriod}: ${monthName} / ${year}</p>
          <p class="meta-text">${t.calculationRules}</p>
        </div>
        <div style="text-align: ${isRtl ? 'left' : 'right'};">
          <p class="meta-text" style="font-weight: bold; font-size: 13px; color: #1e3a8a;">${t.crmSystem}</p>
          <p class="meta-text">${t.exportDate}: ${new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'tr-TR')}</p>
        </div>
      </div>



      <div style="display: grid; grid-template-cols: 2fr 1fr; gap: 20px; margin-bottom: 25px; align-items: start;">
        <div>
          <h2 class="section-title">${t.weeklyEqualization}</h2>
          <div style="display: grid; grid-template-cols: repeat(5, 1fr); gap: 8px;">
            ${weeklyHtml}
          </div>
        </div>
        <div>
          <h2 class="section-title">${t.advancesReceived}</h2>
          <table class="table-container">
            <thead>
              <tr style="background-color: #475569;">
                <th style="padding: 6px; background-color: #475569; border-color: #475569; width: 30%">${t.date}</th>
                <th style="padding: 6px; background-color: #475569; border-color: #475569; width: 45%">${t.description}</th>
                <th style="padding: 6px; background-color: #475569; border-color: #475569; width: 25%">${t.amount}</th>
              </tr>
            </thead>
            <tbody>
              ${paymentsRowsHtml}
            </tbody>
          </table>
        </div>
      </div>

      <h2 class="section-title">${t.dailyAttendanceLog}</h2>
      <table class="table-container">
        <thead>
          <tr>
            <th style="width: 12%">${t.date}</th>
            <th style="width: 10%">${t.day}</th>
            <th style="width: 20%">${t.dayType}</th>
            <th style="width: 12%">${t.scheduledHours}</th>
            <th style="width: 12%">${t.actualHours}</th>
            <th style="width: 18%">${t.exceptionsAndOvertime}</th>
            <th style="width: 16%">${t.notes}</th>
          </tr>
        </thead>
        <tbody>
          ${dailyRowsHtml}
        </tbody>
      </table>

      <div class="summary-footer">
        <div class="summary-pill">
          <span class="pill-label">${t.baseSalary}</span>
          <span class="pill-value">${formatCurrency(calculationResult.baseSalary)}</span>
        </div>
        <div class="summary-pill" style="border-color: #fca5a5;">
          <span class="pill-label" style="color: #ef4444;">${t.totalDeductions}</span>
          <span class="pill-value" style="color: #dc2626;">-${formatCurrency(totalDeductions)}</span>
        </div>
        <div class="summary-pill" style="border-color: #6ee7b7;">
          <span class="pill-label" style="color: #10b981;">${t.overtimePay}</span>
          <span class="pill-value" style="color: #059669;">+${formatCurrency(calculationResult.totalOvertimePay)}</span>
        </div>
        <div class="summary-pill" style="border-color: #93c5fd; background-color: #eff6ff;">
          <span class="pill-label" style="color: #2563eb;">${t.netSalaryDue}</span>
          <span class="pill-value" style="color: #1d4ed8;">${formatCurrency(calculationResult.netSalary)}</span>
        </div>
        <div class="summary-pill" style="border-color: ${remainingBorder}; background-color: ${remainingBg};">
          <span class="pill-label" style="color: ${remainingTextColor};">${remainingTitle}</span>
          <span class="pill-value" style="color: ${remainingTextColor};">${formatCurrency(Math.abs(remaining))}</span>
        </div>
      </div>
    </body>
    </html>
  `);
  iframeDoc.close();

  // Print once resources load
  const iframeWindow = iframe.contentWindow;
  if (iframeWindow) {
    iframe.onload = () => {
      setTimeout(() => {
        iframeWindow.focus();
        iframeWindow.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 500);
    };
  }
}

/**
 * Generates and prints a professional PDF report for a custom date range.
 */
export function exportRangeToPDF(
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
  const isRtl = lang === 'ar';
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

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 2,
    }).format(val);
  };

  // Calculate each month
  let rangeBaseSalary = 0;
  let rangeOvertimePay = 0;
  let rangeDeductions = 0;
  let rangeNetSalary = 0;

  let monthlyRowsHtml = '';

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
    monthlyRowsHtml += `
      <tr style="text-align: center;">
        <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: 600;">${monthLabel}</td>
        <td style="padding: 8px; border: 1px solid #e2e8f0;">${formatCurrency(monthRes.baseSalary)}</td>
        <td style="padding: 8px; border: 1px solid #e2e8f0; color: #059669; font-weight: 500;">+${formatCurrency(monthRes.totalOvertimePay)}</td>
        <td style="padding: 8px; border: 1px solid #e2e8f0; color: #dc2626;">-${formatCurrency(monthDeductions)}</td>
        <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold; color: #1d4ed8;">${formatCurrency(monthRes.netSalary)}</td>
      </tr>
    `;
  });

  // Payments in range
  const rangePayments = payments.filter((p) => {
    const pDate = new Date(p.date);
    return pDate >= start && pDate <= end;
  });
  const rangeTotalPaid = rangePayments.reduce((sum, p) => sum + p.amount, 0);
  const rangeBalance = rangeNetSalary - rangeTotalPaid;

  let remainingTitle = t.remainingBalanceSettled;
  let remainingBg = '#f8fafc';
  let remainingBorder = '#e2e8f0';
  let remainingTextColor = '#0f172a';
  
  if (rangeBalance > 0) {
    remainingTitle = t.remainingBalanceToYou;
    remainingBg = '#f0fdf4';
    remainingBorder = '#6ee7b7';
    remainingTextColor = '#15803d';
  } else if (rangeBalance < 0) {
    remainingTitle = t.remainingBalanceFromYou;
    remainingBg = '#fef2f2';
    remainingBorder = '#fca5a5';
    remainingTextColor = '#b91c1c';
  }

  // Generate Payments list HTML rows
  let paymentsRowsHtml = '';
  if (rangePayments.length === 0) {
    paymentsRowsHtml = `
      <tr>
        <td colspan="3" style="padding: 10px; border: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 11px;">
          ${t.noPayments}
        </td>
      </tr>
    `;
  } else {
    rangePayments.forEach((p) => {
      const [y, m, d] = p.date.split('-').map(Number);
      paymentsRowsHtml += `
        <tr style="text-align: center; font-size: 11px;">
          <td style="padding: 6px; border: 1px solid #e2e8f0; font-weight: 600;">${d}/${m}/${y}</td>
          <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: ${isRtl ? 'right' : 'left'};">${p.note || '-'}</td>
          <td style="padding: 6px; border: 1px solid #e2e8f0; font-weight: bold; color: #059669;">${formatCurrency(p.amount)}</td>
        </tr>
      `;
    });
  }

  // Create iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) return;

  // Write range content
  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html dir="${isRtl ? 'rtl' : 'ltr'}" lang="${lang}">
    <head>
      <meta charset="utf-8">
      <title>${t.reportTitleRange} - ${startDateStr} - ${endDateStr}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
      <style>
        body {
          font-family: ${isRtl ? "'Cairo', sans-serif" : "'Inter', sans-serif"};
          margin: 0;
          padding: 20px;
          color: #0f172a;
          background-color: #ffffff;
        }
        @media print {
          body {
            padding: 0;
          }
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #cbd5e1;
          padding-bottom: 15px;
          margin-bottom: 20px;
        }
        .title {
          font-size: 20px;
          font-weight: 700;
          color: #1e3a8a;
          margin: 0;
        }
        .meta-text {
          font-size: 11px;
          color: #475569;
          margin: 2px 0;
        }
        .summary-footer {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 20px;
          padding-top: 14px;
          border-top: 2px solid #e2e8f0;
        }
        .summary-pill {
          display: flex;
          flex-direction: column;
          align-items: center;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 6px 12px;
          background-color: #f8fafc;
          min-width: 90px;
          flex: 1;
        }
        .pill-label {
          font-size: 9px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          margin-bottom: 3px;
        }
        .pill-value {
          font-size: 12px;
          font-weight: 700;
          color: #0f172a;
        }
        .section-title {
          font-size: 13px;
          font-weight: 700;
          color: #1e293b;
          border-${isRtl ? 'right' : 'left'}: 3px solid #6366f1;
          padding-${isRtl ? 'right' : 'left'}: 8px;
          margin: 20px 0 10px 0;
        }
        .table-container {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
        }
        .table-container th {
          background-color: #0f172a;
          color: #ffffff;
          font-weight: bold;
          padding: 8px;
          border: 1px solid #1e3a8a;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1 class="title">${t.reportTitleRange}</h1>
          <p class="meta-text" style="font-weight: bold;">${t.selectedRange}: ${startDateStr} - ${endDateStr}</p>
          <p class="meta-text">${t.calculationRules}</p>
        </div>
        <div style="text-align: ${isRtl ? 'left' : 'right'};">
          <p class="meta-text" style="font-weight: bold; font-size: 13px; color: #1e3a8a;">${t.crmSystem}</p>
          <p class="meta-text">${t.exportDate}: ${new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'tr-TR')}</p>
        </div>
      </div>



      <div style="display: grid; grid-template-cols: 2fr 1fr; gap: 20px; margin-bottom: 25px; align-items: start;">
        <div>
          <h2 class="section-title">${t.reportTitleRange}</h2>
          <table class="table-container" style="margin-bottom: 15px;">
            <thead>
              <tr>
                <th style="width: 20%">${t.month}</th>
                <th style="width: 20%">${t.baseSalary}</th>
                <th style="width: 20%">${t.overtimePay}</th>
                <th style="width: 20%">${t.totalDeductions}</th>
                <th style="width: 20%">${t.netSalaryDue}</th>
              </tr>
            </thead>
            <tbody>
              ${monthlyRowsHtml}
            </tbody>
          </table>

          <h2 class="section-title">${t.financialReconciliation}</h2>
          <table class="table-container" style="max-width: 400px; font-weight: bold;">
            <tbody>
              <tr>
                <td style="padding: 6px; border: 1px solid #e2e8f0; background-color: #f8fafc;">${t.totalNetDueEarned}</td>
                <td style="padding: 6px; border: 1px solid #e2e8f0; color: #1d4ed8;">${formatCurrency(rangeNetSalary)}</td>
              </tr>
              <tr>
                <td style="padding: 6px; border: 1px solid #e2e8f0; background-color: #f8fafc;">${t.totalPaymentsPaid}</td>
                <td style="padding: 6px; border: 1px solid #e2e8f0; color: #dc2626;">${formatCurrency(rangeTotalPaid)}</td>
              </tr>
              <tr style="background-color: ${rangeBalance >= 0 ? '#f0fdf4' : '#fef2f2'};">
                <td style="padding: 6px; border: 1px solid #e2e8f0;">${rangeBalance >= 0 ? t.netRemainingToYou : t.netRemainingFromYou}</td>
                <td style="padding: 6px; border: 1px solid #e2e8f0; color: ${rangeBalance >= 0 ? '#15803d' : '#b91c1c'};">${formatCurrency(Math.abs(rangeBalance))}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div>
          <h2 class="section-title">${t.advancesReceived}</h2>
          <table class="table-container">
            <thead>
              <tr style="background-color: #475569;">
                <th style="padding: 6px; background-color: #475569; border-color: #475569; width: 30%">${t.date}</th>
                <th style="padding: 6px; background-color: #475569; border-color: #475569; width: 45%">${t.description}</th>
                <th style="padding: 6px; background-color: #475569; border-color: #475569; width: 25%">${t.amount}</th>
              </tr>
            </thead>
            <tbody>
              ${paymentsRowsHtml}
            </tbody>
          </table>
        </div>
      </div>

      <div class="summary-footer">
        <div class="summary-pill">
          <span class="pill-label">${t.totalBaseSalaries}</span>
          <span class="pill-value">${formatCurrency(rangeBaseSalary)}</span>
        </div>
        <div class="summary-pill" style="border-color: #6ee7b7;">
          <span class="pill-label" style="color: #10b981;">${t.totalOvertimePay}</span>
          <span class="pill-value" style="color: #059669;">+${formatCurrency(rangeOvertimePay)}</span>
        </div>
        <div class="summary-pill" style="border-color: #fca5a5;">
          <span class="pill-label" style="color: #ef4444;">${t.totalDeductions}</span>
          <span class="pill-value" style="color: #dc2626;">-${formatCurrency(rangeDeductions)}</span>
        </div>
        <div class="summary-pill" style="border-color: #93c5fd; background-color: #eff6ff;">
          <span class="pill-label" style="color: #2563eb;">${t.netDue}</span>
          <span class="pill-value" style="color: #1d4ed8;">${formatCurrency(rangeNetSalary)}</span>
        </div>
        <div class="summary-pill" style="border-color: #cbd5e1;">
          <span class="pill-label" style="color: #475569;">${t.totalReceived}</span>
          <span class="pill-value" style="color: #334155;">${formatCurrency(rangeTotalPaid)}</span>
        </div>
        <div class="summary-pill" style="border-color: ${remainingBorder}; background-color: ${remainingBg};">
          <span class="pill-label" style="color: ${remainingTextColor};">${remainingTitle}</span>
          <span class="pill-value" style="color: ${remainingTextColor};">${formatCurrency(Math.abs(rangeBalance))}</span>
        </div>
      </div>
    </body>
    </html>
  `);
  iframeDoc.close();

  // Print once resources load
  const iframeWindow = iframe.contentWindow;
  if (iframeWindow) {
    iframe.onload = () => {
      setTimeout(() => {
        iframeWindow.focus();
        iframeWindow.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 500);
    };
  }
}
