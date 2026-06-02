import { HttpClient } from '@angular/common/http';
import { Inject, Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/api/api.config';
import { PredictionResponse } from './ai.models';

@Injectable({ providedIn: 'root' })
export class PredictionService {
  private readonly http = inject(HttpClient);

  constructor(@Inject(API_BASE_URL) private readonly baseUrl: string) {}

  /** Solde projeté fin de mois + anomalies (algo local, ne dépend pas de la clé IA). */
  endOfMonth(): Observable<PredictionResponse> {
    return this.http.get<PredictionResponse>(
      `${this.baseUrl}/predictions/end-of-month`,
    );
  }
}
