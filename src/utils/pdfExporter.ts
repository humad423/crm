import { DayBreakdown, MonthlyCalculationResult, UserSettings, ExceptionEvent } from '../types/salary';

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
  exceptions: ExceptionEvent[]
) {
  const daysOfWeek = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

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

  let remainingTitle = 'الرصيد المتبقي (مستوفى)';
  let remainingBg = '#f8fafc';
  let remainingBorder = '#e2e8f0';
  let remainingTextColor = '#0f172a';
  
  if (remaining > 0) {
    remainingTitle = 'الرصيد المتبقي (لك)';
    remainingBg = '#f0fdf4';
    remainingBorder = '#6ee7b7';
    remainingTextColor = '#15803d';
  } else if (remaining < 0) {
    remainingTitle = 'الرصيد المتبقي (عليك)';
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

    let dayTypeLabel = 'يوم عمل';
    if (day.isHoliday) dayTypeLabel = `عطلة: ${day.holidayName || ''}`;
    else if (isWeekend) dayTypeLabel = 'عطلة أسبوعية';

    let exceptionLabel = '-';
    if (day.absenceDays > 0) exceptionLabel = 'غياب كامل';
    else if (day.delayHours > 0) exceptionLabel = `تأخير ${day.delayHours}س`;
    else if (day.flatOvertimeHours > 0) exceptionLabel = `إضافي ${day.flatOvertimeHours}س (1.0x)`;
    else if ((day.weekdayOvertimeHours + day.saturdayOvertimeHours) > 0) {
      exceptionLabel = `إضافي ${(day.weekdayOvertimeHours + day.saturdayOvertimeHours)}س (1.5x)`;
    } else if (day.sundayHolidayOvertimeHours > 0) {
      exceptionLabel = `إضافي ${day.sundayHolidayOvertimeHours}س (2.0x)`;
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
        <td style="padding: 6px; border: 1px solid #e2e8f0;">${day.defaultScheduledHours}س</td>
        <td style="padding: 6px; border: 1px solid #e2e8f0; font-weight: 500;">${day.actualWeekdayHoursWorked}س</td>
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
          <span>${week.weekLabel}</span>
          <span style="color: ${week.deficitHours > 0 ? '#d97706' : '#10b981'}">${week.deficitHours > 0 ? `عجز: ${week.deficitHours}س` : 'مكتمل (45س)'}</span>
        </div>
        <div style="margin-bottom: 4px;">الساعات الفعلية: <b>${week.actualWeekdayHours}س / ${week.expectedHours}س</b></div>
        <div style="margin-bottom: 4px;">الغيابات/التأخير: <b>${week.absenceDeductions} غ | ${week.delayHours}س</b></div>
        <div style="border-top: 1px dashed #cbd5e1; padding-top: 4px; margin-top: 4px;">
          <div>إضافي 1.0x: <b>${week.overtimeHours1x}س</b></div>
          <div>إضافي 1.5x: <b>${week.overtimeHours1_5x}س</b></div>
          <div>إضافي 2.0x: <b>${week.overtimeHours2x}س</b></div>
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
          لا توجد أي سُلف أو دفعات مسجلة لهذا الشهر.
        </td>
      </tr>
    `;
  } else {
    paymentsList.forEach((p) => {
      const [y, m, d] = p.date.split('-').map(Number);
      paymentsRowsHtml += `
        <tr style="text-align: center; font-size: 11px;">
          <td style="padding: 6px; border: 1px solid #e2e8f0; font-weight: 600;">${d}/${m}/${y}</td>
          <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: right;">${p.note || '-'}</td>
          <td style="padding: 6px; border: 1px solid #e2e8f0; font-weight: bold; color: #059669;">${formatCurrency(p.amount)}</td>
        </tr>
      `;
    });
  }

  // Write content
  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8">
      <title>تقرير الرواتب - ${monthName} ${year}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
      <style>
        body {
          font-family: 'Cairo', sans-serif;
          margin: 0;
          padding: 20px;
          color: #0f172a;
          background-color: #ffffff;
        }
        @media print {
          body {
            padding: 0;
          }
          .no-print {
            display: none;
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
        .summary-grid {
          display: grid;
          grid-template-cols: repeat(5, 1fr);
          gap: 12px;
          margin-bottom: 25px;
        }
        .card {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 12px;
          background-color: #f8fafc;
        }
        .card-title {
          font-size: 10px;
          font-weight: bold;
          color: #64748b;
          margin: 0 0 5px 0;
          text-transform: uppercase;
        }
        .card-value {
          font-size: 15px;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }
        .card-desc {
          font-size: 9px;
          color: #64748b;
          margin: 5px 0 0 0;
        }
        .section-title {
          font-size: 13px;
          font-weight: 700;
          color: #1e293b;
          border-right: 3px solid #6366f1;
          padding-right: 8px;
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
        .signature-section {
          margin-top: 40px;
          display: flex;
          justify-content: space-between;
          padding: 0 40px;
          font-size: 12px;
        }
        .signature-box {
          text-align: center;
          width: 150px;
        }
        .signature-line {
          border-bottom: 1px solid #475569;
          margin-top: 40px;
          margin-bottom: 5px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1 class="title">تقرير حساب الرواتب والأجور الشهرية</h1>
          <p class="meta-text" style="font-weight: bold;">الفترة المحاسبية: ${monthName} / ${year}</p>
          <p class="meta-text">قواعد الحساب: قانون العمل التركي (45 ساعة أسبوعية / 225 ساعة شهرية)</p>
        </div>
        <div style="text-align: left;">
          <p class="meta-text" style="font-weight: bold; font-size: 13px; color: #1e3a8a;">برنامج إدارة الأجور crm</p>
          <p class="meta-text">تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-EG')}</p>
        </div>
      </div>

      <div class="summary-grid">
        <div class="card">
          <p class="card-title">الراتب الأساسي</p>
          <p class="card-value">${formatCurrency(calculationResult.baseSalary)}</p>
          <p class="card-desc">${isCustomSalary ? 'راتب مخصص للشهر' : 'الراتب التعاقدي العام'}</p>
        </div>
        <div class="card" style="border-color: #fca5a5;">
          <p class="card-title" style="color: #ef4444;">إجمالي الخصومات</p>
          <p class="card-value" style="color: #dc2626;">-${formatCurrency(totalDeductions)}</p>
          <p class="card-desc" style="color: #ef4444;">غياب: ${calculationResult.totalAbsenceDays} أيام | تأخير: ${calculationResult.totalDelayHours}س</p>
        </div>
        <div class="card" style="border-color: #6ee7b7;">
          <p class="card-title" style="color: #10b981;">مستحقات الإضافي</p>
          <p class="card-value" style="color: #059669;">+${formatCurrency(calculationResult.totalOvertimePay)}</p>
          <p class="card-desc" style="color: #10b981;">إجمالي ساعات العمل الإضافي: ${totalOvertimeHours.toFixed(1)}س</p>
        </div>
        <div class="card" style="background-color: #eff6ff; border-color: #93c5fd;">
          <p class="card-title" style="color: #2563eb;">صافي الراتب المستحق</p>
          <p class="card-value" style="color: #1d4ed8;">${formatCurrency(calculationResult.netSalary)}</p>
          <p class="card-desc" style="color: #2563eb;">الراتب بعد الخصومات والإضافي</p>
        </div>
        <div class="card" style="background-color: ${remainingBg}; border-color: ${remainingBorder};">
          <p class="card-title" style="color: ${remainingTextColor};">${remainingTitle}</p>
          <p class="card-value" style="color: ${remainingTextColor};">${formatCurrency(Math.abs(remaining))}</p>
          <p class="card-desc" style="color: ${remainingTextColor};">إجمالي المقبوض: ${formatCurrency(calculationResult.totalPaymentsReceived)}</p>
        </div>
      </div>

      <div style="display: grid; grid-template-cols: 2fr 1fr; gap: 20px; margin-bottom: 25px; align-items: start;">
        <div>
          <h2 class="section-title">ملخص المقاصة والتسوية الأسبوعية (Denkleştirme)</h2>
          <div style="display: grid; grid-template-cols: repeat(5, 1fr); gap: 8px;">
            ${weeklyHtml}
          </div>
        </div>
        <div>
          <h2 class="section-title">السلف والدفعات المقبوضة</h2>
          <table class="table-container">
            <thead>
              <tr style="background-color: #475569;">
                <th style="padding: 6px; background-color: #475569; border-color: #475569; width: 30%">التاريخ</th>
                <th style="padding: 6px; background-color: #475569; border-color: #475569; width: 45%">البيان</th>
                <th style="padding: 6px; background-color: #475569; border-color: #475569; width: 25%">المبلغ</th>
              </tr>
            </thead>
            <tbody>
              ${paymentsRowsHtml}
            </tbody>
          </table>
        </div>
      </div>

      <h2 class="section-title">سجل الحضور والعمل الإضافي اليومي الموثق</h2>
      <table class="table-container">
        <thead>
          <tr>
            <th style="width: 12%">التاريخ</th>
            <th style="width: 10%">اليوم</th>
            <th style="width: 20%">توصيف اليوم</th>
            <th style="width: 12%">ساعات افتراضية</th>
            <th style="width: 12%">ساعات فعلية</th>
            <th style="width: 18%">الاستثناءات والعمل الإضافي</th>
            <th style="width: 16%">الملاحظات</th>
          </tr>
        </thead>
        <tbody>
          ${dailyRowsHtml}
        </tbody>
      </table>

      <div class="signature-section">
        <div class="signature-box">
          <p>توقيع الموظف</p>
          <div class="signature-line"></div>
          <p style="font-size: 9px; color: #64748b;">أوافق على البيانات الواردة أعلاه</p>
        </div>
        <div class="signature-box">
          <p>المحاسب المسؤول</p>
          <div class="signature-line"></div>
        </div>
        <div class="signature-box">
          <p>توقيع المدير العام</p>
          <div class="signature-line"></div>
          <p style="font-size: 9px; color: #64748b;">يُعتمد الصرف</p>
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
