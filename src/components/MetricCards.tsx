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

  const metrics = [
    {
      title: 'الراتب الأساسي الصافي',
      value: formatCurrency(calculationResult.baseSalary),
      description: 'الراتب المتفق عليه في العقد',
      icon: Wallet,
      colorClass: 'from-blue-500/10 to-indigo-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/30',
      gradient: 'from-blue-500 to-indigo-600',
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
      description: `${(calculationResult.overtime1xHours + calculationResult.overtime1_5xHours + calculationResult.overtime2xHours).toFixed(1)} ساعة عمل إضافية`,
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
      title: 'صافي الراتب المتوقع استلامه',
      value: formatCurrency(calculationResult.netSalary),
      description: 'الراتب النهائي بعد المقاصة والخصومات',
      icon: Coins,
      colorClass: 'from-amber-500/10 to-orange-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/30 ring-2 ring-amber-500/20',
      gradient: 'from-amber-500 to-orange-600',
      highlight: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((m, idx) => {
        const IconComponent = m.icon;
        return (
          <div
            key={idx}
            className={`relative overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-6 shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col justify-between ${
              m.highlight ? 'ring-1 ring-amber-500/30 dark:ring-amber-500/20' : ''
            }`}
          >
            {/* Background Glow */}
            <div className={`absolute -right-10 -top-10 w-24 h-24 rounded-full bg-gradient-to-br ${m.gradient} opacity-5 blur-xl group-hover:opacity-10 transition-opacity duration-300`} />
            
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{m.title}</p>
                <h3 className={`text-2xl font-bold mt-2 tracking-tight ${m.highlight ? 'text-slate-900 dark:text-amber-400' : 'text-slate-900 dark:text-slate-100'}`}>
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
