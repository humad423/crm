export type IncomeCategory = 'salary' | 'youtube' | 'website' | 'freelance' | 'investment' | 'side_project' | 'other';

export interface IncomeSource {
  id: string;
  name: string;
  category: IncomeCategory;
  color: string; // Hex color
  icon?: string;
  monthlyTarget: number; // Target net income per month in TRY
  taxRate: number; // e.g. 15 for 15% tax, 0 for 0%
  isActive: boolean;
  createdAt: string;
}

export interface IncomeEntry {
  id: string;
  sourceId: string;
  date: string; // YYYY-MM-DD
  netAmount: number; // Net income received in TRY (الدخل الصافي)
  grossAmount: number; // Gross income before tax & expenses in TRY (قبل الضريبة)
  taxAmount: number; // Tax deducted in TRY (مبلغ الضريبة)
  taxRateUsed?: number; // Tax rate % locked at the time of entry (e.g. 0, 15)
  expenses?: number; // Direct expenses in TRY
  exchangeRateUsed: number; // TRY per 1 USD at the time of entry (or current rate)
  netAmountUsd: number; // Net income in USD ($)
  grossAmountUsd: number; // Gross income in USD ($)
  note?: string;
  status: 'received' | 'pending';
  createdAt: string;
}

export interface SourceSummary {
  sourceId: string;
  name: string;
  category: IncomeCategory;
  color: string;
  taxRate: number;
  netAmount: number; // TRY
  grossAmount: number; // TRY
  taxAmount: number; // TRY
  netAmountUsd: number; // USD
  grossAmountUsd: number; // USD
  percentageOfTotal: number;
  monthlyTarget: number; // TRY
  targetAchievementRate: number; // %
}

export interface MonthlyIncomeSummary {
  dateFrom: string;
  dateTo: string;
  usdExchangeRate: number; // Current USD rate
  totalNetTry: number;
  totalGrossTry: number;
  totalTaxTry: number;
  totalExpensesTry: number;
  totalNetUsd: number;
  totalGrossUsd: number;
  totalTaxUsd: number;
  previousMonthNetTry: number;
  previousMonthNetUsd: number;
  momGrowthPercentage: number;
  yearToDateNetTry: number;
  yearToDateNetUsd: number;
  averageMonthlyNetTry: number;
  averageMonthlyNetUsd: number;
  topPerformingSource?: {
    name: string;
    amountTry: number;
    amountUsd: number;
    color: string;
  };
  sourcesBreakdown: SourceSummary[];
  overallTargetTry: number;
  overallTargetUsd: number;
  overallTargetAchievement: number;
}
