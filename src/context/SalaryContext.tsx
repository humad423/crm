'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserSettings, ExceptionEvent, Holiday, MonthlyCalculationResult } from '../types/salary';
import { calculateMonthlySalary } from '../utils/salaryCalculator';

interface SalaryContextType {
  year: number;
  month: number; // 0-based
  settings: UserSettings;
  exceptions: ExceptionEvent[];
  holidays: Holiday[];
  isLoadingHolidays: boolean;
  calculationResult: MonthlyCalculationResult;
  setMonthYear: (year: number, month: number) => void;
  updateSettings: (settings: Partial<UserSettings>) => void;
  addException: (event: Omit<ExceptionEvent, 'id'>) => void;
  deleteException: (id: string) => void;
  deleteExceptionByDate: (dateStr: string) => void;
  clearAllData: () => void;
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
  // Initialize with local date dynamically
  const [year, setYear] = useState<number>(() => new Date().getFullYear());
  const [month, setMonth] = useState<number>(() => new Date().getMonth()); // 0-based
  
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [exceptions, setExceptions] = useState<ExceptionEvent[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoadingHolidays, setIsLoadingHolidays] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // Load from LocalStorage on mount
  useEffect(() => {
    const today = new Date();
    // Set default month/year to local time if we can
    setYear(today.getFullYear());
    setMonth(today.getMonth());

    if (typeof window !== 'undefined') {
      const savedSettings = localStorage.getItem('salary_settings');
      if (savedSettings) {
        try {
          setSettings(JSON.parse(savedSettings));
        } catch (e) {
          console.error('Error loading settings', e);
        }
      }
      
      const savedExceptions = localStorage.getItem('salary_exceptions');
      if (savedExceptions) {
        try {
          setExceptions(JSON.parse(savedExceptions));
        } catch (e) {
          console.error('Error loading exceptions', e);
        }
      }
      setIsInitialized(true);
    }
  }, []);

  // Save Settings to LocalStorage
  const updateSettings = (newSettings: Partial<UserSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('salary_settings', JSON.stringify(updated));
      return updated;
    });
  };

  // Save Exceptions to LocalStorage
  const saveExceptions = (newExceptions: ExceptionEvent[]) => {
    setExceptions(newExceptions);
    localStorage.setItem('salary_exceptions', JSON.stringify(newExceptions));
  };

  const addException = (eventInput: Omit<ExceptionEvent, 'id'>) => {
    const newEvent: ExceptionEvent = {
      ...eventInput,
      id: Math.random().toString(36).substring(2, 9),
    };
    
    // Check if there is already an exception of the same type or a conflicting event on the same day.
    // Under our simplified tool, we can allow multiple overtime events, but for absence/delay, it's typically one per day.
    // Let's filter out existing absence/delay on the same date to avoid conflicts.
    let filtered = exceptions;
    if (newEvent.type === 'absence' || newEvent.type === 'delay') {
      filtered = exceptions.filter((e) => !(e.date === newEvent.date && (e.type === 'absence' || e.type === 'delay')));
    } else if (newEvent.type === 'overtime') {
      // Overtime of the same sub-type on the same day is replaced
      filtered = exceptions.filter((e) => !(e.date === newEvent.date && e.type === 'overtime' && e.overtimeType === newEvent.overtimeType));
    }
    
    saveExceptions([...filtered, newEvent]);
  };

  const deleteException = (id: string) => {
    saveExceptions(exceptions.filter((e) => e.id !== id));
  };

  const deleteExceptionByDate = (dateStr: string) => {
    saveExceptions(exceptions.filter((e) => e.date !== dateStr));
  };

  const clearAllData = () => {
    saveExceptions([]);
    setSettings(defaultSettings);
    localStorage.removeItem('salary_settings');
    localStorage.removeItem('salary_exceptions');
  };

  const setMonthYear = (newYear: number, newMonth: number) => {
    setYear(newYear);
    setMonth(newMonth);
  };

  // Fetch holidays from API
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

  // Calculate salary details
  const calculationResult = calculateMonthlySalary(year, month, settings, exceptions, holidays);

  return (
    <SalaryContext.Provider
      value={{
        year,
        month,
        settings,
        exceptions,
        holidays,
        isLoadingHolidays,
        calculationResult,
        setMonthYear,
        updateSettings,
        addException,
        deleteException,
        deleteExceptionByDate,
        clearAllData,
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
