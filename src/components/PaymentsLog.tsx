'use client';
import React, { useState, useMemo } from 'react';
import { useSalary } from '../context/SalaryContext';
import {
  Landmark, Calendar, Coins, Plus, Trash2, Tag, AlertCircle,
  Pencil, Check, X, Search, ChevronDown,
} from 'lucide-react';

type FilterMode = 'all' | 'month';

interface EditingState {
  id: string;
  amount: string;
  date: string;
  note: string;
}

export default function PaymentsLog() {
  const {
    payments,
    addPayment,
    deletePayment,
    updatePayment,
    year,
    month,
  } = useSalary();

  // ─── Add form state ───────────────────────────────────────────
  const todayStr = new Date().toISOString().split('T')[0];
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayStr);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ─── Filter / search state ────────────────────────────────────
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [searchText, setSearchText] = useState('');

  // ─── Edit state ───────────────────────────────────────────────
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // ─── Helpers ──────────────────────────────────────────────────
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 2,
    }).format(val);

  // ─── Filtered + searched list ─────────────────────────────────
  const filteredPayments = useMemo(() => {
    let list = [...payments];

    if (filterMode === 'month') {
      list = list.filter((p) => {
        const [py, pm] = p.date.split('-').map(Number);
        return py === year && pm - 1 === month;
      });
    }

    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      list = list.filter(
        (p) =>
          (p.note || '').toLowerCase().includes(q) ||
          p.date.includes(q) ||
          String(p.amount).includes(q)
      );
    }

    // Sort newest first
    return list.sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [payments, filterMode, month, year, searchText]);

  const totalFiltered = filteredPayments.reduce((s, p) => s + p.amount, 0);
  const totalAll = payments.reduce((s, p) => s + p.amount, 0);

  // ─── Add handler ──────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    setIsSubmitting(true);
    try {
      await addPayment({ amount: Number(amount), date, note: note.trim() || undefined });
      setAmount('');
      setNote('');
      setDate(todayStr);
    } catch (err) {
      console.error('Failed to add payment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Edit handlers ────────────────────────────────────────────
  const startEdit = (p: { id: string; amount: number; date: string; note?: string }) => {
    setEditing({ id: p.id, amount: String(p.amount), date: p.date, note: p.note || '' });
  };

  const cancelEdit = () => setEditing(null);

  const saveEdit = async () => {
    if (!editing || !editing.amount || Number(editing.amount) <= 0) return;
    setIsSavingEdit(true);
    try {
      await updatePayment(editing.id, {
        amount: Number(editing.amount),
        date: editing.date,
        note: editing.note.trim() || undefined,
      });
      setEditing(null);
    } catch (err) {
      console.error('Failed to update payment:', err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4 sm:p-6 shadow-sm">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-lg">
          <Landmark className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            سجل المدفوعات والسُلف
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            جميع الدفعات المستلمة — يمكنك إضافة وتعديل وحذف أي سجل.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── Left: Add Form ──────────────────────────────── */}
        <div className="lg:border-l lg:border-slate-100 lg:dark:border-slate-800/50 lg:pl-8 space-y-4">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
            إضافة دفعة جديدة
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Amount */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase">
                قيمة الدفعة (TRY)
              </label>
              <div className="relative">
                <Coins className="absolute right-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="مثال: 5000"
                  required
                  min="1"
                  className="w-full pr-10 pl-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-500/30 transition-all font-semibold text-sm"
                />
              </div>
            </div>

            {/* Date */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase">
                تاريخ الاستلام
              </label>
              <div className="relative">
                <Calendar className="absolute right-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full pr-10 pl-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-500/30 transition-all font-semibold text-sm"
                />
              </div>
            </div>

            {/* Note */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase">
                ملاحظات / البيان
              </label>
              <div className="relative">
                <Tag className="absolute right-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="مثال: سلفة / دفعة نقدية"
                  className="w-full pr-10 pl-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-500/30 transition-all text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/10"
            >
              <Plus className="w-4 h-4" />
              {isSubmitting ? 'جاري الحفظ...' : 'تسجيل الدفعة'}
            </button>
          </form>

          {/* Total all-time */}
          <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-950/30 rounded-xl border border-slate-100 dark:border-slate-850 text-xs">
            <div className="flex justify-between font-bold mb-1">
              <span className="text-slate-500">إجمالي المقبوض (الكل):</span>
              <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(totalAll)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>عدد السجلات:</span>
              <span>{payments.length}</span>
            </div>
          </div>
        </div>

        {/* ── Right: Payments Table ───────────────────────── */}
        <div className="lg:col-span-2 flex flex-col">

          {/* Toolbar: Filter + Search */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {/* Filter toggle */}
            <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 text-xs font-bold">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1.5 transition-colors ${filterMode === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                الكل ({payments.length})
              </button>
              <button
                onClick={() => setFilterMode('month')}
                className={`px-3 py-1.5 transition-colors border-r border-slate-200 dark:border-slate-800 ${filterMode === 'month' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                هذا الشهر
              </button>
            </div>

            {/* Search */}
            <div className="relative flex-1 min-w-[140px]">
              <Search className="absolute right-3 top-2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="بحث..."
                className="w-full pr-8 pl-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
            </div>

            {/* Filtered total */}
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
              {formatCurrency(totalFiltered)}
            </span>
          </div>

          {/* Table */}
          {filteredPayments.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50/50 dark:bg-slate-950/20 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl min-h-[180px]">
              <AlertCircle className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                لا توجد سجلات تطابق الفلتر الحالي.
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-x-auto">
              <table className="w-full border-collapse text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold">
                    <th className="pb-3 text-right">التاريخ</th>
                    <th className="pb-3 text-right">البيان</th>
                    <th className="pb-3 text-right">المبلغ</th>
                    <th className="pb-3 text-center w-16">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {filteredPayments.map((p) => {
                    const isEditingThis = editing?.id === p.id;
                    const [py, pm, pd] = p.date.split('-').map(Number);

                    return (
                      <tr
                        key={p.id}
                        className={`hover:bg-slate-50/40 dark:hover:bg-slate-950/10 transition-colors ${isEditingThis ? 'bg-indigo-50/40 dark:bg-indigo-950/10' : ''}`}
                      >
                        {/* Date cell */}
                        <td className="py-2.5 font-semibold text-slate-700 dark:text-slate-300 w-28">
                          {isEditingThis ? (
                            <input
                              type="date"
                              value={editing.date}
                              onChange={(e) => setEditing({ ...editing, date: e.target.value })}
                              className="w-full px-2 py-1 rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                          ) : (
                            `${pd}/${pm}/${py}`
                          )}
                        </td>

                        {/* Note cell */}
                        <td className="py-2.5 text-slate-500 dark:text-slate-400">
                          {isEditingThis ? (
                            <input
                              type="text"
                              value={editing.note}
                              onChange={(e) => setEditing({ ...editing, note: e.target.value })}
                              placeholder="ملاحظة..."
                              className="w-full px-2 py-1 rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                          ) : (
                            p.note || <span className="text-slate-300 dark:text-slate-600">—</span>
                          )}
                        </td>

                        {/* Amount cell */}
                        <td className="py-2.5 font-bold text-emerald-600 dark:text-emerald-400 w-36">
                          {isEditingThis ? (
                            <input
                              type="number"
                              value={editing.amount}
                              min="1"
                              onChange={(e) => setEditing({ ...editing, amount: e.target.value })}
                              className="w-full px-2 py-1 rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                          ) : (
                            formatCurrency(p.amount)
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 text-center">
                          {isEditingThis ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={saveEdit}
                                disabled={isSavingEdit}
                                className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 rounded-lg transition-colors"
                                title="حفظ"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 rounded-lg transition-colors"
                                title="إلغاء"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => startEdit(p)}
                                className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/25 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors"
                                title="تعديل"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm('هل أنت متأكد من حذف هذه الدفعة؟')) {
                                    deletePayment(p.id);
                                  }
                                }}
                                className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/25 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                                title="حذف"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
