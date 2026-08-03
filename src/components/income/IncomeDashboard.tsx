'use client';

import React, { useState } from 'react';
import { useIncome } from '../../context/IncomeContext';
import { IncomeEntry } from '../../types/income';
import IncomeMetricsCards from './IncomeMetricsCards';
import IncomeCharts from './IncomeCharts';
import IncomeInsightsCard from './IncomeInsightsCard';
import IncomeLogTable from './IncomeLogTable';
import IncomeModal from './IncomeModal';
import IncomeBatchModal from './IncomeBatchModal';
import IncomeSourcesModal from './IncomeSourcesModal';
import { Plus, SlidersHorizontal, TrendingUp, DollarSign, ArrowRightLeft, RefreshCw, FileSpreadsheet, FastForward } from 'lucide-react';

export default function IncomeDashboard() {
  const {
    dateFilterFrom,
    dateFilterTo,
    setDateFilter,
    usdExchangeRate,
    setUsdExchangeRate,
    isLiveRateLoading,
    refreshLiveRate,
    displayCurrency,
    setDisplayCurrency,
    entries,
    getDashboardSummary
  } = useIncome();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<IncomeEntry | null>(null);
  const [isSourcesModalOpen, setIsSourcesModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [rateInput, setRateInput] = useState<string>(usdExchangeRate.toString());

  // Keep rateInput synced when usdExchangeRate changes (e.g. via auto API fetch)
  React.useEffect(() => {
    setRateInput(usdExchangeRate.toString());
  }, [usdExchangeRate]);



  const handleOpenAddModal = () => {
    setEntryToEdit(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (entry: IncomeEntry) => {
    setEntryToEdit(entry);
    setIsAddModalOpen(true);
  };

  const handleRateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(rateInput);
    if (val > 0) {
      setUsdExchangeRate(val);
    }
  };

  const handleFetchLive = async () => {
    const live = await refreshLiveRate();
    if (live) {
      setRateInput(live.toString());
    }
  };

  const dashboardSummary = getDashboardSummary(dateFilterFrom, dateFilterTo);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Dashboard Sub-Header Bar: Currency Toggle, Rate input, Selectors & Actions */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
        
        {/* Row 1: Currency Switcher & Exchange Rate Control */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
          
          {/* Currency Toggle Switcher (TRY ₺ vs USD $) */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <ArrowRightLeft className="w-4 h-4 text-emerald-500" />
              عملة العرض:
            </span>

            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => setDisplayCurrency('TRY')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  displayCurrency === 'TRY'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                الليرة التركية (₺ TRY)
              </button>

              <button
                type="button"
                onClick={() => setDisplayCurrency('USD')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  displayCurrency === 'USD'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                الدولار الأمريكي ($ USD)
              </button>
            </div>
          </div>

          {/* Live Exchange Rate Control */}
          <div className="flex items-center gap-3 flex-wrap text-xs">
            <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-lg font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>مباشر من السوق: 1$ = {usdExchangeRate} TRY</span>
            </div>

            <form onSubmit={handleRateSubmit} className="flex items-center gap-1.5">
              <input
                type="text" inputMode="decimal" lang="en"
                step="any"
                value={rateInput}
                onChange={(e) => setRateInput(e.target.value)}
                className="w-20 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 font-extrabold text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-center"
                dir="ltr"
              />
              <button
                type="button"
                onClick={handleFetchLive}
                disabled={isLiveRateLoading}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1 transition-all disabled:opacity-50"
                title="تحديث تلقائي مباشر لسعر الصرف الآن"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLiveRateLoading ? 'animate-spin' : ''}`} />
                <span>{isLiveRateLoading ? 'جاري الجلب...' : 'تحديث مباشر'}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Row 2: Month / Year Selectors + Action Buttons */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          
          {/* Selectors */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-xl shadow-md shadow-emerald-500/10">
              <TrendingUp className="w-5 h-5" />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-0.5">من تاريخ</span>
                <input
                  type="date" lang="en-GB" dir="ltr"
                  value={dateFilterFrom}
                  onChange={(e) => setDateFilter(e.target.value, dateFilterTo)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-0.5">إلى تاريخ</span>
                <input
                  type="date" lang="en-GB" dir="ltr"
                  value={dateFilterTo}
                  onChange={(e) => setDateFilter(dateFilterFrom, e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">


            <button
              onClick={() => setIsSourcesModalOpen(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all"
            >
              <SlidersHorizontal className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>إدارة المصادر والضرائب</span>
            </button>

            <button
              onClick={() => setIsBatchModalOpen(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/10 transition-all"
            >
              <FastForward className="w-4 h-4" />
              <span>تسجيل الدخل (متسلسل)</span>
            </button>

            <button
              onClick={handleOpenAddModal}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/10 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>سجل دخل جديد</span>
            </button>
          </div>
        </div>
      </div>

      {/* 1. Metric Cards (KPIs) */}
      <IncomeMetricsCards summary={dashboardSummary} />

      {/* 2. Interactive SVG Charts */}
      <IncomeCharts summary={dashboardSummary} />

      {/* 3. Growth Insights & Diversity Health Index */}
      <IncomeInsightsCard summary={dashboardSummary} />

      {/* 4. Filterable Log Table */}
      <IncomeLogTable
        onOpenAddModal={handleOpenAddModal}
        onOpenEditModal={handleOpenEditModal}
      />

      {/* Modals */}
      <IncomeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        entryToEdit={entryToEdit}
      />

      <IncomeSourcesModal
        isOpen={isSourcesModalOpen}
        onClose={() => setIsSourcesModalOpen(false)}
      />

      <IncomeBatchModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
      />
    </div>
  );
}
