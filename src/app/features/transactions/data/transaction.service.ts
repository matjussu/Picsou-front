import { HttpClient, HttpParams } from '@angular/common/http';
import { Inject, Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/api/api.config';
import {
  CreateTransactionRequest,
  Transaction,
  TransactionFilters,
  UpdateTransactionRequest,
} from './transaction.models';

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private readonly http = inject(HttpClient);

  constructor(@Inject(API_BASE_URL) private readonly baseUrl: string) {}

  /**
   * Liste filtrée. TOUS les filtres sont envoyés en query params et appliqués côté backend
   * (JPA Specifications) — jamais de filtrage client-side (critère noté du projet).
   */
  search(filters: TransactionFilters = {}): Observable<Transaction[]> {
    let params = new HttpParams();
    const set = (key: string, value: unknown): void => {
      if (value !== null && value !== undefined && `${value}`.trim() !== '') {
        params = params.set(key, `${value}`);
      }
    };
    set('from', filters.from);
    set('to', filters.to);
    set('categoryId', filters.categoryId);
    set('accountId', filters.accountId);
    set('minAmount', filters.minAmount);
    set('maxAmount', filters.maxAmount);
    set('type', filters.type);
    set('q', filters.q);
    set('page', filters.page);
    set('size', filters.size);
    set('sort', filters.sort);
    return this.http.get<Transaction[]>(`${this.baseUrl}/transactions`, { params });
  }

  create(req: CreateTransactionRequest): Observable<Transaction> {
    return this.http.post<Transaction>(`${this.baseUrl}/transactions`, req);
  }

  /** Mise à jour partielle (PATCH) — voir UpdateTransactionRequest. */
  update(id: string, req: UpdateTransactionRequest): Observable<Transaction> {
    return this.http.patch<Transaction>(`${this.baseUrl}/transactions/${id}`, req);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/transactions/${id}`);
  }
}
