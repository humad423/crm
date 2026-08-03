'use client';

import React from 'react';
import { MonthlyIncomeSummary } from '../../types/income';
import { Lightbulb, AlertTriangle, ShieldCheck, Zap, ArrowUpRight, CheckCircle } from 'lucide-react';

interface IncomeInsightsCardProps {
  summary: MonthlyIncomeSummary;
}

export default function IncomeInsightsCard({ summary }: IncomeInsightsCardProps) {
  // Find highest single source percentage
  const maxSource = summary.sourcesBreakdown.reduce((max, s) => (s.percentageOfTotal > max.percentageOfTotal ? s : max), summary.sourcesBreakdown[0] || { percentageOfTotal: 0 });
  const concentrationRisk = maxSource ? maxSource.percentageOfTotal : 0;

  // Active sources with income vs zero income
  const activeIncomeSources = summary.sourcesBreakdown.filter(s => s.netAmount > 0);
  const totalActiveSourcesCount = activeIncomeSources.length;

  // Calculate Health / Diversity Score out of 100
  let diversityScore = 100;
  if (totalActiveSourcesCount <= 1) {
    diversityScore = 40;
  } else if (concentrationRisk > 70) {
    diversityScore = 60;
  } else if (concentrationRisk > 50) {
    diversityScore = 80;
  }

  // Generate dynamic recommendations based on current numbers
  const getInsights = () => {
    const insights: Array<{ title: string; desc: string; type: 'warning' | 'tip' | 'success' }> = [];

    if (totalActiveSourcesCount <= 1) {
      insights.push({
        title: 'مخاطر الاعتماد على مصدر دخل واحد',
        desc: 'أكثر من 90% من دخلك يعتمد على مصدر فرعي واحد. يُنصح بالتركيز على تفعيل وتطوير الأنشطة الحرة أو الاستثمارية لرفع أمانك المالي.',
        type: 'warning'
      });
    } else if (concentrationRisk > 65) {
      insights.push({
        title: `تركيز إيرادات عالي في (${maxSource.name})`,
        desc: `يشكل (${maxSource.name}) نسبة ${concentrationRisk.toFixed(0)}% من إجمالي الدخل. حاول زيادة حصة المصادر الثانوية لتوزيع المخاطر.`,
        type: 'warning'
      });
    } else {
      insights.push({
        title: 'تنوع واستقرار عالي في مصادر الدخل',
        desc: 'ممتاز! مصادر دخلك تتوزع بشكل متوازن، مما يمنحك أماناً مالياً واستقراراً أمام أي تغيرات مفاجئة.',
        type: 'success'
      });
    }

    if (summary.overallTargetAchievement < 80) {
      insights.push({
        title: 'تحسين معدل الوصول للهدف للفترة',
        desc: `حققت حتى الآن ${summary.overallTargetAchievement.toFixed(0)}% من هدفك المالي. ركز على الخدمات الأكثر ربحية في العمل الحر والمشاريع الجانبية لسد الفجوة.`,
        type: 'tip'
      });
    } else if (summary.overallTargetAchievement >= 100) {
      insights.push({
        title: 'تم تجاوز الهدف المالي المحدد لهذه الفترة 🎉',
        desc: 'أنجزت الهدف المالي بالكامل! خذ بعين الاعتبار توجيه الفائض إلى المحفظة الاستثمارية أو إعادة الاستثمار في المشاريع الجانبية.',
        type: 'success'
      });
    }

    // Lowest performing source hint
    const lowSource = summary.sourcesBreakdown
      .filter(s => s.monthlyTarget > 0)
      .sort((a, b) => a.targetAchievementRate - b.targetAchievementRate)[0];

    if (lowSource && lowSource.targetAchievementRate < 50) {
      insights.push({
        title: `فرصة نمو مهدورة في: ${lowSource.name}`,
        desc: `تحقيق ${lowSource.name} يعادل ${lowSource.targetAchievementRate.toFixed(0)}% فقط من هدفه. قم بمراجعة أسباب التعثر وحسّن التسويق أو تسعير الخدمات الخاصة به.`,
        type: 'tip'
      });
    }

    return insights;
  };

  const insights = getInsights();

  return (
    <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-5 sm:p-6 shadow-xl border border-indigo-800/40 relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-indigo-800/50 pb-5 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-600/30 text-indigo-300 rounded-2xl border border-indigo-500/30 shadow-inner">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-wide">
              تحليلات وتوصيات تسريع النمو المالي
            </h3>
            <p className="text-xs text-indigo-200/70">
              تقييم ذكي لمؤشر التنوع وفرص مضاعفة صافي الأرباح
            </p>
          </div>
        </div>

        {/* Diversity Health Index Badge */}
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-xl backdrop-blur-md">
          <div className="text-right">
            <p className="text-[10px] text-indigo-200/80 font-bold">مؤشر أمان وتنوع الدخل</p>
            <p className="text-sm font-extrabold text-indigo-300">{diversityScore} / 100</p>
          </div>
          <div
            className={`w-3 h-3 rounded-full ${
              diversityScore >= 80 ? 'bg-emerald-400 animate-pulse' : diversityScore >= 60 ? 'bg-amber-400' : 'bg-rose-400'
            }`}
          />
        </div>
      </div>

      {/* Recommendations Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {insights.map((item, idx) => (
          <div
            key={idx}
            className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 flex flex-col justify-between hover:bg-white/10 transition-all"
          >
            <div>
              <div className="flex items-center gap-2 mb-2">
                {item.type === 'warning' && (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                )}
                {item.type === 'tip' && (
                  <Lightbulb className="w-4 h-4 text-indigo-300 shrink-0" />
                )}
                {item.type === 'success' && (
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <h4 className="text-xs font-bold text-indigo-100">{item.title}</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
