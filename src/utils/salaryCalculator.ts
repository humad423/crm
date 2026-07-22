import {
  ExceptionEvent,
  Holiday,
  UserSettings,
  MonthlyCalculationResult,
  WeeklyBreakdown,
  DayBreakdown,
  WorkSchedulePeriod,
} from '../types/salary';

/**
 * Checks if a given date string (YYYY-MM-DD) is a public holiday
 */
export function checkIsHoliday(dateStr: string, holidays: Holiday[]): { isHoliday: boolean; name?: string } {
  const holiday = holidays.find((h) => h.date === dateStr);
  return {
    isHoliday: !!holiday,
    name: holiday ? holiday.localName || holiday.name : undefined,
  };
}

/**
 * Gets the number of days in a month (accounting for leap years, etc.)
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Formats a Date object as YYYY-MM-DD in local time
 */
export function formatDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parses HH:MM string into total minutes from midnight
 */
function parseTimeMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

/**
 * Resolves the active WorkSchedulePeriod for a given year+month.
 * Returns computed dailyHours and weeklyHours.
 * Falls back to settings.defaultDailyHours / standardWeeklyHours if no periods defined.
 */
export function getScheduleForMonth(
  year: number,
  month: number, // 0-based
  settings: UserSettings
): { dailyHours: number; weeklyHours: number; period?: WorkSchedulePeriod } {
  const periods = settings.schedulePeriods;
  if (!periods || periods.length === 0) {
    return {
      dailyHours: settings.defaultDailyHours,
      weeklyHours: settings.standardWeeklyHours,
    };
  }

  // First day of the given month as YYYY-MM-DD
  const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;

  // Sort periods ascending by effectiveFrom
  const sorted = [...periods].sort((a, b) =>
    a.effectiveFrom.localeCompare(b.effectiveFrom)
  );

  // Find the latest period whose effectiveFrom <= monthStart
  let active: WorkSchedulePeriod | undefined;
  for (const p of sorted) {
    if (p.effectiveFrom <= monthStart) {
      active = p;
    }
  }

  if (!active) {
    // No period covers this month yet — use the very first one if it exists, else fallback
    active = sorted[0];
  }

  if (!active) {
    return {
      dailyHours: settings.defaultDailyHours,
      weeklyHours: settings.standardWeeklyHours,
    };
  }

  const totalMinutes = parseTimeMinutes(active.endTime) - parseTimeMinutes(active.startTime);
  const netMinutes = totalMinutes - active.breakMinutes;
  const dailyHours = Math.max(0, netMinutes / 60);
  const weeklyHours = dailyHours * 5;

  return { dailyHours, weeklyHours, period: active };
}

/**
 * Parse date string YYYY-MM-DD into a local Date object
 */
export function parseDateStr(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Generates all day breakdowns for the given month, including schedules, holidays, and exceptions.
 */
export function generateMonthlyBreakdown(
  year: number,
  month: number, // 0-based
  settings: UserSettings,
  exceptions: ExceptionEvent[],
  holidays: Holiday[],
  dailyHoursOverride?: number // Optional override from schedule period
): DayBreakdown[] {
  const daysInMonth = getDaysInMonth(year, month);
  const breakdowns: DayBreakdown[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dateStr = formatDateStr(date);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

    const { isHoliday, name: holidayName } = checkIsHoliday(dateStr, holidays);
    
    // Is it a scheduled work day? (Mon-Fri, i.e., 1 to 5)
    // Even if it's a holiday, it remains scheduled, but we adjust actual work if absent
    const isScheduledWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    const effectiveDailyHours = dailyHoursOverride !== undefined ? dailyHoursOverride : settings.defaultDailyHours;
    const defaultScheduledHours = isScheduledWeekday ? effectiveDailyHours : 0;

    // Find exceptions for this day
    const dayExceptions = exceptions.filter((e) => e.date === dateStr);
    
    const absenceEvent = dayExceptions.find((e) => e.type === 'absence');
    const delayEvent = dayExceptions.find((e) => e.type === 'delay');
    const overtimeEvents = dayExceptions.filter((e) => e.type === 'overtime');

    const isAbsent = !!absenceEvent;
    const delayHours = delayEvent?.hours || 0;
    const absenceDays = isAbsent ? 1 : 0;

    // Calculate actual regular weekday hours worked
    let actualWeekdayHoursWorked = 0;
    let weekdayOvertimeHours = 0;
    let saturdayOvertimeHours = 0;
    let sundayHolidayOvertimeHours = 0;
    let flatOvertimeHours = 0;

    if (isScheduledWeekday) {
      if (isAbsent) {
        actualWeekdayHoursWorked = 0;
      } else {
        // Delay reduces standard hours worked
        actualWeekdayHoursWorked = Math.max(0, defaultScheduledHours - delayHours);
      }
    } else {
      // Weekend: no standard scheduled hours
      actualWeekdayHoursWorked = 0;
    }

    // Process overtime events using custom multiplier override if present
    overtimeEvents.forEach((ot) => {
      let mult = ot.multiplier;
      if (mult === undefined) {
        // Fallback to default multipliers
        if (ot.overtimeType === 'holiday' || isHoliday) {
          mult = 1.0;
        } else if (ot.overtimeType === 'sunday' || dayOfWeek === 0) {
          mult = 2.0;
        } else if (ot.overtimeType === 'saturday' || dayOfWeek === 6) {
          mult = 1.5;
        } else {
          mult = 1.5;
        }
      }

      const hoursVal = ot.hours || 0;
      if (mult === 2.0) {
        sundayHolidayOvertimeHours += hoursVal;
      } else if (mult === 1.5) {
        if (ot.overtimeType === 'saturday' || dayOfWeek === 6) {
          saturdayOvertimeHours += hoursVal;
        } else {
          weekdayOvertimeHours += hoursVal;
        }
      } else {
        // 1.0x or other custom multipliers
        flatOvertimeHours += hoursVal;
      }
    });

    breakdowns.push({
      date: dateStr,
      dayOfWeek,
      isHoliday,
      holidayName,
      defaultScheduledHours,
      actualWeekdayHoursWorked,
      delayHours,
      absenceDays,
      weekdayOvertimeHours,
      saturdayOvertimeHours,
      sundayHolidayOvertimeHours,
      flatOvertimeHours,
    });
  }

  return breakdowns;
}

/**
 * Groups day breakdowns into weeks (Monday to Sunday) and performs Weekly Equalization.
 */
export function calculateWeeklyEqualization(
  dayBreakdowns: DayBreakdown[],
  settings: UserSettings,
  weeklyHoursOverride?: number
): WeeklyBreakdown[] {
  // Group days by calendar week.
  // We can identify a week by finding the Monday of the week.
  const weeksMap = new Map<number, DayBreakdown[]>();
  
  dayBreakdowns.forEach((day) => {
    const dateObj = parseDateStr(day.date);
    
    // Find the Monday of this week.
    // getDay() is 0 for Sun, 1 for Mon, etc.
    const dayVal = dateObj.getDay();
    const diff = dateObj.getDate() - dayVal + (dayVal === 0 ? -6 : 1);
    const mondayDate = new Date(dateObj.setDate(diff));
    
    // Use the time representation of Monday as the key
    mondayDate.setHours(0, 0, 0, 0);
    const key = mondayDate.getTime();

    if (!weeksMap.has(key)) {
      weeksMap.set(key, []);
    }
    weeksMap.get(key)!.push(day);
  });

  // Sort weeks chronologically
  const sortedWeekKeys = Array.from(weeksMap.keys()).sort((a, b) => a - b);

  return sortedWeekKeys.map((weekKey, idx) => {
    const days = weeksMap.get(weekKey)!;
    // Sort days chronologically
    days.sort((a, b) => a.date.localeCompare(b.date));

    const dates = days.map((d) => d.date);
    const firstDate = parseDateStr(days[0].date);
    const lastDate = parseDateStr(days[days.length - 1].date);
    
    const weekLabel = `الأسبوع ${idx + 1} (${firstDate.getDate()}/${firstDate.getMonth() + 1} - ${lastDate.getDate()}/${lastDate.getMonth() + 1})`;

    // Calculate baseline figures
    // Expected hours is based on scheduled weekdays inside this month for this week
    let expectedHours = 0;
    let actualWeekdayHours = 0;
    let absenceDeductions = 0;
    let delayHours = 0;
    let weekdayOvertimeHours = 0;
    let saturdayOvertimeHours = 0;
    let sundayHolidayOvertimeHours = 0;
    let flatOvertimeHours = 0;

    days.forEach((day) => {
      expectedHours += day.defaultScheduledHours;
      actualWeekdayHours += day.actualWeekdayHoursWorked;
      absenceDeductions += day.absenceDays;
      delayHours += day.delayHours;
      weekdayOvertimeHours += day.weekdayOvertimeHours;
      saturdayOvertimeHours += day.saturdayOvertimeHours;
      sundayHolidayOvertimeHours += day.sundayHolidayOvertimeHours;
      flatOvertimeHours += day.flatOvertimeHours || 0;
    });

    // Weekly Equalization (Denkleştirme) Logic:
    // Standard weekly hours target is expectedHours (based on scheduled days * daily hours).
    // If actualWeekdayHours < expectedHours, there is a deficit.
    // Note: expectedHours is already computed from defaultScheduledHours per day,
    // which already reflects the active schedule period's dailyHours.
    const deficitHours = Math.max(0, expectedHours - actualWeekdayHours);

    let overtimeHours1x = 0;
    let overtimeHours1_5x = 0;
    let overtimeHours2x = 0;

    if (deficitHours === 0) {
      // No deficit! Standard multipliers apply directly.
      overtimeHours1_5x = weekdayOvertimeHours + saturdayOvertimeHours;
      overtimeHours2x = sundayHolidayOvertimeHours;
      overtimeHours1x = flatOvertimeHours;
    } else {
      // We have a deficit! We must use overtime/weekend hours to cover it.
      // Pool of overtime hours, divided by multipliers:
      // 1.0x Pool: Flat holiday / manually overridden 1.0x hours
      // 1.5x Pool: Weekday evening overtime + Saturday hours
      // 2.0x Pool: Sunday + Holiday hours (that are 2x)
      let pool1_0x = flatOvertimeHours;
      let pool1_5x = weekdayOvertimeHours + saturdayOvertimeHours;
      let pool2_0x = sundayHolidayOvertimeHours;

      let remainingDeficit = deficitHours;

      // 1. First cover deficit using 1.0x pool (cheapest and already 1.0x!)
      const usedFrom1_0x = Math.min(remainingDeficit, pool1_0x);
      overtimeHours1x += usedFrom1_0x;
      pool1_0x -= usedFrom1_0x;
      remainingDeficit -= usedFrom1_0x;

      // 2. Cover remaining deficit using 1.5x pool
      const usedFrom1_5x = Math.min(remainingDeficit, pool1_5x);
      overtimeHours1x += usedFrom1_5x;
      pool1_5x -= usedFrom1_5x;
      remainingDeficit -= usedFrom1_5x;

      // 3. Cover remaining deficit using 2.0x pool
      const usedFrom2_0x = Math.min(remainingDeficit, pool2_0x);
      overtimeHours1x += usedFrom2_0x;
      pool2_0x -= usedFrom2_0x;
      remainingDeficit -= usedFrom2_0x;

      // Remaining pools are paid at their premium rate
      overtimeHours1_5x = pool1_5x;
      overtimeHours2x = pool2_0x;
      
      // Leftover 1.0x hours are paid at 1.0x rate
      overtimeHours1x += pool1_0x;
    }

    return {
      weekIndex: idx + 1,
      weekLabel,
      dates,
      expectedHours,
      actualWeekdayHours,
      absenceDeductions,
      delayHours,
      weekdayOvertimeHours,
      saturdayOvertimeHours,
      sundayHolidayOvertimeHours,
      deficitHours,
      overtimeHours1x,
      overtimeHours1_5x,
      overtimeHours2x,
    };
  });
}

/**
 * Computes the final salary breakdown for the month
 */
export function calculateMonthlySalary(
  year: number,
  month: number, // 0-based
  settings: UserSettings,
  exceptions: ExceptionEvent[],
  holidays: Holiday[],
  customSalary?: number
): MonthlyCalculationResult {
  const baseSalary = customSalary !== undefined ? customSalary : settings.baseSalary;
  const { multiplierWeekdaySat, multiplierSundayHoliday } = settings;

  // Resolve the active schedule for this month
  const { dailyHours, weeklyHours } = getScheduleForMonth(year, month, settings);

  // 1. Calculate base rates:
  // - Accounting month is always 30 days. Daily wage = Salary / 30.
  // - Turkish Labor Law standard monthly hours baseline = 225 hours.
  //   Regular hourly wage = Salary / 225.
  const dailyWage = baseSalary / 30;
  const regularHourlyWage = baseSalary / 225;

  // 2. Generate daily breakdown & perform weekly calculations using resolved dailyHours
  const dayBreakdowns = generateMonthlyBreakdown(year, month, settings, exceptions, holidays, dailyHours);
  const weeklyBreakdowns = calculateWeeklyEqualization(dayBreakdowns, settings, weeklyHours);

  // 3. Aggregate results across weeks
  let totalAbsenceDays = 0;
  let totalDelayHours = 0;
  let overtime1xHours = 0;
  let overtime1_5xHours = 0;
  let overtime2xHours = 0;

  // Delay hours and absence days are counted globally for deductions
  dayBreakdowns.forEach((day) => {
    totalAbsenceDays += day.absenceDays;
    totalDelayHours += day.delayHours;
  });

  weeklyBreakdowns.forEach((week) => {
    overtime1xHours += week.overtimeHours1x;
    overtime1_5xHours += week.overtimeHours1_5x;
    overtime2xHours += week.overtimeHours2x;
  });

  // 4. Calculate payouts and deductions
  // - Absence deduction: 1 day absence = dailyHours * regularHourlyWage
  const totalAbsenceDeduction = totalAbsenceDays * dailyHours * regularHourlyWage;

  // - Delay deduction: hourly wage * delay hours
  const totalDelayDeduction = totalDelayHours * regularHourlyWage;

  // - Overtime payout:
  const overtime1xPay = overtime1xHours * regularHourlyWage;
  const overtime1_5xPay = overtime1_5xHours * regularHourlyWage * multiplierWeekdaySat;
  const overtime2xPay = overtime2xHours * regularHourlyWage * multiplierSundayHoliday;
  const totalOvertimePay = overtime1xPay + overtime1_5xPay + overtime2xPay;

  // - Net salary calculation: Base Salary - Deductions + Overtime Pay
  const netSalary = baseSalary - totalAbsenceDeduction - totalDelayDeduction + totalOvertimePay;

  return {
    baseSalary,
    dailyWage,
    regularHourlyWage,
    totalAbsenceDays,
    totalAbsenceDeduction,
    totalDelayHours,
    totalDelayDeduction,
    overtime1xHours,
    overtime1xPay,
    overtime1_5xHours,
    overtime1_5xPay,
    overtime2xHours,
    overtime2xPay,
    totalOvertimePay,
    netSalary,
    weeklyBreakdowns,
    customMonthSalary: customSalary,
    totalPaymentsReceived: 0,
    remainingBalance: netSalary,
    currentMonthPayments: [],
  };
}
