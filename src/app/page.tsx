'use client';
// Build trigger comment to apply Vercel environment variables

import React, { useState, useEffect } from 'react';
import { useSalary } from '../context/SalaryContext';
import MetricCards from '../components/MetricCards';
import SalaryCalendar from '../components/SalaryCalendar';
import SettingsPanel from '../components/SettingsPanel';
import ExceptionModal from '../components/ExceptionModal';
import AuthScreen from '../components/AuthScreen';
import { Settings as SettingsIcon, Sun, Moon, CalendarDays, Plus, HelpCircle, HardDrive, Download, LogOut } from 'lucide-react';
import { generateMonthlyBreakdown } from '../utils/salaryCalculator';
import { exportMonthToCSV } from '../utils/csvExporter';

export default function Home() {
  const { year, month, setMonthYear, settings, exceptions, holidays, calculationResult, isInitialized, user, logout } = useSalary();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const handleExportCSV = () => {
    const dayBreakdowns = generateMonthlyBreakdown(year, month, settings, exceptions, holidays);
    exportMonthToCSV(year, month, months[month], settings, calculationResult, dayBreakdowns);
  };

  // Load and apply theme
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) {
        setTheme(savedTheme as 'light' | 'dark');
        document.documentElement.classList.toggle('dark', savedTheme === 'dark');
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(prefersDark ? 'dark' : 'light');
        document.documentElement.classList.toggle('dark', prefersDark);
      }
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMonthYear(year, Number(e.target.value));
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMonthYear(Number(e.target.value), month);
  };

  // Open exception modal for today
  const handleQuickLog = () => {
    const today = new Date();
    // format today as YYYY-MM-DD
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${d}`);
  };

  const months = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

  const years = [2025, 2026, 2027];

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800/80 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Branding */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-xl shadow-md shadow-indigo-500/10">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 tracking-wide">
                لوحة رواتب عمال تركيا
              </h1>
              <p className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 font-medium">
                حساب الرواتب وساعات الإضافي والمقاصة الأسبوعية
              </p>
            </div>
          </div>

          {/* Utility Tools */}
          <div className="flex items-center gap-2 sm:gap-4">
            
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl transition-all"
              title={theme === 'light' ? 'الوضع المظلم' : 'الوضع المضيء'}
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-amber-400" />}
            </button>

            {/* Settings Trigger */}
            <button
               onClick={() => setIsSettingsOpen(true)}
               className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all"
               title="تعديل الإعدادات والرواتب"
             >
               <SettingsIcon className="w-4 h-4" />
               <span className="hidden sm:inline">الإعدادات</span>
             </button>

             {/* User display & Logout */}
             <div className="flex items-center gap-1.5 sm:gap-2 border-r border-slate-100 dark:border-slate-800/80 pr-2 sm:pr-4 mr-1 sm:mr-2">
               <span className="hidden md:inline text-xs font-bold text-slate-500 dark:text-slate-400">
                 مرحباً، {user?.email?.split('@')[0]}
               </span>
               <button
                 onClick={() => logout()}
                 className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all"
                 title="تسجيل الخروج"
               >
                 <LogOut className="w-5 h-5" />
               </button>
             </div>
           </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
        
        {/* Sub-Header: Month/Year selector and Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm">
          {/* Selectors */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1">الشهر المحاسبي</span>
              <select
                value={month}
                onChange={handleMonthChange}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 font-bold text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {months.map((mName, idx) => (
                  <option key={idx} value={idx} className="dark:bg-slate-900">{mName}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1">السنة</span>
              <select
                value={year}
                onChange={handleYearChange}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 font-bold text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {years.map((y) => (
                  <option key={y} value={y} className="dark:bg-slate-900">{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 self-start sm:self-auto w-full sm:w-auto">
            {/* Quick Log Action */}
            <button
              onClick={handleQuickLog}
              type="button"
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/10 hover:shadow-lg transition-all"
            >
              <Plus className="w-4 h-4" />
              سجل حالة استثنائية اليوم
            </button>

            {/* Export CSV Action */}
            <button
              onClick={handleExportCSV}
              type="button"
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-850/40 transition-all"
            >
              <Download className="w-4 h-4" />
              تصدير الشهر كـ CSV
            </button>
          </div>
        </div>

        {/* 1. Summary Metrics Dashboard */}
        <section aria-label="Statistics Summary">
          <MetricCards />
        </section>

        {/* 2. Interactive Calendar and Weekly Equalization Panel */}
        <section aria-label="Monthly calendar and breakdowns">
          <SalaryCalendar onSelectDate={setSelectedDate} />
        </section>

        {/* 3. Turkish Labor Law Reference Guide */}
        <section aria-label="Labor Law references" className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-4">
            <HelpCircle className="w-5 h-5 text-indigo-500" />
            دليل قواعد الاحتساب وقانون العمل التركي
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            <div className="space-y-2">
              <h3 className="font-bold text-slate-700 dark:text-slate-300">📅 الشهر المحاسبي القياسي</h3>
              <p>
                يُعتبر الشهر المحاسبي لأغراض الأجور والخصومات دائماً <strong>30 يوماً</strong> بغض النظر عن أيام التقويم الفعلية (28 أو 31). يُحتسب خصم غياب اليوم الكامل كأجرة يوم عمل واحدة (الراتب ÷ 30).
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-slate-700 dark:text-slate-300">⏱️ ساعات العمل الشهرية</h3>
              <p>
                مجموع ساعات العمل الشهرية المعتمدة هي <strong>225 ساعة</strong>. تُحسب أجرة الساعة العادية بقسمة الراتب الأساسي على 225. يُحسب خصم ساعات التأخير بضرب ساعات التأخر في أجرة الساعة العادية.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-slate-700 dark:text-slate-300">⚖️ قاعدة المقاصة الأسبوعية (Denkleştirme)</h3>
              <p>
                لا تُدفع علاوة الإضافي (1.5x أو 2x) إلا بعد استيفاء <strong>45 ساعة عمل أسبوعية</strong>. أي غياب أو تأخير خلال الأسبوع يُغظى أولاً بساعات العمل الإضافية أو عطلة نهاية الأسبوع وتُدفع بمعدل عادي (1x) لتعويض النقص.
              </p>
            </div>
          </div>
        </section>

      </main>

      {/* Floating Action Panels */}
      <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      
      <ExceptionModal dateStr={selectedDate} onClose={() => setSelectedDate(null)} />

      {/* Footer */}
      <footer className="mt-auto py-6 border-t border-slate-100 dark:border-slate-900/60 bg-white dark:bg-slate-950 transition-colors text-center text-xs text-slate-400 dark:text-slate-655">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-center gap-2">
          <HardDrive className="w-3.5 h-3.5" />
          <span>يتم حفظ جميع البيانات محلياً في متصفحك (LocalStorage).</span>
        </div>
      </footer>

    </div>
  );
}
