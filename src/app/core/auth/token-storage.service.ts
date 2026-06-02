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

  /** Décode l'userId (claim `sub`) depuis l'access token JWT, sans vérif de signature (côté client). */
  getUserId(): string | null {
    const token = this.getAccessToken();
    if (!token) {
      return null;
    }
    const parts = token.split('.');
    if (parts.length < 2) {
      return null;
    }
    try {
      const json = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
      const payload = JSON.parse(json) as { sub?: string };
      return payload.sub ?? null;
    } catch {
      return null;
    }
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
