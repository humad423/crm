'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { IncomeSource, IncomeEntry, MonthlyIncomeSummary, SourceSummary } from '../types/income';
import { fetchLiveUsdRate } from '../utils/exchangeRate';
import { supabase } from '../utils/supabaseClient';

// Supabase mappers
const mapSourceToDb = (s: IncomeSource) => ({
  id: s.id,
  name: s.name,
  category: s.category,
  color: s.color,
  monthly_target: s.monthlyTarget,
  tax_rate: s.taxRate,
  is_active: s.isActive,
  created_at: s.createdAt || new Date().toISOString()
});

const mapDbToSource = (row: any): IncomeSource => ({
  id: row.id,
  name: row.name,
  category: row.category,
  color: row.color,
  monthlyTarget: Number(row.monthly_target || 10000),
  taxRate: Number(row.tax_rate || 0),
  isActive: row.is_active ?? true,
  createdAt: row.created_at
});

const mapEntryToDb = (e: IncomeEntry) => ({
  id: e.id,
  source_id: e.sourceId,
  date: e.date,
  net_amount: e.netAmount,
  gross_amount: e.grossAmount,
  tax_amount: e.taxAmount || 0,
  tax_rate_used: e.taxRateUsed || 0,
  exchange_rate_used: e.exchangeRateUsed || 38.5,
  net_amount_usd: e.netAmountUsd,
  gross_amount_usd: e.grossAmountUsd,
  note: e.note || '',
  status: e.status || 'received',
  created_at: e.createdAt || new Date().toISOString()
});

const mapDbToEntry = (row: any): IncomeEntry => ({
  id: row.id,
  sourceId: row.source_id,
  date: row.date,
  netAmount: Number(row.net_amount || 0),
  grossAmount: Number(row.gross_amount || 0),
  taxAmount: Number(row.tax_amount || 0),
  taxRateUsed: Number(row.tax_rate_used || 0),
  exchangeRateUsed: Number(row.exchange_rate_used || 38.5),
  netAmountUsd: Number(row.net_amount_usd || 0),
  grossAmountUsd: Number(row.gross_amount_usd || 0),
  note: row.note || '',
  status: row.status || 'received',
  createdAt: row.created_at
});

interface IncomeContextType {
  sources: IncomeSource[];
  entries: IncomeEntry[];
  isInitialized: boolean;
  dateFilterFrom: string;
  dateFilterTo: string;
  usdExchangeRate: number;
  isLiveRateLoading: boolean;
  displayCurrency: 'TRY' | 'USD';
  setDateFilter: (from: string, to: string) => void;
  setUsdExchangeRate: (rate: number) => void;
  setDisplayCurrency: (curr: 'TRY' | 'USD') => void;
  refreshLiveRate: () => Promise<number | null>;
  
  // Actions for Sources
  addSource: (source: Omit<IncomeSource, 'id' | 'createdAt'>) => Promise<void>;
  updateSource: (id: string, updates: Partial<Omit<IncomeSource, 'id'>>) => Promise<void>;
  deleteSource: (id: string) => Promise<void>;
  
  // Actions for Entries
  addEntry: (entry: Omit<IncomeEntry, 'id' | 'createdAt' | 'netAmountUsd' | 'grossAmountUsd'>) => Promise<void>;
  updateEntry: (id: string, updates: Partial<Omit<IncomeEntry, 'id' | 'netAmountUsd' | 'grossAmountUsd'>>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  // Actions for Reset & Clear
  clearAllIncomeData: () => Promise<void>;
  
  // Calculations
  getDashboardSummary: (from: string, to: string) => MonthlyIncomeSummary;
  getTrendData: (from: string, to: string) => Array<{
    monthKey: string;
    monthName: string;
    totalNetTry: number;
    totalNetUsd: number;
    bySourceTry: Record<string, number>;
    bySourceUsd: Record<string, number>;
  }>;
}

const defaultSources: IncomeSource[] = [
  {
    id: 'src_job',
    name: 'الوظيفة والعمل المسائي (الإضافي)',
    category: 'salary',
    color: '#3b82f6', // blue
    monthlyTarget: 75000,
    taxRate: 0, // 0% tax for salary
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'src_yt_storm',
    name: 'قناة عاصفة التقنية (YouTube)',
    category: 'youtube',
    color: '#ef4444', // red
    monthlyTarget: 20000,
    taxRate: 15, // 15% tax
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'src_yt_rihawi',
    name: 'قناة ريحاوي (YouTube)',
    category: 'youtube',
    color: '#f97316', // orange
    monthlyTarget: 15000,
    taxRate: 15, // 15% tax
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'src_yt_gamestan',
    name: 'قناة جيم ستان (YouTube)',
    category: 'youtube',
    color: '#a855f7', // purple
    monthlyTarget: 12000,
    taxRate: 15, // 15% tax
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'src_web_1',
    name: 'الموقع الإلكتروني الأول (Website 1)',
    category: 'website',
    color: '#10b981', // emerald
    monthlyTarget: 18000,
    taxRate: 15, // 15% tax
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'src_web_2',
    name: 'الموقع الإلكتروني الثاني (Website 2)',
    category: 'website',
    color: '#06b6d4', // cyan
    monthlyTarget: 14000,
    taxRate: 15, // 15% tax
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'src_web_3',
    name: 'الموقع الإلكتروني الثالث (Website 3)',
    category: 'website',
    color: '#f59e0b', // amber
    monthlyTarget: 10000,
    taxRate: 15, // 15% tax
    isActive: true,
    createdAt: new Date().toISOString()
  }
];

// Helper to generate seed initial entries for the 7 sources
const generateInitialEntries = (rate = 38.5): IncomeEntry[] => {
  const entries: IncomeEntry[] = [];
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  const seedConfigs = [
    { id: 'src_job', gross: 75000, tax: 0, note: 'الراتب الأساسي وساعات الإضافي المسائي' },
    { id: 'src_yt_storm', gross: 22000, tax: 15, note: 'أرباح Google AdSense قناة عاصفة التقنية' },
    { id: 'src_yt_rihawi', gross: 16000, tax: 15, note: 'أرباح قناة ريحاوي ورعايات الفيديو' },
    { id: 'src_yt_gamestan', gross: 13000, tax: 15, note: 'أرباح قناة جيم ستان' },
    { id: 'src_web_1', gross: 19000, tax: 15, note: 'أرباح إعلانات واشتراكات الموقع الأول' },
    { id: 'src_web_2', gross: 15000, tax: 15, note: 'أرباح تسويق بالعمولة الموقع الثاني' },
    { id: 'src_web_3', gross: 11000, tax: 15, note: 'أرباح المقالات الممتازة الموقع الثالث' }
  ];

  for (let i = 3; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - i, 10);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');

    seedConfigs.forEach((cfg, idx) => {
      const grossAmt = cfg.gross + (3 - i) * 1000;
      const taxAmt = (grossAmt * cfg.tax) / 100;
      const netAmt = grossAmt - taxAmt;
      const netUsd = netAmt / rate;
      const grossUsd = grossAmt / rate;

      entries.push({
        id: `seed_${cfg.id}_${i}`,
        sourceId: cfg.id,
        date: `${y}-${m}-${String(idx * 3 + 2).padStart(2, '0')}`,
        grossAmount: grossAmt,
        taxAmount: taxAmt,
        netAmount: netAmt,
        expenses: 0,
        exchangeRateUsed: rate,
        netAmountUsd: Number(netUsd.toFixed(2)),
        grossAmountUsd: Number(grossUsd.toFixed(2)),
        note: cfg.note,
        status: 'received',
        createdAt: new Date().toISOString()
      });
    });
  }

  return entries;
};

const IncomeContext = createContext<IncomeContextType | undefined>(undefined);

export function IncomeProvider({ children }: { children: ReactNode }) {
  const [sources, setSources] = useState<IncomeSource[]>(defaultSources);
  const [entries, setEntries] = useState<IncomeEntry[]>([]);
  const [usdExchangeRate, setUsdExchangeRateState] = useState<number>(38.5); // Default TRY per 1 USD
  const [isLiveRateLoading, setIsLiveRateLoading] = useState<boolean>(false);
  const [displayCurrency, setDisplayCurrencyState] = useState<'TRY' | 'USD'>('TRY');
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  const [dateFilterFrom, setDateFilterFrom] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const savedFrom = localStorage.getItem('date_filter_from');
      if (savedFrom) return savedFrom;
    }
    const d = new Date();
    // Default to first day of current month if no saved value
    const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
    const y = firstDay.getFullYear();
    const m = String(firstDay.getMonth() + 1).padStart(2, '0');
    const day = String(firstDay.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });
  const [dateFilterTo, setDateFilterTo] = useState<string>(() => {
    const d = new Date();
    // Always default to last day of PREVIOUS month
    const lastDay = new Date(d.getFullYear(), d.getMonth(), 0);
    const y = lastDay.getFullYear();
    const m = String(lastDay.getMonth() + 1).padStart(2, '0');
    const day = String(lastDay.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });

  const setDateFilter = (from: string, to: string) => {
    setDateFilterFrom(from);
    setDateFilterTo(to);
    if (typeof window !== 'undefined') {
      localStorage.setItem('date_filter_from', from);
    }
  };

  const refreshLiveRate = async (): Promise<number | null> => {
    setIsLiveRateLoading(true);
    const liveRate = await fetchLiveUsdRate();
    if (liveRate && liveRate > 0) {
      setUsdExchangeRateState(liveRate);
      if (typeof window !== 'undefined') {
        localStorage.setItem('usd_exchange_rate', liveRate.toString());
      }
    }
    setIsLiveRateLoading(false);
    return liveRate;
  };

  // Load state from Supabase / localStorage & fetch live rate on initial mount
  useEffect(() => {
    const initData = async () => {
      if (typeof window !== 'undefined') {
        const savedRate = localStorage.getItem('usd_exchange_rate');
        const savedCurrency = localStorage.getItem('display_currency');

        let currentRate = 38.5;
        if (savedRate) {
          currentRate = parseFloat(savedRate) || 38.5;
          setUsdExchangeRateState(currentRate);
        }

        if (savedCurrency === 'USD' || savedCurrency === 'TRY') {
          setDisplayCurrencyState(savedCurrency);
        }

        const isInitializedFlag = localStorage.getItem('income_initialized');

        // 1. Try fetching Sources & Entries from Supabase Database
        try {
          const { data: dbSources } = await supabase.from('personal_income_sources').select('*');
          const { data: dbEntries } = await supabase.from('personal_income_entries').select('*');

          if (dbSources && dbSources.length > 0) {
            const parsedSources = deduplicateSources(dbSources.map(mapDbToSource));
            setSources(parsedSources);
            localStorage.setItem('income_sources', JSON.stringify(parsedSources));
            localStorage.setItem('income_initialized', 'true');
          } else {
            // Fallback to local storage
            const savedSources = localStorage.getItem('income_sources');
            if (savedSources !== null) {
              const rawSources: IncomeSource[] = JSON.parse(savedSources);
              const sanitizedSources = rawSources.map(s => ({
                ...s,
                taxRate: s.taxRate ?? (s.category === 'youtube' || s.category === 'website' ? 15 : 0)
              }));
              const deduplicated = deduplicateSources(sanitizedSources);
              setSources(deduplicated);
            } else if (isInitializedFlag !== 'true') {
              setSources(defaultSources);
              localStorage.setItem('income_sources', JSON.stringify(defaultSources));
              localStorage.setItem('income_initialized', 'true');
            } else {
              setSources([]);
            }
          }

          if (dbEntries && dbEntries.length > 0) {
            const parsedEntries = deduplicateEntries(dbEntries.map(mapDbToEntry));
            setEntries(parsedEntries);
            localStorage.setItem('income_entries', JSON.stringify(parsedEntries));
            localStorage.setItem('income_initialized', 'true');
          } else {
            // Fallback to local storage
            const savedEntries = localStorage.getItem('income_entries');
            if (savedEntries !== null) {
              const raw: IncomeEntry[] = JSON.parse(savedEntries);
              const deduplicated = deduplicateEntries(raw);
              setEntries(deduplicated);
            } else if (isInitializedFlag !== 'true') {
              const seeds = generateInitialEntries(currentRate);
              setEntries(seeds);
              localStorage.setItem('income_entries', JSON.stringify(seeds));
              localStorage.setItem('income_initialized', 'true');
            } else {
              setEntries([]);
            }
          }
        } catch (err) {
          console.warn('Supabase database sync fallback to local storage', err);
        }

        // Fetch fresh live exchange rate in background
        fetchLiveUsdRate().then(live => {
          if (live && live > 0) {
            setUsdExchangeRateState(live);
            localStorage.setItem('usd_exchange_rate', live.toString());
          }
        });
      }
      setIsInitialized(true);
    };

    initData();
  }, []);

  const setUsdExchangeRate = (rate: number) => {
    if (rate <= 0) return;
    setUsdExchangeRateState(rate);
    if (typeof window !== 'undefined') {
      localStorage.setItem('usd_exchange_rate', rate.toString());
    }
  };

  const setDisplayCurrency = (curr: 'TRY' | 'USD') => {
    setDisplayCurrencyState(curr);
    if (typeof window !== 'undefined') {
      localStorage.setItem('display_currency', curr);
    }
  };

// Deduplication helpers to purge duplicate accumulated entries and sources
const deduplicateEntries = (rawEntries: IncomeEntry[]): IncomeEntry[] => {
  const seen = new Set<string>();
  const unique: IncomeEntry[] = [];
  for (const e of rawEntries) {
    const key = `${e.date}_${e.sourceId}_${e.netAmount}_${e.grossAmount}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(e);
    }
  }
  return unique;
};

const deduplicateSources = (rawSources: IncomeSource[]): IncomeSource[] => {
  const seen = new Map<string, IncomeSource>();
  for (const s of rawSources) {
    const normName = s.name.trim().toLowerCase();
    if (!seen.has(normName)) {
      seen.set(normName, s);
    }
  }
  return Array.from(seen.values());
};

  // Storage and Supabase Sync helpers
  const saveSourcesToStorage = async (newSources: IncomeSource[], overwrite: boolean = false) => {
    const clean = deduplicateSources(newSources);
    setSources(clean);
    if (typeof window !== 'undefined') {
      localStorage.setItem('income_sources', JSON.stringify(clean));
    }
    try {
      if (overwrite) {
        await supabase.from('personal_income_sources').delete().neq('id', 'dummy_id');
      }
      if (clean.length > 0) {
        await supabase.from('personal_income_sources').upsert(clean.map(mapSourceToDb));
      }
    } catch (err) {
      console.error('Supabase sources sync error', err);
    }
  };

  const saveEntriesToStorage = async (newEntries: IncomeEntry[], overwrite: boolean = false) => {
    const clean = deduplicateEntries(newEntries);
    setEntries(clean);
    if (typeof window !== 'undefined') {
      localStorage.setItem('income_entries', JSON.stringify(clean));
    }
    try {
      if (overwrite) {
        await supabase.from('personal_income_entries').delete().neq('id', 'dummy_id');
      }
      if (clean.length > 0) {
        const dbRows = clean.map(mapEntryToDb);
        const chunkSize = 50;
        for (let i = 0; i < dbRows.length; i += chunkSize) {
          await supabase.from('personal_income_entries').upsert(dbRows.slice(i, i + chunkSize));
        }
      }
    } catch (err) {
      console.error('Supabase entries sync error', err);
    }
  };



  // Actions
  const addSource = async (sourceData: Omit<IncomeSource, 'id' | 'createdAt'>) => {
    const newSource: IncomeSource = {
      ...sourceData,
      id: `src_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString()
    };
    const updated = [...sources, newSource];
    await saveSourcesToStorage(updated);
  };



  const updateSource = async (id: string, updates: Partial<Omit<IncomeSource, 'id'>>) => {
    const updated = sources.map(s => s.id === id ? { ...s, ...updates } : s);
    await saveSourcesToStorage(updated);
  };

  const deleteSource = async (id: string) => {
    const updatedSources = sources.filter(s => s.id !== id);
    const updatedEntries = entries.filter(e => e.sourceId !== id);
    await saveSourcesToStorage(updatedSources);
    await saveEntriesToStorage(updatedEntries);
    try {
      await supabase.from('personal_income_sources').delete().eq('id', id);
    } catch (err) {
      console.error('Supabase deleteSource error', err);
    }
  };

  const addEntry = async (entryData: Omit<IncomeEntry, 'id' | 'createdAt' | 'netAmountUsd' | 'grossAmountUsd'>) => {
    const rate = entryData.exchangeRateUsed || usdExchangeRate;
    const netUsd = entryData.netAmount / rate;
    const grossUsd = entryData.grossAmount / rate;

    const newEntry: IncomeEntry = {
      ...entryData,
      netAmountUsd: Number(netUsd.toFixed(2)),
      grossAmountUsd: Number(grossUsd.toFixed(2)),
      id: `inc_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString()
    };
    const updated = [newEntry, ...entries];
    await saveEntriesToStorage(updated);
  };

// Safe date string parser (prevents timezone shifts e.g. "2025-06-30" -> year: 2025, month: 5)
function getYearMonthFromDateStr(dateStr: string): { year: number; month: number; day: number } {
  if (!dateStr) return { year: 2026, month: 0, day: 1 };
  const clean = dateStr.trim().replace(/\//g, '-');
  const parts = clean.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1; // 0-based month
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return { year: y, month: m, day: d };
    }
  }
  const dateObj = new Date(dateStr);
  return {
    year: isNaN(dateObj.getFullYear()) ? 2026 : dateObj.getFullYear(),
    month: isNaN(dateObj.getMonth()) ? 0 : dateObj.getMonth(),
    day: isNaN(dateObj.getDate()) ? 1 : dateObj.getDate()
  };
}

  const updateEntry = async (id: string, updates: Partial<Omit<IncomeEntry, 'id' | 'netAmountUsd' | 'grossAmountUsd'>>) => {
    const updated = entries.map(e => {
      if (e.id !== id) return e;
      const merged = { ...e, ...updates };
      const rate = merged.exchangeRateUsed || usdExchangeRate;
      merged.netAmountUsd = Number((merged.netAmount / rate).toFixed(2));
      merged.grossAmountUsd = Number((merged.grossAmount / rate).toFixed(2));
      return merged;
    });
    saveEntriesToStorage(updated);
  };

  const deleteEntry = async (id: string) => {
    const updated = entries.filter(e => e.id !== id);
    await saveEntriesToStorage(updated);
    try {
      await supabase.from('personal_income_entries').delete().eq('id', id);
    } catch (err) {
      console.error('Supabase deleteEntry error', err);
    }
  };

  const clearAllIncomeData = async () => {
    setEntries([]);
    setSources([]);
    if (typeof window !== 'undefined') {
      localStorage.setItem('income_entries', JSON.stringify([]));
      localStorage.setItem('income_sources', JSON.stringify([]));
      localStorage.setItem('income_initialized', 'true');
    }
    try {
      await supabase.from('personal_income_entries').delete().neq('id', 'dummy_id');
      await supabase.from('personal_income_sources').delete().neq('id', 'dummy_id');
    } catch (err) {
      console.error('Supabase clearAllIncomeData error', err);
    }
  };

  // Summary calculation
  const getDashboardSummary = (from: string, to: string): MonthlyIncomeSummary => {
    const currentPeriodEntries = entries.filter(e => {
      return e.date >= from && e.date <= to && e.status === 'received';
    });

    const totalNetTry = currentPeriodEntries.reduce((acc, curr) => acc + (curr.netAmount || 0), 0);
    const totalGrossTry = currentPeriodEntries.reduce((acc, curr) => acc + (curr.grossAmount ?? (curr.netAmount || 0)), 0);
    const totalTaxTry = currentPeriodEntries.reduce((acc, curr) => acc + (curr.taxAmount ?? 0), 0);
    const totalExpensesTry = currentPeriodEntries.reduce((acc, curr) => acc + (curr.expenses ?? 0), 0);

    const totalNetUsd = currentPeriodEntries.reduce((acc, curr) => acc + (curr.netAmountUsd ?? ((curr.netAmount || 0) / usdExchangeRate)), 0);
    const totalGrossUsd = currentPeriodEntries.reduce((acc, curr) => acc + (curr.grossAmountUsd ?? ((curr.grossAmount ?? (curr.netAmount || 0)) / usdExchangeRate)), 0);
    const totalTaxUsd = currentPeriodEntries.reduce((acc, curr) => {
      const rate = curr.exchangeRateUsed || usdExchangeRate;
      const taxTry = curr.taxAmount ?? 0;
      return acc + (rate > 0 ? taxTry / rate : 0);
    }, 0);

    // Previous period
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const timeDiff = toDate.getTime() - fromDate.getTime();
    
    // Fallback if dates are invalid
    let prevFromDateStr = '';
    let prevToDateStr = '';
    
    if (!isNaN(timeDiff)) {
      const prevTo = new Date(fromDate.getTime() - 24 * 60 * 60 * 1000); // 1 day before 'from'
      const prevFrom = new Date(prevTo.getTime() - timeDiff);
      prevToDateStr = prevTo.toISOString().split('T')[0];
      prevFromDateStr = prevFrom.toISOString().split('T')[0];
    }

    const prevPeriodEntries = entries.filter(e => {
      return e.date >= prevFromDateStr && e.date <= prevToDateStr && e.status === 'received';
    });

    const previousMonthNetTry = prevPeriodEntries.reduce((acc, curr) => acc + (curr.netAmount || 0), 0);
    const previousMonthNetUsd = prevPeriodEntries.reduce((acc, curr) => acc + (curr.netAmountUsd ?? ((curr.netAmount || 0) / usdExchangeRate)), 0);

    let momGrowthPercentage = 0;
    if (previousMonthNetTry > 0) {
      momGrowthPercentage = ((totalNetTry - previousMonthNetTry) / previousMonthNetTry) * 100;
    } else if (totalNetTry > 0) {
      momGrowthPercentage = 100;
    }

    // YTD
    const toYear = !isNaN(toDate.getFullYear()) ? toDate.getFullYear() : new Date().getFullYear();
    const ytdEntries = entries.filter(e => {
      const entryYear = new Date(e.date).getFullYear();
      return entryYear === toYear && e.status === 'received';
    });
    const yearToDateNetTry = ytdEntries.reduce((acc, curr) => acc + (curr.netAmount || 0), 0);
    const yearToDateNetUsd = ytdEntries.reduce((acc, curr) => acc + (curr.netAmountUsd ?? ((curr.netAmount || 0) / usdExchangeRate)), 0);

    const toMonth = !isNaN(toDate.getMonth()) ? toDate.getMonth() : new Date().getMonth();
    const monthsWithEntriesCount = Math.max(1, toMonth + 1);
    const averageMonthlyNetTry = yearToDateNetTry / monthsWithEntriesCount;
    const averageMonthlyNetUsd = yearToDateNetUsd / monthsWithEntriesCount;

    // Breakdown per source
    const activeSources = sources.filter(s => s.isActive);
    let topSource: { name: string; amountTry: number; amountUsd: number; color: string } | undefined = undefined;
    let maxAmount = -1;

    const sourcesBreakdown: SourceSummary[] = activeSources.map(s => {
      const sourceEntries = currentPeriodEntries.filter(e => e.sourceId === s.id);
      const sNet = sourceEntries.reduce((acc, curr) => acc + (curr.netAmount || 0), 0);
      const sGross = sourceEntries.reduce((acc, curr) => acc + (curr.grossAmount ?? (curr.netAmount || 0)), 0);
      const sTax = sourceEntries.reduce((acc, curr) => acc + (curr.taxAmount ?? 0), 0);
      const sNetUsd = sourceEntries.reduce((acc, curr) => acc + (curr.netAmountUsd ?? ((curr.netAmount || 0) / usdExchangeRate)), 0);
      const sGrossUsd = sourceEntries.reduce((acc, curr) => acc + (curr.grossAmountUsd ?? ((curr.grossAmount ?? (curr.netAmount || 0)) / usdExchangeRate)), 0);
      
      const pct = totalNetTry > 0 ? (sNet / totalNetTry) * 100 : 0;
      const targetAch = s.monthlyTarget > 0 ? (sNet / s.monthlyTarget) * 100 : 0;

      if (sNet > maxAmount) {
        maxAmount = sNet;
        topSource = { name: s.name, amountTry: sNet, amountUsd: sNetUsd, color: s.color };
      }

      return {
        sourceId: s.id,
        name: s.name,
        category: s.category,
        color: s.color,
        taxRate: s.taxRate,
        netAmount: sNet,
        grossAmount: sGross,
        taxAmount: sTax,
        netAmountUsd: sNetUsd,
        grossAmountUsd: sGrossUsd,
        percentageOfTotal: pct,
        monthlyTarget: s.monthlyTarget,
        targetAchievementRate: targetAch
      };
    });

    const overallTargetTry = activeSources.reduce((acc, s) => acc + s.monthlyTarget, 0);
    // Since target is monthly, we scale the overall target by the number of months in the period to get a meaningful achievement rate, or assume it's roughly 1 month.
    // For simplicity, we just keep the target as the sum of monthlyTargets, so achievement rate might be >100% if range > 1 month.
    const overallTargetUsd = overallTargetTry / usdExchangeRate;
    const overallTargetAchievement = overallTargetTry > 0 ? (totalNetTry / overallTargetTry) * 100 : 0;

    return {
      dateFrom: from,
      dateTo: to,
      usdExchangeRate,
      totalNetTry,
      totalGrossTry,
      totalTaxTry,
      totalExpensesTry,
      totalNetUsd,
      totalGrossUsd,
      totalTaxUsd,
      previousMonthNetTry,
      previousMonthNetUsd,
      momGrowthPercentage,
      yearToDateNetTry,
      yearToDateNetUsd,
      averageMonthlyNetTry,
      averageMonthlyNetUsd,
      topPerformingSource: topSource && maxAmount > 0 ? topSource : undefined,
      sourcesBreakdown,
      overallTargetTry,
      overallTargetUsd,
      overallTargetAchievement
    };
  };

  const getTrendData = (from: string, to: string) => {
    const result: Array<{
      monthKey: string;
      monthName: string;
      totalNetTry: number;
      totalNetUsd: number;
      bySourceTry: Record<string, number>;
      bySourceUsd: Record<string, number>;
    }> = [];

    const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

    let fromDate = new Date(from);
    let toDate = new Date(to);
    
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
       return result;
    }

    let currentY = fromDate.getFullYear();
    let currentM = fromDate.getMonth();
    const endY = toDate.getFullYear();
    const endM = toDate.getMonth();

    let maxLoops = 60; // Max 5 years of trend
    
    while ((currentY < endY || (currentY === endY && currentM <= endM)) && maxLoops > 0) {
      const y = currentY;
      const m = currentM;

      const monthEntries = entries.filter(e => {
        const ym = getYearMonthFromDateStr(e.date);
        return ym.year === y && ym.month === m && e.status === 'received';
      });

      const totalNetTry = monthEntries.reduce((acc, curr) => acc + (curr.netAmount || 0), 0);
      const totalNetUsd = monthEntries.reduce((acc, curr) => acc + (curr.netAmountUsd ?? ((curr.netAmount || 0) / usdExchangeRate)), 0);
      const bySourceTry: Record<string, number> = {};
      const bySourceUsd: Record<string, number> = {};

      sources.forEach(s => {
        const sEntries = monthEntries.filter(e => e.sourceId === s.id);
        bySourceTry[s.id] = sEntries.reduce((acc, curr) => acc + (curr.netAmount || 0), 0);
        bySourceUsd[s.id] = sEntries.reduce((acc, curr) => acc + (curr.netAmountUsd ?? ((curr.netAmount || 0) / usdExchangeRate)), 0);
      });

      result.push({
        monthKey: `${y}-${String(m + 1).padStart(2, '0')}`,
        monthName: `${monthNames[m]} ${y}`,
        totalNetTry,
        totalNetUsd,
        bySourceTry,
        bySourceUsd
      });

      currentM++;
      if (currentM > 11) {
        currentM = 0;
        currentY++;
      }
      maxLoops--;
    }

    return result;
  };

  return (
    <IncomeContext.Provider
      value={{
        sources,
        entries,
        isInitialized,
        dateFilterFrom,
        dateFilterTo,
        usdExchangeRate,
        isLiveRateLoading,
        displayCurrency,
        setDateFilter,
        setUsdExchangeRate,
        setDisplayCurrency,
        refreshLiveRate,
        addSource,
        updateSource,
        deleteSource,
        addEntry,
        updateEntry,
        deleteEntry,
        clearAllIncomeData,
        getDashboardSummary,
        getTrendData
      }}
    >
      {children}
    </IncomeContext.Provider>
  );
}

export function useIncome() {
  const context = useContext(IncomeContext);
  if (!context) {
    throw new Error('useIncome must be used within an IncomeProvider');
  }
  return context;
}
