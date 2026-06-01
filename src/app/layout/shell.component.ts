import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {
  ArrowLeftRight,
  LayoutDashboard,
  LogOut,
  LucideAngularModule,
  LucideIconData,
  Settings,
  Sparkles,
  Target,
  Users,
} from 'lucide-angular';

import { AuthService } from '../core/auth/auth.service';
import { TokenStorageService } from '../core/auth/token-storage.service';

interface NavItem {
  label: string;
  icon: LucideIconData;
  route: string | null; // null = écran à venir (P3+), lien inerte en P2
}

/**
 * App shell minimal Phase 2 : sidebar 248px (logo + nav + user) + zone contenu.
 * Seul l'onglet Transactions est fonctionnel ; les autres sont présents mais inertes (P3+).
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, LucideAngularModule],
  template: `
    <div class="layout">
      <aside class="sidebar">
        <div class="brand">
          <span class="coin">P</span>
          <span class="wordmark font-display">PICSOU</span>
        </div>

        <nav class="nav">
          @for (item of nav; track item.label) {
            @if (item.route) {
              <a
                class="nav-item"
                [routerLink]="item.route"
                routerLinkActive="active"
                #rla="routerLinkActive"
                [attr.aria-current]="rla.isActive ? 'page' : null"
              >
                <lucide-icon [img]="item.icon" [size]="20"></lucide-icon>
                <span>{{ item.label }}</span>
              </a>
            } @else {
              <span class="nav-item disabled" aria-disabled="true" title="Bientôt disponible">
                <lucide-icon [img]="item.icon" [size]="20"></lucide-icon>
                <span>{{ item.label }}</span>
              </span>
            }
          }
        </nav>

        <div class="user">
          <span class="avatar">{{ initial }}</span>
          <div class="user-meta">
            <span class="user-name">{{ firstName }}</span>
            <span class="user-sub">Compte courant</span>
          </div>
          <button type="button" class="logout" (click)="logout()" aria-label="Se déconnecter">
            <lucide-icon [img]="icons.LogOut" [size]="18"></lucide-icon>
          </button>
        </div>
      </aside>

      <main class="content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: `
    .layout {
      display: flex;
      min-height: 100vh;
      background: var(--bg);
    }
    .sidebar {
      width: 248px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      background: var(--surface);
      border-right: 0.5px solid var(--border);
      padding: var(--space-5) var(--space-4);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-2) var(--space-2) var(--space-6);
    }
    .coin {
      width: 34px;
      height: 34px;
      border-radius: var(--radius-pill);
      background: var(--accent);
      color: var(--on-accent);
      font-family: var(--font-display);
      font-size: 22px;
      display: grid;
      place-items: center;
    }
    .wordmark {
      font-size: 25px;
      letter-spacing: 1.5px;
      color: var(--text);
    }
    .nav {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .nav-item {
      position: relative;
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-3);
      border-radius: var(--radius-md);
      font-size: 15px;
      color: var(--text-secondary);
      text-decoration: none;
      cursor: pointer;
      transition: background var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease);
    }
    .nav-item lucide-icon {
      color: var(--text-tertiary);
      display: inline-flex;
    }
    .nav-item:hover:not(.disabled) {
      background: rgba(255, 255, 255, 0.03);
      color: var(--text);
    }
    .nav-item.active {
      background: rgba(255, 214, 10, 0.08);
      color: var(--text);
      font-weight: 600;
    }
    .nav-item.active lucide-icon {
      color: var(--accent);
    }
    .nav-item.active::before {
      content: '';
      position: absolute;
      left: calc(var(--space-4) * -1);
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 22px;
      border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
      background: var(--accent);
    }
    .nav-item.disabled {
      opacity: 0.45;
      cursor: default;
    }
    .user {
      margin-top: auto;
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding-top: var(--space-4);
      border-top: 0.5px solid var(--border);
    }
    .avatar {
      width: 34px;
      height: 34px;
      border-radius: var(--radius-pill);
      background: var(--surface-raised);
      border: 0.5px solid var(--border-strong);
      color: var(--text);
      display: grid;
      place-items: center;
      font-weight: 600;
      font-size: 14px;
    }
    .user-meta {
      display: flex;
      flex-direction: column;
      min-width: 0;
      flex: 1;
    }
    .user-name {
      font-size: 14px;
      font-weight: 500;
      color: var(--text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .user-sub {
      font-size: 12px;
      color: var(--text-tertiary);
    }
    .logout {
      background: transparent;
      border: none;
      color: var(--text-tertiary);
      cursor: pointer;
      padding: var(--space-2);
      border-radius: var(--radius-md);
      display: inline-flex;
    }
    .logout:hover {
      color: var(--text);
    }
    .content {
      flex: 1;
      min-width: 0;
    }
  `,
})
export class ShellComponent {
  private readonly auth = inject(AuthService);
  private readonly storage = inject(TokenStorageService);
  private readonly router = inject(Router);

  readonly icons = { LogOut };
  readonly firstName = this.storage.getFirstName() ?? 'Utilisateur';
  readonly initial = (this.firstName.charAt(0) || 'U').toUpperCase();

  readonly nav: NavItem[] = [
    { label: 'Dashboard', icon: LayoutDashboard, route: null },
    { label: 'Transactions', icon: ArrowLeftRight, route: '/transactions' },
    { label: 'Coloc', icon: Users, route: null },
    { label: 'Objectifs', icon: Target, route: null },
    { label: 'Insights', icon: Sparkles, route: null },
    { label: 'Réglages', icon: Settings, route: null },
  ];

  logout(): void {
    this.auth.logout().subscribe({
      next: () => this.router.navigateByUrl('/login'),
      error: () => this.router.navigateByUrl('/login'),
    });
  }
}
