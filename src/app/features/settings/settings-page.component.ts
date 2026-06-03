import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LogOut, LucideAngularModule } from 'lucide-angular';

import { AuthService } from '../../core/auth/auth.service';
import { TokenStorageService } from '../../core/auth/token-storage.service';
import { ThemeService } from '../../core/theme/theme.service';

/**
 * Écran Réglages minimal, aligné sur la maquette screen-settings.jsx (titre de
 * section au-dessus d'une carte, lignes à séparateurs, toggle pilule, pied avec
 * version + déconnexion). Périmètre volontairement réduit (profil + thème +
 * déconnexion) : les sections « Comptes connectés » (Open Banking) et
 * « Catégories » de la maquette sont hors-scope ici.
 */
@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <header class="topbar">
      <h1 class="title">Réglages</h1>
    </header>

    <div class="body">
      <!-- Profil -->
      <section class="section">
        <h2 class="section-title">Profil</h2>
        <div class="card">
          <div class="row last">
            <span class="avatar">{{ initial }}</span>
            <div class="row-main">
              <div class="row-strong">{{ firstName }}</div>
              <div class="row-desc">Compte Picsou</div>
            </div>
          </div>
        </div>
      </section>

      <!-- Préférences -->
      <section class="section">
        <h2 class="section-title">Préférences</h2>
        <div class="card">
          <div class="row last">
            <div class="row-main">
              <div class="row-label">Thème sombre</div>
              <div class="row-desc">Interface en mode nuit</div>
            </div>
            <button
              type="button"
              class="toggle"
              role="switch"
              [class.on]="isDark()"
              [attr.aria-checked]="isDark()"
              aria-label="Thème sombre"
              (click)="toggleTheme()"
            >
              <span class="knob"></span>
            </button>
          </div>
        </div>
      </section>

      <!-- Pied : version + déconnexion -->
      <div class="footer">
        <span class="version">Picsou · v0.9 — M1 MIAGE Dauphine-PSL</span>
        <button type="button" class="btn danger" (click)="logout()">
          <lucide-icon [img]="icons.LogOut" [size]="18"></lucide-icon>
          Se déconnecter
        </button>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .topbar {
      padding: var(--space-6) var(--space-8);
      border-bottom: 0.5px solid var(--border);
    }
    .title {
      margin: 0;
      font-size: 26px;
      font-weight: 600;
      letter-spacing: -0.4px;
      color: var(--text);
    }
    .body {
      padding: var(--space-6) var(--space-8);
    }
    .section {
      max-width: 760px;
      margin-bottom: var(--space-6);
    }
    .section-title {
      margin: 0 0 var(--space-3);
      font-size: 16px;
      font-weight: 600;
      letter-spacing: -0.2px;
      color: var(--text);
    }
    .card {
      background: var(--surface-raised);
      border: 0.5px solid var(--border);
      border-radius: var(--radius-lg);
      padding: var(--space-2) var(--space-6);
    }
    .row {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      padding: var(--space-4) 0;
      border-bottom: 0.5px solid var(--border);
    }
    .row.last {
      border-bottom: none;
    }
    .row-main {
      flex: 1;
      min-width: 0;
    }
    .avatar {
      width: 56px;
      height: 56px;
      border-radius: var(--radius-pill);
      background: var(--accent);
      color: var(--on-accent);
      display: grid;
      place-items: center;
      font-weight: 600;
      font-size: 22px;
      flex-shrink: 0;
    }
    .row-strong {
      font-size: 17px;
      font-weight: 600;
      color: var(--text);
    }
    .row-label {
      font-size: 15px;
      font-weight: 500;
      color: var(--text);
    }
    .row-desc {
      font-size: 13px;
      color: var(--text-tertiary);
      margin-top: 2px;
    }

    /* Toggle pilule (style maquette) */
    .toggle {
      width: 44px;
      height: 26px;
      flex-shrink: 0;
      padding: 3px;
      border-radius: var(--radius-pill);
      background: var(--surface);
      border: 0.5px solid var(--border-strong);
      display: flex;
      justify-content: flex-start;
      cursor: pointer;
      transition:
        background var(--dur-fast) var(--ease),
        border-color var(--dur-fast) var(--ease);
    }
    .toggle.on {
      background: var(--accent);
      border-color: var(--accent);
      justify-content: flex-end;
    }
    .knob {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: var(--text-tertiary);
      transition: background var(--dur-fast) var(--ease);
    }
    .toggle.on .knob {
      background: var(--on-accent);
    }

    /* Pied */
    .footer {
      max-width: 760px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
      padding: var(--space-1) var(--space-1) 0;
    }
    .version {
      font-size: 13px;
      color: var(--text-tertiary);
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      min-height: 44px;
      padding: var(--space-3) var(--space-4);
      border-radius: var(--radius-md);
      font-size: var(--text-sm);
      font-weight: 600;
      cursor: pointer;
      border: 0.5px solid transparent;
      transition: border-color var(--dur-fast) var(--ease);
    }
    .btn.danger {
      background: transparent;
      color: var(--danger);
      border-color: rgba(240, 88, 77, 0.35);
    }
    .btn.danger:hover {
      border-color: var(--danger);
    }

    @media (max-width: 640px) {
      .topbar {
        padding: var(--space-5) var(--space-4);
      }
      .title {
        font-size: 22px;
      }
      .body {
        padding: var(--space-5) var(--space-4);
      }
      .footer {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--space-3);
      }
    }
  `,
})
export class SettingsPageComponent {
  private readonly auth = inject(AuthService);
  private readonly storage = inject(TokenStorageService);
  private readonly router = inject(Router);
  private readonly theme = inject(ThemeService);

  readonly icons = { LogOut };
  readonly firstName = this.storage.getFirstName() ?? 'Utilisateur';
  readonly initial = (this.firstName.charAt(0) || 'U').toUpperCase();

  isDark(): boolean {
    return this.theme.theme() === 'dark';
  }

  toggleTheme(): void {
    this.theme.set(this.isDark() ? 'light' : 'dark');
  }

  logout(): void {
    this.auth.logout().subscribe({
      next: () => this.router.navigateByUrl('/login'),
      error: () => this.router.navigateByUrl('/login'),
    });
  }
}
