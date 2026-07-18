import React from 'react';
import { useSalary } from '../context/SalaryContext';
import { Wallet, ArrowDownCircle, ArrowUpCircle, Coins, Clock, Calendar } from 'lucide-react';

export default function MetricCards() {
  const { calculationResult } = useSalary();
  
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
  let remainingColorClass = 'from-slate-500/10 to-slate-650/10 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800/80';
  let remainingGradient = 'from-slate-500 to-slate-600';
  let remainingValueColor = 'text-slate-700 dark:text-slate-400';
  
  if (remaining > 0) {
    remainingTitle = 'الرصيد المتبقي (مستحق لك)';
    remainingColorClass = 'from-emerald-500/10 to-teal-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30 ring-2 ring-emerald-500/20';
    remainingGradient = 'from-emerald-500 to-teal-600';
    remainingValueColor = 'text-emerald-650 dark:text-emerald-405';
  } else if (remaining < 0) {
    remainingTitle = 'الرصيد المتبقي (مستحق عليك)';
    remainingColorClass = 'from-rose-500/10 to-red-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/30 ring-2 ring-rose-500/20';
    remainingGradient = 'from-rose-500 to-red-600';
    remainingValueColor = 'text-rose-650 dark:text-rose-405';
  }

  const metrics = [
    {
      title: 'الراتب الأساسي الصافي',
      value: formatCurrency(calculationResult.baseSalary),
      description: isCustomSalary ? 'تم تخصيصه لهذا الشهر فقط' : 'الراتب الافتراضي العام',
      icon: Wallet,
      colorClass: 'from-blue-500/10 to-indigo-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/30',
      gradient: 'from-blue-500 to-indigo-600',
      highlightBadge: isCustomSalary ? 'راتب مخصص' : null,
    },
    {
      title: 'إجمالي الخصومات',
      value: formatCurrency(totalDeductions),
      description: `${calculationResult.totalAbsenceDays} غياب | ${calculationResult.totalDelayHours} ساعة تأخير`,
      icon: ArrowDownCircle,
      colorClass: 'from-rose-500/10 to-red-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/30',
      gradient: 'from-rose-500 to-red-600',
      detailBreakdown: (
        <div className="text-xs mt-1 text-rose-500/80 font-medium">
          غياب: {formatCurrency(calculationResult.totalAbsenceDeduction)} / تأخير: {formatCurrency(calculationResult.totalDelayDeduction)}
        </div>
      )
    },
    {
      title: 'مستحقات الإضافي',
      value: formatCurrency(calculationResult.totalOvertimePay),
      description: `${totalOvertimeHours.toFixed(1)} ساعة عمل إضافية`,
      icon: ArrowUpCircle,
      colorClass: 'from-emerald-500/10 to-teal-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30',
      gradient: 'from-emerald-500 to-teal-600',
      detailBreakdown: (
        <div className="text-xs mt-1 text-emerald-500/80 font-medium flex gap-2">
          <span>1x: {calculationResult.overtime1xHours.toFixed(1)}س</span>
          <span>1.5x: {calculationResult.overtime1_5xHours.toFixed(1)}س</span>
          <span>2x: {calculationResult.overtime2xHours.toFixed(1)}س</span>
        </div>
      )
    },
    {
      title: 'صافي الراتب المستحق',
      value: formatCurrency(calculationResult.netSalary),
      description: 'الراتب النهائي بعد المقاصة والخصومات',
      icon: Coins,
      colorClass: 'from-indigo-500/10 to-purple-500/10 text-indigo-650 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/30',
      gradient: 'from-indigo-500 to-purple-650',
    },
    {
      title: remainingTitle,
      value: formatCurrency(Math.abs(remaining)),
      description: `إجمالي المقبوض: ${formatCurrency(calculationResult.totalPaymentsReceived)}`,
      icon: Calendar,
      colorClass: remainingColorClass,
      gradient: remainingGradient,
      highlight: remaining !== 0,
      valueColor: remainingValueColor,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
      {metrics.map((m, idx) => {
        const IconComponent = m.icon;
        return (
          <div
            key={idx}
            className={`relative overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-6 shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col justify-between ${
              m.highlight ? 'ring-1 ring-indigo-500/30 dark:ring-indigo-500/20' : ''
            }`}
          >
            {/* Background Glow */}
            <div className={`absolute -right-10 -top-10 w-24 h-24 rounded-full bg-gradient-to-br ${m.gradient} opacity-5 blur-xl group-hover:opacity-10 transition-opacity duration-300`} />
            
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{m.title}</p>
                  {m.highlightBadge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-indigo-500/10 dark:bg-indigo-500/25 text-indigo-700 dark:text-indigo-300 rounded-md">
                      {m.highlightBadge}
                    </span>
                  )}
                </div>
                <h3 className={`text-2xl font-bold mt-2 tracking-tight ${m.valueColor || (m.highlight ? 'text-slate-900 dark:text-amber-400' : 'text-slate-900 dark:text-slate-100')}`}>
                  {m.value}
                </h3>
              </div>
              <div className={`p-3 rounded-xl bg-gradient-to-br ${m.colorClass} flex items-center justify-center`}>
                <IconComponent className="w-6 h-6" />
              </div>
            </div>
            
            <div className="mt-4 border-t border-slate-50 dark:border-slate-800/50 pt-3 flex flex-col">
              <span className="text-xs text-slate-400 dark:text-slate-500">{m.description}</span>
              {m.detailBreakdown || null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
