import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  ChevronLeft,
  LucideAngularModule,
  LucideIconData,
  Plus,
} from 'lucide-angular';

import { AddContributionDialogComponent } from './add-contribution-dialog/add-contribution-dialog.component';
import { Contribution, GoalDetail } from './data/goal.models';
import { GoalService } from './data/goal.service';
import { eur } from '../transactions/util/currency';

/**
 * Objectif — détail (handoff §11).
 * Carte progression (héros Bebas + barre + reste/échéance) + carte contributions (liste + ajout
 * via dialog → re-fetch). Données via GoalService.get(id). Projection (ETA) volontairement omise
 * (calcul serveur absent — pas d'agrégation client).
 */
@Component({
  selector: 'app-goal-detail-page',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  template: `
    <header class="topbar">
      <div>
        <a class="back-eyebrow" routerLink="/goals">
          <lucide-icon [img]="icons.ChevronLeft" [size]="14"></lucide-icon> Objectifs
        </a>
        <h1 class="title">{{ detail()?.goal?.name ?? 'Objectif' }}</h1>
      </div>
      <div class="actions">
        @if (detail()) {
          <button type="button" class="btn primary" (click)="openContribution()">
            <lucide-icon [img]="icons.Plus" [size]="18"></lucide-icon>
            Contribution
          </button>
        }
      </div>
    </header>

    <section class="body">
      @if (loading()) {
        <div class="grid">
          <div class="card skeleton card-sk"></div>
          <div class="card skeleton card-sk"></div>
        </div>
      } @else if (errored() || !detail()) {
        <div class="card error-card" role="alert">
          <strong>Impossible de charger cet objectif.</strong>
          <button type="button" class="btn ghost sm" (click)="reload()">Réessayer</button>
        </div>
      } @else {
        <div class="grid">
          <!-- Progression -->
          <div class="card progression">
            <div class="prog-top">
              <div>
                <span class="eyebrow">Progression</span>
                <div class="prog-amount">
                  <span class="font-display hero" [class.pos]="completed()">{{ savedStr() }}</span>
                  <span class="amount prog-target">/ {{ targetStr() }}</span>
                </div>
              </div>
              <span class="font-display prog-pct">{{ pct() }}%</span>
            </div>
            <span class="track big">
              <span class="fill" [style.width.%]="pct()"></span>
            </span>
            <div class="prog-foot">
              <span>Il te reste <strong>{{ remainingStr() }}</strong></span>
              @if (detail()?.goal?.deadline) {
                <span>Échéance <strong>{{ deadlineStr() }}</strong></span>
              } @else {
                <span>Sans échéance</span>
              }
            </div>
          </div>

          <!-- Contributions -->
          <div class="card">
            <div class="section-head">
              <h2 class="card-title">Contributions</h2>
            </div>
            @if (contributions().length === 0) {
              <p class="inline-empty">
                Aucune contribution. Ajoute-en une pour démarrer ta progression.
              </p>
            } @else {
              <div class="contrib-list">
                @for (c of contributions(); track c.id; let last = $last) {
                  <div class="contrib-row" [class.last]="last">
                    <span class="contrib-pic">
                      <lucide-icon [img]="icons.Plus" [size]="15"></lucide-icon>
                    </span>
                    <div class="contrib-meta">
                      <span class="contrib-note">Contribution</span>
                      <span class="contrib-date">{{ formatDate(c.date) }}</span>
                    </div>
                    <span class="amount contrib-amt pos">{{ contribAmount(c) }}</span>
                  </div>
                }
              </div>
            }
            <button type="button" class="btn ghost full" (click)="openContribution()">
              <lucide-icon [img]="icons.Plus" [size]="18"></lucide-icon>
              Ajouter une contribution
            </button>
          </div>
        </div>
      }
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    .topbar {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      padding: var(--space-6) var(--space-8);
      border-bottom: 0.5px solid var(--border);
    }
    .back-eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: var(--text-meta);
      font-weight: 500;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      color: var(--text-tertiary);
      text-decoration: none;
      margin-bottom: 6px;
    }
    .back-eyebrow:hover {
      color: var(--text-secondary);
    }
    .title {
      margin: 0;
      font-size: 26px;
      font-weight: 600;
      letter-spacing: -0.4px;
      color: var(--text);
    }
    .actions {
      display: flex;
      gap: 10px;
    }
    .body {
      padding: var(--space-6) var(--space-8);
      max-width: var(--container-max);
    }
    .grid {
      display: grid;
      grid-template-columns: 1.5fr 1fr;
      gap: var(--space-5);
      align-items: start;
    }
    .card {
      background: var(--surface-raised);
      border: 0.5px solid var(--border);
      border-radius: var(--radius-lg);
      padding: var(--space-6);
    }
    .eyebrow {
      display: block;
      font-size: var(--text-meta);
      font-weight: 500;
      letter-spacing: 1.4px;
      text-transform: uppercase;
      color: var(--text-tertiary);
      margin-bottom: 10px;
    }
    .amount {
      font-variant-numeric: tabular-nums;
      font-feature-settings: 'tnum';
      white-space: nowrap;
    }
    .pos {
      color: var(--positive);
    }

    /* Progression */
    .prog-top {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: var(--space-4);
      margin-bottom: 18px;
    }
    .prog-amount {
      display: flex;
      align-items: baseline;
      gap: 10px;
    }
    .hero {
      font-size: 56px;
      line-height: 1;
      color: var(--text);
    }
    .hero.pos {
      color: var(--positive);
    }
    .prog-target {
      font-size: 17px;
      color: var(--text-tertiary);
    }
    .prog-pct {
      font-size: 40px;
      color: var(--text);
      line-height: 1;
    }
    .track {
      display: block;
      background: var(--surface);
      border: 0.5px solid var(--border);
      border-radius: var(--radius-pill);
      overflow: hidden;
      height: 10px;
    }
    .track.big {
      height: 14px;
    }
    .fill {
      display: block;
      height: 100%;
      background: var(--positive);
      border-radius: var(--radius-pill);
      transition: width var(--dur) var(--ease);
    }
    .prog-foot {
      display: flex;
      justify-content: space-between;
      margin-top: 12px;
      font-size: 14px;
      color: var(--text-secondary);
    }
    .prog-foot strong {
      color: var(--text);
    }

    /* Contributions */
    .section-head {
      margin-bottom: var(--space-4);
    }
    .card-title {
      margin: 0;
      font-size: 17px;
      font-weight: 600;
      letter-spacing: -0.2px;
      color: var(--text);
    }
    .contrib-list {
      display: flex;
      flex-direction: column;
      margin-bottom: var(--space-4);
    }
    .contrib-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 13px 0;
      border-bottom: 0.5px solid var(--border);
    }
    .contrib-row.last {
      border-bottom: none;
    }
    .contrib-pic {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(47, 191, 132, 0.1);
      border: 0.5px solid rgba(47, 191, 132, 0.25);
      color: var(--positive);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .contrib-meta {
      flex: 1;
      min-width: 0;
    }
    .contrib-note {
      display: block;
      font-size: 14.5px;
      font-weight: 500;
      color: var(--text);
    }
    .contrib-date {
      display: block;
      font-size: 12.5px;
      color: var(--text-tertiary);
    }
    .contrib-amt {
      font-size: 15px;
      font-weight: 500;
    }
    .inline-empty {
      margin: 0 0 var(--space-4);
      font-size: 14px;
      color: var(--text-tertiary);
    }

    .error-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
      background: rgba(217, 45, 32, 0.1);
      border-color: rgba(217, 45, 32, 0.3);
    }
    .error-card strong {
      font-size: 14px;
      color: var(--text);
    }

    .skeleton {
      background: var(--surface);
      animation: pulse 1.2s var(--ease) infinite;
    }
    .card-sk {
      height: 200px;
      border: none;
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
      white-space: nowrap;
    }
    .btn.sm {
      min-height: 36px;
      padding: 8px 14px;
    }
    .btn.full {
      width: 100%;
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
    .btn.ghost:hover {
      background: rgba(250, 247, 239, 0.04);
    }

    @media (max-width: 1024px) {
      .grid {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class GoalDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(GoalService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  readonly icons: { ChevronLeft: LucideIconData; Plus: LucideIconData } = {
    ChevronLeft,
    Plus,
  };

  private readonly id = this.route.snapshot.paramMap.get('id') ?? '';

  readonly loading = signal(true);
  readonly errored = signal(false);
  readonly detail = signal<GoalDetail | null>(null);

  readonly completed = computed(() => this.detail()?.goal?.completed ?? false);
  readonly contributions = computed(() => this.detail()?.contributions ?? []);
  readonly pct = computed(() =>
    Math.round(Math.max(0, Math.min(100, this.detail()?.goal?.progressPercent ?? 0))),
  );

  constructor() {
    this.load();
  }

  reload(): void {
    this.load();
  }

  private load(): void {
    if (!this.id) {
      this.loading.set(false);
      this.errored.set(true);
      return;
    }
    this.loading.set(true);
    this.errored.set(false);
    this.service.get(this.id).subscribe({
      next: (d) => {
        this.detail.set(d);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.errored.set(true);
      },
    });
  }

  openContribution(): void {
    const goal = this.detail()?.goal;
    if (!goal) {
      return;
    }
    const ref = this.dialog.open(AddContributionDialogComponent, {
      width: '460px',
      maxWidth: '94vw',
      autoFocus: false,
      panelClass: 'picsou-dialog',
      data: { goalId: goal.id, goalName: goal.name },
    });
    ref.afterClosed().subscribe((created?: Contribution) => {
      if (created) {
        this.load();
        this.snack.open('Contribution ajoutée.', 'OK', { duration: 2500 });
      }
    });
  }

  savedStr(): string {
    return eur(this.detail()?.goal?.currentAmount ?? null);
  }

  targetStr(): string {
    return eur(this.detail()?.goal?.targetAmount ?? null);
  }

  remainingStr(): string {
    const g = this.detail()?.goal;
    if (!g) {
      return '—';
    }
    return eur(Math.max(0, g.targetAmount - g.currentAmount));
  }

  deadlineStr(): string {
    const dl = this.detail()?.goal?.deadline;
    return dl ? this.formatLong(dl) : '—';
  }

  contribAmount(c: Contribution): string {
    return eur(c.amount, { plus: true });
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return '—';
    }
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private formatLong(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return iso;
    }
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' });
  }
}
