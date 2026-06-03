import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import {
  Check,
  LucideAngularModule,
  LucideIconData,
  RefreshCw,
  Send,
  Sparkles,
} from 'lucide-angular';

import { eur } from '../transactions/util/currency';
import { InsightResponse } from './data/ai.models';
import { InsightService } from './data/insight.service';
import {
  InsightQaService,
  QUESTION_MAX_LENGTH,
} from './data/insight-qa.service';
import { renderInsightMarkdown } from './insight-markdown';

interface QaTurn {
  id: number;
  question: string;
  state: 'loading' | 'done' | 'error';
  answerHtml?: string;
  error?: string;
}

/**
 * Écran Insights (handoff screen-insights.jsx) : prose IA + StatChips data-driven (depuis facts,
 * jamais la prose) + AngleChips (v1 statiques). États loading / « IA non configurée » (503).
 */
@Component({
  selector: 'app-insights-page',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <header class="topbar">
      <div>
        <span class="eyebrow">{{ periodLabel() }}</span>
        <h1 class="title">Insights</h1>
      </div>
      @if (!loading() && !unavailable()) {
        <button type="button" class="btn ghost" (click)="reload()">
          <lucide-icon [img]="icons.RefreshCw" [size]="18"></lucide-icon>
          Réanalyser
        </button>
      }
    </header>

    <section class="body">
      <div class="wrap">
        @if (unavailable()) {
          <div class="card notice">
            <span class="notice-icon"
              ><lucide-icon [img]="icons.Sparkles" [size]="22"></lucide-icon
            ></span>
            <h2 class="notice-title">IA non configurée</h2>
            <p class="notice-body">
              Le résumé intelligent nécessite une clé Anthropic côté serveur.
              Tes prédictions et tes tableaux de bord restent disponibles — ils
              ne dépendent pas de l'IA.
            </p>
          </div>
        } @else {
          <div class="brand-card">
            <div class="brand-head">
              <span class="spark" [class.pulse]="loading()">
                <lucide-icon [img]="icons.Sparkles" [size]="21"></lucide-icon>
              </span>
              <div>
                <span class="eyebrow">Insight AI</span>
                <div class="brand-sub">Ton mois, en quelques phrases</div>
              </div>
            </div>

            @if (loading()) {
              <p class="loading-text">Picsou analyse ton mois…</p>
              <div class="shimmer" style="width:92%"></div>
              <div class="shimmer" style="width:100%"></div>
              <div class="shimmer" style="width:78%"></div>
            } @else if (errored()) {
              <p class="prose">
                Impossible de générer l'analyse pour l'instant.
              </p>
              <button type="button" class="btn ghost sm" (click)="reload()">
                Réessayer
              </button>
            } @else {
              @if (insight(); as ins) {
                <div class="prose" [innerHTML]="renderedInsight()"></div>
                <div class="chips">
                  @for (
                    c of ins.facts.topCategories.slice(0, 3);
                    track c.name
                  ) {
                    <div class="chip">
                      <div class="chip-value amount">{{ eur(c.amount) }}</div>
                      <div class="chip-label">{{ c.name }}</div>
                    </div>
                  }
                  <div class="chip">
                    <div
                      class="chip-value amount"
                      [class.pos]="ins.facts.net >= 0"
                      [class.neg]="ins.facts.net < 0"
                    >
                      {{ eur(ins.facts.net) }}
                    </div>
                    <div class="chip-label">Solde net du mois</div>
                  </div>
                </div>
              }
            }
          </div>

          @if (!loading() && insight()) {
            <div class="angles">
              <div class="angles-title">Demander un autre angle</div>
              <div class="angles-row">
                @for (a of angleChips; track a) {
                  <span class="angle">{{ a }}</span>
                }
              </div>
            </div>
            <div class="privacy">
              <lucide-icon [img]="icons.Check" [size]="14"></lucide-icon>
              Analyse générée à partir de tes données anonymisées. Picsou ne
              partage rien.
              @if (insight()?.cached) {
                · mis en cache
              }
            </div>
          }

          <!-- Q&A libre -->
          <div class="qa">
            <div class="qa-head">
              <span class="eyebrow">Pose ta question</span>
              <div class="qa-sub">
                Demande ce que tu veux sur tes finances — l'IA répond à partir de
                tes données.
              </div>
            </div>

            @if (turns().length > 0) {
              <div class="qa-thread" aria-live="polite">
                @for (t of turns(); track t.id) {
                  <div class="qa-turn">
                    <div class="qa-q">
                      <span class="qa-q-label">Toi</span>
                      <span>{{ t.question }}</span>
                    </div>
                    @switch (t.state) {
                      @case ('loading') {
                        <div class="qa-a loading">
                          <span class="qa-dot"></span>
                          <span class="qa-dot"></span>
                          <span class="qa-dot"></span>
                          <span class="qa-loading-text">L'IA réfléchit…</span>
                        </div>
                      }
                      @case ('error') {
                        <div class="qa-a error" role="alert">{{ t.error }}</div>
                      }
                      @default {
                        <div class="qa-a prose" [innerHTML]="t.answerHtml"></div>
                      }
                    }
                  </div>
                }
              </div>
            }

            <form class="qa-form" (ngSubmit)="ask()">
              <div class="qa-input" [class.over]="question().length > maxLen">
                <label class="sr-only" for="qa-question">Ta question</label>
                <textarea
                  id="qa-question"
                  rows="2"
                  [value]="question()"
                  (input)="onInput($event)"
                  (keydown.enter)="onEnter($event)"
                  [attr.maxlength]="maxLen"
                  [disabled]="pending()"
                  placeholder="Ex. Où part le plus gros de mon budget ce mois-ci ?"
                ></textarea>
                <button
                  type="submit"
                  class="qa-send"
                  [disabled]="!canAsk()"
                  aria-label="Envoyer la question"
                >
                  <lucide-icon [img]="icons.Send" [size]="18"></lucide-icon>
                </button>
              </div>
              <div class="qa-meta">
                <span class="qa-count" [class.over]="question().length > maxLen">
                  {{ question().length }}/{{ maxLen }}
                </span>
              </div>
            </form>
          </div>
        }
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
    .body {
      padding: var(--space-10) var(--space-8);
      display: flex;
      justify-content: center;
    }
    .wrap {
      width: 100%;
      max-width: 760px;
    }
    .card {
      background: var(--surface-raised);
      border: 0.5px solid var(--border);
      border-radius: var(--radius-lg);
      padding: var(--space-6);
    }

    /* Carte de marque (sombre + or) */
    .brand-card {
      position: relative;
      overflow: hidden;
      border-radius: var(--radius-lg);
      background: linear-gradient(
        155deg,
        var(--tile-gradient-start) 0%,
        var(--surface-raised) 55%
      );
      border: 0.5px solid rgba(255, 214, 10, 0.3);
      padding: var(--space-10);
    }
    .brand-head {
      display: flex;
      align-items: center;
      gap: 11px;
      margin-bottom: var(--space-6);
    }
    .spark {
      width: 38px;
      height: 38px;
      border-radius: var(--radius-md);
      background: var(--accent);
      color: var(--on-accent);
      display: grid;
      place-items: center;
      flex-shrink: 0;
    }
    .spark.pulse {
      animation: pulse 1.2s var(--ease) infinite;
    }
    .brand-sub {
      font-size: 15px;
      font-weight: 600;
      margin-top: 2px;
      color: var(--text);
    }
    .prose {
      margin: 0;
      font-size: 22px;
      line-height: 1.6;
      color: var(--text);
      letter-spacing: -0.2px;
    }
    .prose :first-child {
      margin-top: 0;
    }
    .prose :last-child {
      margin-bottom: 0;
    }
    .prose p {
      margin: 0 0 var(--space-4);
    }
    .prose strong {
      font-weight: 600;
    }
    .prose em {
      font-style: italic;
    }
    .prose h3 {
      margin: 0 0 var(--space-3);
      font-size: 24px;
      font-weight: 600;
      letter-spacing: -0.3px;
    }
    .prose h4 {
      margin: var(--space-4) 0 var(--space-2);
      font-size: 19px;
      font-weight: 600;
    }
    .prose ul {
      margin: 0 0 var(--space-4);
      padding-left: 1.25em;
    }
    .prose li {
      margin: 0 0 var(--space-2);
    }
    .loading-text {
      font-size: 19px;
      font-weight: 500;
      color: var(--text-secondary);
      margin: 0 0 22px;
    }
    .shimmer {
      height: 16px;
      border-radius: 6px;
      margin-bottom: 14px;
      background: var(--surface);
      animation: pulse 1.2s var(--ease) infinite;
    }

    .chips {
      display: flex;
      gap: 12px;
      margin-top: var(--space-8);
    }
    .chip {
      flex: 1;
      padding: 14px 16px;
      background: rgba(255, 255, 255, 0.03);
      border: 0.5px solid var(--border);
      border-radius: var(--radius-md);
    }
    .chip-value {
      font-size: 22px;
      font-weight: 600;
      color: var(--text);
    }
    .chip-value.pos {
      color: var(--positive);
    }
    .chip-value.neg {
      color: var(--danger);
    }
    .chip-label {
      font-size: 12.5px;
      color: var(--text-secondary);
      margin-top: 4px;
    }
    .amount {
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    .angles {
      margin-top: var(--space-8);
    }
    .angles-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-secondary);
      margin-bottom: 14px;
    }
    .angles-row {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .angle {
      padding: 9px 14px;
      border-radius: var(--radius-pill);
      border: 0.5px solid var(--border-strong);
      background: var(--surface);
      font-size: 13.5px;
      font-weight: 500;
      color: var(--text);
      white-space: nowrap;
    }
    .privacy {
      display: flex;
      align-items: center;
      gap: 8px;
      justify-content: center;
      margin-top: var(--space-8);
      font-size: 12.5px;
      color: var(--text-tertiary);
    }

    /* Notice « IA non configurée » */
    .notice {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: var(--space-3);
      padding: var(--space-12) var(--space-6);
    }
    .notice-icon {
      width: 72px;
      height: 72px;
      border-radius: var(--radius-pill);
      background: var(--surface);
      border: 0.5px solid var(--border);
      color: var(--text-secondary);
      display: grid;
      place-items: center;
    }
    .notice-title {
      margin: 0;
      font-size: 21px;
      font-weight: 600;
      color: var(--text);
    }
    .notice-body {
      margin: 0;
      font-size: 15px;
      color: var(--text-secondary);
      line-height: 1.5;
      max-width: 460px;
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
    }
    .btn.sm {
      min-height: 36px;
      padding: 8px 14px;
      margin-top: 14px;
    }
    .btn.ghost {
      background: transparent;
      color: var(--text);
      border-color: var(--border-strong);
    }
    .btn.ghost:hover {
      background: rgba(250, 247, 239, 0.04);
    }

    /* ── Q&A libre ── */
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
    .qa {
      margin-top: var(--space-6);
      padding-top: var(--space-6);
      border-top: 0.5px solid var(--border);
    }
    .qa-head {
      margin-bottom: var(--space-5);
    }
    .qa-sub {
      margin-top: var(--space-2);
      font-size: var(--text-sm);
      color: var(--text-secondary);
      line-height: 1.5;
    }
    .qa-thread {
      display: flex;
      flex-direction: column;
      gap: var(--space-5);
      margin-bottom: var(--space-5);
    }
    .qa-turn {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }
    .qa-q {
      display: flex;
      gap: var(--space-3);
      align-items: baseline;
      font-size: var(--text-body);
      font-weight: 500;
      color: var(--text);
    }
    .qa-q-label {
      flex-shrink: 0;
      font-size: var(--text-meta);
      font-weight: 600;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      color: var(--text-tertiary);
      padding-top: 3px;
    }
    .qa-a {
      padding: var(--space-4) var(--space-5);
      background: var(--surface);
      border: 0.5px solid var(--border);
      border-radius: var(--radius-lg);
      font-size: var(--text-body);
      line-height: 1.6;
      color: var(--text);
    }
    .qa-a.error {
      color: var(--danger);
      background: transparent;
    }
    .qa-a.loading {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      color: var(--text-secondary);
    }
    .qa-loading-text {
      margin-left: var(--space-2);
      font-size: var(--text-sm);
    }
    .qa-dot {
      width: 6px;
      height: 6px;
      border-radius: var(--radius-pill);
      background: var(--text-tertiary);
      animation: qaBlink 1.2s var(--ease) infinite;
    }
    .qa-dot:nth-child(2) {
      animation-delay: 0.2s;
    }
    .qa-dot:nth-child(3) {
      animation-delay: 0.4s;
    }
    @keyframes qaBlink {
      0%,
      100% {
        opacity: 0.3;
      }
      50% {
        opacity: 1;
      }
    }
    /* La réponse réutilise les styles .prose (titres/listes/gras) déjà définis. */
    .qa-a.prose {
      font-size: var(--text-body);
    }

    .qa-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }
    .qa-input {
      display: flex;
      align-items: flex-end;
      gap: var(--space-2);
      padding: var(--space-2) var(--space-2) var(--space-2) var(--space-4);
      background: var(--surface-raised);
      border: 0.5px solid var(--border-strong);
      border-radius: var(--radius-md);
      transition: border-color var(--dur-fast) var(--ease);
    }
    .qa-input:focus-within {
      border-color: var(--text-tertiary);
    }
    .qa-input.over {
      border-color: var(--danger);
    }
    .qa-input textarea {
      flex: 1;
      min-width: 0;
      resize: none;
      border: none;
      outline: none;
      background: transparent;
      color: var(--text);
      font-family: var(--font-sans);
      font-size: var(--text-body);
      line-height: 1.5;
      padding: var(--space-2) 0;
    }
    .qa-input textarea::placeholder {
      color: var(--text-tertiary);
    }
    .qa-input textarea:disabled {
      opacity: 0.6;
    }
    .qa-send {
      flex-shrink: 0;
      width: 40px;
      height: 40px;
      display: grid;
      place-items: center;
      border: none;
      border-radius: var(--radius-md);
      background: var(--accent);
      color: var(--on-accent);
      cursor: pointer;
      transition: filter var(--dur-fast) var(--ease);
    }
    .qa-send:hover:not(:disabled) {
      filter: brightness(1.05);
    }
    .qa-send:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .qa-meta {
      display: flex;
      justify-content: flex-end;
      padding-right: var(--space-1);
    }
    .qa-count {
      font-size: var(--text-meta);
      color: var(--text-tertiary);
      font-variant-numeric: tabular-nums;
    }
    .qa-count.over {
      color: var(--danger);
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
        padding: var(--space-6) var(--space-4);
      }
    }
  `,
})
export class InsightsPageComponent {
  private readonly service = inject(InsightService);
  private readonly qa = inject(InsightQaService);

  readonly icons: {
    Sparkles: LucideIconData;
    RefreshCw: LucideIconData;
    Check: LucideIconData;
    Send: LucideIconData;
  } = {
    Sparkles,
    RefreshCw,
    Check,
    Send,
  };
  readonly eur = eur;
  readonly angleChips = [
    'Et mes abonnements ?',
    'Compare à avril',
    'Où je peux économiser ?',
    'Pourquoi autant de restos ?',
  ];

  readonly loading = signal(true);
  readonly errored = signal(false);
  readonly unavailable = signal(false);
  readonly insight = signal<InsightResponse | null>(null);

  /** Prose IA rendue en HTML sûr (markdown LLM → strong/titres/listes). */
  readonly renderedInsight = computed(() =>
    renderInsightMarkdown(this.insight()?.text),
  );

  // ── Q&A libre ──
  readonly maxLen = QUESTION_MAX_LENGTH;
  readonly question = signal('');
  readonly turns = signal<QaTurn[]>([]);
  private nextTurnId = 0;

  /** Une requête est en vol : on bloque l'envoi concurrent. */
  readonly pending = computed(() =>
    this.turns().some((t) => t.state === 'loading'),
  );

  /** Validation client miroir du back : non vide, ≤ 500, pas de requête en cours. */
  readonly canAsk = computed(() => {
    const q = this.question().trim();
    return q.length >= 1 && q.length <= this.maxLen && !this.pending();
  });

  constructor() {
    this.load();
  }

  onInput(event: Event): void {
    this.question.set((event.target as HTMLTextAreaElement).value);
  }

  /** Entrée = envoyer ; Maj+Entrée = nouvelle ligne. */
  onEnter(event: Event): void {
    const e = event as KeyboardEvent;
    if (!e.shiftKey) {
      e.preventDefault();
      this.ask();
    }
  }

  ask(): void {
    const q = this.question().trim();
    if (!this.canAsk()) {
      return;
    }
    const id = ++this.nextTurnId;
    this.turns.update((ts) => [...ts, { id, question: q, state: 'loading' }]);
    this.question.set('');

    this.qa.ask(q).subscribe({
      next: (r) =>
        this.patchTurn(id, {
          state: 'done',
          answerHtml: renderInsightMarkdown(r.answer),
        }),
      error: (err: HttpErrorResponse) =>
        this.patchTurn(id, { state: 'error', error: this.askError(err) }),
    });
  }

  private patchTurn(id: number, patch: Partial<QaTurn>): void {
    this.turns.update((ts) =>
      ts.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    );
  }

  private askError(err: HttpErrorResponse): string {
    if (err.status === 503) {
      return "L'IA est momentanément indisponible. Réessaie dans un instant.";
    }
    if (err.status === 400) {
      return 'Question invalide (1 à 500 caractères).';
    }
    return "Impossible d'obtenir une réponse pour l'instant.";
  }

  reload(): void {
    this.load();
  }

  periodLabel(): string {
    const ins = this.insight();
    if (!ins) {
      return 'Ce mois-ci';
    }
    const d = new Date(ins.periodStart);
    return Number.isNaN(d.getTime())
      ? 'Ce mois-ci'
      : d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }

  private load(): void {
    this.loading.set(true);
    this.errored.set(false);
    this.unavailable.set(false);
    this.service.monthly().subscribe({
      next: (insight) => {
        this.insight.set(insight);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        if (err.status === 503) {
          this.unavailable.set(true);
        } else {
          this.errored.set(true);
        }
      },
    });
  }
}
