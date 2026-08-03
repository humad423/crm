'use client';

import React from 'react';
import { useIncome } from '../../context/IncomeContext';
import { MonthlyIncomeSummary } from '../../types/income';
import { TrendingUp, TrendingDown, DollarSign, Calendar, Target, Award, Percent } from 'lucide-react';

interface IncomeMetricsCardsProps {
  summary: MonthlyIncomeSummary;
}

export default function IncomeMetricsCards({ summary }: IncomeMetricsCardsProps) {
  const { displayCurrency } = useIncome();

  const formatCurrency = (tryAmount: number, usdAmount?: number) => {
    if (displayCurrency === 'USD') {
      const val = usdAmount !== undefined ? usdAmount : tryAmount / summary.usdExchangeRate;
      return '$' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) + ' USD';
    }
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(tryAmount) + ' TRY';
  };

  const isGrowthPositive = summary.momGrowthPercentage >= 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Monthly Net Income */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 to-slate-900 dark:from-slate-900 dark:to-indigo-950/80 rounded-2xl p-5 text-white shadow-xl shadow-indigo-950/10 border border-indigo-700/30">
        <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -ml-10 -mt-10 pointer-events-none" />
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-indigo-200/80 mb-1">
              الدخل الصافي المستلم للفترة المحددة
            </p>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {formatCurrency(summary.totalNetTry, summary.totalNetUsd)}
            </h3>
          </div>
          <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl text-indigo-300 border border-white/10">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Growth MoM Badge + Tax Note */}
        <div className="mt-4 flex items-center justify-between text-xs border-t border-white/10 pt-3">
          <div className="flex items-center gap-1.5 font-bold">
            <span
              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-xs ${
                isGrowthPositive
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}
            >
              {isGrowthPositive ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              {Math.abs(summary.momGrowthPercentage).toFixed(1)}%
            </span>
            <span className="text-slate-300 font-medium">عن الفترة السابقة</span>
          </div>

          <span className="text-[10px] text-indigo-200/70 font-semibold">
            قبل الضريبة: {formatCurrency(summary.totalGrossTry, summary.totalGrossUsd)}
          </span>
        </div>
      </div>

      {/* 2. Total Tax Deductions (15% Tax) */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              خصومات الضريبة المقتطعة (15%)
            </p>
            <h3 className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 tracking-tight">
              {formatCurrency(summary.totalTaxTry, summary.totalTaxUsd)}
            </h3>
          </div>
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 rounded-xl text-rose-600 dark:text-rose-400">
            <Percent className="w-6 h-6" />
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-1 text-[11px] border-t border-slate-100 dark:border-slate-800 pt-3">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span>قبل الضريبة (Gross):</span>
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {formatCurrency(summary.totalGrossTry, summary.totalGrossUsd)}
            </span>
          </div>
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
            <span>الصافي بعد الضريبة (Net):</span>
            <span className="font-extrabold">
              {formatCurrency(summary.totalNetTry, summary.totalNetUsd)}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Year To Date & Monthly Average */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              إجمالي دخل السنة الحالية (YTD)
            </p>
            <h3 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
              {formatCurrency(summary.yearToDateNetTry, summary.yearToDateNetUsd)}
            </h3>
          </div>
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-blue-600 dark:text-blue-400">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
          <span>المتوسط الشهري:</span>
          <span className="font-bold text-slate-700 dark:text-slate-200">
            {formatCurrency(summary.averageMonthlyNetTry, summary.averageMonthlyNetUsd)}
          </span>
        </div>
      </div>

      {/* 4. Top Performing Source & Target Achievement */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              المصدر الأعلى نماءً وإيراداً
            </p>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 truncate max-w-[170px]">
              {summary.topPerformingSource ? summary.topPerformingSource.name : 'لا توجد بيانات'}
            </h3>
          </div>
          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-amber-600 dark:text-amber-400">
            <Award className="w-6 h-6" />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs border-t border-slate-100 dark:border-slate-800 pt-3">
          <span className="text-slate-500 dark:text-slate-400">صافي الأرباح:</span>
          <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
            {summary.topPerformingSource
              ? formatCurrency(summary.topPerformingSource.amountTry, summary.topPerformingSource.amountUsd)
              : '0'}
          </span>
        </div>
      </div>
    </div>
  );
}
