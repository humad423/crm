'use client';

import React, { useState } from 'react';
import { useIncome } from '../../context/IncomeContext';
import { MonthlyIncomeSummary } from '../../types/income';
import { PieChart, BarChart2, TrendingUp, CheckCircle2, ChevronDown } from 'lucide-react';

interface IncomeChartsProps {
  summary: MonthlyIncomeSummary;
}

export default function IncomeCharts({ summary }: IncomeChartsProps) {
  const { getTrendData, dateFilterFrom, dateFilterTo, sources, displayCurrency, usdExchangeRate } = useIncome();
  const trendData = getTrendData(dateFilterFrom, dateFilterTo);
  const [hoveredMonthIndex, setHoveredMonthIndex] = useState<number | null>(null);
  const [selectedSources, setSelectedSources] = useState<string[]>(['all']);
  const activeSources = sources.filter(s => s.isActive);

  const formatCurrency = (tryAmount: number, usdAmount?: number) => {
    if (displayCurrency === 'USD') {
      const val = usdAmount !== undefined ? usdAmount : tryAmount / usdExchangeRate;
      return '$' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) + ' USD';
    }
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(tryAmount) + ' TRY';
  };

  const maxTrendNet = Math.max(
    1,
    ...trendData.map(t => {
      if (selectedSources.includes('all')) {
        return displayCurrency === 'USD' ? t.totalNetUsd : t.totalNetTry;
      } else {
        return selectedSources.reduce((sum, srcId) => {
          return sum + (displayCurrency === 'USD' 
            ? (t.bySourceUsd[srcId] || 0)
            : (t.bySourceTry[srcId] || 0));
        }, 0);
      }
    })
  ) * 1.4;

  const currentChartTotalTry = trendData.reduce((acc, item) => {
    return acc + (selectedSources.includes('all') ? item.totalNetTry : selectedSources.reduce((sum, src) => sum + (item.bySourceTry[src] || 0), 0));
  }, 0);
  
  const currentChartTotalUsd = trendData.reduce((acc, item) => {
    return acc + (selectedSources.includes('all') ? item.totalNetUsd : selectedSources.reduce((sum, src) => sum + (item.bySourceUsd[src] || 0), 0));
  }, 0);

  // Donut chart logic for income distribution
  const totalNet = displayCurrency === 'USD' ? summary.totalNetUsd : summary.totalNetTry;
  let accumulatedAngle = 0;
  const radius = 60;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Chart 1: Multi-Month Growth Trend (Spans 2 columns on lg screens) */}
      <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base flex flex-wrap items-center gap-2">
                مسار نمو الإيرادات
                <span className="text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 px-2.5 py-0.5 rounded-md font-extrabold shadow-sm">
                  المجموع: {formatCurrency(currentChartTotalTry, currentChartTotalUsd)}
                </span>
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                مقارنة وتتبع الأداء عبر الأشهر
              </p>
            </div>
          </div>
          
          <details className="relative group">
            <summary className="list-none cursor-pointer flex items-center gap-2 text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg px-3 py-1.5 outline-none focus:border-indigo-500 transition-colors select-none">
              <span>{selectedSources.includes('all') ? 'إجمالي كافة المصادر' : `محدد (${selectedSources.length})`}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-open:rotate-180 transition-transform" />
            </summary>
            <div className="absolute left-0 top-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl min-w-[220px] z-50 p-2 flex flex-col gap-1 max-h-64 overflow-y-auto custom-scrollbar">
              <label className="flex items-center gap-2.5 text-xs p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg cursor-pointer transition-colors">
                <input 
                  type="checkbox" 
                  checked={selectedSources.includes('all')} 
                  onChange={() => {
                    if (selectedSources.includes('all')) {
                      setSelectedSources([]);
                    } else {
                      setSelectedSources(['all']);
                    }
                  }} 
                  className="rounded text-indigo-500 focus:ring-indigo-500 w-3.5 h-3.5" 
                />
                <span className="font-bold text-slate-800 dark:text-slate-200">إجمالي كافة المصادر</span>
              </label>
              <div className="h-px bg-slate-100 dark:bg-slate-700/50 my-1 mx-2" />
              {activeSources.map(s => {
                const isSelected = selectedSources.includes('all') || selectedSources.includes(s.id);
                return (
                  <label key={s.id} className="flex items-center gap-2.5 text-xs p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      checked={isSelected} 
                      onChange={() => {
                        if (selectedSources.includes('all')) {
                          setSelectedSources([s.id]);
                        } else {
                          const newSel = selectedSources.includes(s.id) 
                            ? selectedSources.filter(id => id !== s.id)
                            : [...selectedSources, s.id];
                          if (newSel.length === 0 || newSel.length === activeSources.length) {
                            setSelectedSources(['all']);
                          } else {
                            setSelectedSources(newSel);
                          }
                        }
                      }} 
                      className="rounded text-indigo-500 focus:ring-indigo-500 w-3.5 h-3.5" 
                    />
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }}></span>
                    <span className="text-slate-700 dark:text-slate-300">{s.name}</span>
                  </label>
                );
              })}
            </div>
          </details>
        </div>

        {/* Generate SVG points for the Line Chart */}
        {(() => {
          const points = trendData.map((item, idx) => {
            const currentNet = selectedSources.includes('all') 
              ? (displayCurrency === 'USD' ? item.totalNetUsd : item.totalNetTry)
              : selectedSources.reduce((sum, srcId) => {
                  return sum + (displayCurrency === 'USD' ? (item.bySourceUsd[srcId] || 0) : (item.bySourceTry[srcId] || 0));
                }, 0);
              
            const heightRatio = currentNet / maxTrendNet;
            const y = currentNet > 0 ? 100 - (heightRatio * 100) : 100;
            const x = (idx / (trendData.length - 1)) * 100;
            return `${x},${y}`;
          }).join(' ');

          const lineColor = selectedSources.includes('all') || selectedSources.length > 1
            ? '#6366f1' 
            : (sources.find(s => s.id === selectedSources[0])?.color || '#6366f1');

          return (
            <div className="relative h-56 w-full mt-4 mb-10 px-4 sm:px-6">
              {/* Background grid lines */}
              <div className="absolute inset-x-4 sm:inset-x-6 top-0 bottom-0 flex flex-col justify-between pointer-events-none opacity-20 dark:opacity-10 z-0">
                <div className="border-b border-dashed border-slate-400 w-full" />
                <div className="border-b border-dashed border-slate-400 w-full" />
                <div className="border-b border-dashed border-slate-400 w-full" />
                <div className="border-b border-slate-400 w-full" />
              </div>

              <div className="relative w-full h-full z-10">
                {/* Line Chart SVG */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
                      <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <polygon
                    points={`0,100 ${points} 100,100`}
                    fill="url(#lineGradient)"
                  />
                  <polyline
                    points={points}
                    fill="none"
                    stroke={lineColor}
                    strokeWidth="3"
                    vectorEffect="non-scaling-stroke"
                    className="drop-shadow-md"
                  />
                </svg>

                {/* Interactive points & Tooltips */}
                {trendData.map((item, idx) => {
                  const currentNetTry = selectedSources.includes('all')
                    ? item.totalNetTry
                    : selectedSources.reduce((sum, src) => sum + (item.bySourceTry[src] || 0), 0);
                  const currentNetUsd = selectedSources.includes('all')
                    ? item.totalNetUsd
                    : selectedSources.reduce((sum, src) => sum + (item.bySourceUsd[src] || 0), 0);
                  const currentNet = displayCurrency === 'USD' ? currentNetUsd : currentNetTry;
                    
                  const heightRatio = currentNet / maxTrendNet;
                  const barHeightPct = currentNet > 0 ? (heightRatio * 100) : 0;
                  const isHovered = hoveredMonthIndex === idx;
                  const leftPct = (idx / (trendData.length - 1)) * 100;

                  return (
                    <div
                      key={item.monthKey}
                      onMouseEnter={() => setHoveredMonthIndex(idx)}
                      onMouseLeave={() => setHoveredMonthIndex(null)}
                      className="absolute top-0 bottom-0 flex flex-col items-center cursor-pointer group z-10"
                      style={{ left: `${leftPct}%`, width: '40px', transform: 'translateX(-50%)' }}
                    >
                      {/* Tooltip on Hover */}
                      {isHovered && (
                        <div className="absolute bottom-full mb-3 z-30 bg-slate-900 text-white dark:bg-slate-800 text-xs rounded-xl p-3 shadow-xl border border-slate-700 min-w-[200px] animate-scale-up pointer-events-none">
                          <p className="font-bold text-indigo-300 border-b border-slate-700 pb-1 mb-1.5 text-center">
                            {item.monthName}
                          </p>
                          <p className="flex justify-between font-extrabold text-sm text-white mb-2 gap-4">
                            <span>{selectedSources.includes('all') ? 'إجمالي كافة المصادر:' : (selectedSources.length > 1 ? 'إجمالي المحدد:' : 'صافي المصدر:')}</span>
                            <span>{formatCurrency(currentNetTry, currentNetUsd)}</span>
                          </p>
                          {(selectedSources.includes('all') || selectedSources.length > 1) && (
                            <div className="space-y-1 text-[11px]">
                              {activeSources
                                .filter(s => selectedSources.includes('all') || selectedSources.includes(s.id))
                                .map(s => {
                                const amtTry = item.bySourceTry[s.id] || 0;
                                const amtUsd = item.bySourceUsd[s.id] || 0;
                                if (amtTry <= 0) return null;
                                return (
                                  <div key={s.id} className="flex justify-between items-center text-slate-300">
                                    <span className="flex items-center gap-1">
                                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                                      <span className="truncate max-w-[110px]">{s.name}</span>
                                    </span>
                                    <span className="font-medium">{formatCurrency(amtTry, amtUsd)}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Dot */}
                      <div 
                        className={`absolute w-3.5 h-3.5 rounded-full border-[2.5px] border-white dark:border-slate-900 shadow-sm transition-transform duration-300 ${isHovered ? 'scale-[1.8]' : 'scale-100'}`}
                        style={{
                          bottom: `${barHeightPct}%`,
                          backgroundColor: lineColor,
                          marginBottom: '-7px'
                        }}
                      />

                      {/* Permanent/Hover Value Label */}
                      {(trendData.length <= 10 || isHovered) && (
                        <span
                          className={`absolute text-[8px] sm:text-[9px] font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm px-1.5 py-0.5 rounded shadow-sm border border-slate-200 dark:border-slate-700 pointer-events-none transition-all duration-300 ${isHovered ? 'z-40 scale-110' : 'z-20'}`}
                          style={{
                            bottom: `calc(${barHeightPct}% + 10px)`,
                          }}
                        >
                          {formatCurrency(currentNetTry, currentNetUsd)}
                        </span>
                      )}

                      {/* Month Name */}
                      {(trendData.length <= 12 || idx % Math.ceil(trendData.length / 12) === 0 || isHovered) && (
                        <span className={`absolute -bottom-6 text-[9px] sm:text-[10px] font-bold whitespace-nowrap -rotate-45 sm:rotate-0 mt-2 text-center w-20 transform -translate-x-1/2 left-1/2 origin-center transition-colors ${isHovered ? 'text-indigo-600 dark:text-indigo-400 z-40' : 'text-slate-500 dark:text-slate-400 z-20'}`}>
                          {item.monthName.split(' ')[0]}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Legend */}
        {selectedSources.includes('all') && (
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-center gap-4 text-xs">
            {activeSources.map(s => (
              <div key={s.id} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-slate-600 dark:text-slate-300 font-semibold">{s.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chart 2: Revenue Distribution Donut Chart */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-2 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 rounded-xl">
            <PieChart className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">
              توزيع الإيرادات حسب المصدر
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              حصة كل قناة وموقع والوظيفة من الصافي
            </p>
          </div>
        </div>

        {/* Donut Graphic */}
        <div className="flex-1 flex flex-col items-center justify-center relative my-2">
          {totalNet > 0 ? (
            <div className="relative w-44 h-44 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                {summary.sourcesBreakdown.map((s) => {
                  if (s.netAmount <= 0) return null;
                  const strokeDasharray = `${(s.percentageOfTotal / 100) * circumference} ${circumference}`;
                  const strokeDashoffset = -accumulatedAngle;
                  accumulatedAngle += (s.percentageOfTotal / 100) * circumference;

                  return (
                    <circle
                      key={s.sourceId}
                      cx="80"
                      cy="80"
                      r={radius}
                      fill="transparent"
                      stroke={s.color}
                      strokeWidth="20"
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      className="transition-all duration-500 hover:opacity-80 cursor-pointer"
                    />
                  );
                })}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
                <span className="text-[10px] font-bold text-slate-400">إجمالي الصافي</span>
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate max-w-[120px]">
                  {formatCurrency(summary.totalNetTry, summary.totalNetUsd)}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs">
              لا توجد إيرادات مسجلة لهذه الفترة
            </div>
          )}
        </div>

        {/* List of sources with percentages */}
        <div className="space-y-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          {summary.sourcesBreakdown.map((s) => (
            <div key={s.sourceId} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                  {s.name}
                </span>
              </div>
              <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                <span>{formatCurrency(s.netAmount, s.netAmountUsd)}</span>
                <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                  {s.percentageOfTotal.toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chart 3: Target vs Actual Comparison Cards */}
      <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">
                مقارنة الصافي المستلم بالأهداف المحددة (قنوات + مواقع + وظيفة)
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                متابعة تدرج الوصول لكل هدف مالية لكل مصدر
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          {summary.sourcesBreakdown.map((s) => {
            const isAchieved = s.targetAchievementRate >= 100;
            return (
              <div
                key={s.sourceId}
                className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[130px]">
                      {s.name}
                    </span>
                  </div>
                  {isAchieved && (
                    <span title="تم تحقيق الهدف المالي">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </span>
                  )}
                </div>

                <div className="my-2 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">الصافي:</span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-100">
                      {formatCurrency(s.netAmount, s.netAmountUsd)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>قبل الضريبة (Gross):</span>
                    <span>{formatCurrency(s.grossAmount, s.grossAmountUsd)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>الهدف:</span>
                    <span>{formatCurrency(s.monthlyTarget)}</span>
                  </div>
                </div>

                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-slate-400">الضريبة: {s.taxRate}%</span>
                    <span style={{ color: s.color }}>{s.targetAchievementRate.toFixed(0)}% من الهدف</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, s.targetAchievementRate)}%`,
                        backgroundColor: s.color
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
