import React, { useState } from 'react';
import { useSalary } from '../context/SalaryContext';
import { KeyRound, User, LogIn, UserPlus, AlertCircle, CalendarDays, Loader2 } from 'lucide-react';

export default function AuthScreen() {
  const { login, signup } = useSalary();
  
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername) {
      setError('يرجى إدخال اسم المستخدم.');
      return;
    }
    if (password.length < 6) {
      setError('يجب أن تكون كلمة المرور مكونة من 6 أحرف على الأقل.');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const { error: loginErr } = await login(cleanUsername, password);
        if (loginErr) {
          if (loginErr.message.includes('Invalid login credentials')) {
            setError('اسم المستخدم أو كلمة المرور غير صحيحة.');
          } else {
            setError(loginErr.message);
          }
        }
      } else {
        const { error: signupErr } = await signup(cleanUsername, password);
        if (signupErr) {
          if (signupErr.message.includes('User already registered')) {
            setError('اسم المستخدم هذا محجوز بالفعل، اختر اسماً آخر.');
          } else {
            setError(signupErr.message);
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      setError('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 font-sans transition-colors duration-300">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-indigo-500/10 dark:bg-indigo-500/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-emerald-500/10 dark:bg-emerald-500/5 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden transition-all duration-300 animate-scale-up">
        {/* Top bar design indicator */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 to-indigo-600" />

        {/* Branding & Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-500/20 mb-4 animate-spin-slow">
            <CalendarDays className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">
            لوحة رواتب عمال تركيا
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 font-medium">
            مزامنة سحابية آمنة لحساب الأجور والعمل الإضافي والخصومات
          </p>
        </div>

        {/* Tabs for Login / Signup */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-955 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => {
              setIsLogin(true);
              setError(null);
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              isLogin
                ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-650'
            }`}
          >
            <LogIn className="w-4 h-4" />
            تسجيل الدخول
          </button>
          <button
            type="button"
            onClick={() => {
              setIsLogin(false);
              setError(null);
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              !isLogin
                ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-655'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            إنشاء حساب جديد
          </button>
        </div>

        {/* Errors view */}
        {error && (
          <div className="mb-5 p-3.5 bg-rose-500/5 dark:bg-rose-500/10 border border-rose-200/50 dark:border-rose-900/30 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-bold flex items-start gap-2.5 animate-fade-in">
            <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider block">
              اسم المستخدم (Username)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4.5 h-4.5" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="مثال: ahmed_2026"
                disabled={loading}
                required
                className="w-full pl-4 pr-11 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-500/30 transition-all font-semibold placeholder-slate-350 dark:placeholder-slate-600"
              />
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed pr-1">
              اسم بسيط باللغة الإنجليزية بدون مسافات للوصول لبياناتك من أي جهاز.
            </p>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider block">
              كلمة المرور (Password)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                <KeyRound className="w-4.5 h-4.5" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                disabled={loading}
                required
                className="w-full pl-4 pr-11 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-850 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-500/30 transition-all font-semibold placeholder-slate-400 dark:placeholder-slate-700"
              />
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 pr-1">
              يجب أن تكون 6 خانات أو أكثر.
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-750 disabled:bg-indigo-500/60 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-500/10 hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4.5 h-4.5 animate-spin" />
                <span>جاري المعالجة...</span>
              </>
            ) : isLogin ? (
              <>
                <LogIn className="w-4.5 h-4.5" />
                <span>تسجيل الدخول للوحة التحكم</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4.5 h-4.5" />
                <span>إنشاء حساب ونسخ البيانات</span>
              </>
            )}
          </button>
        </form>

        {/* Sync Info Footer */}
        <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800/40 text-center">
          <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
            عند إنشاء حساب جديد، سيتم نقل وتخزين كافة أيام العمل الإضافي والرواتب الحالية المسجلة في هذا المتصفح تلقائياً إلى حسابك السحابي!
          </p>
        </div>
      </div>
    </div>
  );
}
