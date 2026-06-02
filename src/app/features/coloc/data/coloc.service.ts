import { HttpClient } from '@angular/common/http';
import { Inject, Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/api/api.config';
import {
  AddMemberRequest,
  AddSharedExpenseRequest,
  Balance,
  CreateGroupRequest,
  GroupDetail,
  GroupSummary,
  Member,
  SharedExpense,
} from './coloc.models';

@Injectable({ providedIn: 'root' })
export class ColocService {
  private readonly http = inject(HttpClient);

  constructor(@Inject(API_BASE_URL) private readonly baseUrl: string) {}

  listGroups(): Observable<GroupSummary[]> {
    return this.http.get<GroupSummary[]>(`${this.baseUrl}/coloc/groups`);
  }

  createGroup(req: CreateGroupRequest): Observable<GroupSummary> {
    return this.http.post<GroupSummary>(`${this.baseUrl}/coloc/groups`, req);
  }

  getGroup(id: string): Observable<GroupDetail> {
    return this.http.get<GroupDetail>(`${this.baseUrl}/coloc/groups/${id}`);
  }

  addMember(groupId: string, req: AddMemberRequest): Observable<Member> {
    return this.http.post<Member>(
      `${this.baseUrl}/coloc/groups/${groupId}/members`,
      req,
    );
  }

  listExpenses(groupId: string): Observable<SharedExpense[]> {
    return this.http.get<SharedExpense[]>(
      `${this.baseUrl}/coloc/groups/${groupId}/expenses`,
    );
  }

  addExpense(
    groupId: string,
    req: AddSharedExpenseRequest,
  ): Observable<SharedExpense> {
    return this.http.post<SharedExpense>(
      `${this.baseUrl}/coloc/groups/${groupId}/expenses`,
      req,
    );
  }

  balances(groupId: string): Observable<Balance> {
    return this.http.get<Balance>(
      `${this.baseUrl}/coloc/groups/${groupId}/balances`,
    );
  }

  settleExpense(expenseId: string): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/coloc/expenses/${expenseId}/settle`,
      {},
    );
  }

  settleAll(groupId: string): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/coloc/groups/${groupId}/settle-all`,
      {},
    );
  }
}
