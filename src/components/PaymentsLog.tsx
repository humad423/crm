import React, { useState } from 'react';
import { useSalary } from '../context/SalaryContext';
import { Landmark, Calendar, Coins, Plus, Trash2, Tag, AlertCircle } from 'lucide-react';

export default function PaymentsLog() {
  const { calculationResult, addPayment, deletePayment, year, month } = useSalary();
  
  // Local form states
  const todayStr = new Date().toISOString().split('T')[0];
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayStr);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 2,
    }).format(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    
    setIsSubmitting(true);
    try {
      await addPayment({
        amount: Number(amount),
        date,
        note: note.trim() || undefined,
      });
      setAmount('');
      setNote('');
    } catch (err) {
      console.error('Failed to add payment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const paymentsList = calculationResult.currentMonthPayments || [];

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4 sm:p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-lg">
          <Landmark className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            سجل الدفعات المستلمة (المدفوعات والسُلف)
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            سجل المبالغ النقدية التي استلمتها خلال هذا الشهر لمطابقتها مع صافي المستحقات.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Add Payment Form */}
        <div className="lg:border-l lg:border-slate-100 lg:dark:border-slate-800/50 lg:pl-8 space-y-4">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
            إضافة دفعة مقبوضة جديدة
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Amount */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-450 dark:text-slate-500 uppercase">
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
              <label className="text-[11px] font-bold text-slate-450 dark:text-slate-500 uppercase">
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
              <label className="text-[11px] font-bold text-slate-450 dark:text-slate-500 uppercase">
                ملاحظات / البيان
              </label>
              <div className="relative">
                <Tag className="absolute right-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="مثال: سلفة أول الشهر / دفعة نقدية"
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
        </div>

        {/* Right Side: Payments List */}
        <div className="lg:col-span-2 flex flex-col">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4">
            الدفعات المستلمة لشهر {month + 1} / {year}
          </h3>

          {paymentsList.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50/50 dark:bg-slate-950/20 border border-dashed border-slate-150 dark:border-slate-850 rounded-xl min-h-[180px]">
              <AlertCircle className="w-8 h-8 text-slate-350 dark:text-slate-600 mb-2" />
              <p className="text-xs text-slate-450 dark:text-slate-500 font-medium">
                لا توجد أي سُلف أو دفعات مسجلة لهذا الشهر بعد.
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-x-auto">
              <table className="w-full border-collapse text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold">
                    <th className="pb-3 text-right">التاريخ</th>
                    <th className="pb-3 text-right">البيان / الملاحظة</th>
                    <th className="pb-3 text-right">المبلغ المستلم</th>
                    <th className="pb-3 text-left">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-850">
                  {paymentsList.map((p) => {
                    const [y, m, d] = p.date.split('-').map(Number);
                    return (
                      <tr key={p.id} className="text-slate-650 dark:text-slate-350 hover:bg-slate-50/40 dark:hover:bg-slate-950/10 transition-colors">
                        <td className="py-3 font-semibold text-slate-700 dark:text-slate-300">{d}/{m}/{y}</td>
                        <td className="py-3">{p.note || '-'}</td>
                        <td className="py-3 font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(p.amount)}
                        </td>
                        <td className="py-3 text-left">
                          <button
                            onClick={() => {
                              if (window.confirm('هل أنت متأكد من رغبتك في حذف هذه الدفعة؟')) {
                                deletePayment(p.id);
                              }
                            }}
                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/25 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                            title="حذف الدفعة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-950/30 rounded-xl flex items-center justify-between text-xs font-bold border border-slate-100 dark:border-slate-850">
                <span className="text-slate-500 dark:text-slate-400">إجمالي المقبوض هذا الشهر:</span>
                <span className="text-emerald-650 dark:text-emerald-400 text-sm">
                  {formatCurrency(calculationResult.totalPaymentsReceived)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
