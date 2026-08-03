'use client';

import React, { useState, useMemo } from 'react';
import { useIncome } from '../../context/IncomeContext';
import { IncomeEntry } from '../../types/income';
import {
  Search, Filter, Plus, Edit2, Trash2, FileSpreadsheet,
  CheckCircle2, Clock, Calendar, DollarSign, Percent,
  LayoutList, CalendarDays, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Globe2
} from 'lucide-react';

interface IncomeLogTableProps {
  onOpenAddModal: () => void;
  onOpenEditModal: (entry: IncomeEntry) => void;
}

const PAGE_SIZES = [10, 25, 50, 100];

export default function IncomeLogTable({ onOpenAddModal, onOpenEditModal }: IncomeLogTableProps) {
  const { entries, sources, dateFilterFrom, dateFilterTo, deleteEntry, displayCurrency, usdExchangeRate } = useIncome();

  // View mode: 'current' = current dashboard date range, 'all' = all records with custom date range
  const [viewMode, setViewMode] = useState<'current' | 'all'>('current');

  // Date range filter (for viewAll mode)
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'received' | 'pending'>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const formatCurrency = (tryAmount: number, usdAmount?: number) => {
    if (displayCurrency === 'USD') {
      const val = usdAmount !== undefined ? usdAmount : tryAmount / usdExchangeRate;
      return '$' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) + ' USD';
    }
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(tryAmount) + ' TRY';
  };

  // Sort entries by date descending
  const sortedEntries = useMemo(() =>
    [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [entries]
  );

  // Apply filters
  const filteredEntries = useMemo(() => {
    return sortedEntries.filter((e) => {
      const entryDate = new Date(e.date);

      if (viewMode === 'current') {
        if (e.date < dateFilterFrom || e.date > dateFilterTo) return false;
      } else {
        if (dateFrom) {
          const from = new Date(dateFrom);
          if (entryDate < from) return false;
        }
        if (dateTo) {
          const to = new Date(dateTo);
          to.setHours(23, 59, 59);
          if (entryDate > to) return false;
        }
      }

      if (selectedSourceFilter !== 'all' && e.sourceId !== selectedSourceFilter) return false;
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;

      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        const source = sources.find(s => s.id === e.sourceId);
        const sourceName = source ? source.name.toLowerCase() : '';
        const note = (e.note || '').toLowerCase();
        const amountStr = e.netAmount.toString();
        return sourceName.includes(term) || note.includes(term) || amountStr.includes(term) || e.date.includes(term);
      }

      return true;
    });
  }, [sortedEntries, viewMode, dateFilterFrom, dateFilterTo, dateFrom, dateTo, selectedSourceFilter, statusFilter, searchTerm, sources]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pagedEntries = filteredEntries.slice((safePage - 1) * pageSize, safePage * pageSize);

  const goToPage = (p: number) => setCurrentPage(Math.max(1, Math.min(p, totalPages)));
  const resetPage = () => setCurrentPage(1);

  // Totals for ALL filtered records (across all pages)
  const totalFilteredNetTry = filteredEntries.reduce((sum, e) => sum + e.netAmount, 0);
  const totalFilteredNetUsd = filteredEntries.reduce((sum, e) => sum + e.netAmountUsd, 0);
  const totalFilteredTaxTry = filteredEntries.reduce((sum, e) => sum + e.taxAmount, 0);
  const totalFilteredTaxUsd = filteredEntries.reduce((sum, e) => sum + (e.taxAmount / (e.exchangeRateUsed || usdExchangeRate || 1)), 0);


  // CSV Export
  const handleExportCSV = () => {
    const headers = ['التاريخ', 'مصدر الدخل', 'الإجمالي (TRY)', 'الضريبة (TRY)', 'الصافي (TRY)', 'المعادل بالدولار ($ USD)', 'سعر الصرف', 'الحالة', 'ملاحظات'];
    const rows = filteredEntries.map((e) => {
      const s = sources.find(src => src.id === e.sourceId);
      return [
        e.date,
        s ? s.name : 'غير محدد',
        e.grossAmount,
        e.taxAmount,
        e.netAmount,
        e.netAmountUsd,
        e.exchangeRateUsed,
        e.status === 'received' ? 'مستلم' : 'قيد الانتظار',
        `"${(e.note || '').replace(/"/g, '""')}"`
      ];
    });
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', viewMode === 'all' ? 'income_log_all.csv' : `income_log_${dateFilterFrom}_to_${dateFilterTo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            سجل إيرادات القنوات والمواقع والوظيفة
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            استعراض وتفصيل الإجمالي، الضريبة (15%)، والصافي بالليرة والدولار
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View mode toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 gap-1">
            <button
              onClick={() => { setViewMode('current'); resetPage(); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'current'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              النطاق المحدد
            </button>
            <button
              onClick={() => { setViewMode('all'); resetPage(); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'all'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <Globe2 className="w-3.5 h-3.5" />
              كل السجلات
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all"
            title="تصدير السجل إلى Excel CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>تصدير CSV</span>
          </button>

          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/10 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>سجل دخل جديد</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); resetPage(); }}
            placeholder="بحث بالملاحظة، القناة، أو المبلغ..."
            className="w-full pr-9 pl-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedSourceFilter}
            onChange={(e) => { setSelectedSourceFilter(e.target.value); resetPage(); }}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          >
            <option value="all">كافة المصادر (قنوات + مواقع + وظيفة)</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as any); resetPage(); }}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          >
            <option value="all">كافة الحالات (مستلم + انتظار)</option>
            <option value="received">المستلم فقط (Received)</option>
            <option value="pending">قيد الانتظار (Pending)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <LayoutList className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); resetPage(); }}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          >
            {PAGE_SIZES.map(s => <option key={s} value={s}>{s} سجل في الصفحة</option>)}
          </select>
        </div>
      </div>

      {/* Date range filter — only in 'all' mode */}
      {viewMode === 'all' && (
        <div className="flex flex-wrap items-center gap-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl px-4 py-3">
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            تصفية بالتاريخ:
          </span>
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">من:</label>
              <input
                type="date" lang="en-GB" dir="ltr"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); resetPage(); }}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">إلى:</label>
              <input
                type="date" lang="en-GB" dir="ltr"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); resetPage(); }}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); resetPage(); }}
                className="text-xs text-rose-500 hover:text-rose-700 font-bold px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all"
              >
                مسح التاريخ ✕
              </button>
            )}
          </div>
          <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold">
            {filteredEntries.length} سجل متطابق من أصل {entries.length}
          </span>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
        <table className="w-full text-right text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
            <tr>
              <th className="p-3">التاريخ</th>
              <th className="p-3">مصدر الدخل</th>
              <th className="p-3">الإجمالي (Gross)</th>
              <th className="p-3">الضريبة (15%)</th>
              <th className="p-3">الصافي المستلم (Net)</th>
              <th className="p-3">المعادل بالدولار ($ USD)</th>
              <th className="p-3">الوصف والملاحظات</th>
              <th className="p-3">الحالة</th>
              <th className="p-3 text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
            {pagedEntries.length > 0 ? (
              pagedEntries.map((entry) => {
                const source = sources.find((s) => s.id === entry.sourceId);
                return (
                  <tr key={entry.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-semibold whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{entry.date}</span>
                      </div>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: source ? source.color : '#94a3b8' }} />
                        <span className="font-bold">{source ? source.name : 'غير محدد'}</span>
                      </div>
                    </td>
                    <td className="p-3 font-bold whitespace-nowrap text-slate-700 dark:text-slate-300">
                      {displayCurrency === 'USD'
                        ? `$${(entry.grossAmountUsd ?? ((entry.grossAmount ?? entry.netAmount) / (entry.exchangeRateUsed || usdExchangeRate))).toFixed(2)} USD`
                        : `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(entry.grossAmount ?? entry.netAmount)} TRY`}
                    </td>
                    <td className="p-3 whitespace-nowrap text-rose-500 font-bold">
                      {(entry.taxAmount ?? 0) > 0 ? (
                        <div className="flex flex-col">
                          <span className="inline-flex items-center gap-1">
                            <Percent className="w-3 h-3" />
                            {displayCurrency === 'USD'
                              ? `-$${((entry.taxAmount ?? 0) / (entry.exchangeRateUsed || usdExchangeRate)).toFixed(2)} USD`
                              : `-${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(entry.taxAmount)} TRY`}
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            مستقطع {entry.taxRateUsed !== undefined ? entry.taxRateUsed : (source ? source.taxRate : 0)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-normal">معفى (0%)</span>
                      )}
                    </td>
                    <td className="p-3 font-extrabold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      {displayCurrency === 'USD'
                        ? `$${(entry.netAmountUsd ?? (entry.netAmount / (entry.exchangeRateUsed || usdExchangeRate))).toFixed(2)} USD`
                        : `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(entry.netAmount)} TRY`}
                    </td>
                    <td className="p-3 font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                      {displayCurrency === 'USD' ? (
                        <span>
                          {new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(entry.netAmount)} TRY
                          <span className="text-[10px] text-slate-400 block font-normal">@ {entry.exchangeRateUsed || usdExchangeRate} TRY/$</span>
                        </span>
                      ) : (
                        <div>
                          <span>${(entry.netAmountUsd ?? (entry.netAmount / (entry.exchangeRateUsed || usdExchangeRate))).toFixed(2)} USD</span>
                          {(entry.taxAmount ?? 0) > 0 && (
                            <span className="text-[10px] text-slate-400 block font-normal">
                              قبل الضريبة: ${(entry.grossAmountUsd ?? ((entry.grossAmount ?? entry.netAmount) / (entry.exchangeRateUsed || usdExchangeRate))).toFixed(2)}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="p-3 max-w-[200px] truncate text-slate-500 dark:text-slate-400">{entry.note || '-'}</td>
                    <td className="p-3 whitespace-nowrap">
                      {entry.status === 'received' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3 h-3" />تم الاستلام
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                          <Clock className="w-3 h-3" />قيد الانتظار
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onOpenEditModal(entry)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                          title="تعديل القيد"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteEntry(entry.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                          title="حذف القيد"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={9} className="p-8 text-center text-slate-400 text-xs">
                  {viewMode === 'all' ? 'لا توجد سجلات مطابقة للفلاتر المحددة.' : 'لا توجد سجلات إيرادات مطابقة للشروط المسجلة لهذه الفترة.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filteredEntries.length > pageSize && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            عرض {((safePage - 1) * pageSize) + 1} – {Math.min(safePage * pageSize, filteredEntries.length)} من {filteredEntries.length} سجل
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => goToPage(1)} disabled={safePage === 1} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all" title="أول صفحة">
              <ChevronsRight className="w-4 h-4" />
            </button>
            <button onClick={() => goToPage(safePage - 1)} disabled={safePage === 1} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all" title="الصفحة السابقة">
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let page: number;
                if (totalPages <= 5) { page = i + 1; }
                else if (safePage <= 3) { page = i + 1; }
                else if (safePage >= totalPages - 2) { page = totalPages - 4 + i; }
                else { page = safePage - 2 + i; }
                return (
                  <button
                    key={page}
                    onClick={() => goToPage(page)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                      page === safePage
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>

            <button onClick={() => goToPage(safePage + 1)} disabled={safePage === totalPages} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all" title="الصفحة التالية">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => goToPage(totalPages)} disabled={safePage === totalPages} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all" title="آخر صفحة">
              <ChevronsLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Table Footer Totals */}
      {filteredEntries.length > 0 && (
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pt-3 text-xs font-bold text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800">
          <span>عدد القيود المعروضة: {filteredEntries.length} سجل</span>
          <div className="flex items-center gap-5 flex-wrap">
            <div className="flex items-center gap-1.5 text-rose-500 bg-rose-50 dark:bg-rose-950/30 px-3 py-1.5 rounded-lg border border-rose-100 dark:border-rose-900/50">
              <span>إجمالي الضريبة:</span>
              <span dir="ltr">{new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(totalFilteredTaxTry)} TRY</span>
              <span className="text-rose-300 dark:text-rose-700/50">|</span>
              <span dir="ltr">${totalFilteredTaxUsd.toFixed(2)} USD</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 rounded-lg border border-emerald-100 dark:border-emerald-900/50">
              <span>إجمالي الصافي:</span>
              <span dir="ltr">{new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(totalFilteredNetTry)} TRY</span>
              <span className="text-emerald-300 dark:text-emerald-800/50">|</span>
              <span dir="ltr">${totalFilteredNetUsd.toFixed(2)} USD</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
