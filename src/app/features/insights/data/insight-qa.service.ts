import { HttpClient } from '@angular/common/http';
import { Inject, Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/api/api.config';
import { AskRequest, AskResponse } from './ai.models';

/** Longueur max d'une question (miroir de la validation backend 1..500). */
export const QUESTION_MAX_LENGTH = 500;

@Injectable({ providedIn: 'root' })
export class InsightQaService {
  private readonly http = inject(HttpClient);

  constructor(@Inject(API_BASE_URL) private readonly baseUrl: string) {}

  /**
   * Pose une question libre à l'IA sur les finances de l'utilisateur.
   * 400 si vide ou > 500 caractères · 401 si non authentifié · 503 si IA non configurée.
   */
  ask(question: string): Observable<AskResponse> {
    const body: AskRequest = { question };
    return this.http.post<AskResponse>(`${this.baseUrl}/insights/ask`, body);
  }
}
