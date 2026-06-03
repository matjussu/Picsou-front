// Modèles front IA, alignés sur le contrat back Phase 6 (insights / prédictions / OCR).

/** Part d'une catégorie (chiffre calculé par le backend, pas par le LLM). */
export interface CategoryShare {
  name: string;
  amount: number;
}

/** Faits chiffrés du mois (StatChips data-driven). */
export interface InsightFacts {
  periodStart: string;
  periodEnd: string;
  income: number;
  expense: number;
  net: number;
  transactionCount: number;
  topCategories: CategoryShare[];
}

/** POST /api/insights/monthly (InsightResponse) : prose LLM + facts + cache/coût. */
export interface InsightResponse {
  periodStart: string;
  periodEnd: string;
  text: string;
  model: string | null;
  tokensUsed: number | null;
  cached: boolean;
  facts: InsightFacts;
}

/** POST /api/insights/ask — question libre. Question 1..500 caractères. */
export interface AskRequest {
  question: string;
}

/** Réponse Q&A IA : prose markdown LLM + métadonnées de coût. */
export interface AskResponse {
  answer: string;
  model: string | null;
  tokensUsed: number | null;
}

/** Anomalie de dépense (PredictionResponse.anomalies). */
export interface Anomaly {
  category: string;
  current: number;
  average: number;
  deltaPct: number;
}

/** GET /api/predictions/end-of-month (PredictionResponse). */
export interface PredictionResponse {
  forecastDate: string;
  predictedBalance: number;
  lowConfidence: boolean;
  anomalies: Anomaly[];
}

/** POST /api/ocr/receipt (ReceiptExtraction) — champs nullables (extraction partielle). */
export interface ReceiptExtraction {
  total: number | null;
  merchant: string | null;
  date: string | null;
}
