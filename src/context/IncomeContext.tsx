'use client';

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { IncomeSource, IncomeEntry, MonthlyIncomeSummary, SourceSummary } from '../types/income';
import { fetchLiveUsdRate } from '../utils/exchangeRate';
import { supabase } from '../utils/supabaseClient';

// Supabase mappers
const mapSourceToDb = (s: IncomeSource, userId: string) => ({
  user_id: userId,
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

const mapEntryToDb = (e: IncomeEntry, userId: string) => ({
  user_id: userId,
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

const IncomeContext = createContext<IncomeContextType | undefined>(undefined);

export function IncomeProvider({ children }: { children: ReactNode }) {
  const [sources, setSourcesState] = useState<IncomeSource[]>(defaultSources);
  const [entries, setEntriesState] = useState<IncomeEntry[]>([]);
  // Always-current copies: actions may be awaited in a loop (batch entry), where the
  // `sources`/`entries` captured by the closure would be stale and drop earlier items.
  const sourcesRef = useRef<IncomeSource[]>(defaultSources);
  const entriesRef = useRef<IncomeEntry[]>([]);
  const setSources = (list: IncomeSource[]) => {
    sourcesRef.current = list;
    setSourcesState(list);
  };
  const setEntries = (list: IncomeEntry[]) => {
    entriesRef.current = list;
    setEntriesState(list);
  };
  // Logged-in Supabase user that owns the income data (null when logged out)
  const userIdRef = useRef<string | null>(null);
  const reportDbError = (action: string, error: { message?: string } | null | undefined): boolean => {
    if (!error) return false;
    console.error(`Supabase ${action} failed:`, error);
    if (typeof window !== 'undefined') {
      window.alert(`تعذّر حفظ التغيير في قاعدة البيانات (${action}). البيانات محفوظة على هذا الجهاز فقط حالياً.\n${error.message ?? ''}`);
    }
    return true;
  };
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
    // Default to the first day of the PREVIOUS month, matching the default end date below
    // (starting at the current month would make the range empty: from > to).
    const firstDay = new Date(d.getFullYear(), d.getMonth() - 1, 1);
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

  // Device preferences + live exchange rate (not tied to an account)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedRate = localStorage.getItem('usd_exchange_rate');
    const savedCurrency = localStorage.getItem('display_currency');
    if (savedRate) {
      const parsed = parseFloat(savedRate);
      if (parsed > 0) setUsdExchangeRateState(parsed);
    }
    if (savedCurrency === 'USD' || savedCurrency === 'TRY') {
      setDisplayCurrencyState(savedCurrency);
    }
    fetchLiveUsdRate().then(live => {
      if (live && live > 0) {
        setUsdExchangeRateState(live);
        localStorage.setItem('usd_exchange_rate', live.toString());
      }
    });
  }, []);

  // Load the logged-in user's income data; reload on login, clear on logout.
  useEffect(() => {
    const loadForUser = async (userId: string) => {
      try {
        const [{ data: dbSources, error: sourcesErr }, { data: dbEntries, error: entriesErr }] = await Promise.all([
          supabase.from('personal_income_sources').select('*').eq('user_id', userId),
          supabase.from('personal_income_entries').select('*').eq('user_id', userId),
        ]);
        if (userIdRef.current !== userId) return; // user changed while loading

        if (sourcesErr || entriesErr) {
          // Offline / temporary failure: fall back to this device's cached copy
          console.error('Failed to load income data:', sourcesErr || entriesErr);
          const cachedSources = localStorage.getItem('income_sources');
          const cachedEntries = localStorage.getItem('income_entries');
          if (cachedSources) setSources(deduplicateSources(JSON.parse(cachedSources)));
          if (cachedEntries) setEntries(deduplicateEntries(JSON.parse(cachedEntries)));
          return;
        }

        let loadedSources = deduplicateSources((dbSources || []).map(mapDbToSource));
        if (loadedSources.length === 0) {
          // New account: create the default source templates in the database
          // (entries reference their source, so the sources must exist there).
          loadedSources = defaultSources.map(src => ({ ...src, createdAt: new Date().toISOString() }));
          const { error } = await supabase
            .from('personal_income_sources')
            .upsert(loadedSources.map(src => mapSourceToDb(src, userId)), { onConflict: 'user_id,id' });
          reportDbError('إنشاء مصادر الدخل', error);
        }
        const loadedEntries = deduplicateEntries((dbEntries || []).map(mapDbToEntry));

        setSources(loadedSources);
        setEntries(loadedEntries);
        localStorage.setItem('income_sources', JSON.stringify(loadedSources));
        localStorage.setItem('income_entries', JSON.stringify(loadedEntries));
      } catch (err) {
        console.error('Income data load error', err);
      } finally {
        setIsInitialized(true);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUserId = session?.user?.id ?? null;
      if (nextUserId === userIdRef.current) {
        if (!nextUserId) setIsInitialized(true);
        return; // token refresh etc.
      }
      const previousUserId = userIdRef.current;
      userIdRef.current = nextUserId;

      if (nextUserId) {
        // Defer: Supabase calls must not run inside the auth callback itself.
        setTimeout(() => loadForUser(nextUserId), 0);
      } else {
        if (previousUserId) {
          // Logged out: drop this account's cached income data from the device
          localStorage.removeItem('income_sources');
          localStorage.removeItem('income_entries');
          localStorage.removeItem('income_initialized');
        }
        setSources([]);
        setEntries([]);
        setIsInitialized(true);
      }
    });

    return () => subscription.unsubscribe();
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

  // Storage and Supabase sync helpers: update local state/cache, then write only the changed rows.
  const saveSourcesToStorage = async (newSources: IncomeSource[], changed: IncomeSource[] = []) => {
    const clean = deduplicateSources(newSources);
    setSources(clean);
    if (typeof window !== 'undefined') {
      localStorage.setItem('income_sources', JSON.stringify(clean));
    }
    const userId = userIdRef.current;
    const keptIds = new Set(clean.map(src => src.id));
    const toWrite = changed.filter(src => keptIds.has(src.id));
    if (!userId || toWrite.length === 0) return;
    try {
      const { error } = await supabase
        .from('personal_income_sources')
        .upsert(toWrite.map(src => mapSourceToDb(src, userId)), { onConflict: 'user_id,id' });
      reportDbError('مصادر الدخل', error);
    } catch (err) {
      console.error('Supabase sources sync error', err);
    }
  };

  const saveEntriesToStorage = async (newEntries: IncomeEntry[], changed: IncomeEntry[] = []) => {
    const clean = deduplicateEntries(newEntries);
    setEntries(clean);
    if (typeof window !== 'undefined') {
      localStorage.setItem('income_entries', JSON.stringify(clean));
    }
    const userId = userIdRef.current;
    const keptIds = new Set(clean.map(e => e.id));
    const toWrite = changed.filter(e => keptIds.has(e.id));
    if (!userId || toWrite.length === 0) return;
    try {
      const { error } = await supabase
        .from('personal_income_entries')
        .upsert(toWrite.map(e => mapEntryToDb(e, userId)), { onConflict: 'user_id,id' });
      reportDbError('سجل الدخل', error);
    } catch (err) {
      console.error('Supabase entries sync error', err);
    }
  };

  // Actions
  const addSource = async (sourceData: Omit<IncomeSource, 'id' | 'createdAt'>) => {
    const newSource: IncomeSource = {
      ...sourceData,
      id: `src_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString()
    };
    await saveSourcesToStorage([...sourcesRef.current, newSource], [newSource]);
  };

  const updateSource = async (id: string, updates: Partial<Omit<IncomeSource, 'id'>>) => {
    let changed: IncomeSource | undefined;
    const updated = sourcesRef.current.map(src => {
      if (src.id !== id) return src;
      changed = { ...src, ...updates };
      return changed;
    });
    await saveSourcesToStorage(updated, changed ? [changed] : []);
  };

  const deleteSource = async (id: string) => {
    await saveSourcesToStorage(sourcesRef.current.filter(src => src.id !== id));
    await saveEntriesToStorage(entriesRef.current.filter(e => e.sourceId !== id));
    const userId = userIdRef.current;
    if (!userId) return;
    try {
      // The database also cascades, but delete the entries explicitly for clarity.
      const { error: entriesErr } = await supabase
        .from('personal_income_entries').delete().eq('user_id', userId).eq('source_id', id);
      if (reportDbError('حذف سجلات المصدر', entriesErr)) return;
      const { error } = await supabase
        .from('personal_income_sources').delete().eq('user_id', userId).eq('id', id);
      reportDbError('حذف المصدر', error);
    } catch (err) {
      console.error('Supabase deleteSource error', err);
    }
  };

  const addEntry = async (entryData: Omit<IncomeEntry, 'id' | 'createdAt' | 'netAmountUsd' | 'grossAmountUsd'>) => {
    const rate = entryData.exchangeRateUsed || usdExchangeRate;
    const newEntry: IncomeEntry = {
      ...entryData,
      netAmountUsd: Number((entryData.netAmount / rate).toFixed(2)),
      grossAmountUsd: Number((entryData.grossAmount / rate).toFixed(2)),
      id: `inc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString()
    };
    await saveEntriesToStorage([newEntry, ...entriesRef.current], [newEntry]);
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
    let changed: IncomeEntry | undefined;
    const updated = entriesRef.current.map(e => {
      if (e.id !== id) return e;
      const merged = { ...e, ...updates };
      const rate = merged.exchangeRateUsed || usdExchangeRate;
      merged.netAmountUsd = Number((merged.netAmount / rate).toFixed(2));
      merged.grossAmountUsd = Number((merged.grossAmount / rate).toFixed(2));
      changed = merged;
      return merged;
    });
    await saveEntriesToStorage(updated, changed ? [changed] : []);
  };

  const deleteEntry = async (id: string) => {
    await saveEntriesToStorage(entriesRef.current.filter(e => e.id !== id));
    const userId = userIdRef.current;
    if (!userId) return;
    try {
      const { error } = await supabase.from('personal_income_entries').delete().eq('user_id', userId).eq('id', id);
      reportDbError('حذف السجل', error);
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
    }
    const userId = userIdRef.current;
    if (!userId) return;
    try {
      const { error: entriesErr } = await supabase.from('personal_income_entries').delete().eq('user_id', userId);
      if (reportDbError('مسح سجل الدخل', entriesErr)) return;
      const { error: sourcesErr } = await supabase.from('personal_income_sources').delete().eq('user_id', userId);
      reportDbError('مسح مصادر الدخل', sourcesErr);
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

    const fromDate = new Date(from);
    const toDate = new Date(to);
    
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
