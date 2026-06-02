import { HttpClient } from '@angular/common/http';
import { Inject, Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/api/api.config';
import { InsightResponse } from './ai.models';

@Injectable({ providedIn: 'root' })
export class InsightService {
  private readonly http = inject(HttpClient);

  constructor(@Inject(API_BASE_URL) private readonly baseUrl: string) {}

  /** Génère (ou réutilise le cache 24h) le résumé IA du mois. 503 si la clé n'est pas configurée. */
  monthly(): Observable<InsightResponse> {
    return this.http.post<InsightResponse>(
      `${this.baseUrl}/insights/monthly`,
      {},
    );
  }
}
