import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useIncome } from '../../context/IncomeContext';
import { IncomeEntry } from '../../types/income';
import { X, Calendar, DollarSign, CheckCircle2, Clock, Percent, RefreshCw } from 'lucide-react';

interface IncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  entryToEdit?: IncomeEntry | null;
}

export default function IncomeModal({ isOpen, onClose, entryToEdit }: IncomeModalProps) {
  const { sources, addEntry, updateEntry, usdExchangeRate } = useIncome();
  const activeSources = sources.filter(s => s.isActive);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [sourceId, setSourceId] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [grossAmount, setGrossAmount] = useState<string>('');
  const [taxAmount, setTaxAmount] = useState<string>('');
  const [netAmount, setNetAmount] = useState<string>('');
  const [taxRateInput, setTaxRateInput] = useState<string>('0');
  const [exchangeRate, setExchangeRate] = useState<string>(usdExchangeRate.toString());
  const [note, setNote] = useState<string>('');
  const [status, setStatus] = useState<'received' | 'pending'>('received');

  // Selected source default tax rate
  const selectedSource = sources.find(s => s.id === sourceId) || activeSources[0];
  const taxRate = parseFloat(taxRateInput) || 0;

  useEffect(() => {
    if (entryToEdit) {
      setSourceId(entryToEdit.sourceId);
      setDate(entryToEdit.date);
      setGrossAmount(entryToEdit.grossAmount.toString());
      setTaxAmount(entryToEdit.taxAmount.toString());
      setNetAmount(entryToEdit.netAmount.toString());
      const initialTaxRate = entryToEdit.taxRateUsed !== undefined 
        ? entryToEdit.taxRateUsed 
        : (selectedSource?.taxRate ?? 0);
      setTaxRateInput(initialTaxRate.toString());
      setExchangeRate(entryToEdit.exchangeRateUsed ? entryToEdit.exchangeRateUsed.toString() : usdExchangeRate.toString());
      setNote(entryToEdit.note || '');
      setStatus(entryToEdit.status);
    } else {
      const today = new Date();
      // The user records income for the previous month at the start of the current month.
      // So default to the last day of the previous month.
      const lastDayOfPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      
      const y = lastDayOfPrevMonth.getFullYear();
      const m = String(lastDayOfPrevMonth.getMonth() + 1).padStart(2, '0');
      const d = String(lastDayOfPrevMonth.getDate()).padStart(2, '0');

      const defaultSrc = activeSources[0];
      setSourceId(defaultSrc?.id || '');
      setDate(`${y}-${m}-${d}`);
      setGrossAmount('');
      setTaxAmount('');
      setNetAmount('');
      setTaxRateInput((defaultSrc?.taxRate ?? 0).toString());
      setExchangeRate(usdExchangeRate.toString());
      setNote('');
      setStatus('received');
    }
  }, [entryToEdit, isOpen, usdExchangeRate]);

  // Live auto-calculation when Gross amount changes
  const handleGrossChange = (val: string) => {
    setGrossAmount(val);
    const grossVal = parseFloat(val);
    if (!isNaN(grossVal) && grossVal > 0) {
      const calculatedTax = (grossVal * taxRate) / 100;
      const calculatedNet = grossVal - calculatedTax;
      setTaxAmount(calculatedTax.toFixed(2));
      setNetAmount(calculatedNet.toFixed(2));
    } else {
      setTaxAmount('');
      setNetAmount('');
    }
  };

  // Live auto-calculation when Net amount changes directly
  const handleNetChange = (val: string) => {
    setNetAmount(val);
    const netVal = parseFloat(val);
    if (!isNaN(netVal) && netVal > 0) {
      if (taxRate > 0) {
        const grossVal = netVal / (1 - taxRate / 100);
        const calculatedTax = grossVal - netVal;
        setGrossAmount(grossVal.toFixed(2));
        setTaxAmount(calculatedTax.toFixed(2));
      } else {
        setGrossAmount(netVal.toFixed(2));
        setTaxAmount('0');
      }
    }
  };

  // When source changes, update tax rate input and recalculate tax for existing gross
  const handleSourceChange = (newSourceId: string) => {
    setSourceId(newSourceId);
    const src = sources.find(s => s.id === newSourceId);
    const currentTaxRate = src ? src.taxRate : 0;
    setTaxRateInput(currentTaxRate.toString());

    const grossVal = parseFloat(grossAmount);
    if (!isNaN(grossVal) && grossVal > 0) {
      const calculatedTax = (grossVal * currentTaxRate) / 100;
      const calculatedNet = grossVal - calculatedTax;
      setTaxAmount(calculatedTax.toFixed(2));
      setNetAmount(calculatedNet.toFixed(2));
    }
  };

  if (!isOpen || !mounted) return null;

  const currentRate = parseFloat(exchangeRate) || usdExchangeRate;
  const netValNumber = parseFloat(netAmount) || 0;
  const netUsdPreview = currentRate > 0 ? (netValNumber / currentRate).toFixed(2) : '0.00';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceId || !date || !netAmount) return;

    const netVal = parseFloat(netAmount);
    const grossVal = grossAmount ? parseFloat(grossAmount) : netVal;
    const taxVal = taxAmount ? parseFloat(taxAmount) : 0;

    if (entryToEdit) {
      await updateEntry(entryToEdit.id, {
        sourceId,
        date,
        netAmount: netVal,
        grossAmount: grossVal,
        taxAmount: taxVal,
        taxRateUsed: taxRate,
        exchangeRateUsed: currentRate,
        note,
        status
      });
    } else {
      await addEntry({
        sourceId,
        date,
        netAmount: netVal,
        grossAmount: grossVal,
        taxAmount: taxVal,
        taxRateUsed: taxRate,
        exchangeRateUsed: currentRate,
        note,
        status
      });
    }

    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            {entryToEdit ? 'تعديل سجل الإيراد' : 'تسجيل إيراد جديد (قناة / موقع / وظيفة)'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Income Source */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              مصدر الدخل *
            </label>
            <select
              value={sourceId}
              onChange={(e) => handleSourceChange(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {activeSources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.taxRate > 0 ? `ضريبة ${s.taxRate}%` : 'معفى 0%'})
                </option>
              ))}
            </select>
          </div>

          {/* Date & Exchange Rate */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                تاريخ الاستلام *
              </label>
              <input
                type="date" lang="en-GB" dir="ltr"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                سعر صرف اليوم (1$ = TRY)
              </label>
              <input
                type="text" inputMode="decimal" lang="en"
                step="any"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Amounts inputs: Gross, Tax, Net */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
              <span>نسبة الضريبة المعتمدة لهذا السجل (%):</span>
              <div className="flex items-center gap-1">
                <input
                  type="text" inputMode="decimal" lang="en"
                  step="any"
                  value={taxRateInput}
                  onChange={(e) => {
                    setTaxRateInput(e.target.value);
                    const r = parseFloat(e.target.value) || 0;
                    const grossVal = parseFloat(grossAmount);
                    if (!isNaN(grossVal) && grossVal > 0) {
                      const calculatedTax = (grossVal * r) / 100;
                      const calculatedNet = grossVal - calculatedTax;
                      setTaxAmount(calculatedTax.toFixed(2));
                      setNetAmount(calculatedNet.toFixed(2));
                    }
                  }}
                  className="w-16 px-2 py-0.5 bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 rounded-lg text-rose-600 dark:text-rose-400 font-extrabold text-xs text-center focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                <span className="text-rose-500 font-bold">%</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الإجمالي قبل الضريبة (Gross TRY)
                </label>
                <input
                  type="text" inputMode="decimal" lang="en"
                  step="any"
                  value={grossAmount}
                  onChange={(e) => handleGrossChange(e.target.value)}
                  placeholder="مثال: 20000"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                  الصافي المستلم (Net TRY) *
                </label>
                <input
                  type="text" inputMode="decimal" lang="en"
                  step="any"
                  value={netAmount}
                  onChange={(e) => handleNetChange(e.target.value)}
                  placeholder="مثال: 17000"
                  required
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-xl text-slate-800 dark:text-slate-100 font-extrabold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* USD Live Preview Banner with Full Tax & Net Breakdown */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span>قبل الضريبة (Gross USD):</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  ${currentRate > 0 ? ((parseFloat(grossAmount) || netValNumber) / currentRate).toFixed(2) : '0.00'} USD
                </span>
              </div>

              {(parseFloat(taxAmount) || 0) > 0 && (
                <div className="flex items-center justify-between text-rose-500 font-medium">
                  <span>الضريبة المقتطعة ({taxRate}% Tax USD):</span>
                  <span className="font-bold">
                    -${currentRate > 0 ? ((parseFloat(taxAmount) || 0) / currentRate).toFixed(2) : '0.00'} USD
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800">
                <span>الصافي المستلم (Net USD):</span>
                <span>${netUsdPreview} USD</span>
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              حالة القيد
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatus('received')}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition-all ${
                  status === 'received'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>تم الاستلام</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('pending')}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition-all ${
                  status === 'pending'
                    ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-600 dark:text-amber-400'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>قيد الانتظار</span>
              </button>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              ملاحظات أو تفاصيل السجل
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="مثال: أرباح شهر يوليو من AdSense أو ساعات المسائي..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-all"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-500/10 transition-all"
            >
              {entryToEdit ? 'حفظ التعديلات' : 'تسجيل الإيراد'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
