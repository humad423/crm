import type { Metadata } from 'next';
import { Cairo } from 'next/font/google';
import './globals.css';
import { SalaryProvider } from '../context/SalaryContext';
import { IncomeProvider } from '../context/IncomeContext';

const cairo = Cairo({
  subsets: ['arabic'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-cairo',
});

export const metadata: Metadata = {
  title: 'حاسبة الرواتب وتتبع نمو الإيرادات الشخصية',
  description: 'لوحة تحكم تفاعلية لحساب الرواتب وتتبع نمو الإيرادات ومصادر الدخل الشخصية.',
  keywords: 'رواتب تركيا, العمل الإضافي, إيرادات شخصية, مصادر الدخل, نمو الإيرادات, Denkleştirme',
  authors: [{ name: 'Antigravity Developer' }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 font-sans transition-colors duration-300 flex flex-col">
        <SalaryProvider>
          <IncomeProvider>
            {children}
          </IncomeProvider>
        </SalaryProvider>
      </body>
    </html>
  );
}
