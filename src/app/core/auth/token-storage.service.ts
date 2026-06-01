import { Injectable } from '@angular/core';

const ACCESS_KEY = 'picsou.access';
const REFRESH_KEY = 'picsou.refresh';
const FIRSTNAME_KEY = 'picsou.firstName';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  }

  getFirstName(): string | null {
    return localStorage.getItem(FIRSTNAME_KEY);
  }

  saveTokens(access: string, refresh: string, firstName: string): void {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
    localStorage.setItem(FIRSTNAME_KEY, firstName);
  }

  clear(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(FIRSTNAME_KEY);
  }

  isLoggedIn(): boolean {
    return !!this.getAccessToken();
  }
}
