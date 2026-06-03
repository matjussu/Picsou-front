import { Injectable, signal } from '@angular/core';

export type Theme = 'dark' | 'light';

const THEME_KEY = 'picsou.theme';

/**
 * Pilote l'attribut `data-theme` sur <html> (source des rôles de couleur dans tokens.css).
 * Défaut = dark (cohérent avec index.html). Choix persisté en localStorage.
 * Additif : tant que l'utilisateur ne bascule pas, le rendu reste identique à l'existant.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>(this.read());

  /** À appeler une fois au démarrage de l'app pour appliquer le thème persisté. */
  init(): void {
    this.apply(this.theme());
  }

  set(theme: Theme): void {
    this.theme.set(theme);
    this.apply(theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* localStorage indisponible (mode privé) : on garde le thème en mémoire seulement. */
    }
  }

  toggle(): void {
    this.set(this.theme() === 'dark' ? 'light' : 'dark');
  }

  private apply(theme: Theme): void {
    document.documentElement.setAttribute('data-theme', theme);
  }

  private read(): Theme {
    try {
      return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  }
}
