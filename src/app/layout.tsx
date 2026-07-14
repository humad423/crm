import type { Metadata } from 'next';
import { Cairo } from 'next/font/google';
import './globals.css';
import { SalaryProvider } from '../context/SalaryContext';

const cairo = Cairo({
  subsets: ['arabic'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-cairo',
});

export const metadata: Metadata = {
  title: 'حاسبة الرواتب والعمل الإضافي لمصانع تركيا',
  description: 'لوحة تحكم تفاعلية لحساب الرواتب وساعات العمل الإضافية والخصومات بناءً على قانون العمل التركي وقاعدة المقاصة الأسبوعية (Denkleştirme).',
  keywords: 'رواتب تركيا, العمل الإضافي تركيا, قانون العمل التركي, حساب الرواتب, المقاصة الأسبوعية, لوحة تحكم الرواتب, Denkleştirme',
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
          {children}
        </SalaryProvider>
      </body>
    </html>
  );
}
