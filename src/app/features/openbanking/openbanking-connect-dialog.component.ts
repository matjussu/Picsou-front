import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  ArrowRight,
  Check,
  ChevronRight,
  LucideAngularModule,
  LucideIconData,
  Plus,
  ShieldCheck,
  X,
} from 'lucide-angular';

import {
  BankConnection,
  Institution,
  bankLogoUrl,
} from './data/openbanking.models';

/** Étape du flow de connexion (modale), fidèle à screen-openbanking.jsx. */
export interface ModalState {
  step: 'choose' | 'connect' | 'sync' | 'done';
  bank?: Institution;
  result?: BankConnection;
  error?: string;
}

/**
 * Modale du flow de connexion Open Banking (4 étapes : choix → sandbox PSD2 → synchro →
 * confirmation), fidèle à screen-openbanking.jsx. Présentationnel : aucune logique réseau ici,
 * tout remonte au parent via les @Output. Couleur de marque (data-driven) en inline ; le reste via
 * tokens (thème clair/sombre).
 */
@Component({
  selector: 'app-openbanking-connect-dialog',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <div
      class="overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Connecter une banque"
      (click)="close.emit()"
    >
      <div class="modal" (click)="$event.stopPropagation()">
        <button
          type="button"
          class="modal-close"
          (click)="close.emit()"
          aria-label="Fermer"
        >
          <lucide-icon [img]="icons.X" [size]="18"></lucide-icon>
        </button>

        @switch (state.step) {
          @case ('choose') {
            <div class="dialog-head">
              <h2 class="dialog-title">Connecter ta banque</h2>
              <p class="dialog-sub">
                Import automatique de tes transactions. Connexion sécurisée via
                Open Banking — sandbox PSD2, aucune vraie donnée.
              </p>
            </div>
            <div class="chooser">
              @for (b of institutions; track b.slug) {
                <button type="button" class="bank-row" (click)="pick.emit(b)">
                  <span class="logo-tile sm">
                    <img [src]="logo(b.slug)" [alt]="b.name" />
                  </span>
                  <span class="bank-name">{{ b.name }}</span>
                  <lucide-icon
                    [img]="icons.ChevronRight"
                    [size]="18"
                    class="chev"
                  ></lucide-icon>
                </button>
              }
              <div class="reassure">
                <lucide-icon [img]="icons.ShieldCheck" [size]="15"></lucide-icon>
                Picsou n'a jamais accès à tes identifiants — ils restent chez ta
                banque.
              </div>
            </div>
          }

          @case ('connect') {
            <div class="sandbox-banner">
              <lucide-icon [img]="icons.ShieldCheck" [size]="16"></lucide-icon>
              <span
                >Tu quittes Picsou — environnement
                <strong>sandbox</strong> PSD2</span
              >
            </div>
            <div class="bank-head" [style.background]="state.bank!.brandColor">
              <span class="bank-head-logo">
                <img [src]="logo(state.bank!.slug)" [alt]="state.bank!.name" />
              </span>
              <div>
                <div class="bank-head-name">{{ state.bank!.name }}</div>
                <div class="bank-head-sub">Espace sécurisé · connexion</div>
              </div>
            </div>
            <div class="connect-body">
              @if (state.error) {
                <div class="form-error">{{ state.error }}</div>
              }
              <div class="field">
                <label>Identifiant</label>
                <div class="fake-input">demo.user</div>
              </div>
              <div class="field">
                <label>Code secret</label>
                <div class="fake-input"><span class="dots">••••••</span></div>
              </div>
              <div class="sandbox-note">
                <lucide-icon [img]="icons.Check" [size]="14"></lucide-icon>
                Identifiants de test du bac à sable — aucune vraie donnée
                bancaire.
              </div>
              <button
                type="button"
                class="btn primary block"
                (click)="authorizeBank.emit(state.bank!)"
              >
                Autoriser l'accès
                <lucide-icon [img]="icons.ArrowRight" [size]="18"></lucide-icon>
              </button>
            </div>
          }

          @case ('sync') {
            <div class="centered">
              <div class="spinner">
                <span class="ring"></span>
                <span class="spinner-logo">
                  <img [src]="logo(state.bank!.slug)" [alt]="state.bank!.name" />
                </span>
              </div>
              <h2 class="centered-title">Synchronisation…</h2>
              <p class="centered-sub">
                Import des transactions récentes depuis {{ state.bank!.name }}.
              </p>
              <div class="steps">
                <div class="step done">
                  <span class="step-dot"
                    ><lucide-icon [img]="icons.Check" [size]="13"></lucide-icon
                  ></span>
                  Connexion au compte
                </div>
                <div class="step done">
                  <span class="step-dot"
                    ><lucide-icon [img]="icons.Check" [size]="13"></lucide-icon
                  ></span>
                  Lecture des transactions
                </div>
                <div class="step">
                  <span class="step-dot pending"></span>
                  Catégorisation automatique
                </div>
              </div>
            </div>
          }

          @case ('done') {
            <div class="centered">
              <div class="success-mark">
                <lucide-icon [img]="icons.Check" [size]="30"></lucide-icon>
              </div>
              <h2 class="done-count">
                {{ state.result!.transactionsImported }} transactions importées
              </h2>
              <p class="centered-sub">
                Importées depuis ton compte {{ state.bank!.name }}.
              </p>
              <div class="done-card">
                <span class="logo-tile">
                  <img [src]="logo(state.bank!.slug)" [alt]="state.bank!.name" />
                </span>
                <div class="done-main">
                  <div class="done-name">{{ state.bank!.name }}</div>
                  <div class="done-meta">
                    Compte courant · ····{{ mask(state.result!.accountId) }}
                  </div>
                </div>
                <span class="badge"><span class="dot"></span>Connecté</span>
              </div>
              <button
                type="button"
                class="btn primary block"
                (click)="dashboard.emit()"
              >
                Voir mon dashboard
                <lucide-icon [img]="icons.ArrowRight" [size]="18"></lucide-icon>
              </button>
              <button type="button" class="btn quiet" (click)="another.emit()">
                <lucide-icon [img]="icons.Plus" [size]="16"></lucide-icon>
                Connecter une autre banque
              </button>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: `
    .overlay {
      position: fixed;
      inset: 0;
      z-index: 50;
      background: rgba(15, 15, 15, 0.45);
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: var(--space-8) var(--space-4);
      overflow-y: auto;
    }
    .modal {
      position: relative;
      width: 100%;
      max-width: 460px;
      margin-top: 6vh;
      background: var(--surface-raised);
      border: 0.5px solid var(--border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-pop);
      overflow: hidden;
      animation: rise var(--dur) var(--ease);
    }
    .modal-close {
      position: absolute;
      top: 12px;
      right: 12px;
      z-index: 2;
      width: 32px;
      height: 32px;
      display: grid;
      place-items: center;
      border-radius: var(--radius-md);
      background: transparent;
      border: none;
      color: var(--text-tertiary);
      cursor: pointer;
    }
    .modal-close:hover {
      color: var(--text);
    }

    /* Chip logo (fond clair : logos dessinés pour fond clair) */
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
    .logo-tile.sm {
      width: 38px;
      height: 38px;
    }
    .logo-tile img {
      width: 76%;
      height: 76%;
      object-fit: contain;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12.5px;
      font-weight: 500;
      color: var(--positive);
      white-space: nowrap;
    }
    .badge .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--positive);
    }

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
      transition: opacity var(--dur-fast) var(--ease);
    }
    .btn.primary {
      background: var(--accent);
      color: var(--on-accent);
    }
    .btn.primary:hover {
      opacity: 0.9;
    }
    .btn.quiet {
      background: transparent;
      color: var(--text-secondary);
      min-height: 38px;
    }
    .btn.quiet:hover {
      color: var(--text);
    }
    .btn.block {
      width: 100%;
      min-height: 50px;
    }

    /* Étape choose */
    .dialog-head {
      padding: var(--space-6) var(--space-6) var(--space-3);
    }
    .dialog-title {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      letter-spacing: -0.3px;
      color: var(--text);
    }
    .dialog-sub {
      margin: 8px 0 0;
      font-size: 13.5px;
      line-height: 1.5;
      color: var(--text-secondary);
    }
    .chooser {
      padding: var(--space-2) var(--space-6) var(--space-6);
    }
    .bank-row {
      display: flex;
      align-items: center;
      gap: 13px;
      width: 100%;
      padding: 11px 0;
      background: transparent;
      border: none;
      border-bottom: 0.5px solid var(--border);
      cursor: pointer;
      text-align: left;
    }
    .bank-row:last-of-type {
      border-bottom: none;
    }
    .bank-name {
      flex: 1;
      font-size: 15px;
      font-weight: 600;
      color: var(--text);
    }
    .bank-row .chev {
      color: var(--text-tertiary);
    }
    .reassure {
      display: flex;
      align-items: center;
      gap: 9px;
      margin-top: 16px;
      padding: 12px 14px;
      background: var(--surface);
      border-radius: var(--radius-md);
      font-size: 12.5px;
      color: var(--text-tertiary);
    }

    /* Étape connect */
    .sandbox-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 11px 18px;
      background: rgba(255, 214, 10, 0.1);
      border-bottom: 0.5px solid rgba(255, 214, 10, 0.25);
      font-size: 12.5px;
      color: var(--text-secondary);
    }
    .sandbox-banner strong {
      color: var(--text);
    }
    .bank-head {
      display: flex;
      align-items: center;
      gap: 13px;
      padding: var(--space-6);
    }
    .bank-head-logo {
      width: 44px;
      height: 44px;
      flex-shrink: 0;
      border-radius: var(--radius-md);
      background: #fff;
      display: grid;
      place-items: center;
      overflow: hidden;
    }
    .bank-head-logo img {
      width: 78%;
      height: 78%;
      object-fit: contain;
    }
    .bank-head-name {
      font-size: 16px;
      font-weight: 700;
      color: #fff;
    }
    .bank-head-sub {
      font-size: 12.5px;
      color: rgba(255, 255, 255, 0.85);
      margin-top: 1px;
    }
    .connect-body {
      padding: var(--space-6);
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }
    .form-error {
      padding: 10px 14px;
      border-radius: var(--radius-md);
      background: rgba(217, 45, 32, 0.1);
      border: 0.5px solid rgba(217, 45, 32, 0.3);
      color: var(--danger);
      font-size: 13px;
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 7px;
    }
    .field label {
      font-size: 13px;
      font-weight: 500;
      color: var(--text-secondary);
    }
    .fake-input {
      display: flex;
      align-items: center;
      height: 48px;
      padding: 0 14px;
      background: var(--surface);
      border: 0.5px solid var(--border-strong);
      border-radius: var(--radius-md);
      font-size: 15px;
      color: var(--text);
    }
    .fake-input .dots {
      letter-spacing: 4px;
      font-size: 16px;
    }
    .sandbox-note {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12.5px;
      color: var(--text-tertiary);
    }

    /* Étapes sync + done */
    .centered {
      padding: var(--space-10) var(--space-8);
      text-align: center;
    }
    .spinner {
      position: relative;
      width: 64px;
      height: 64px;
      margin: 0 auto 24px;
    }
    .ring {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      border: 3px solid var(--border);
      border-top-color: var(--accent);
      animation: spin 0.9s linear infinite;
    }
    .spinner-logo {
      position: absolute;
      inset: 13px;
      border-radius: var(--radius-sm);
      background: #fff;
      display: grid;
      place-items: center;
      overflow: hidden;
    }
    .spinner-logo img {
      width: 80%;
      height: 80%;
      object-fit: contain;
    }
    .centered-title {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      color: var(--text);
    }
    .centered-sub {
      margin: 8px 0 24px;
      font-size: 14.5px;
      color: var(--text-secondary);
    }
    .steps {
      text-align: left;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .step {
      display: flex;
      align-items: center;
      gap: 11px;
      font-size: 14.5px;
      color: var(--text-secondary);
    }
    .step.done {
      color: var(--text);
    }
    .step-dot {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      border-radius: 50%;
      background: var(--surface);
      display: grid;
      place-items: center;
      color: #fff;
    }
    .step.done .step-dot {
      background: var(--positive);
    }
    .step-dot.pending {
      animation: pulse 1.2s var(--ease) infinite;
    }

    .success-mark {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      margin: 0 auto 22px;
      background: rgba(20, 160, 107, 0.12);
      border: 0.5px solid rgba(20, 160, 107, 0.3);
      color: var(--positive);
      display: grid;
      place-items: center;
    }
    .done-count {
      margin: 0;
      font-size: 22px;
      font-weight: 600;
      letter-spacing: -0.3px;
      color: var(--text);
    }
    .done-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      background: var(--surface);
      border: 0.5px solid var(--border);
      border-radius: var(--radius-md);
      text-align: left;
      margin: 4px 0 24px;
    }
    .done-main {
      flex: 1;
      min-width: 0;
    }
    .done-name {
      font-size: 15px;
      font-weight: 600;
      color: var(--text);
    }
    .done-meta {
      font-size: 13px;
      color: var(--text-tertiary);
      margin-top: 2px;
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
    @keyframes rise {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (max-width: 640px) {
      .overlay {
        padding: 0;
        align-items: flex-end;
      }
      .modal {
        max-width: 100%;
        margin-top: 0;
        border-radius: var(--radius-lg) var(--radius-lg) 0 0;
      }
    }
  `,
})
export class OpenBankingConnectDialogComponent {
  @Input({ required: true }) state!: ModalState;
  @Input() institutions: Institution[] = [];

  @Output() pick = new EventEmitter<Institution>();
  @Output() authorizeBank = new EventEmitter<Institution>();
  @Output() close = new EventEmitter<void>();
  @Output() dashboard = new EventEmitter<void>();
  @Output() another = new EventEmitter<void>();

  readonly icons: {
    Plus: LucideIconData;
    ChevronRight: LucideIconData;
    Check: LucideIconData;
    ArrowRight: LucideIconData;
    X: LucideIconData;
    ShieldCheck: LucideIconData;
  } = { Plus, ChevronRight, Check, ArrowRight, X, ShieldCheck };

  logo(slug: string): string {
    return bankLogoUrl(slug);
  }

  mask(accountId: string | null): string {
    if (!accountId) {
      return '----';
    }
    return accountId.replace(/-/g, '').slice(-4);
  }
}
