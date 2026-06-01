import { HttpClient } from '@angular/common/http';
import { Inject, Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { API_BASE_URL } from '../api/api.config';
import { TokenStorageService } from './token-storage.service';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  firstName: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private storage = inject(TokenStorageService);

  constructor(@Inject(API_BASE_URL) private baseUrl: string) {}

  signup(email: string, password: string, firstName: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/auth/signup`, { email, password, firstName })
      .pipe(tap((r) => this.storage.saveTokens(r.accessToken, r.refreshToken, r.firstName)));
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/auth/login`, { email, password })
      .pipe(tap((r) => this.storage.saveTokens(r.accessToken, r.refreshToken, r.firstName)));
  }

  refresh(): Observable<AuthResponse> {
    const refresh = this.storage.getRefreshToken();
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/auth/refresh`, { refreshToken: refresh })
      .pipe(tap((r) => this.storage.saveTokens(r.accessToken, r.refreshToken, r.firstName)));
  }

  logout(): Observable<void> {
    const refresh = this.storage.getRefreshToken();
    return this.http
      .post<void>(`${this.baseUrl}/auth/logout`, { refreshToken: refresh })
      .pipe(tap(() => this.storage.clear()));
  }
}
