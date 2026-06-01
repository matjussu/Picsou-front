// Modèles alignés sur le contrat back dashboard (Picsou_back main b451700).

/** GET /api/dashboard/summary — KPIs du mois courant. */
export interface DashboardSummary {
  income: number;
  expense: number;
  balance: number;
  transactionCount: number;
}

/** GET /api/dashboard/charts/monthly — un point par mois (12 points continus). */
export interface MonthlyPoint {
  period: string; // 'YYYY-MM'
  total: number;
  current: boolean;
}

/** GET /api/dashboard/charts/category-breakdown — une part par catégorie. */
export interface CategorySlice {
  category: string;
  total: number;
}
