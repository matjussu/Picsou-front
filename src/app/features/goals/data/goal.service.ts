import { HttpClient, HttpParams } from '@angular/common/http';
import { Inject, Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/api/api.config';
import {
  AddContributionRequest,
  Contribution,
  CreateGoalRequest,
  Goal,
  GoalDetail,
  GoalStatus,
  UpdateGoalRequest,
} from './goal.models';

@Injectable({ providedIn: 'root' })
export class GoalService {
  private readonly http = inject(HttpClient);

  constructor(@Inject(API_BASE_URL) private readonly baseUrl: string) {}

  list(status?: GoalStatus): Observable<Goal[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<Goal[]>(`${this.baseUrl}/goals`, { params });
  }

  get(id: string): Observable<GoalDetail> {
    return this.http.get<GoalDetail>(`${this.baseUrl}/goals/${id}`);
  }

  create(req: CreateGoalRequest): Observable<Goal> {
    return this.http.post<Goal>(`${this.baseUrl}/goals`, req);
  }

  update(id: string, req: UpdateGoalRequest): Observable<Goal> {
    return this.http.patch<Goal>(`${this.baseUrl}/goals/${id}`, req);
  }

  addContribution(id: string, req: AddContributionRequest): Observable<Contribution> {
    return this.http.post<Contribution>(`${this.baseUrl}/goals/${id}/contributions`, req);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/goals/${id}`);
  }
}
