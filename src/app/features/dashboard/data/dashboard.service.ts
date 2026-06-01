import { HttpClient } from '@angular/common/http';
import { Inject, Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/api/api.config';
import { CategorySlice, DashboardSummary, MonthlyPoint } from './dashboard.models';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  constructor(@Inject(API_BASE_URL) private readonly baseUrl: string) {}

  summary(): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(`${this.baseUrl}/dashboard/summary`);
  }

  monthly(): Observable<MonthlyPoint[]> {
    return this.http.get<MonthlyPoint[]>(`${this.baseUrl}/dashboard/charts/monthly`);
  }

  categoryBreakdown(): Observable<CategorySlice[]> {
    return this.http.get<CategorySlice[]>(`${this.baseUrl}/dashboard/charts/category-breakdown`);
  }
}
