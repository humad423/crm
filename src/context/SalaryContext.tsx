'use client';

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { UserSettings, ExceptionEvent, Holiday, MonthlyCalculationResult, Payment, WorkSchedulePeriod } from '../types/salary';
import { calculateMonthlySalary, getScheduleForMonth } from '../utils/salaryCalculator';
import { supabase } from '../utils/supabaseClient';
import { User } from '@supabase/supabase-js';

interface SalaryContextType {
  year: number;
  month: number; // 0-based
  settings: UserSettings;
  exceptions: ExceptionEvent[];
  holidays: Holiday[];
  isLoadingHolidays: boolean;
  isInitialized: boolean;
  user: User | null;
  calculationResult: MonthlyCalculationResult;
  setMonthYear: (year: number, month: number) => void;
  updateSettings: (settings: Partial<UserSettings>) => Promise<void>;
  addException: (event: Omit<ExceptionEvent, 'id'>) => Promise<void>;
  deleteException: (id: string) => Promise<void>;
  deleteExceptionByDate: (dateStr: string) => Promise<void>;
  clearAllData: () => Promise<void>;
  login: (username: string, password: string) => Promise<{ error: any }>;
  signup: (username: string, password: string) => Promise<{ error: any }>;
  logout: () => Promise<void>;
  
  // Custom salary and payments additions
  monthlySalaries: { [key: string]: number };
  payments: Payment[];
  updateMonthlySalary: (salary: number, targetYear?: number, targetMonth?: number) => Promise<void>;
  clearMonthlySalary: (targetYear?: number, targetMonth?: number) => Promise<void>;
  addPayment: (payment: { date: string; amount: number; note?: string }) => Promise<void>;
  deletePayment: (id: string) => Promise<void>;
  updatePayment: (id: string, updates: { date: string; amount: number; note?: string }) => Promise<void>;
  // Schedule periods
  schedulePeriods: WorkSchedulePeriod[];
  addSchedulePeriod: (period: Omit<WorkSchedulePeriod, 'id'>) => Promise<void>;
  updateSchedulePeriod: (id: string, period: Omit<WorkSchedulePeriod, 'id'>) => Promise<void>;
  deleteSchedulePeriod: (id: string) => Promise<void>;
  // Active schedule for the selected month (dynamic, from schedule periods or defaults)
  activeSchedule: { dailyHours: number; weeklyHours: number; period?: WorkSchedulePeriod };
  // Cumulative balance across ALL months
  cumulativeBalance: number;
  cumulativeTotalEarned: number;
  cumulativeTotalPaid: number;
}

const defaultSettings: UserSettings = {
  baseSalary: 70000,
  standardWeeklyHours: 45,
  defaultDailyHours: 9,
  multiplierWeekdaySat: 1.5,
  multiplierSundayHoliday: 2.0,
  googleApiKey: '',
};

const SalaryContext = createContext<SalaryContextType | undefined>(undefined);

export function SalaryProvider({ children }: { children: ReactNode }) {
  const [year, setYear] = useState<number>(() => new Date().getFullYear());
  const [month, setMonth] = useState<number>(() => new Date().getMonth()); // 0-based
  
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [exceptions, setExceptions] = useState<ExceptionEvent[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoadingHolidays, setIsLoadingHolidays] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  
  // Custom monthly salary and payments state
  const [monthlySalaries, setMonthlySalariesState] = useState<{ [key: string]: number }>({});
  // Always-current copy: Settings saves several months in a loop, where the closure value would be stale.
  const monthlySalariesRef = useRef<{ [key: string]: number }>({});
  const setMonthlySalaries = (next: { [key: string]: number }) => {
    monthlySalariesRef.current = next;
    setMonthlySalariesState(next);
  };
  const [payments, setPayments] = useState<Payment[]>([]);
  const [schedulePeriods, setSchedulePeriods] = useState<WorkSchedulePeriod[]>([]);

  // Surfaces failed database writes instead of silently pretending they were saved.
  const reportDbError = (action: string, error: { message?: string } | null | undefined): boolean => {
    if (!error) return false;
    console.error(`Supabase ${action} failed:`, error);
    if (typeof window !== 'undefined') {
      window.alert(`تعذّر حفظ التغيير (${action}). تحقق من الاتصال وحاول مرة أخرى.\n${error.message ?? ''}`);
    }
    return true;
  };

  // 1. Listen to Auth Changes and load session on mount
  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);

      // Restore month/year selection from LocalStorage
      if (typeof window !== 'undefined') {
        const today = new Date();
        let initialYear = today.getFullYear();
        let initialMonth = today.getMonth();

        const savedYear = localStorage.getItem('salary_selected_year');
        const savedMonth = localStorage.getItem('salary_selected_month');
        const parsedYear = Number(savedYear);
        const parsedMonth = Number(savedMonth);
        if (savedYear && Number.isInteger(parsedYear) && parsedYear >= 2000 && parsedYear <= 2100) initialYear = parsedYear;
        if (savedMonth && Number.isInteger(parsedMonth) && parsedMonth >= 0 && parsedMonth <= 11) initialMonth = parsedMonth;
        
        setYear(initialYear);
        setMonth(initialMonth);
      }
      setIsInitialized(true);
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 2. Fetch User Data (Settings & Exceptions) from Supabase on Login, or LocalStorage on Logout
  const fetchUserData = async (userId: string) => {
    try {
      // A. Fetch Settings
      const { data: settingsData, error: settingsErr } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (settingsData) {
        setSettings({
          baseSalary: Number(settingsData.base_salary),
          standardWeeklyHours: Number(settingsData.standard_weekly_hours),
          defaultDailyHours: Number(settingsData.default_daily_hours),
          multiplierWeekdaySat: Number(settingsData.multiplier_weekday_sat),
          multiplierSundayHoliday: Number(settingsData.multiplier_sunday_holiday),
          googleApiKey: settingsData.google_api_key || '',
        });
      } else if (settingsErr) {
        console.error('Failed to load settings:', settingsErr);
      } else {
        // Insert defaults if none exist
        await supabase.from('user_settings').insert({
          user_id: userId,
          base_salary: settings.baseSalary,
          standard_weekly_hours: settings.standardWeeklyHours,
          default_daily_hours: settings.defaultDailyHours,
          multiplier_weekday_sat: settings.multiplierWeekdaySat,
          multiplier_sunday_holiday: settings.multiplierSundayHoliday,
          google_api_key: settings.googleApiKey,
        });
      }

      // B. Fetch Exceptions
      const { data: exceptionsData, error: exceptionsErr } = await supabase
        .from('exceptions')
        .select('*')
        .eq('user_id', userId);

      if (exceptionsErr) console.error('Failed to load exceptions:', exceptionsErr);
      if (exceptionsData) {
        const mappedExceptions: ExceptionEvent[] = exceptionsData.map((e) => ({
          id: e.id,
          date: e.date,
          type: e.type as any,
          hours: e.hours ? Number(e.hours) : undefined,
          overtimeType: e.overtime_type as any,
          multiplier: e.multiplier ? Number(e.multiplier) : undefined,
          note: e.note || undefined,
        }));
        setExceptions(mappedExceptions);
      }

      // C. Fetch Monthly Salaries
      const { data: monthlySalariesData, error: monthlySalariesErr } = await supabase
        .from('monthly_salaries')
        .select('*')
        .eq('user_id', userId);

      if (monthlySalariesErr) console.error('Failed to load monthly salaries:', monthlySalariesErr);
      if (monthlySalariesData) {
        const salariesMap: { [key: string]: number } = {};
        monthlySalariesData.forEach((s) => {
          salariesMap[`${s.year}-${s.month}`] = Number(s.base_salary);
        });
        setMonthlySalaries(salariesMap);
      } else {
        setMonthlySalaries({});
      }

      // D. Fetch Payments
      const { data: paymentsData, error: paymentsErr } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', userId);

      if (paymentsErr) console.error('Failed to load payments:', paymentsErr);
      if (paymentsData) {
        const mappedPayments: Payment[] = paymentsData.map((p) => ({
          id: p.id,
          date: p.date,
          amount: Number(p.amount),
          note: p.note || undefined,
        }));
        setPayments(mappedPayments);
      } else {
        setPayments([]);
      }
      // E. Fetch Schedule Periods
      const { data: scheduleData } = await supabase
        .from('schedule_periods')
        .select('*')
        .eq('user_id', userId)
        .order('effective_from', { ascending: true });

      if (scheduleData) {
        const mapped: WorkSchedulePeriod[] = scheduleData.map((s) => ({
          id: s.id,
          effectiveFrom: s.effective_from,
          label: s.label || undefined,
          startTime: s.start_time,
          endTime: s.end_time,
          breakMinutes: Number(s.break_minutes),
        }));
        setSchedulePeriods(mapped);
      } else {
        setSchedulePeriods([]);
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserData(user.id);
    } else {
      // Load Offline Local Storage Fallback
      if (typeof window !== 'undefined') {
        const savedSettings = localStorage.getItem('salary_settings');
        if (savedSettings) {
          try { setSettings(JSON.parse(savedSettings)); } catch (e) {}
        } else {
          setSettings(defaultSettings);
        }
        
        const savedExceptions = localStorage.getItem('salary_exceptions');
        if (savedExceptions) {
          try { setExceptions(JSON.parse(savedExceptions)); } catch (e) {}
        } else {
          setExceptions([]);
        }

        const savedMonthlySalaries = localStorage.getItem('salary_monthly_salaries');
        if (savedMonthlySalaries) {
          try { setMonthlySalaries(JSON.parse(savedMonthlySalaries)); } catch (e) {}
        } else {
          setMonthlySalaries({});
        }

        const savedPayments = localStorage.getItem('salary_payments');
        if (savedPayments) {
          try { setPayments(JSON.parse(savedPayments)); } catch (e) {}
        } else {
          setPayments([]);
        }

        const savedSchedulePeriods = localStorage.getItem('salary_schedule_periods');
        if (savedSchedulePeriods) {
          try { setSchedulePeriods(JSON.parse(savedSchedulePeriods)); } catch (e) {}
        } else {
          setSchedulePeriods([]);
        }
      }
    }
  }, [user]);

  // Helper to format Username to Email
  const getEmailFromUsername = (username: string) => {
    return `${username.trim().toLowerCase()}@factory.com`;
  };

  // 3. Authentication Functions
  const login = async (username: string, password: string) => {
    const email = getEmailFromUsername(username);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signup = async (username: string, password: string) => {
    const email = getEmailFromUsername(username);
    
    // Register
    const { data, error } = await supabase.auth.signUp({ email, password });
    
    if (error) return { error };
    
    // Only migrate when a session exists (if e-mail confirmation is enabled there is none yet,
    // and every insert would be rejected by row-level security).
    if (data.user && data.session) {
      const newUserId = data.user.id;
      
      // Migrate existing local storage exceptions and settings to Supabase
      try {
        const failures: unknown[] = [];
        // A. Migrate settings
        const { error: settingsMigErr } = await supabase.from('user_settings').upsert({
          user_id: newUserId,
          base_salary: settings.baseSalary,
          standard_weekly_hours: settings.standardWeeklyHours,
          default_daily_hours: settings.defaultDailyHours,
          multiplier_weekday_sat: settings.multiplierWeekdaySat,
          multiplier_sunday_holiday: settings.multiplierSundayHoliday,
          google_api_key: settings.googleApiKey,
        });
        if (settingsMigErr) failures.push(settingsMigErr);

        // B. Migrate exceptions
        if (exceptions.length > 0) {
          const dbExceptions = exceptions.map((e) => ({
            user_id: newUserId,
            date: e.date,
            type: e.type,
            hours: e.hours,
            overtime_type: e.overtimeType,
            multiplier: e.multiplier,
            note: e.note || '',
          }));
          const { error: e1 } = await supabase.from('exceptions').insert(dbExceptions);
          if (e1) failures.push(e1);
        }

        // Migrate monthly salaries
        if (Object.keys(monthlySalaries).length > 0) {
          const dbSalaries = Object.entries(monthlySalaries).map(([key, sal]) => {
            const [y, m] = key.split('-').map(Number);
            return {
              user_id: newUserId,
              year: y,
              month: m,
              base_salary: sal,
            };
          });
          const { error: e2 } = await supabase.from('monthly_salaries').upsert(dbSalaries);
          if (e2) failures.push(e2);
        }

        // Migrate payments
        if (payments.length > 0) {
          const dbPayments = payments.map((p) => {
            const [y, m] = p.date.split('-').map(Number);
            return {
              user_id: newUserId,
              year: y,
              month: m - 1, // 0-based
              amount: p.amount,
              date: p.date,
              note: p.note || '',
            };
          });
          const { error: e3 } = await supabase.from('payments').insert(dbPayments);
          if (e3) failures.push(e3);
        }

        // Migrate work schedule periods
        if (schedulePeriods.length > 0) {
          const dbPeriods = schedulePeriods.map((sp) => ({
            user_id: newUserId,
            effective_from: sp.effectiveFrom,
            label: sp.label || '',
            start_time: sp.startTime,
            end_time: sp.endTime,
            break_minutes: sp.breakMinutes,
          }));
          const { error: e4 } = await supabase.from('schedule_periods').insert(dbPeriods);
          if (e4) failures.push(e4);
        }

        if (failures.length > 0) {
          // Keep the local copy so nothing is lost.
          console.error('Local data migration partially failed:', failures);
          return { error: null };
        }

        // C. Clear local storage offline keys (only after everything was copied)
        localStorage.removeItem('salary_schedule_periods');
        localStorage.removeItem('salary_settings');
        localStorage.removeItem('salary_exceptions');
        localStorage.removeItem('salary_monthly_salaries');
        localStorage.removeItem('salary_payments');
      } catch (migrationErr) {
        console.error('Local data migration failed:', migrationErr);
      }
    }

    return { error: null };
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  // 4. Data Mutation Functions (Sync to DB if logged in, otherwise LocalStorage)
  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    const previous = settings;
    const updated = { ...settings, ...newSettings };
    setSettings(updated);

    if (user) {
      // Sync to Supabase
      const { error } = await supabase.from('user_settings').upsert({
        user_id: user.id,
        base_salary: updated.baseSalary,
        standard_weekly_hours: updated.standardWeeklyHours,
        default_daily_hours: updated.defaultDailyHours,
        multiplier_weekday_sat: updated.multiplierWeekdaySat,
        multiplier_sunday_holiday: updated.multiplierSundayHoliday,
        google_api_key: updated.googleApiKey,
        updated_at: new Date().toISOString(),
      });
      if (reportDbError('الإعدادات', error)) setSettings(previous);
    } else {
      // Save locally
      localStorage.setItem('salary_settings', JSON.stringify(updated));
    }
  };

  const addException = async (eventInput: Omit<ExceptionEvent, 'id'>) => {
    // Determine conflicting filters
    let conflictFilter = (e: ExceptionEvent) => true;
    if (eventInput.type === 'absence' || eventInput.type === 'delay') {
      conflictFilter = (e) => e.date === eventInput.date && (e.type === 'absence' || e.type === 'delay');
    } else if (eventInput.type === 'overtime') {
      conflictFilter = (e) => e.date === eventInput.date && e.type === 'overtime' && e.overtimeType === eventInput.overtimeType;
    }

    if (user) {
      // Delete conflicts in Supabase first
      let conflictErr: { message?: string } | null = null;
      if (eventInput.type === 'absence' || eventInput.type === 'delay') {
        ({ error: conflictErr } = await supabase
          .from('exceptions')
          .delete()
          .eq('user_id', user.id)
          .eq('date', eventInput.date)
          .in('type', ['absence', 'delay']));
      } else if (eventInput.type === 'overtime') {
        ({ error: conflictErr } = await supabase
          .from('exceptions')
          .delete()
          .eq('user_id', user.id)
          .eq('date', eventInput.date)
          .eq('type', 'overtime')
          .eq('overtime_type', eventInput.overtimeType || 'weekday'));
      }
      if (reportDbError('حذف الاستثناء السابق', conflictErr)) return;

      // Insert new exception into Supabase
      const { data, error: insertErr } = await supabase
        .from('exceptions')
        .insert({
          user_id: user.id,
          date: eventInput.date,
          type: eventInput.type,
          hours: eventInput.hours,
          overtime_type: eventInput.overtimeType,
          multiplier: eventInput.multiplier,
          note: eventInput.note || '',
        })
        .select()
        .single();

      if (reportDbError('إضافة الاستثناء', insertErr)) {
        // The conflicting rows were already removed in the DB: mirror that locally.
        setExceptions((prev) => prev.filter((e) => !conflictFilter(e)));
        return;
      }
      if (data) {
        const newEvent: ExceptionEvent = {
          id: data.id,
          date: data.date,
          type: data.type as any,
          hours: data.hours ? Number(data.hours) : undefined,
          overtimeType: data.overtime_type as any,
          multiplier: data.multiplier ? Number(data.multiplier) : undefined,
          note: data.note || undefined,
        };

        // Filter local state and append
        setExceptions((prev) => [...prev.filter((e) => !conflictFilter(e)), newEvent]);
      }
    } else {
      // Local offline mode
      const newEvent: ExceptionEvent = {
        ...eventInput,
        id: Math.random().toString(36).substring(2, 9),
      };
      
      const filtered = exceptions.filter((e) => !conflictFilter(e));
      const updated = [...filtered, newEvent];
      setExceptions(updated);
      localStorage.setItem('salary_exceptions', JSON.stringify(updated));
    }
  };

  const deleteException = async (id: string) => {
    if (user) {
      const { error } = await supabase.from('exceptions').delete().eq('user_id', user.id).eq('id', id);
      if (reportDbError('حذف الاستثناء', error)) return;
      setExceptions((prev) => prev.filter((e) => e.id !== id));
    } else {
      const updated = exceptions.filter((e) => e.id !== id);
      setExceptions(updated);
      localStorage.setItem('salary_exceptions', JSON.stringify(updated));
    }
  };

  const deleteExceptionByDate = async (dateStr: string) => {
    if (user) {
      const { error } = await supabase.from('exceptions').delete().eq('user_id', user.id).eq('date', dateStr);
      if (reportDbError('حذف استثناءات اليوم', error)) return;
      setExceptions((prev) => prev.filter((e) => e.date !== dateStr));
    } else {
      const updated = exceptions.filter((e) => e.date !== dateStr);
      setExceptions(updated);
      localStorage.setItem('salary_exceptions', JSON.stringify(updated));
    }
  };

  const clearAllData = async () => {
    if (user) {
      // Clear Supabase exceptions, monthly salaries, payments & reset settings
      const results = await Promise.all([
        supabase.from('exceptions').delete().eq('user_id', user.id),
        supabase.from('monthly_salaries').delete().eq('user_id', user.id),
        supabase.from('payments').delete().eq('user_id', user.id),
        supabase.from('schedule_periods').delete().eq('user_id', user.id),
      ]);
      const deleteErr = results.find((r) => r.error)?.error;
      if (reportDbError('مسح البيانات', deleteErr)) {
        await fetchUserData(user.id);
        return;
      }
      await supabase.from('user_settings').upsert({
        user_id: user.id,
        base_salary: defaultSettings.baseSalary,
        standard_weekly_hours: defaultSettings.standardWeeklyHours,
        default_daily_hours: defaultSettings.defaultDailyHours,
        multiplier_weekday_sat: defaultSettings.multiplierWeekdaySat,
        multiplier_sunday_holiday: defaultSettings.multiplierSundayHoliday,
        google_api_key: '',
      });
    }

    setSettings(defaultSettings);
    setExceptions([]);
    setMonthlySalaries({});
    setPayments([]);
    setSchedulePeriods([]);

    localStorage.removeItem('salary_schedule_periods');
    localStorage.removeItem('salary_settings');
    localStorage.removeItem('salary_exceptions');
    localStorage.removeItem('salary_monthly_salaries');
    localStorage.removeItem('salary_payments');
    localStorage.removeItem('salary_selected_year');
    localStorage.removeItem('salary_selected_month');
  };

  const setMonthYear = (newYear: number, newMonth: number) => {
    setYear(newYear);
    setMonth(newMonth);
    localStorage.setItem('salary_selected_year', String(newYear));
    localStorage.setItem('salary_selected_month', String(newMonth));
  };

  // 5. Fetch Holidays from Calendar API
  useEffect(() => {
    const fetchHolidays = async () => {
      setIsLoadingHolidays(true);
      try {
        const url = `/api/holidays?year=${year}&apiKey=${encodeURIComponent(settings.googleApiKey || '')}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setHolidays(data.holidays || []);
        } else {
          console.error('Failed to fetch holidays');
        }
      } catch (err) {
        console.error('Error fetching holidays:', err);
      } finally {
        setIsLoadingHolidays(false);
      }
    };

    fetchHolidays();
  }, [year, settings.googleApiKey]);

  const updateMonthlySalary = async (salary: number, targetYear?: number, targetMonth?: number) => {
    const y = targetYear !== undefined ? targetYear : year;
    const m = targetMonth !== undefined ? targetMonth : month;
    const key = `${y}-${m}`;
    const previousValue = monthlySalariesRef.current[key];
    const updated = { ...monthlySalariesRef.current, [key]: salary };
    setMonthlySalaries(updated);

    if (user) {
      const { error } = await supabase.from('monthly_salaries').upsert({
        user_id: user.id,
        year: y,
        month: m,
        base_salary: salary,
      });
      if (reportDbError('راتب الشهر', error)) {
        const reverted = { ...monthlySalariesRef.current };
        if (previousValue === undefined) delete reverted[key];
        else reverted[key] = previousValue;
        setMonthlySalaries(reverted);
      }
    } else {
      localStorage.setItem('salary_monthly_salaries', JSON.stringify(updated));
    }
  };

  const clearMonthlySalary = async (targetYear?: number, targetMonth?: number) => {
    const y = targetYear !== undefined ? targetYear : year;
    const m = targetMonth !== undefined ? targetMonth : month;
    const key = `${y}-${m}`;
    const previousValue = monthlySalariesRef.current[key];
    const updated = { ...monthlySalariesRef.current };
    delete updated[key];
    setMonthlySalaries(updated);

    if (user) {
      const { error } = await supabase.from('monthly_salaries').delete().eq('user_id', user.id).eq('year', y).eq('month', m);
      if (reportDbError('حذف راتب الشهر', error) && previousValue !== undefined) {
        setMonthlySalaries({ ...monthlySalariesRef.current, [key]: previousValue });
      }
    } else {
      localStorage.setItem('salary_monthly_salaries', JSON.stringify(updated));
    }
  };

  const addPayment = async (paymentInput: { date: string; amount: number; note?: string }) => {
    if (user) {
      // Store year/month of the payment's own date (not the month currently on screen).
      const [payYear, payMonth] = paymentInput.date.split('-').map(Number);
      const { data, error } = await supabase
        .from('payments')
        .insert({
          user_id: user.id,
          year: payYear,
          month: payMonth - 1,
          amount: paymentInput.amount,
          date: paymentInput.date,
          note: paymentInput.note || '',
        })
        .select()
        .single();

      if (reportDbError('إضافة الدفعة', error)) return;
      if (data) {
        const newPayment: Payment = {
          id: data.id,
          date: data.date,
          amount: Number(data.amount),
          note: data.note || undefined,
        };
        setPayments((prev) => [...prev, newPayment]);
      }
    } else {
      const newPayment: Payment = {
        id: Math.random().toString(36).substring(2, 9),
        date: paymentInput.date,
        amount: paymentInput.amount,
        note: paymentInput.note,
      };
      const updated = [...payments, newPayment];
      setPayments(updated);
      localStorage.setItem('salary_payments', JSON.stringify(updated));
    }
  };

  const deletePayment = async (id: string) => {
    if (user) {
      const { error } = await supabase.from('payments').delete().eq('user_id', user.id).eq('id', id);
      if (reportDbError('حذف الدفعة', error)) return;
      setPayments((prev) => prev.filter((p) => p.id !== id));
    } else {
      const updated = payments.filter((p) => p.id !== id);
      setPayments(updated);
      localStorage.setItem('salary_payments', JSON.stringify(updated));
    }
  };

  const updatePayment = async (id: string, updates: { date: string; amount: number; note?: string }) => {
    if (user) {
      const [payYear, payMonth] = updates.date.split('-').map(Number);
      const { error } = await supabase
        .from('payments')
        .update({
          amount: updates.amount,
          date: updates.date,
          year: payYear,
          month: payMonth - 1,
          note: updates.note || '',
        })
        .eq('user_id', user.id)
        .eq('id', id);
      if (reportDbError('تعديل الدفعة', error)) return;
      setPayments((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, amount: updates.amount, date: updates.date, note: updates.note }
            : p
        )
      );
    } else {
      const updated = payments.map((p) =>
        p.id === id
          ? { ...p, amount: updates.amount, date: updates.date, note: updates.note }
          : p
      );
      setPayments(updated);
      localStorage.setItem('salary_payments', JSON.stringify(updated));
    }
  };

  // ── Schedule Period CRUD ─────────────────────────────────────────────────────
  const addSchedulePeriod = async (period: Omit<WorkSchedulePeriod, 'id'>) => {
    if (user) {
      const { data, error } = await supabase
        .from('schedule_periods')
        .insert({
          user_id: user.id,
          effective_from: period.effectiveFrom,
          label: period.label || '',
          start_time: period.startTime,
          end_time: period.endTime,
          break_minutes: period.breakMinutes,
        })
        .select()
        .single();
      if (reportDbError('إضافة جدول الدوام', error)) return;
      if (data) {
        const newPeriod: WorkSchedulePeriod = {
          id: data.id,
          effectiveFrom: data.effective_from,
          label: data.label || undefined,
          startTime: data.start_time,
          endTime: data.end_time,
          breakMinutes: Number(data.break_minutes),
        };
        setSchedulePeriods((prev) =>
          [...prev, newPeriod].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom))
        );
      }
    } else {
      const newPeriod: WorkSchedulePeriod = { id: Math.random().toString(36).substring(2, 9), ...period };
      const updated = [...schedulePeriods, newPeriod].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
      setSchedulePeriods(updated);
      localStorage.setItem('salary_schedule_periods', JSON.stringify(updated));
    }
  };

  const updateSchedulePeriod = async (id: string, period: Omit<WorkSchedulePeriod, 'id'>) => {
    if (user) {
      const { error } = await supabase.from('schedule_periods').update({
        effective_from: period.effectiveFrom,
        label: period.label || '',
        start_time: period.startTime,
        end_time: period.endTime,
        break_minutes: period.breakMinutes,
      }).eq('user_id', user.id).eq('id', id);
      if (reportDbError('تعديل جدول الدوام', error)) return;
      setSchedulePeriods((prev) =>
        prev.map((p) => (p.id === id ? { id, ...period } : p))
            .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom))
      );
    } else {
      const updated = schedulePeriods
        .map((p) => (p.id === id ? { id, ...period } : p))
        .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
      setSchedulePeriods(updated);
      localStorage.setItem('salary_schedule_periods', JSON.stringify(updated));
    }
  };

  const deleteSchedulePeriod = async (id: string) => {
    if (user) {
      const { error } = await supabase.from('schedule_periods').delete().eq('user_id', user.id).eq('id', id);
      if (reportDbError('حذف جدول الدوام', error)) return;
      setSchedulePeriods((prev) => prev.filter((p) => p.id !== id));
    } else {
      const updated = schedulePeriods.filter((p) => p.id !== id);
      setSchedulePeriods(updated);
      localStorage.setItem('salary_schedule_periods', JSON.stringify(updated));
    }
  };

  // Calculate salary breakdowns for selected month
  // Inject schedulePeriods into settings so the calculator can resolve the active schedule
  const settingsWithSchedule: UserSettings = { ...settings, schedulePeriods };
  const activeSchedule = getScheduleForMonth(year, month, settingsWithSchedule);
  const customSalary = monthlySalaries[`${year}-${month}`];
  const rawResult = calculateMonthlySalary(year, month, settingsWithSchedule, exceptions, holidays, customSalary);

  const currentMonthPayments = payments.filter((p) => {
    const [pYear, pMonth] = p.date.split('-').map(Number);
    return pYear === year && (pMonth - 1) === month;
  });

  const totalPaymentsReceived = currentMonthPayments.reduce((sum, p) => sum + p.amount, 0);
  const remainingBalance = rawResult.netSalary - totalPaymentsReceived;

  const calculationResult = {
    ...rawResult,
    customMonthSalary: customSalary,
    totalPaymentsReceived,
    remainingBalance,
    currentMonthPayments,
  };

  // ── Cumulative balance — complete approach ──────────────────────────────────
  // Always compute up to TODAY's real month (not the dashboard-selected month).
  // For every month from January up to the current real month (inclusive),
  // calculate the full net salary including all overtime, absences, and delays.
  const today = new Date();
  const realYear = today.getFullYear();
  const realMonth = today.getMonth(); // 0-based

  // Start from January of the current year, or earlier if older records exist, so that
  // earnings and payments always cover the same period (also after the year changes).
  let startYear = realYear;
  let startMonth = 0;
  const considerStart = (y: number, m: number) => {
    if (!Number.isInteger(y) || !Number.isInteger(m) || y < 2000 || m < 0 || m > 11) return;
    if (y < startYear || (y === startYear && m < startMonth)) {
      startYear = y;
      startMonth = m;
    }
  };
  exceptions.forEach((e) => {
    const [ey, em] = e.date.split('-').map(Number);
    considerStart(ey, em - 1);
  });
  payments.forEach((p) => {
    const [py, pm] = p.date.split('-').map(Number);
    considerStart(py, pm - 1);
  });
  Object.keys(monthlySalaries).forEach((key) => {
    const [sy, sm] = key.split('-').map(Number);
    considerStart(sy, sm);
  });

  let cumulativeTotalEarned = 0;
  let cy = startYear;
  let cm = startMonth;
  while (cy < realYear || (cy === realYear && cm <= realMonth)) {
    const loopYear = cy;
    const loopMonth = cm;
    const monthExceptions = exceptions.filter((e) => {
      const [ey, em] = e.date.split('-').map(Number);
      return ey === loopYear && (em - 1) === loopMonth;
    });
    const customMonthlySalary = monthlySalaries[`${loopYear}-${loopMonth}`];
    const monthResult = calculateMonthlySalary(loopYear, loopMonth, settingsWithSchedule, monthExceptions, holidays, customMonthlySalary);
    cumulativeTotalEarned += monthResult.netSalary;
    cm++;
    if (cm > 11) {
      cm = 0;
      cy++;
    }
  }

  // Total paid = every payment ever recorded (earnings above start at the oldest record)
  const cumulativeTotalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  const cumulativeBalance = cumulativeTotalEarned - cumulativeTotalPaid;
  // ───────────────────────────────────────────────────────────────────────────

  return (
    <SalaryContext.Provider
      value={{
        year,
        month,
        settings,
        exceptions,
        holidays,
        isLoadingHolidays,
        isInitialized,
        user,
        calculationResult,
        setMonthYear,
        updateSettings,
        addException,
        deleteException,
        deleteExceptionByDate,
        clearAllData,
        login,
        signup,
        logout,
        monthlySalaries,
        payments,
        updateMonthlySalary,
        clearMonthlySalary,
        addPayment,
        deletePayment,
        updatePayment,
        schedulePeriods,
        addSchedulePeriod,
        updateSchedulePeriod,
        deleteSchedulePeriod,
        activeSchedule,
        cumulativeBalance,
        cumulativeTotalEarned,
        cumulativeTotalPaid,
      }}
    >
      {children}
    </SalaryContext.Provider>
  );
}

export function useSalary() {
  const context = useContext(SalaryContext);
  if (!context) {
    throw new Error('useSalary must be used within a SalaryProvider');
  }
  return context;
}
