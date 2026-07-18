export type ExceptionType = 'absence' | 'delay' | 'overtime';

export type OvertimeType = 'weekday' | 'saturday' | 'sunday' | 'holiday';

export interface ExceptionEvent {
  id: string;
  date: string; // YYYY-MM-DD
  type: ExceptionType;
  hours?: number; // Needed for delay and overtime
  overtimeType?: OvertimeType; // Needed for overtime
  multiplier?: number; // Custom overtime multiplier override (1, 1.5, 2)
  note?: string;
}

export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string; // Global name (e.g. Republic Day)
  localName: string; // Turkish name (e.g. Cumhuriyet Bayramı)
}

export interface UserSettings {
  baseSalary: number; // e.g., 70,000 TRY
  standardWeeklyHours: number; // e.g., 45
  defaultDailyHours: number; // e.g., 9
  multiplierWeekdaySat: number; // e.g., 1.5
  multiplierSundayHoliday: number; // e.g., 2.0
  googleApiKey: string; // Optional Google Calendar API key
}

export interface DayBreakdown {
  date: string; // YYYY-MM-DD
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  isHoliday: boolean;
  holidayName?: string;
  defaultScheduledHours: number;
  actualWeekdayHoursWorked: number; // weekday hours worked (capped at default, unless weekday overtime exists)
  delayHours: number;
  absenceDays: number; // 1 if absent, 0 otherwise
  weekdayOvertimeHours: number;
  saturdayOvertimeHours: number;
  sundayHolidayOvertimeHours: number;
  flatOvertimeHours: number;
}

export interface Payment {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  note?: string;
}

export interface WeeklyBreakdown {
  weekIndex: number; // 1-based index of the week in the month
  weekLabel: string; // e.g. "Week 1 (01/07 - 05/07)"
  dates: string[]; // YYYY-MM-DD
  expectedHours: number; // Standard target (usually 45)
  actualWeekdayHours: number; // Regular hours worked Mon-Fri
  absenceDeductions: number; // Number of absent days
  delayHours: number; // Number of delay hours
  weekdayOvertimeHours: number; // Mon-Fri evening overtime
  saturdayOvertimeHours: number; // Saturday overtime
  sundayHolidayOvertimeHours: number; // Sunday or holiday overtime
  
  // After weekly equalization (Denkleştirme):
  deficitHours: number; // 45 - actualWeekdayHours
  overtimeHours1x: number; // Overtime hours used at 1x to cover the deficit
  overtimeHours1_5x: number; // Overtime hours paid at 1.5x (after deficit coverage)
  overtimeHours2x: number; // Overtime hours paid at 2.0x (after deficit coverage)
}

export interface MonthlyCalculationResult {
  baseSalary: number;
  dailyWage: number;
  regularHourlyWage: number;
  
  totalAbsenceDays: number;
  totalAbsenceDeduction: number;
  
  totalDelayHours: number;
  totalDelayDeduction: number;
  
  overtime1xHours: number;
  overtime1xPay: number;
  
  overtime1_5xHours: number;
  overtime1_5xPay: number;
  
  overtime2xHours: number;
  overtime2xPay: number;
  
  totalOvertimePay: number;
  netSalary: number;
  
  weeklyBreakdowns: WeeklyBreakdown[];
  
  // Custom salary and payments attributes
  customMonthSalary?: number;
  totalPaymentsReceived: number;
  remainingBalance: number;
  currentMonthPayments: Payment[];
}
