import { HttpClient } from '@angular/common/http';
import { Inject, Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/api/api.config';
import { BankConnection, Institution, SyncResult } from './openbanking.models';

/**
 * Service Open Banking (mock) — branché sur /api/openbanking. Aucune donnée en dur : le catalogue,
 * les connexions et les synchros viennent toutes du backend. Le token JWT est ajouté par
 * l'auth.interceptor global.
 */
@Injectable({ providedIn: 'root' })
export class OpenBankingService {
  private readonly http = inject(HttpClient);

  constructor(@Inject(API_BASE_URL) private readonly baseUrl: string) {}

  /** Catalogue des banques connectables. */
  institutions(): Observable<Institution[]> {
    return this.http.get<Institution[]>(`${this.baseUrl}/openbanking/institutions`);
  }

  /** Connexions de l'utilisateur (statut + dernière synchro + nb transactions). */
  connections(): Observable<BankConnection[]> {
    return this.http.get<BankConnection[]>(`${this.baseUrl}/openbanking/connections`);
  }

  /** Connecte une banque (OAuth simulé) + 1re synchro. 404 banque inconnue, 409 déjà connectée. */
  connect(institutionId: string): Observable<BankConnection> {
    return this.http.post<BankConnection>(`${this.baseUrl}/openbanking/connections`, {
      institutionId,
    });
  }

  /** Resynchronise une connexion (idempotent côté back). 409 si la connexion n'est plus active. */
  sync(connectionId: string): Observable<SyncResult> {
    return this.http.post<SyncResult>(
      `${this.baseUrl}/openbanking/connections/${connectionId}/sync`,
      {},
    );
  }

  /** Déconnecte une banque (passe en révoquée côté back, historique conservé). */
  disconnect(connectionId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/openbanking/connections/${connectionId}`);
  }
}
