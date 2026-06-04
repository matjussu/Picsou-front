// Modèles front alignés sur le contrat d'API backend (Picsou_back, main 85ea6f2).
// amount = number (NUMERIC sérialisé en JSON), date = ISO 'yyyy-MM-dd'.

export type TransactionType = 'income' | 'expense';
export type TransactionSource = 'manual' | 'ocr' | 'openbanking';
export type AccountType = 'cash' | 'coloc' | 'bank';

/** Réponse GET /api/transactions[/{id}] (TransactionResponse). */
export interface Transaction {
  id: string;
  amount: number;
  date: string;
  description: string;
  type: TransactionType;
  source: TransactionSource;
  categoryId: string | null;
  accountId: string | null;
  note: string | null;
}

/** Corps POST /api/transactions (CreateTransactionRequest). */
export interface CreateTransactionRequest {
  amount: number;
  date: string;
  description: string;
  type: TransactionType;
  categoryId?: string | null;
  accountId?: string | null;
  note?: string | null;
}

/**
 * Corps PATCH /api/transactions/{id} (UpdateTransactionRequest).
 * Mise à jour partielle : seuls les champs fournis sont modifiés.
 * NB : le backend ne porte pas `accountId` en update (champ non éditable ici).
 */
export interface UpdateTransactionRequest {
  amount?: number;
  date?: string;
  description?: string;
  type?: TransactionType;
  categoryId?: string | null;
  note?: string | null;
}

/** Réponse GET /api/categories (CategoryResponse). */
export interface Category {
  id: string;
  name: string;
  iconKey: string | null;
  colorKey: string | null;
  isDefault: boolean;
  parentId: string | null;
}

/** Réponse GET /api/accounts (AccountResponse). */
export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number | null;
  currency: string | null;
}

/**
 * Filtres de l'écran Transactions → query params backend.
 * Tous optionnels ; le filtrage est 100% backend (critère noté), jamais en mémoire.
 */
export interface TransactionFilters {
  from?: string | null;
  to?: string | null;
  categoryId?: string | null;
  accountId?: string | null;
  minAmount?: number | null;
  maxAmount?: number | null;
  type?: TransactionType | null;
  q?: string | null;
  page?: number;
  size?: number;
  sort?: string;
}
