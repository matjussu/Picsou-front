// Modèles front Open Banking (mock), alignés sur le contrat back Phase 5 (/api/openbanking).

/** Banque connectable du catalogue (GET /institutions). */
export interface Institution {
  slug: string;
  name: string;
  brandColor: string;
}

/** Statut d'une connexion bancaire (enum back ob_status). */
export type ConnectionStatus = 'active' | 'expired' | 'revoked';

/** Connexion bancaire de l'utilisateur (GET /connections, POST /connections). */
export interface BankConnection {
  id: string;
  institutionSlug: string;
  institutionName: string;
  brandColor: string;
  status: ConnectionStatus;
  accountId: string | null;
  transactionsImported: number;
  lastSyncAt: string | null;
  connectedAt: string;
}

/** Résultat d'une synchronisation (POST /connections/{id}/sync). */
export interface SyncResult {
  connectionId: string;
  transactionsImported: number;
  syncedAt: string;
}

/** URL de l'asset logo (SVG officiel) d'une banque, par slug. */
export function bankLogoUrl(slug: string): string {
  return `assets/banks/${slug}.svg`;
}
