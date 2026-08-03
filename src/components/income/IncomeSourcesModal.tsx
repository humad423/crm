'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useIncome } from '../../context/IncomeContext';
import { IncomeSource, IncomeCategory } from '../../types/income';
import { X, Plus, Edit2, Trash2, Check, Target, Palette, Percent } from 'lucide-react';

interface IncomeSourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORY_NAMES: Record<IncomeCategory, string> = {
  salary: 'الراتب الوظيفي / المسائي',
  youtube: 'قناة يوتيوب (YouTube)',
  website: 'موقع إلكتروني (Website)',
  freelance: 'عمل حر',
  investment: 'استثمار وتقنية',
  side_project: 'مشروع جانبي',
  other: 'أخرى'
};

const COLOR_PRESETS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#f97316', // orange
  '#a855f7', // purple
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#f59e0b', // amber
  '#ec4899'  // pink
];

export default function IncomeSourcesModal({ isOpen, onClose }: IncomeSourcesModalProps) {
  const { sources, addSource, updateSource, deleteSource } = useIncome();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<IncomeCategory>('youtube');
  const [color, setColor] = useState('#ef4444');
  const [monthlyTarget, setMonthlyTarget] = useState('');
  const [taxRate, setTaxRate] = useState('15');

  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen || !mounted) return null;

  const startEdit = (source: IncomeSource) => {
    setEditingId(source.id);
    setName(source.name);
    setCategory(source.category);
    setColor(source.color);
    setMonthlyTarget(source.monthlyTarget.toString());
    setTaxRate(source.taxRate.toString());
    setIsCreating(false);
  };

  const startCreate = () => {
    setEditingId(null);
    setName('');
    setCategory('youtube');
    setColor('#ef4444');
    setMonthlyTarget('15000');
    setTaxRate('15');
    setIsCreating(true);
  };

  const cancelEditOrCreate = () => {
    setEditingId(null);
    setIsCreating(false);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    const targetVal = parseFloat(monthlyTarget) || 0;
    const taxVal = parseFloat(taxRate) || 0;

    if (isCreating) {
      await addSource({
        name,
        category,
        color,
        monthlyTarget: targetVal,
        taxRate: taxVal,
        isActive: true
      });
    } else if (editingId) {
      await updateSource(editingId, {
        name,
        category,
        color,
        monthlyTarget: targetVal,
        taxRate: taxVal
      });
    }

    cancelEditOrCreate();
  };

  const toggleSourceActive = async (source: IncomeSource) => {
    await updateSource(source.id, { isActive: !source.isActive });
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-scale-up max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">
              إدارة القنوات، المواقع، ونسب الضريبة (15%)
            </h3>
            <p className="text-xs text-slate-400">
              تخصيص أسماء وألوان وأهداف الإيراد الشهرية ونسبة الضريبة
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 space-y-4 pr-1 text-xs">
          
          {/* Create or Edit Form Box */}
          {(isCreating || editingId) && (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/70 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-3">
              <h4 className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                {isCreating ? 'إضافة قناة أو موقع أو مصدر دخل جديد' : 'تعديل بيانات المصدر'}
              </h4>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  اسم المصدر أو القناة *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: قناة جديدة أو موقع رابع..."
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    التصنيف
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as IncomeCategory)}
                    className="w-full px-2 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 font-medium"
                  >
                    {Object.entries(CATEGORY_NAMES).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    الهدف الشهري (TRY)
                  </label>
                  <input
                    type="text" inputMode="decimal" lang="en"
                    value={monthlyTarget}
                    onChange={(e) => setMonthlyTarget(e.target.value)}
                    placeholder="مثال: 15000"
                    className="w-full px-2 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    نسبة الضريبة (%)
                  </label>
                  <input
                    type="text" inputMode="decimal" lang="en"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    placeholder="مثال: 15"
                    className="w-full px-2 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 font-bold text-rose-600 dark:text-rose-400"
                  />
                </div>
              </div>

              {/* Color Selector */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  لون المصدر في الرسم البياني
                </label>
                <div className="flex items-center gap-2">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                        color === c ? 'ring-2 ring-emerald-500 scale-110' : 'opacity-80 hover:opacity-100'
                      }`}
                    >
                      {color === c && <Check className="w-3 h-3 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={cancelEditOrCreate}
                  className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
                >
                  حفظ
                </button>
              </div>
            </div>
          )}

          {/* Create trigger */}
          {!isCreating && !editingId && (
            <button
              onClick={startCreate}
              className="w-full py-2.5 px-4 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-dashed border-emerald-300 dark:border-emerald-800 rounded-xl font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة قناة أو موقع إلكتروني جديد</span>
            </button>
          )}

          {/* List of Sources */}
          <div className="space-y-2">
            {sources.map((source) => (
              <div
                key={source.id}
                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl hover:border-slate-200 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0"
                    style={{ backgroundColor: source.color }}
                  />
                  <div>
                    <h5 className="font-bold text-slate-800 dark:text-slate-100">
                      {source.name}
                    </h5>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <span>{CATEGORY_NAMES[source.category] || source.category}</span>
                      <span>•</span>
                      <span>الهدف: {source.monthlyTarget.toLocaleString()} TRY</span>
                      <span>•</span>
                      <span className={source.taxRate > 0 ? 'text-rose-500 font-bold' : 'text-emerald-500 font-bold'}>
                        {source.taxRate > 0 ? `ضريبة ${source.taxRate}%` : 'معفى 0%'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleSourceActive(source)}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-lg transition-all ${
                      source.isActive
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                    }`}
                  >
                    {source.isActive ? 'نشط' : 'معطل'}
                  </button>

                  <button
                    onClick={() => startEdit(source)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg"
                    title="تعديل"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {sources.length > 1 && (
                    <button
                      onClick={() => deleteSource(source.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                      title="حذف المصدر"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-right shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 text-white rounded-xl font-bold text-xs"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
