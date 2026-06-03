import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  Landmark,
  LucideAngularModule,
  LucideIconData,
  Plus,
  RefreshCw,
  ShieldCheck,
  Unlink,
} from 'lucide-angular';

import {
  BankConnection,
  ConnectionStatus,
  Institution,
  bankLogoUrl,
} from './data/openbanking.models';
import { OpenBankingService } from './data/openbanking.service';
import {
  ModalState,
  OpenBankingConnectDialogComponent,
} from './openbanking-connect-dialog.component';

/**
 * Écran Open Banking (handoff screen-openbanking.jsx) : liste des banques connectées (statut +
 * dernière synchro + nb transactions, resync/déconnexion) et lancement du flow de connexion mock
 * (composant {@link OpenBankingConnectDialogComponent}). Données 100 % backend (/api/openbanking),
 * logos = assets SVG officiels. Surfaces via tokens (thème clair/sombre) ; couleur de marque
 * (data-driven) appliquée en inline dans la modale.
 */
@Component({
  selector: 'app-openbanking-page',
  standalone: true,
  imports: [LucideAngularModule, OpenBankingConnectDialogComponent],
  template: `
    <header class="topbar">
      <div>
        <span class="eyebrow">Open Banking</span>
        <h1 class="title">Comptes bancaires</h1>
      </div>
      @if (!loading() && connections().length > 0) {
        <button type="button" class="btn primary" (click)="openChooser()">
          <lucide-icon [img]="icons.Plus" [size]="18"></lucide-icon>
          Connecter une banque
        </button>
      }
    </header>

    <section class="body">
      <div class="wrap">
        @if (loading()) {
          <div class="conn-card skeleton" aria-hidden="true">
            <span class="logo-tile shimmer"></span>
            <div class="conn-main">
              <div class="shimmer line" style="width: 40%"></div>
              <div class="shimmer line" style="width: 60%"></div>
            </div>
          </div>
        } @else if (errored()) {
          <div class="card notice">
            <h2 class="notice-title">Connexions indisponibles</h2>
            <p class="notice-body">
              Impossible de charger tes comptes connectés pour l'instant.
            </p>
            <button type="button" class="btn ghost" (click)="loadConnections()">
              Réessayer
            </button>
          </div>
        } @else if (connections().length === 0) {
          <div class="card empty">
            <span class="empty-icon">
              <lucide-icon [img]="icons.Landmark" [size]="26"></lucide-icon>
            </span>
            <h2 class="empty-title">Aucune banque connectée</h2>
            <p class="empty-body">
              Connecte ta banque pour importer automatiquement tes
              transactions. Connexion sécurisée via Open Banking — sandbox PSD2,
              aucune vraie donnée bancaire.
            </p>
            <button type="button" class="btn primary lg" (click)="openChooser()">
              <lucide-icon [img]="icons.Plus" [size]="18"></lucide-icon>
              Connecter une banque
            </button>
          </div>
        } @else {
          <div class="conn-list">
            @for (c of connections(); track c.id) {
              <article class="conn-card">
                <span class="logo-tile">
                  <img
                    [src]="logo(c.institutionSlug)"
                    [alt]="c.institutionName"
                    loading="lazy"
                  />
                </span>
                <div class="conn-main">
                  <div class="conn-name">{{ c.institutionName }}</div>
                  <div class="conn-meta">
                    Compte courant · ····{{ mask(c.accountId) }}
                  </div>
                  <div class="conn-sync">
                    {{ syncLabel(c) }} · {{ c.transactionsImported }} transactions
                  </div>
                </div>
                <div class="conn-side">
                  <span
                    class="badge"
                    [class.ok]="c.status === 'active'"
                    [class.off]="c.status !== 'active'"
                  >
                    <span class="dot"></span>{{ statusLabel(c.status) }}
                  </span>
                  @if (c.status === 'active') {
                    <div class="conn-actions">
                      <button
                        type="button"
                        class="icon-btn"
                        (click)="resync(c)"
                        [disabled]="busyId() === c.id"
                        [attr.aria-label]="'Resynchroniser ' + c.institutionName"
                        title="Resynchroniser"
                      >
                        <lucide-icon
                          [img]="icons.RefreshCw"
                          [size]="17"
                          [class.spin]="busyId() === c.id"
                        ></lucide-icon>
                      </button>
                      <button
                        type="button"
                        class="icon-btn danger"
                        (click)="disconnect(c)"
                        [disabled]="busyId() === c.id"
                        [attr.aria-label]="'Déconnecter ' + c.institutionName"
                        title="Déconnecter"
                      >
                        <lucide-icon [img]="icons.Unlink" [size]="17"></lucide-icon>
                      </button>
                    </div>
                  }
                </div>
              </article>
            }
          </div>
          <div class="privacy">
            <lucide-icon [img]="icons.ShieldCheck" [size]="14"></lucide-icon>
            Picsou n'a jamais accès à tes identifiants — ils restent chez ta
            banque.
          </div>
        }
      </div>
    </section>

    @if (modal(); as m) {
      <app-openbanking-connect-dialog
        [state]="m"
        [institutions]="institutions()"
        (pick)="selectBank($event)"
        (authorizeBank)="authorize($event)"
        (close)="closeModal()"
        (dashboard)="goDashboard()"
        (another)="connectAnother()"
      />
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .topbar {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: var(--space-4);
      padding: var(--space-6) var(--space-8);
      border-bottom: 0.5px solid var(--border);
    }
    .eyebrow {
      display: block;
      font-size: var(--text-meta);
      font-weight: 500;
      letter-spacing: 1.4px;
      text-transform: uppercase;
      color: var(--text-tertiary);
      margin-bottom: 6px;
    }
    .title {
      margin: 0;
      font-size: 26px;
      font-weight: 600;
      letter-spacing: -0.4px;
      color: var(--text);
    }
    .body {
      padding: var(--space-8);
      display: flex;
      justify-content: center;
    }
    .wrap {
      width: 100%;
      max-width: 760px;
    }

    /* Carte de connexion */
    .conn-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }
    .conn-card {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      padding: var(--space-4) var(--space-5);
      background: var(--surface-raised);
      border: 0.5px solid var(--border);
      border-radius: var(--radius-lg);
    }
    .conn-main {
      flex: 1;
      min-width: 0;
    }
    .conn-name {
      font-size: 15px;
      font-weight: 600;
      color: var(--text);
    }
    .conn-meta {
      font-size: 13px;
      color: var(--text-tertiary);
      margin-top: 2px;
    }
    .conn-sync {
      font-size: 12.5px;
      color: var(--text-secondary);
      margin-top: 4px;
    }
    .conn-side {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: var(--space-3);
    }
    .conn-actions {
      display: flex;
      gap: 6px;
    }

    /* Chip logo (fond clair : les logos de marque sont dessinés pour fond clair) */
    .logo-tile {
      width: 44px;
      height: 44px;
      flex-shrink: 0;
      border-radius: var(--radius-md);
      background: #fff;
      border: 0.5px solid var(--border);
      display: grid;
      place-items: center;
      overflow: hidden;
    }
    .logo-tile img {
      width: 76%;
      height: 76%;
      object-fit: contain;
    }

    /* Badge statut */
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12.5px;
      font-weight: 500;
      white-space: nowrap;
    }
    .badge .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
    }
    .badge.ok {
      color: var(--positive);
    }
    .badge.ok .dot {
      background: var(--positive);
    }
    .badge.off {
      color: var(--text-tertiary);
    }
    .badge.off .dot {
      background: var(--text-tertiary);
    }

    .icon-btn {
      width: 34px;
      height: 34px;
      display: grid;
      place-items: center;
      border-radius: var(--radius-md);
      background: var(--surface);
      border: 0.5px solid var(--border-strong);
      color: var(--text-secondary);
      cursor: pointer;
      transition:
        color var(--dur-fast) var(--ease),
        border-color var(--dur-fast) var(--ease);
    }
    .icon-btn:hover:not(:disabled) {
      color: var(--text);
      border-color: var(--text-tertiary);
    }
    .icon-btn.danger:hover:not(:disabled) {
      color: var(--danger);
      border-color: var(--danger);
    }
    .icon-btn:disabled {
      opacity: 0.5;
      cursor: default;
    }
    .spin {
      animation: spin 0.8s linear infinite;
    }

    /* États vide / erreur */
    .card {
      background: var(--surface-raised);
      border: 0.5px solid var(--border);
      border-radius: var(--radius-lg);
      padding: var(--space-6);
    }
    .empty,
    .notice {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: var(--space-3);
      padding: var(--space-12) var(--space-6);
    }
    .empty-icon {
      width: 72px;
      height: 72px;
      border-radius: var(--radius-pill);
      background: var(--surface);
      border: 0.5px solid var(--border);
      color: var(--text-secondary);
      display: grid;
      place-items: center;
    }
    .empty-title,
    .notice-title {
      margin: 0;
      font-size: 21px;
      font-weight: 600;
      color: var(--text);
    }
    .empty-body,
    .notice-body {
      margin: 0;
      font-size: 15px;
      color: var(--text-secondary);
      line-height: 1.5;
      max-width: 440px;
    }
    .empty .btn {
      margin-top: var(--space-3);
    }

    .privacy {
      display: flex;
      align-items: center;
      gap: 8px;
      justify-content: center;
      margin-top: var(--space-6);
      font-size: 12.5px;
      color: var(--text-tertiary);
    }

    /* Skeleton */
    .skeleton .logo-tile {
      background: var(--surface);
      border: none;
    }
    .shimmer {
      background: var(--surface);
      border-radius: 6px;
      animation: pulse 1.2s var(--ease) infinite;
    }
    .line {
      height: 13px;
      margin-bottom: 8px;
    }

    /* Boutons */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 44px;
      padding: 11px 16px;
      border-radius: var(--radius-md);
      font-family: var(--font-sans);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border: 0.5px solid transparent;
      transition:
        border-color var(--dur-fast) var(--ease),
        opacity var(--dur-fast) var(--ease);
    }
    .btn.primary {
      background: var(--accent);
      color: var(--on-accent);
    }
    .btn.primary:hover {
      opacity: 0.9;
    }
    .btn.ghost {
      background: transparent;
      color: var(--text);
      border-color: var(--border-strong);
    }
    .btn.lg {
      min-height: 50px;
      padding: 12px 22px;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
    @keyframes pulse {
      0%,
      100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
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
      .conn-card {
        flex-wrap: wrap;
      }
      .conn-side {
        flex-direction: row;
        align-items: center;
        width: 100%;
        justify-content: space-between;
        border-top: 0.5px solid var(--border);
        padding-top: var(--space-3);
      }
    }
  `,
})
export class OpenBankingPageComponent {
  private readonly service = inject(OpenBankingService);
  private readonly router = inject(Router);

  readonly icons: {
    Plus: LucideIconData;
    RefreshCw: LucideIconData;
    Landmark: LucideIconData;
    Unlink: LucideIconData;
    ShieldCheck: LucideIconData;
  } = { Plus, RefreshCw, Landmark, Unlink, ShieldCheck };

  readonly loading = signal(true);
  readonly errored = signal(false);
  readonly connections = signal<BankConnection[]>([]);
  readonly institutions = signal<Institution[]>([]);
  readonly modal = signal<ModalState | null>(null);
  readonly busyId = signal<string | null>(null);

  constructor() {
    this.loadConnections();
  }

  loadConnections(): void {
    this.loading.set(true);
    this.errored.set(false);
    this.service.connections().subscribe({
      next: (list) => {
        this.connections.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.errored.set(true);
        this.loading.set(false);
      },
    });
  }

  openChooser(): void {
    this.modal.set({ step: 'choose' });
    if (this.institutions().length === 0) {
      this.service.institutions().subscribe({
        next: (list) => this.institutions.set(list),
      });
    }
  }

  selectBank(bank: Institution): void {
    this.modal.set({ step: 'connect', bank });
  }

  authorize(bank: Institution): void {
    this.modal.set({ step: 'sync', bank });
    this.service.connect(bank.slug).subscribe({
      next: (result) => {
        this.modal.set({ step: 'done', bank, result });
        this.loadConnections();
      },
      error: (err: HttpErrorResponse) => {
        this.modal.set({
          step: 'connect',
          bank,
          error:
            err.status === 409
              ? 'Cette banque est déjà connectée.'
              : 'Connexion impossible pour le moment, réessaie.',
        });
      },
    });
  }

  connectAnother(): void {
    this.openChooser();
  }

  goDashboard(): void {
    this.closeModal();
    void this.router.navigate(['/dashboard']);
  }

  closeModal(): void {
    this.modal.set(null);
  }

  resync(c: BankConnection): void {
    this.busyId.set(c.id);
    this.service.sync(c.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.loadConnections();
      },
      error: () => this.busyId.set(null),
    });
  }

  disconnect(c: BankConnection): void {
    this.busyId.set(c.id);
    this.service.disconnect(c.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.loadConnections();
      },
      error: () => this.busyId.set(null),
    });
  }

  logo(slug: string): string {
    return bankLogoUrl(slug);
  }

  mask(accountId: string | null): string {
    if (!accountId) {
      return '----';
    }
    return accountId.replace(/-/g, '').slice(-4);
  }

  statusLabel(status: ConnectionStatus): string {
    switch (status) {
      case 'active':
        return 'Connecté';
      case 'expired':
        return 'Expiré';
      case 'revoked':
        return 'Déconnecté';
    }
  }

  syncLabel(c: BankConnection): string {
    if (!c.lastSyncAt) {
      return 'Jamais synchronisé';
    }
    return `Synchronisé ${this.relativeTime(c.lastSyncAt)}`;
  }

  private relativeTime(iso: string): string {
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) {
      return '';
    }
    const sec = Math.max(0, (Date.now() - then) / 1000);
    if (sec < 60) {
      return "à l'instant";
    }
    const min = Math.floor(sec / 60);
    if (min < 60) {
      return `il y a ${min} min`;
    }
    const h = Math.floor(min / 60);
    if (h < 24) {
      return `il y a ${h} h`;
    }
    const d = Math.floor(h / 24);
    if (d < 30) {
      return `il y a ${d} j`;
    }
    return new Date(then).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });
  }
}
