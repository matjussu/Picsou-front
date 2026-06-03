import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronRight,
  CreditCard,
  LucideAngularModule,
  LucideIconData,
  Plus,
  Sparkles,
} from 'lucide-angular';
import { forkJoin } from 'rxjs';

import { TokenStorageService } from '../../core/auth/token-storage.service';
import { Transaction } from '../transactions/data/transaction.models';
import { TransactionService } from '../transactions/data/transaction.service';
import { eur } from '../transactions/util/currency';
import {
  CategorySlice,
  DashboardSummary,
  MonthlyPoint,
} from './data/dashboard.models';
import { DashboardService } from './data/dashboard.service';
import { PredictionResponse } from '../insights/data/ai.models';
import { PredictionService } from '../insights/data/prediction.service';
import { Goal } from '../goals/data/goal.models';
import { GoalService } from '../goals/data/goal.service';

interface CatRow {
  label: string;
  pct: number; // 0..100 relative to largest
  amount: string;
  lead: boolean;
}

interface MonthBar {
  label: string;
  amount: string;
  heightPct: number; // 0..100 relative to max
  current: boolean;
}

/**
 * Dashboard (handoff §1) — hub.
 * Stats (DashboardService.summary) · graphe mensuel ApexCharts (DashboardService.monthly) ·
 * répartition catégories (CSS bars, DashboardService.categoryBreakdown) · transactions récentes
 * (TransactionService.search size 6) · mini-objectifs (GoalService.list) · tuile « solde projeté fin
 * de mois » (PredictionService) · CTA Insight AI → /insights. Aucune agrégation client : tout vient
 * du back.
 *
 * NOTE charts : ng-apexcharts 2.4.0 exige Angular >=20 (importe `afterEveryRender`, absent en 19.2,
 * échec de build). Fallback assumé sur des barres CSS tokenisées (mois courant en Or, reste neutre),
 * styling à plat identique au handoff `WeekBars`. À rebrancher sur ApexCharts au passage Angular 20.
 */
@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  template: `
    <header class="topbar">
      <div>
        <span class="eyebrow">{{ monthLabel }}</span>
        <h1 class="title">Salut, {{ firstName }}</h1>
      </div>
      <div class="actions">
        <a class="btn primary" routerLink="/transactions">
          <lucide-icon [img]="icons.Plus" [size]="18"></lucide-icon>
          Transaction
        </a>
      </div>
    </header>

    <section class="body">
      @if (errored()) {
        <div class="card error-card" role="alert">
          <lucide-icon
            [img]="icons.AlertTriangle"
            [size]="18"
            class="err-icon"
          ></lucide-icon>
          <div>
            <strong>Impossible de charger ton tableau de bord.</strong>
            <span>Réessaie dans un instant.</span>
          </div>
          <button type="button" class="btn ghost sm" (click)="reload()">
            Réessayer
          </button>
        </div>
      }

      <!-- Stats -->
      <div class="stats">
        <div class="card stat">
          <span class="eyebrow">Solde du mois</span>
          @if (loading()) {
            <span class="skeleton hero-sk"></span>
          } @else {
            <span
              class="hero font-display amount"
              [class.pos]="balancePositive()"
              >{{ balance() }}</span
            >
          }
          <span class="stat-sub"
            >{{ summary()?.transactionCount ?? 0 }} transactions ce mois</span
          >
        </div>
        <div class="card stat">
          <span class="eyebrow">Revenus</span>
          @if (loading()) {
            <span class="skeleton num-sk"></span>
          } @else {
            <span class="num amount pos">{{ income() }}</span>
          }
          <span class="stat-sub">Entrées du mois</span>
        </div>
        <div class="card stat">
          <span class="eyebrow">Dépenses</span>
          @if (loading()) {
            <span class="skeleton num-sk"></span>
          } @else {
            <span class="num amount neutral">{{ expense() }}</span>
          }
          <span class="stat-sub">Sorties du mois</span>
        </div>
      </div>

      @if (forecast(); as f) {
        <div class="card forecast">
          <div class="forecast-main">
            <span class="eyebrow">Solde projeté fin de mois</span>
            <div class="forecast-row">
              <span
                class="num font-display amount"
                [class.pos]="f.predictedBalance >= 0"
                >{{ forecastValue() }}</span
              >
              @if (f.lowConfidence) {
                <span class="forecast-tag">estimation</span>
              }
            </div>
            <span class="stat-sub"
              >Projection à partir de ton rythme du mois + historique</span
            >
          </div>
          @if (f.anomalies.length > 0) {
            <div class="forecast-anomalies">
              <lucide-icon
                [img]="icons.AlertTriangle"
                [size]="16"
              ></lucide-icon>
              {{ f.anomalies.length }} catégorie{{
                f.anomalies.length > 1 ? 's' : ''
              }}
              en hausse · {{ topAnomalyLabel(f) }} +{{
                f.anomalies[0].deltaPct
              }}&#8201;%
            </div>
          }
        </div>
      }

      <!-- Corps : 2 colonnes -->
      <div class="grid">
        <!-- Colonne gauche -->
        <div class="col">
          <!-- Dépenses mensuelles (ApexCharts) -->
          <div class="card">
            <div class="section-head">
              <div>
                <h2 class="card-title">Dépenses mensuelles</h2>
                <div class="card-sub">
                  12 derniers mois · mois en cours en surbrillance
                </div>
              </div>
            </div>
            @if (loading()) {
              <div class="chart-sk"></div>
            } @else if (monthBars().length === 0) {
              <p class="inline-empty">
                Aucune donnée mensuelle pour l'instant.
              </p>
            } @else {
              <div
                class="month-bars"
                role="img"
                [attr.aria-label]="monthlyAria()"
              >
                @for (b of monthBars(); track b.label) {
                  <div class="month-col">
                    <span
                      class="month-val amount"
                      [class.current]="b.current"
                      >{{ b.amount }}</span
                    >
                    <span class="month-bar-wrap">
                      <span
                        class="month-bar"
                        [class.current]="b.current"
                        [style.height.%]="b.heightPct"
                      ></span>
                    </span>
                    <span class="month-label" [class.current]="b.current">{{
                      b.label
                    }}</span>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Transactions récentes -->
          <div class="card">
            <div class="section-head">
              <h2 class="card-title">Transactions récentes</h2>
              <a class="link" routerLink="/transactions">
                Voir tout
                <lucide-icon
                  [img]="icons.ChevronRight"
                  [size]="15"
                ></lucide-icon>
              </a>
            </div>
            @if (loading()) {
              <div class="rows-sk">
                @for (i of [1, 2, 3, 4, 5, 6]; track i) {
                  <span class="skeleton row-sk"></span>
                }
              </div>
            } @else if (recent().length === 0) {
              <p class="inline-empty">Aucune transaction récente.</p>
            } @else {
              <div class="txn-list">
                @for (t of recent(); track t.id; let last = $last) {
                  <div class="txn-row" [class.last]="last">
                    <span class="cat-icon">
                      <lucide-icon
                        [img]="icons.CreditCard"
                        [size]="18"
                      ></lucide-icon>
                    </span>
                    <div class="txn-meta">
                      <span class="txn-desc">{{ t.description }}</span>
                      <span class="txn-sub">{{ formatDate(t.date) }}</span>
                    </div>
                    <span class="amount" [class.pos]="t.type === 'income'">{{
                      amount(t)
                    }}</span>
                  </div>
                }
              </div>
            }
          </div>
        </div>

        <!-- Colonne droite -->
        <div class="col">
          <!-- Insight AI : CTA inerte (P6) -->
          <div class="insight">
            <svg
              class="coin-motif"
              width="180"
              height="180"
              viewBox="0 0 180 180"
              aria-hidden="true"
            >
              <circle
                cx="90"
                cy="90"
                r="76"
                fill="none"
                stroke="var(--accent)"
                stroke-width="10"
              />
              <circle
                cx="90"
                cy="90"
                r="48"
                fill="none"
                stroke="var(--accent)"
                stroke-width="6"
              />
            </svg>
            <div class="insight-inner">
              <div class="insight-head">
                <span class="insight-badge">
                  <lucide-icon [img]="icons.Sparkles" [size]="18"></lucide-icon>
                </span>
                <span class="eyebrow">Insight AI</span>
              </div>
              <div class="insight-title">Comprendre mon mois en une phrase</div>
              <p class="insight-body">
                Picsou analyse tes dépenses et t'explique l'essentiel, en
                français.
              </p>
              <a class="btn primary sm" routerLink="/insights">
                <lucide-icon [img]="icons.ArrowRight" [size]="16"></lucide-icon>
                Comprendre mon mois
              </a>
            </div>
          </div>

          <!-- Répartition par catégorie -->
          <div class="card">
            <div class="section-head">
              <h2 class="card-title">Répartition par catégorie</h2>
            </div>
            @if (loading()) {
              <div class="rows-sk">
                @for (i of [1, 2, 3, 4]; track i) {
                  <span class="skeleton row-sk"></span>
                }
              </div>
            } @else if (catRows().length === 0) {
              <p class="inline-empty">Aucune dépense catégorisée ce mois.</p>
            } @else {
              <div class="cat-list">
                @for (c of catRows(); track c.label) {
                  <div class="cat-row">
                    <span class="cat-label">{{ c.label }}</span>
                    <span class="cat-track">
                      <span
                        class="cat-fill"
                        [class.lead]="c.lead"
                        [style.width.%]="c.pct"
                      ></span>
                    </span>
                    <span class="amount cat-amount" [class.lead]="c.lead">{{
                      c.amount
                    }}</span>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Mini-objectifs -->
          <div class="card">
            <div class="section-head">
              <h2 class="card-title">Objectifs</h2>
              <a class="link" routerLink="/goals">
                Voir tout
                <lucide-icon
                  [img]="icons.ChevronRight"
                  [size]="15"
                ></lucide-icon>
              </a>
            </div>
            @if (loading()) {
              <div class="rows-sk">
                @for (i of [1, 2]; track i) {
                  <span class="skeleton row-sk"></span>
                }
              </div>
            } @else if (miniGoals().length === 0) {
              <p class="inline-empty">
                Aucun objectif. Crée-en un depuis Objectifs.
              </p>
            } @else {
              <div class="goals-mini">
                @for (g of miniGoals(); track g.id) {
                  <a class="goal-mini" [routerLink]="['/goals', g.id]">
                    <div class="goal-mini-top">
                      <span class="goal-mini-name">{{ g.name }}</span>
                      <span class="amount goal-mini-amt"
                        >{{ saved(g) }} / {{ target(g) }}</span
                      >
                    </div>
                    <span
                      class="track"
                      role="progressbar"
                      [attr.aria-valuenow]="clampPct(g.progressPercent)"
                      aria-valuemin="0"
                      aria-valuemax="100"
                      [attr.aria-label]="g.name + ' : ' + clampPct(g.progressPercent) + '%'"
                    >
                      <span
                        class="fill"
                        [style.width.%]="clampPct(g.progressPercent)"
                      ></span>
                    </span>
                    <span class="goal-mini-pct" [class.done]="g.completed">
                      @if (g.completed) {
                        <lucide-icon
                          [img]="icons.Check"
                          [size]="13"
                        ></lucide-icon>
                        Atteint
                      } @else {
                        {{ round(g.progressPercent) }}&#8201;%
                      }
                    </span>
                  </a>
                }
              </div>
            }
          </div>
        </div>
      </div>
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

    /* Stats */
    .stats {
      display: grid;
      grid-template-columns: 1.5fr 1fr 1fr;
      gap: var(--space-5);
    }
    .stat {
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 10px;
    }
    .hero {
      font-size: 54px;
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
    }
    .num.pos {
      color: var(--positive);
    }
    .num.neutral {
      color: var(--text);
    }
    .stat-sub {
      font-size: 13px;
      color: var(--text-tertiary);
    }

    /* Grid */
    .grid {
      display: grid;
      grid-template-columns: 1.5fr 1fr;
      gap: var(--space-5);
      align-items: start;
    }
    .col {
      display: flex;
      flex-direction: column;
      gap: var(--space-5);
      min-width: 0;
    }

    /* Card */
    .card {
      background: var(--surface-raised);
      border: 0.5px solid var(--border);
      border-radius: var(--radius-lg);
      padding: var(--space-5) var(--space-6);
    }
    .section-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-4);
      margin-bottom: var(--space-4);
    }
    .card-title {
      margin: 0;
      font-size: 17px;
      font-weight: 600;
      letter-spacing: -0.2px;
      color: var(--text);
    }
    .card-sub {
      font-size: 13px;
      color: var(--text-tertiary);
      margin-top: 3px;
    }
    .link {
      font-size: 13px;
      color: var(--text-secondary);
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      white-space: nowrap;
    }
    .link:hover {
      color: var(--text);
    }

    /* Error */
    .error-card {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      background: rgba(217, 45, 32, 0.1);
      border-color: rgba(217, 45, 32, 0.3);
    }
    .error-card > div {
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .error-card strong {
      font-size: 14px;
      color: var(--text);
    }
    .error-card span {
      font-size: 13px;
      color: var(--text-secondary);
    }
    .err-icon {
      color: var(--danger);
      flex-shrink: 0;
    }

    /* Transactions */
    .txn-list {
      display: flex;
      flex-direction: column;
    }
    .txn-row {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px 0;
      border-bottom: 0.5px solid var(--border);
    }
    .txn-row.last {
      border-bottom: none;
    }
    .cat-icon {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-md);
      background: var(--surface);
      border: 0.5px solid var(--border);
      color: var(--text-secondary);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .txn-meta {
      display: flex;
      flex-direction: column;
      min-width: 0;
      flex: 1;
    }
    .txn-desc {
      font-size: 15px;
      font-weight: 500;
      color: var(--text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .txn-sub {
      font-size: 12.5px;
      color: var(--text-tertiary);
      margin-top: 2px;
    }
    .amount {
      font-variant-numeric: tabular-nums;
      font-feature-settings: 'tnum';
      white-space: nowrap;
    }
    .txn-row .amount {
      font-size: 15px;
      font-weight: 500;
      color: var(--text);
    }
    .txn-row .amount.pos {
      color: var(--positive);
    }

    /* Insight tile */
    .insight {
      position: relative;
      overflow: hidden;
      border-radius: var(--radius-lg);
      background: linear-gradient(
        150deg,
        var(--tile-gradient-start) 0%,
        var(--surface-raised) 60%
      );
      border: 0.5px solid rgba(255, 214, 10, 0.28);
      padding: var(--space-6);
    }
    .coin-motif {
      position: absolute;
      right: -34px;
      top: -34px;
      opacity: 0.06;
    }
    .insight-inner {
      position: relative;
    }
    .insight-head {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 14px;
    }
    .insight-badge {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-md);
      background: var(--accent);
      color: var(--on-accent);
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .insight-title {
      font-size: 19px;
      font-weight: 600;
      line-height: 1.3;
      margin-bottom: 6px;
      letter-spacing: -0.2px;
      color: var(--text);
    }
    .insight-body {
      margin: 0 0 18px;
      font-size: 14px;
      color: var(--text-secondary);
      line-height: 1.5;
    }

    /* Category breakdown bars */
    .cat-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .cat-row {
      display: grid;
      grid-template-columns: 92px 1fr 64px;
      align-items: center;
      gap: 12px;
    }
    .cat-label {
      font-size: 13px;
      color: var(--text-secondary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .cat-track {
      height: 10px;
      background: var(--surface);
      border-radius: var(--radius-sm);
      overflow: hidden;
    }
    .cat-fill {
      display: block;
      height: 100%;
      border-radius: var(--radius-sm);
      background: var(--neutre);
      transition: width var(--dur) var(--ease);
    }
    .cat-fill.lead {
      background: var(--accent);
    }
    .cat-amount {
      font-size: 13px;
      font-weight: 500;
      text-align: right;
      color: var(--text-secondary);
    }
    .cat-amount.lead {
      color: var(--text);
    }

    /* Mini goals */
    .goals-mini {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .goal-mini {
      display: block;
      text-decoration: none;
    }
    .goal-mini-top {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 12px;
      margin-bottom: 8px;
    }
    .goal-mini-name {
      font-size: 14px;
      font-weight: 500;
      color: var(--text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .goal-mini-amt {
      font-size: 13px;
      color: var(--text-secondary);
      white-space: nowrap;
    }
    .track {
      display: block;
      height: 8px;
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
    .goal-mini-pct {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      color: var(--text-tertiary);
      margin-top: 7px;
    }
    .goal-mini-pct.done {
      color: var(--positive);
    }

    /* Skeletons / inline states */
    .skeleton {
      display: block;
      background: var(--surface);
      border-radius: var(--radius-sm);
      animation: pulse 1.2s var(--ease) infinite;
    }
    .hero-sk {
      width: 60%;
      height: 50px;
    }
    .num-sk {
      width: 50%;
      height: 28px;
    }
    .row-sk {
      height: 16px;
      width: 100%;
    }
    .rows-sk {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .chart-sk {
      height: 240px;
      background: var(--surface);
      border-radius: var(--radius-md);
      animation: pulse 1.2s var(--ease) infinite;
    }

    /* Monthly bars (flat, token-driven; current month in Or) */
    .month-bars {
      display: flex;
      align-items: stretch;
      gap: 8px;
      height: 230px;
      padding-top: 8px;
    }
    .month-col {
      flex: 1;
      min-width: 0;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
    }
    .month-val {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-tertiary);
      white-space: nowrap;
    }
    .month-val.current {
      color: var(--text);
    }
    .month-bar-wrap {
      width: 100%;
      flex: 1;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }
    .month-bar {
      width: 100%;
      max-width: 30px;
      min-height: 6px;
      border-radius: var(--radius-sm);
      background: var(--surface);
      border: 0.5px solid var(--border-strong);
      transition: height var(--dur) var(--ease);
    }
    .month-bar.current {
      background: var(--accent);
      border: none;
    }
    .month-label {
      font-size: 11px;
      color: var(--text-tertiary);
    }
    .month-label.current {
      color: var(--text-secondary);
      font-weight: 600;
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
    .inline-empty {
      margin: 0;
      font-size: 14px;
      color: var(--text-tertiary);
      padding: var(--space-2) 0;
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
      text-decoration: none;
      transition:
        filter var(--dur) var(--ease),
        background var(--dur) var(--ease);
    }
    .btn.sm {
      min-height: 36px;
      padding: 8px 14px;
    }
    .btn.primary {
      background: var(--accent);
      color: var(--on-accent);
    }
    .btn.primary:hover:not(:disabled) {
      filter: brightness(1.05);
    }
    .btn.primary:disabled {
      opacity: 0.55;
      cursor: default;
    }
    .btn.ghost {
      background: transparent;
      color: var(--text);
      border-color: var(--border-strong);
    }
    .btn.ghost:hover {
      background: rgba(250, 247, 239, 0.04);
    }

    .forecast {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-5);
      flex-wrap: wrap;
    }
    .forecast-row {
      display: flex;
      align-items: baseline;
      gap: 10px;
      margin: 2px 0 4px;
    }
    .forecast-tag {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: var(--text-tertiary);
      border: 0.5px solid var(--border);
      border-radius: var(--radius-pill);
      padding: 2px 8px;
    }
    .forecast-anomalies {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: var(--danger);
      background: rgba(217, 45, 32, 0.08);
      border: 0.5px solid rgba(217, 45, 32, 0.25);
      border-radius: var(--radius-md);
      padding: 10px 14px;
    }

    @media (max-width: 1024px) {
      .grid,
      .stats {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 640px) {
      .topbar {
        flex-wrap: wrap;
        gap: var(--space-4);
        padding: var(--space-5) var(--space-4);
      }
      .body {
        padding: var(--space-5) var(--space-4);
        gap: var(--space-4);
      }
      .title {
        font-size: 22px;
      }
      .hero {
        font-size: 40px;
      }
      .actions {
        width: 100%;
      }
    }
  `,
})
export class DashboardPageComponent {
  private readonly dashboard = inject(DashboardService);
  private readonly predictions = inject(PredictionService);
  private readonly transactions = inject(TransactionService);
  private readonly goals = inject(GoalService);
  private readonly storage = inject(TokenStorageService);
  private readonly snack = inject(MatSnackBar);

  readonly icons: {
    Plus: LucideIconData;
    ChevronRight: LucideIconData;
    CreditCard: LucideIconData;
    Sparkles: LucideIconData;
    ArrowRight: LucideIconData;
    Check: LucideIconData;
    AlertTriangle: LucideIconData;
  } = {
    Plus,
    ChevronRight,
    CreditCard,
    Sparkles,
    ArrowRight,
    Check,
    AlertTriangle,
  };

  readonly firstName = this.storage.getFirstName() ?? 'toi';
  readonly monthLabel = new Date()
    .toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    .toUpperCase();

  readonly loading = signal(true);
  readonly errored = signal(false);
  readonly summary = signal<DashboardSummary | null>(null);
  readonly monthly = signal<MonthlyPoint[]>([]);
  readonly categories = signal<CategorySlice[]>([]);
  readonly recent = signal<Transaction[]>([]);
  readonly miniGoals = signal<Goal[]>([]);
  readonly forecast = signal<PredictionResponse | null>(null);

  readonly forecastValue = computed(() =>
    eur(this.forecast()?.predictedBalance ?? null, { plus: true }),
  );

  readonly balance = computed(() =>
    eur(this.summary()?.balance ?? null, { plus: true }),
  );
  readonly balancePositive = computed(
    () => (this.summary()?.balance ?? 0) >= 0,
  );
  readonly income = computed(() =>
    eur(this.summary()?.income ?? null, { plus: true }),
  );
  readonly expense = computed(() => eur(this.summary()?.expense ?? null));

  /** Barres mensuelles CSS (mois courant en Or, hauteur relative au max). */
  readonly monthBars = computed<MonthBar[]>(() => {
    const points = this.monthly();
    if (points.length === 0) {
      return [];
    }
    const max = Math.max(...points.map((p) => Math.abs(p.total)), 1);
    return points.map((p) => {
      const v = Math.abs(p.total);
      return {
        label: this.monthShort(p.period),
        amount: eur(v),
        heightPct: v <= 0 ? 0 : Math.max(4, Math.round((v / max) * 100)),
        current: p.current,
      };
    });
  });

  readonly monthlyAria = computed(() => {
    const cur = this.monthly().find((p) => p.current);
    return cur
      ? `Dépenses mensuelles sur 12 mois ; mois en cours ${eur(Math.abs(cur.total))}.`
      : 'Dépenses mensuelles sur 12 mois.';
  });

  readonly catRows = computed<CatRow[]>(() => {
    const sorted = [...this.categories()].sort(
      (a, b) => Math.abs(b.total) - Math.abs(a.total),
    );
    if (sorted.length === 0) {
      return [];
    }
    const max = Math.abs(sorted[0].total) || 1;
    return sorted.map((s, i) => ({
      label: s.category,
      pct: Math.round((Math.abs(s.total) / max) * 100),
      amount: eur(Math.abs(s.total)),
      lead: i === 0,
    }));
  });

  constructor() {
    this.load();
  }

  reload(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.errored.set(false);
    forkJoin({
      summary: this.dashboard.summary(),
      monthly: this.dashboard.monthly(),
      categories: this.dashboard.categoryBreakdown(),
      recent: this.transactions.search({ size: 6, sort: 'date,desc' }),
      goals: this.goals.list(),
    }).subscribe({
      next: (r) => {
        this.summary.set(r.summary);
        this.monthly.set(r.monthly);
        this.categories.set(r.categories);
        this.recent.set(r.recent.slice(0, 6));
        this.miniGoals.set(r.goals.slice(0, 2));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.errored.set(true);
        this.snack.open('Impossible de charger le tableau de bord.', 'OK', {
          duration: 4000,
        });
      },
    });
    // Prédiction chargée à part : un échec ne doit pas casser le dashboard (algo, sans clé IA).
    this.predictions.endOfMonth().subscribe({
      next: (f) => this.forecast.set(f),
      error: () => this.forecast.set(null),
    });
  }

  topAnomalyLabel(f: PredictionResponse): string {
    return f.anomalies.length === 0 ? '' : f.anomalies[0].category;
  }

  // ── Display helpers ──
  amount(t: Transaction): string {
    return eur(t.type === 'income' ? t.amount : -t.amount, {
      plus: t.type === 'income',
    });
  }

  saved(g: Goal): string {
    return eur(g.currentAmount);
  }

  target(g: Goal): string {
    return eur(g.targetAmount);
  }

  round(n: number): number {
    return Math.round(n);
  }

  clampPct(n: number): number {
    return Math.max(0, Math.min(100, n));
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return '—';
    }
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  }

  private monthShort(period: string): string {
    // 'YYYY-MM' → 'janv.' …
    const [y, m] = period.split('-').map(Number);
    if (!y || !m) {
      return period;
    }
    return new Date(y, m - 1, 1)
      .toLocaleDateString('fr-FR', { month: 'short' })
      .replace('.', '');
  }
}
