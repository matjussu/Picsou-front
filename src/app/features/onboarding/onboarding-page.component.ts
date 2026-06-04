import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  ArrowRight,
  Check,
  ChevronLeft,
  CreditCard,
  Landmark,
  LucideAngularModule,
  Plus,
  Send,
  ShoppingBag,
  Users,
  Wallet,
  X,
} from 'lucide-angular';

type ColocChoice = 'share' | 'solo';
type BankChoice = 'connect' | 'manual';
type GoalChoice = 'savings' | 'trip' | 'purchase';

/**
 * Onboarding présentationnel en 3 étapes (Coloc / Banque / Objectifs), reproduit
 * depuis la maquette design (screen-onboarding.jsx). Écran de marque sombre, plein
 * écran (hors shell). Les choix sont un état local d'UI — aucune écriture backend ;
 * « Terminer » / « Passer » / « Définir plus tard » mènent au dashboard.
 *
 * NB : l'étape Banque est une carte de CHOIX présentationnelle — elle ne déclenche
 * PAS le flux Open Banking (feature distincte).
 */
@Component({
  selector: 'app-onboarding-page',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <div class="onb">
      <!-- Motif pièce en filigrane -->
      <svg class="coin-motif" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="46" />
        <circle cx="50" cy="50" r="33" />
        <text x="50" y="68" text-anchor="middle" class="coin-p">P</text>
      </svg>

      <!-- Barre haut : logo + progression + passer -->
      <header class="top">
        <div class="brand">
          <img class="coin" src="/assets/branding/logo-picsou.svg" alt="Picsou" />
          <span class="wordmark font-display">PICSOU</span>
        </div>
        <div class="top-right">
          <div class="progress" role="progressbar" aria-label="Progression de l'inscription"
               [attr.aria-valuenow]="step()" aria-valuemin="1" aria-valuemax="3">
            @for (i of [1, 2, 3]; track i) {
              <span class="seg" [class.filled]="i <= step()"></span>
            }
          </div>
          <button type="button" class="skip" (click)="finish()">Passer</button>
        </div>
      </header>

      <!-- Contenu centré -->
      <main class="content">
        @switch (step()) {
          @case (1) {
            <span class="eyebrow">Étape 1 sur 3</span>
            <h1>Tu vis en coloc ou en couple&nbsp;?</h1>
            <p class="sub">
              Picsou gère les dépenses partagées et te dit qui doit quoi à qui, en
              temps réel.
            </p>

            <div class="body">
              <div class="choices">
                <button
                  type="button"
                  class="choice"
                  [class.selected]="coloc() === 'share'"
                  [attr.aria-pressed]="coloc() === 'share'"
                  (click)="coloc.set('share')"
                >
                  <span class="choice-icon">
                    <lucide-icon [img]="icons.Users" [size]="22"></lucide-icon>
                  </span>
                  <span class="choice-text">
                    <span class="choice-title">Oui, on partage</span>
                    <span class="choice-desc">Loyer, courses, abonnements communs</span>
                  </span>
                  <span class="radio"
                    >@if (coloc() === 'share') {
                      <lucide-icon [img]="icons.Check" [size]="13"></lucide-icon>
                    }</span
                  >
                </button>
                <button
                  type="button"
                  class="choice"
                  [class.selected]="coloc() === 'solo'"
                  [attr.aria-pressed]="coloc() === 'solo'"
                  (click)="coloc.set('solo')"
                >
                  <span class="choice-icon">
                    <lucide-icon [img]="icons.Wallet" [size]="22"></lucide-icon>
                  </span>
                  <span class="choice-text">
                    <span class="choice-title">Non, juste moi</span>
                    <span class="choice-desc">Je gère mon budget perso</span>
                  </span>
                  <span class="radio"
                    >@if (coloc() === 'solo') {
                      <lucide-icon [img]="icons.Check" [size]="13"></lucide-icon>
                    }</span
                  >
                </button>
              </div>

              @if (coloc() === 'share') {
                <div class="invite">
                  <label for="onb-invite">Invite tes coloc (optionnel)</label>
                  <div class="invite-row">
                    <div class="invite-field">
                      <lucide-icon [img]="icons.Send" [size]="16"></lucide-icon>
                      <input
                        id="onb-invite"
                        type="email"
                        [value]="inviteEmail()"
                        (input)="inviteEmail.set($any($event.target).value)"
                        (keyup.enter)="addInvite()"
                        placeholder="email@exemple.com"
                      />
                    </div>
                    <button type="button" class="btn subtle" (click)="addInvite()">
                      <lucide-icon [img]="icons.Plus" [size]="16"></lucide-icon>
                      Inviter
                    </button>
                  </div>
                  <div class="chips">
                    @for (name of invites(); track name) {
                      <span class="chip">
                        <span class="chip-avatar">{{ initialOf(name) }}</span>
                        {{ name }}
                        <button
                          type="button"
                          class="chip-x"
                          [attr.aria-label]="'Retirer ' + name"
                          (click)="removeInvite(name)"
                        >
                          <lucide-icon [img]="icons.X" [size]="13"></lucide-icon>
                        </button>
                      </span>
                    }
                    <span class="chips-hint">Tu pourras les inviter plus tard aussi.</span>
                  </div>
                </div>
              }
            </div>

            <div class="footer">
              <button type="button" class="btn primary push" (click)="next()">
                Continuer
                <lucide-icon [img]="icons.ArrowRight" [size]="18"></lucide-icon>
              </button>
            </div>
          }

          @case (2) {
            <span class="eyebrow">Étape 2 sur 3</span>
            <h1>Connecte ta banque</h1>
            <p class="sub">
              Importe tes transactions automatiquement, ou saisis-les à la main. Tu
              peux changer d'avis quand tu veux.
            </p>

            <div class="body">
              <div class="choices col">
                <button
                  type="button"
                  class="choice big"
                  [class.selected]="bank() === 'connect'"
                  [attr.aria-pressed]="bank() === 'connect'"
                  (click)="bank.set('connect')"
                >
                  <span class="choice-icon">
                    <lucide-icon [img]="icons.Landmark" [size]="22"></lucide-icon>
                  </span>
                  <span class="choice-text">
                    <span class="choice-title">
                      Connecter ma banque
                      <span class="badge">Recommandé</span>
                    </span>
                    <span class="choice-desc">
                      Import automatique de tes transactions via Open Banking (sandbox
                      PSD2). BNP, Société Générale, Crédit Agricole…
                    </span>
                  </span>
                  <span class="radio"
                    >@if (bank() === 'connect') {
                      <lucide-icon [img]="icons.Check" [size]="13"></lucide-icon>
                    }</span
                  >
                </button>
                <button
                  type="button"
                  class="choice big"
                  [class.selected]="bank() === 'manual'"
                  [attr.aria-pressed]="bank() === 'manual'"
                  (click)="bank.set('manual')"
                >
                  <span class="choice-icon">
                    <lucide-icon [img]="icons.Plus" [size]="22"></lucide-icon>
                  </span>
                  <span class="choice-text">
                    <span class="choice-title">Saisie manuelle</span>
                    <span class="choice-desc">
                      Tu ajoutes tes transactions toi-même. Idéal pour démarrer avec
                      des données de démo.
                    </span>
                  </span>
                  <span class="radio"
                    >@if (bank() === 'manual') {
                      <lucide-icon [img]="icons.Check" [size]="13"></lucide-icon>
                    }</span
                  >
                </button>
              </div>
            </div>

            <div class="footer">
              <button type="button" class="btn ghost" (click)="back()">
                <lucide-icon [img]="icons.ChevronLeft" [size]="18"></lucide-icon>
                Retour
              </button>
              <button type="button" class="btn primary push" (click)="next()">
                Continuer
                <lucide-icon [img]="icons.ArrowRight" [size]="18"></lucide-icon>
              </button>
            </div>
          }

          @case (3) {
            <span class="eyebrow">Étape 3 sur 3</span>
            <h1>Tes premiers objectifs&nbsp;?</h1>
            <p class="sub">
              Choisis un point de départ — tu pourras l'ajuster ou en créer d'autres
              ensuite.
            </p>

            <div class="body">
              <div class="goals">
                @for (g of goalCards; track g.key) {
                  <button
                    type="button"
                    class="goal"
                    [class.selected]="goal() === g.key"
                    [attr.aria-pressed]="goal() === g.key"
                    (click)="goal.set(g.key)"
                  >
                    <span class="goal-top">
                      <span class="goal-icon">
                        <lucide-icon [img]="g.icon" [size]="20"></lucide-icon>
                      </span>
                      @if (goal() === g.key) {
                        <lucide-icon
                          class="goal-check"
                          [img]="icons.Check"
                          [size]="18"
                        ></lucide-icon>
                      }
                    </span>
                    <span class="goal-name">{{ g.title }}</span>
                    <span class="goal-suggest"
                      >Suggéré&#8201;:
                      <span class="amount">{{ g.suggested }}</span></span
                    >
                  </button>
                }
              </div>
            </div>

            <div class="footer">
              <button type="button" class="btn ghost" (click)="back()">
                <lucide-icon [img]="icons.ChevronLeft" [size]="18"></lucide-icon>
                Retour
              </button>
              <button type="button" class="btn quiet" (click)="finish()">
                Définir plus tard
              </button>
              <button type="button" class="btn primary push" (click)="finish()">
                Terminer
                <lucide-icon [img]="icons.Check" [size]="18"></lucide-icon>
              </button>
            </div>
          }
        }
      </main>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .onb {
      position: relative;
      min-height: 100vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      color: var(--text);
      background: radial-gradient(120% 90% at 50% -10%, #1a1913 0%, #0c0c0c 55%);
    }
    .coin-motif {
      position: absolute;
      left: -180px;
      bottom: -200px;
      width: 520px;
      height: 520px;
      opacity: 0.04;
      fill: none;
      stroke: var(--accent);
      stroke-width: 1.5;
      pointer-events: none;
    }
    .coin-p {
      font-family: var(--font-display);
      font-size: 38px;
      fill: var(--accent);
      stroke: none;
    }

    /* Barre haut */
    .top {
      position: relative;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-6) var(--space-10);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }
    .coin {
      height: 38px;
      width: auto;
      object-fit: contain;
    }
    .wordmark {
      font-size: 25px;
      letter-spacing: 1.5px;
      color: var(--text);
    }
    .top-right {
      display: flex;
      align-items: center;
      gap: var(--space-5);
    }
    .progress {
      display: flex;
      gap: var(--space-2);
    }
    .seg {
      width: 32px;
      height: 4px;
      border-radius: 2px;
      background: var(--border-strong);
      transition: background var(--dur) var(--ease);
    }
    .seg.filled {
      background: var(--accent);
    }
    .skip {
      background: transparent;
      border: none;
      font-size: var(--text-sm);
      color: var(--text-secondary);
      cursor: pointer;
      padding: var(--space-2);
    }
    .skip:hover {
      color: var(--text);
    }

    /* Contenu centré */
    .content {
      position: relative;
      flex: 1;
      width: 100%;
      max-width: 660px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 0 var(--space-8) var(--space-10);
    }
    .eyebrow {
      display: block;
      font-size: var(--text-meta);
      font-weight: 500;
      letter-spacing: 1.4px;
      text-transform: uppercase;
      color: var(--text-tertiary);
      margin-bottom: var(--space-3);
    }
    h1 {
      margin: 0;
      font-size: 34px;
      font-weight: 600;
      letter-spacing: -0.6px;
      line-height: 1.15;
      color: var(--text);
    }
    .sub {
      margin: var(--space-3) 0 0;
      font-size: var(--text-body);
      color: var(--text-secondary);
      line-height: 1.6;
    }
    .body {
      margin-top: var(--space-8);
    }

    /* Choices */
    .choices {
      display: flex;
      gap: var(--space-4);
    }
    .choices.col {
      flex-direction: column;
    }
    .choice {
      flex: 1;
      display: flex;
      gap: var(--space-4);
      align-items: center;
      padding: var(--space-5);
      text-align: left;
      cursor: pointer;
      background: var(--surface-raised);
      border: 0.5px solid var(--border);
      border-radius: var(--radius-lg);
      transition:
        background var(--dur-fast) var(--ease),
        border-color var(--dur-fast) var(--ease);
    }
    .choice.big {
      align-items: flex-start;
    }
    .choice:hover {
      border-color: var(--border-strong);
    }
    .choice.selected {
      background: rgba(255, 214, 10, 0.07);
      border-color: var(--accent);
    }
    .choice-icon {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-md);
      flex-shrink: 0;
      display: grid;
      place-items: center;
      background: var(--surface);
      border: 0.5px solid var(--border);
      color: var(--text-secondary);
    }
    .choice.selected .choice-icon {
      background: var(--accent);
      border: none;
      color: var(--on-accent);
    }
    .choice-text {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }
    .choice-title {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--text-body);
      font-weight: 600;
      color: var(--text);
    }
    .choice-desc {
      font-size: 13.5px;
      color: var(--text-secondary);
      margin-top: var(--space-1);
      line-height: 1.5;
    }
    .badge {
      font-size: 11px;
      font-weight: 600;
      color: var(--on-accent);
      background: var(--accent);
      padding: 2px var(--space-2);
      border-radius: var(--radius-pill);
    }
    .radio {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      flex-shrink: 0;
      display: grid;
      place-items: center;
      border: 1.5px solid var(--border-strong);
      color: var(--on-accent);
      align-self: center;
    }
    .choice.selected .radio {
      background: var(--accent);
      border-color: var(--accent);
    }

    /* Invite (étape 1) */
    .invite {
      margin-top: var(--space-5);
      padding: var(--space-5);
      background: var(--surface);
      border: 0.5px solid var(--border);
      border-radius: var(--radius-lg);
    }
    .invite > label {
      font-size: 13px;
      font-weight: 500;
      color: var(--text-secondary);
    }
    .invite-row {
      display: flex;
      gap: var(--space-2);
      margin-top: var(--space-3);
    }
    .invite-field {
      flex: 1;
      display: flex;
      align-items: center;
      gap: var(--space-3);
      height: 46px;
      padding: 0 var(--space-4);
      background: var(--surface-raised);
      border: 0.5px solid var(--border-strong);
      border-radius: var(--radius-md);
      color: var(--text-tertiary);
    }
    .invite-field input {
      flex: 1;
      min-width: 0;
      background: transparent;
      border: none;
      outline: none;
      color: var(--text);
      font-family: var(--font-sans);
      font-size: var(--text-sm);
    }
    .invite-field input::placeholder {
      color: var(--text-tertiary);
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
      margin-top: var(--space-3);
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      padding: 6px var(--space-3) 6px 6px;
      border-radius: var(--radius-pill);
      background: var(--surface-raised);
      border: 0.5px solid var(--border-strong);
      font-size: 13.5px;
      font-weight: 500;
    }
    .chip-avatar {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: var(--surface);
      border: 0.5px solid var(--border-strong);
      display: grid;
      place-items: center;
      font-size: 11px;
      font-weight: 600;
    }
    .chip-x {
      display: inline-flex;
      background: transparent;
      border: none;
      color: var(--text-tertiary);
      cursor: pointer;
      padding: 0;
    }
    .chip-x:hover {
      color: var(--text);
    }
    .chips-hint {
      font-size: 13px;
      color: var(--text-tertiary);
      margin-left: var(--space-1);
    }

    /* Goals (étape 3) */
    .goals {
      display: flex;
      gap: var(--space-4);
    }
    .goal {
      flex: 1;
      padding: var(--space-5);
      text-align: left;
      cursor: pointer;
      background: var(--surface-raised);
      border: 0.5px solid var(--border);
      border-radius: var(--radius-lg);
      display: flex;
      flex-direction: column;
      transition:
        background var(--dur-fast) var(--ease),
        border-color var(--dur-fast) var(--ease);
    }
    .goal:hover {
      border-color: var(--border-strong);
    }
    .goal.selected {
      background: rgba(255, 214, 10, 0.07);
      border-color: var(--accent);
    }
    .goal-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: var(--space-4);
    }
    .goal-icon {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-md);
      display: grid;
      place-items: center;
      background: var(--surface);
      border: 0.5px solid var(--border);
      color: var(--text-secondary);
    }
    .goal.selected .goal-icon {
      background: var(--accent);
      border: none;
      color: var(--on-accent);
    }
    .goal-check {
      color: var(--accent);
    }
    .goal-name {
      font-size: 15px;
      font-weight: 600;
      color: var(--text);
    }
    .goal-suggest {
      font-size: 12.5px;
      color: var(--text-tertiary);
      margin-top: var(--space-2);
    }
    .goal-suggest .amount {
      color: var(--text-secondary);
      font-weight: 500;
    }

    /* Footer nav */
    .footer {
      display: flex;
      gap: var(--space-3);
      margin-top: var(--space-10);
    }
    .push {
      margin-left: auto;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      min-height: 48px;
      padding: var(--space-3) var(--space-4);
      border-radius: var(--radius-md);
      font-size: var(--text-sm);
      font-weight: 600;
      cursor: pointer;
      border: 0.5px solid transparent;
      transition:
        background var(--dur-fast) var(--ease),
        filter var(--dur-fast) var(--ease);
    }
    .btn.primary {
      background: var(--accent);
      color: var(--on-accent);
    }
    .btn.primary:hover {
      filter: brightness(1.05);
    }
    .btn.ghost {
      background: transparent;
      color: var(--text);
      border-color: var(--border-strong);
    }
    .btn.subtle {
      background: var(--surface);
      color: var(--text);
      border-color: var(--border);
      min-height: 0;
    }
    .btn.quiet {
      background: transparent;
      color: var(--text-secondary);
    }
    .btn.quiet:hover {
      color: var(--text);
    }

    @media (max-width: 640px) {
      .top {
        padding: var(--space-5) var(--space-5);
      }
      .content {
        padding: 0 var(--space-5) var(--space-8);
      }
      h1 {
        font-size: 26px;
      }
      .choices:not(.col) {
        flex-direction: column;
      }
      .goals {
        flex-direction: column;
      }
      .footer {
        flex-wrap: wrap;
      }
    }
  `,
})
export class OnboardingPageComponent {
  private readonly router = inject(Router);

  readonly icons = {
    Users,
    Wallet,
    Landmark,
    Plus,
    Send,
    X,
    Check,
    ArrowRight,
    ChevronLeft,
    ShoppingBag,
    CreditCard,
  };

  readonly step = signal<1 | 2 | 3>(1);

  readonly coloc = signal<ColocChoice>('share');
  readonly bank = signal<BankChoice>('connect');
  readonly goal = signal<GoalChoice>('savings');

  readonly inviteEmail = signal('');
  readonly invites = signal<string[]>(['Pierre', 'Lucas']);

  readonly goalCards: { key: GoalChoice; icon: typeof Wallet; title: string; suggested: string }[] =
    [
      { key: 'savings', icon: Wallet, title: 'Épargne de précaution', suggested: '1 000 €' },
      { key: 'trip', icon: ShoppingBag, title: 'Voyage', suggested: '1 500 €' },
      { key: 'purchase', icon: CreditCard, title: 'Achat important', suggested: '1 300 €' },
    ];

  next(): void {
    this.step.update((s) => (s < 3 ? ((s + 1) as 1 | 2 | 3) : s));
  }

  back(): void {
    this.step.update((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s));
  }

  finish(): void {
    this.router.navigateByUrl('/dashboard');
  }

  addInvite(): void {
    const raw = this.inviteEmail().trim();
    if (!raw) {
      return;
    }
    const name = raw.split('@')[0] || raw;
    const label = name.charAt(0).toUpperCase() + name.slice(1);
    if (!this.invites().includes(label)) {
      this.invites.update((list) => [...list, label]);
    }
    this.inviteEmail.set('');
  }

  removeInvite(name: string): void {
    this.invites.update((list) => list.filter((n) => n !== name));
  }

  initialOf(name: string): string {
    return (name.charAt(0) || '?').toUpperCase();
  }
}
