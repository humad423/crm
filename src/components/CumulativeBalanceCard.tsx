'use client';
import React from 'react';
import { useSalary } from '../context/SalaryContext';
import { TrendingUp, TrendingDown, Minus, Landmark, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function CumulativeBalanceCard() {
  const { cumulativeBalance, cumulativeTotalEarned, cumulativeTotalPaid } = useSalary();

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 0,
    }).format(val);

  const isPositive = cumulativeBalance > 0;
  const isZero = cumulativeBalance === 0;
  const hasData = cumulativeTotalEarned > 0 || cumulativeTotalPaid > 0;

  const config = isZero
    ? {
        label: 'الرصيد الإجمالي مستوفى',
        subLabel: 'لا يوجد مستحقات متراكمة',
        bg: 'from-slate-800 to-slate-900',
        badgeBg: 'bg-slate-700 text-slate-300',
        valueCls: 'text-slate-300',
        ringCls: 'ring-slate-700/40',
        Icon: Minus,
        iconBg: 'bg-slate-700/60',
        iconCls: 'text-slate-300',
        barCls: 'bg-slate-600',
      }
    : isPositive
    ? {
        label: 'المستحق لك (الإجمالي)',
        subLabel: 'مستحقات لم تُصرف بعد',
        bg: 'from-emerald-800 to-teal-900',
        badgeBg: 'bg-emerald-700/60 text-emerald-200',
        valueCls: 'text-emerald-300',
        ringCls: 'ring-emerald-500/30',
        Icon: TrendingUp,
        iconBg: 'bg-emerald-600/40',
        iconCls: 'text-emerald-300',
        barCls: 'bg-emerald-500',
      }
    : {
        label: 'المستحق عليك (الإجمالي)',
        subLabel: 'استلمت أكثر من مستحقاتك',
        bg: 'from-rose-800 to-red-900',
        badgeBg: 'bg-rose-700/60 text-rose-200',
        valueCls: 'text-rose-300',
        ringCls: 'ring-rose-500/30',
        Icon: TrendingDown,
        iconBg: 'bg-rose-600/40',
        iconCls: 'text-rose-300',
        barCls: 'bg-rose-500',
      };

  // Ratio of paid vs earned (for the progress bar)
  const paidRatio = cumulativeTotalEarned > 0
    ? Math.min(cumulativeTotalPaid / cumulativeTotalEarned, 1)
    : 0;

  const { Icon } = config;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${config.bg} ring-1 ${config.ringCls} p-5 shadow-xl text-white`}
    >
      {/* Decorative circles */}
      <div className="absolute -top-8 -left-8 w-32 h-32 rounded-full bg-white/5 blur-xl" />
      <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-white/5 blur-2xl" />

      {/* Header row */}
      <div className="relative flex items-start justify-between mb-4">
        <div>
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${config.badgeBg} uppercase tracking-wide mb-2`}>
            <Landmark className="w-3 h-3" />
            الرصيد التراكمي الكلي
          </span>
          <p className="text-xs text-white/60 font-medium">{config.subLabel}</p>
        </div>
        <div className={`p-2.5 rounded-xl ${config.iconBg}`}>
          <Icon className={`w-5 h-5 ${config.iconCls}`} />
        </div>
      </div>

      {/* Main value */}
      <div className="relative mb-5">
        <p className={`text-3xl font-black tracking-tight ${config.valueCls}`}>
          {isZero ? '—' : formatCurrency(Math.abs(cumulativeBalance))}
        </p>
        <p className="text-xs text-white/50 mt-0.5">{config.label}</p>
      </div>

      {/* Breakdown row */}
      {hasData && (
        <div className="relative space-y-3">
          {/* Progress bar: paid / earned */}
          <div>
            <div className="flex justify-between text-[10px] text-white/50 mb-1">
              <span>نسبة المدفوع من المستحق</span>
              <span>{(paidRatio * 100).toFixed(0)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className={`h-full rounded-full ${config.barCls} transition-all duration-700`}
                style={{ width: `${paidRatio * 100}%` }}
              />
            </div>
          </div>

          {/* Two stat pills */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/10 rounded-xl px-3 py-2">
              <div className="flex items-center gap-1 text-[10px] text-white/50 mb-0.5">
                <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                إجمالي المستحق
              </div>
              <p className="text-xs font-bold text-white truncate">
                {formatCurrency(cumulativeTotalEarned)}
              </p>
            </div>
            <div className="bg-white/10 rounded-xl px-3 py-2">
              <div className="flex items-center gap-1 text-[10px] text-white/50 mb-0.5">
                <ArrowDownRight className="w-3 h-3 text-rose-400" />
                إجمالي المقبوض
              </div>
              <p className="text-xs font-bold text-white truncate">
                {formatCurrency(cumulativeTotalPaid)}
              </p>
            </div>
          </div>
        </div>
      )}

      {!hasData && (
        <p className="relative text-xs text-white/40 text-center py-2">
          سجّل استثناءات أو دفعات لبدء تتبع الرصيد التراكمي
        </p>
      )}
    </div>
  );
}
