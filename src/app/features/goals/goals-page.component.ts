import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  Check,
  LucideAngularModule,
  LucideIconData,
  MoreHorizontal,
  Plane,
  Plus,
  ShoppingBag,
  Target,
  TrendingUp,
} from 'lucide-angular';

import { CreateGoalDialogComponent } from './create-goal-dialog/create-goal-dialog.component';
import { Goal, GoalTemplate } from './data/goal.models';
import { GoalService } from './data/goal.service';
import { eur } from '../transactions/util/currency';

/**
 * Objectifs — liste (handoff §11).
 * Stats (total mis de côté = somme currentAmount, compte) · grille de GoalCard cliquables →
 * /goals/:id · « + Nouvel objectif » → CreateGoalDialog → re-fetch. Données via GoalService.list().
 */
@Component({
  selector: 'app-goals-page',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  template: `
    <header class="topbar">
      <div>
        <span class="eyebrow">Objectifs</span>
        <h1 class="title">Tes objectifs</h1>
      </div>
      <div class="actions">
        <button type="button" class="btn primary" (click)="openCreate()">
          <lucide-icon [img]="icons.Plus" [size]="18"></lucide-icon>
          Nouvel objectif
        </button>
      </div>
    </header>

    <section class="body">
      <!-- Stats -->
      <div class="stats">
        <div class="card stat">
          <span class="eyebrow">Total mis de côté</span>
          @if (loading()) {
            <span class="skeleton hero-sk"></span>
          } @else {
            <span class="hero font-display amount pos">{{ totalSaved() }}</span>
          }
        </div>
        <div class="card stat">
          <span class="eyebrow">Objectifs</span>
          <span class="num">{{ goals().length }}</span>
          <span class="stat-sub">{{ completedCount() }} atteint · {{ activeCount() }} en cours</span>
        </div>
        <div class="card stat">
          <span class="eyebrow">Cible totale</span>
          @if (loading()) {
            <span class="skeleton num-sk"></span>
          } @else {
            <span class="num amount">{{ totalTarget() }}</span>
          }
          <span class="stat-sub">Tous objectifs confondus</span>
        </div>
      </div>

      @if (loading()) {
        <div class="goals-grid">
          @for (i of [1, 2, 3, 4]; track i) {
            <div class="card skeleton card-sk"></div>
          }
        </div>
      } @else if (errored()) {
        <div class="card error-card" role="alert">
          <strong>Impossible de charger tes objectifs.</strong>
          <button type="button" class="btn ghost sm" (click)="reload()">Réessayer</button>
        </div>
      } @else if (goals().length === 0) {
        <div class="card empty">
          <span class="empty-icon">
            <lucide-icon [img]="icons.Target" [size]="28"></lucide-icon>
          </span>
          <h2 class="empty-title">Aucun objectif pour l'instant</h2>
          <p class="empty-body">
            Définis un premier objectif d'épargne — un voyage, un achat ou une réserve de
            précaution — et suis ta progression au fil des contributions.
          </p>
          <button type="button" class="btn primary" (click)="openCreate()">
            <lucide-icon [img]="icons.Plus" [size]="18"></lucide-icon>
            Créer un objectif
          </button>
        </div>
      } @else {
        <div class="goals-grid">
          @for (g of goals(); track g.id) {
            <a class="card goal-card" [routerLink]="['/goals', g.id]">
              <div class="goal-head">
                <span class="goal-pic" [class.done]="g.completed">
                  <lucide-icon [img]="templateIcon(g.template)" [size]="22"></lucide-icon>
                </span>
                <div class="goal-id">
                  <span class="goal-name">{{ g.name }}</span>
                  <span class="goal-deadline">{{ deadlineLabel(g) }}</span>
                </div>
                <lucide-icon
                  [img]="icons.MoreHorizontal"
                  [size]="18"
                  class="goal-more"
                ></lucide-icon>
              </div>

              <div class="goal-amount">
                <span class="font-display goal-saved" [class.pos]="g.completed">{{
                  saved(g)
                }}</span>
                <span class="amount goal-target">/ {{ target(g) }}</span>
              </div>

              <span class="track">
                <span class="fill" [style.width.%]="clampPct(g.progressPercent)"></span>
              </span>

              <div class="goal-foot">
                <span class="goal-pct" [class.done]="g.completed">
                  @if (g.completed) {
                    <lucide-icon [img]="icons.Check" [size]="14"></lucide-icon> 100&#8201;%
                  } @else {
                    {{ round(g.progressPercent) }}&#8201;%
                  }
                </span>
                @if (g.deadline && !g.completed) {
                  <span class="goal-eta">
                    <lucide-icon [img]="icons.TrendingUp" [size]="14"></lucide-icon>
                    Échéance {{ shortDate(g.deadline) }}
                  </span>
                }
              </div>
            </a>
          }
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
    .actions {
      display: flex;
      gap: 10px;
    }
    .body {
      padding: var(--space-6) var(--space-8);
      max-width: var(--container-max);
      display: flex;
      flex-direction: column;
      gap: var(--space-5);
    }

    .stats {
      display: grid;
      grid-template-columns: 1.4fr 1fr 1fr;
      gap: var(--space-5);
    }
    .card {
      background: var(--surface-raised);
      border: 0.5px solid var(--border);
      border-radius: var(--radius-lg);
      padding: var(--space-5) var(--space-6);
    }
    .stat {
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 10px;
    }
    .hero {
      font-size: 48px;
      line-height: 1;
      color: var(--text);
    }
    .hero.pos {
      color: var(--positive);
    }
    .num {
      font-size: 30px;
      font-weight: 600;
      line-height: 1;
      color: var(--text);
    }
    .stat-sub {
      font-size: 13px;
      color: var(--text-tertiary);
    }
    .amount {
      font-variant-numeric: tabular-nums;
      font-feature-settings: 'tnum';
      white-space: nowrap;
    }
    .pos {
      color: var(--positive);
    }

    /* Goals grid */
    .goals-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-5);
    }
    .goal-card {
      display: flex;
      flex-direction: column;
      gap: 16px;
      text-decoration: none;
      transition: border-color var(--dur) var(--ease);
    }
    .goal-card:hover {
      border-color: var(--border-strong);
    }
    .goal-head {
      display: flex;
      align-items: center;
      gap: 13px;
    }
    .goal-pic {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-md);
      background: var(--surface);
      border: 0.5px solid var(--border);
      color: var(--accent);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .goal-pic.done {
      color: var(--positive);
    }
    .goal-id {
      flex: 1;
      min-width: 0;
    }
    .goal-name {
      display: block;
      font-size: 16px;
      font-weight: 600;
      color: var(--text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .goal-deadline {
      display: block;
      font-size: 13px;
      color: var(--text-tertiary);
      margin-top: 2px;
    }
    .goal-more {
      color: var(--text-tertiary);
      flex-shrink: 0;
    }
    .goal-amount {
      display: flex;
      align-items: baseline;
      gap: 8px;
    }
    .goal-saved {
      font-size: 38px;
      line-height: 1;
      color: var(--text);
    }
    .goal-saved.pos {
      color: var(--positive);
    }
    .goal-target {
      font-size: 15px;
      color: var(--text-tertiary);
    }
    .track {
      display: block;
      height: 10px;
      background: var(--surface);
      border: 0.5px solid var(--border);
      border-radius: var(--radius-pill);
      overflow: hidden;
    }
    .fill {
      display: block;
      height: 100%;
      background: var(--positive);
      border-radius: var(--radius-pill);
      transition: width var(--dur) var(--ease);
    }
    .goal-foot {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .goal-pct {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-secondary);
    }
    .goal-pct.done {
      color: var(--positive);
    }
    .goal-eta {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12.5px;
      color: var(--text-tertiary);
    }

    /* Empty / error */
    .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: var(--space-12) var(--space-6);
      gap: var(--space-3);
    }
    .empty-icon {
      width: 72px;
      height: 72px;
      border-radius: var(--radius-pill);
      background: var(--surface);
      border: 0.5px solid var(--border);
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: var(--space-2);
    }
    .empty-title {
      margin: 0;
      font-size: 21px;
      font-weight: 600;
      color: var(--text);
    }
    .empty-body {
      margin: 0 0 var(--space-3);
      font-size: 15px;
      color: var(--text-secondary);
      line-height: 1.5;
      max-width: 440px;
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

    /* Skeleton */
    .skeleton {
      background: var(--surface);
      animation: pulse 1.2s var(--ease) infinite;
    }
    .hero-sk {
      display: block;
      width: 60%;
      height: 44px;
      border-radius: var(--radius-sm);
    }
    .num-sk {
      display: block;
      width: 50%;
      height: 28px;
      border-radius: var(--radius-sm);
    }
    .card-sk {
      height: 188px;
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

    /* Buttons */
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
      .stats,
      .goals-grid {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class GoalsPageComponent {
  private readonly service = inject(GoalService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  readonly icons: {
    Plus: LucideIconData;
    Target: LucideIconData;
    Check: LucideIconData;
    TrendingUp: LucideIconData;
    MoreHorizontal: LucideIconData;
    Plane: LucideIconData;
    ShoppingBag: LucideIconData;
  } = {
    Plus,
    Target,
    Check,
    TrendingUp,
    MoreHorizontal,
    Plane,
    ShoppingBag,
  };

  readonly loading = signal(true);
  readonly errored = signal(false);
  readonly goals = signal<Goal[]>([]);

  readonly totalSaved = computed(() =>
    eur(this.goals().reduce((s, g) => s + g.currentAmount, 0)),
  );
  readonly totalTarget = computed(() =>
    eur(this.goals().reduce((s, g) => s + g.targetAmount, 0)),
  );
  readonly completedCount = computed(() => this.goals().filter((g) => g.completed).length);
  readonly activeCount = computed(() => this.goals().filter((g) => !g.completed).length);

  constructor() {
    this.load();
  }

  reload(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.errored.set(false);
    this.service.list().subscribe({
      next: (goals) => {
        this.goals.set(goals);
        this.loading.set(false);
      },
      error: () => {
        this.goals.set([]);
        this.loading.set(false);
        this.errored.set(true);
      },
    });
  }

  openCreate(): void {
    const ref = this.dialog.open(CreateGoalDialogComponent, {
      width: '520px',
      maxWidth: '94vw',
      autoFocus: false,
      panelClass: 'picsou-dialog',
    });
    ref.afterClosed().subscribe((created?: Goal) => {
      if (created) {
        this.load();
        this.snack.open('Objectif créé.', 'OK', { duration: 2500 });
      }
    });
  }

  templateIcon(template: GoalTemplate): LucideIconData {
    switch (template) {
      case 'travel':
        return this.icons.Plane;
      case 'purchase':
        return this.icons.ShoppingBag;
      case 'savings':
      case 'custom':
      default:
        return this.icons.Target;
    }
  }

  saved(g: Goal): string {
    return eur(g.currentAmount);
  }

  target(g: Goal): string {
    return eur(g.targetAmount);
  }

  deadlineLabel(g: Goal): string {
    if (g.completed) {
      return 'Objectif atteint';
    }
    return g.deadline ? `Échéance ${this.shortDate(g.deadline)}` : 'Sans échéance';
  }

  shortDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return iso;
    }
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  round(n: number): number {
    return Math.round(n);
  }

  clampPct(n: number): number {
    return Math.max(0, Math.min(100, n));
  }
}
