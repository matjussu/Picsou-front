import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  Calendar,
  ChevronDown,
  CreditCard,
  Landmark,
  LucideAngularModule,
  LucideIconData,
  Plus,
  Receipt,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-angular';

import { AddTransactionDialogComponent } from './add-transaction-dialog/add-transaction-dialog.component';
import { AccountService } from './data/account.service';
import { CategoryService } from './data/category.service';
import {
  Account,
  Category,
  Transaction,
  TransactionFilters,
  TransactionType,
} from './data/transaction.models';
import { TransactionService } from './data/transaction.service';
import { eur } from './util/currency';

interface ActiveChip {
  key: keyof TransactionFilters | 'period';
  label: string;
  primary: boolean;
}

type PeriodPreset = 'month' | '30d';

/**
 * Écran Transactions (handoff §2).
 * Top bar · recherche + chips de filtre (Catégorie / Compte / Type) · chips de filtres actifs
 * (supprimables, re-fetch backend) · tableau dans une Card avec barre de résumé.
 *
 * RÈGLE NOTÉE : tout filtre passe par TransactionService.search(filters) — jamais de .filter() client.
 * OCR « Scanner un ticket » différé P6 (omis). Badges coloc + récurrence différés P4 (omis).
 */
@Component({
  selector: 'app-transactions-page',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, MatMenuModule],
  template: `
    <header class="topbar">
      <div>
        <span class="eyebrow">Mai 2026</span>
        <h1 class="title">Transactions</h1>
      </div>
      <div class="actions">
        <button type="button" class="btn primary" (click)="openAdd()">
          <lucide-icon [img]="icons.Plus" [size]="18"></lucide-icon>
          Transaction
        </button>
      </div>
    </header>

    <section class="body">
      <!-- Recherche + chips de filtre -->
      <div class="toolbar">
        <div class="search">
          <lucide-icon [img]="icons.Search" [size]="18" class="search-icon"></lucide-icon>
          <input
            type="search"
            class="search-input"
            placeholder="Rechercher une transaction…"
            aria-label="Rechercher une transaction"
            [ngModel]="query()"
            (ngModelChange)="onQueryChange($event)"
          />
        </div>

        <!-- Période -->
        <button
          type="button"
          class="chip"
          [class.active]="period()"
          [matMenuTriggerFor]="periodMenu"
        >
          <lucide-icon [img]="icons.Calendar" [size]="15" class="chip-icon"></lucide-icon>
          <span class="chip-label">Période</span>
          <span class="chip-value">{{ periodLabel() }}</span>
          <lucide-icon [img]="icons.ChevronDown" [size]="14"></lucide-icon>
        </button>
        <mat-menu #periodMenu="matMenu" class="picsou-menu">
          <button mat-menu-item (click)="setPeriod('month')">Ce mois</button>
          <button mat-menu-item (click)="setPeriod('30d')">30 derniers jours</button>
          <button mat-menu-item (click)="setPeriod(null)">Tout</button>
        </mat-menu>

        <!-- Catégorie -->
        <button
          type="button"
          class="chip"
          [class.active]="filters().categoryId"
          [matMenuTriggerFor]="catMenu"
        >
          <span class="chip-label">Catégorie</span>
          <span class="chip-value">{{ categoryLabel() }}</span>
          <lucide-icon [img]="icons.ChevronDown" [size]="14"></lucide-icon>
        </button>
        <mat-menu #catMenu="matMenu" class="picsou-menu">
          <button mat-menu-item (click)="setCategory(null)">Toutes</button>
          @for (cat of categories(); track cat.id) {
            <button mat-menu-item (click)="setCategory(cat.id)">{{ cat.name }}</button>
          }
        </mat-menu>

        <!-- Compte -->
        <button
          type="button"
          class="chip"
          [class.active]="filters().accountId"
          [matMenuTriggerFor]="accMenu"
        >
          <lucide-icon [img]="icons.Landmark" [size]="15" class="chip-icon"></lucide-icon>
          <span class="chip-label">Compte</span>
          <span class="chip-value">{{ accountLabel() }}</span>
          <lucide-icon [img]="icons.ChevronDown" [size]="14"></lucide-icon>
        </button>
        <mat-menu #accMenu="matMenu" class="picsou-menu">
          <button mat-menu-item (click)="setAccount(null)">Tous</button>
          @for (acc of accounts(); track acc.id) {
            <button mat-menu-item (click)="setAccount(acc.id)">{{ acc.name }}</button>
          }
        </mat-menu>

        <!-- Type -->
        <button
          type="button"
          class="chip"
          [class.active]="filters().type"
          [matMenuTriggerFor]="typeMenu"
        >
          <span class="chip-label">Type</span>
          <span class="chip-value">{{ typeLabel() }}</span>
          <lucide-icon [img]="icons.ChevronDown" [size]="14"></lucide-icon>
        </button>
        <mat-menu #typeMenu="matMenu" class="picsou-menu">
          <button mat-menu-item (click)="setType(null)">Tous</button>
          <button mat-menu-item (click)="setType('expense')">Dépense</button>
          <button mat-menu-item (click)="setType('income')">Revenu</button>
        </mat-menu>

        <button
          type="button"
          class="btn ghost"
          [class.active]="showAdvanced()"
          [attr.aria-expanded]="showAdvanced()"
          (click)="toggleAdvanced()"
        >
          <lucide-icon [img]="icons.SlidersHorizontal" [size]="18"></lucide-icon>
          Filtres
        </button>
      </div>

      <!-- Filtres avancés (montant) — tape le back via minAmount/maxAmount -->
      @if (showAdvanced()) {
        <div class="advanced">
          <label class="adv-field">
            <span>Montant min</span>
            <input
              type="number"
              min="0"
              step="0.01"
              inputmode="decimal"
              placeholder="0,00"
              [ngModel]="filters().minAmount"
              (ngModelChange)="setMinAmount($event)"
            />
            <span class="adv-unit">€</span>
          </label>
          <label class="adv-field">
            <span>Montant max</span>
            <input
              type="number"
              min="0"
              step="0.01"
              inputmode="decimal"
              placeholder="—"
              [ngModel]="filters().maxAmount"
              (ngModelChange)="setMaxAmount($event)"
            />
            <span class="adv-unit">€</span>
          </label>
        </div>
      }

      <!-- Filtres actifs -->
      @if (activeChips().length > 0) {
        <div class="active-row">
          <span class="active-label">Actifs :</span>
          @for (chip of activeChips(); track chip.key) {
            <button
              type="button"
              class="active-chip"
              [class.primary]="chip.primary"
              (click)="removeFilter(chip.key)"
              [attr.aria-label]="'Retirer le filtre ' + chip.label"
            >
              {{ chip.label }}
              <lucide-icon [img]="icons.X" [size]="13"></lucide-icon>
            </button>
          }
        </div>
      }

      <!-- Tableau dans une Card -->
      <div class="card">
        <div class="summary">
          <span class="summary-count">
            <strong>{{ transactions().length }}</strong>
            {{ transactions().length > 1 ? 'transactions' : 'transaction' }}
          </span>
          <span class="summary-totals">
            <span>Reçu&#8201;: <span class="amount pos">{{ received() }}</span></span>
            <span>Dépensé&#8201;: <span class="amount neutral">{{ spent() }}</span></span>
          </span>
        </div>

        @if (loading()) {
          <div class="state">Chargement…</div>
        } @else if (transactions().length === 0) {
          <div class="empty">
            <span class="empty-icon">
              <lucide-icon [img]="icons.Receipt" [size]="28"></lucide-icon>
            </span>
            <h2 class="empty-title">Aucune transaction</h2>
            <p class="empty-body">
              Aucune transaction ne correspond. Ajuste tes filtres ou ajoute ta première
              transaction.
            </p>
            <button type="button" class="btn primary" (click)="openAdd()">
              <lucide-icon [img]="icons.Plus" [size]="18"></lucide-icon>
              Ajouter une transaction
            </button>
          </div>
        } @else {
          <table class="txn-table">
            <thead>
              <tr>
                <th class="col-icon"></th>
                <th>Description</th>
                <th>Catégorie</th>
                <th>Compte</th>
                <th>Date</th>
                <th class="col-amount">Montant</th>
              </tr>
            </thead>
            <tbody>
              @for (t of transactions(); track t.id) {
                <tr>
                  <td class="col-icon">
                    <span class="cat-icon">
                      <lucide-icon [img]="categoryIcon(t)" [size]="18"></lucide-icon>
                    </span>
                  </td>
                  <td class="desc">{{ t.description }}</td>
                  <td>
                    @if (categoryName(t.categoryId)) {
                      <span class="pill">{{ categoryName(t.categoryId) }}</span>
                    } @else {
                      <span class="muted">—</span>
                    }
                  </td>
                  <td class="account">{{ accountName(t.accountId) }}</td>
                  <td class="date">{{ formatDate(t.date) }}</td>
                  <td class="col-amount">
                    <span class="amount" [class.pos]="t.type === 'income'">
                      {{ formatAmount(t) }}
                    </span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
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

    /* Toolbar */
    .toolbar {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .search {
      flex: 1;
      min-width: 220px;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0 14px;
      height: 44px;
      background: var(--surface-raised);
      border: 0.5px solid var(--border);
      border-radius: var(--radius-md);
    }
    .search:focus-within {
      border-color: var(--border-strong);
    }
    .search-icon {
      color: var(--text-tertiary);
      flex-shrink: 0;
    }
    .search-input {
      flex: 1;
      min-width: 0;
      border: none;
      background: transparent;
      color: var(--text);
      font-family: var(--font-sans);
      font-size: 14px;
    }
    .search-input::placeholder {
      color: var(--text-tertiary);
    }
    .search-input:focus {
      outline: none;
    }
    .search-input::-webkit-search-cancel-button {
      filter: invert(0.5);
    }

    /* Filter chips */
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      height: 44px;
      padding: 0 13px;
      border-radius: var(--radius-md);
      border: 0.5px solid var(--border);
      background: transparent;
      color: var(--text);
      font-family: var(--font-sans);
      font-size: 13.5px;
      cursor: pointer;
      white-space: nowrap;
      transition: border-color var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease);
    }
    .chip:hover,
    .chip.active {
      border-color: var(--border-strong);
      background: var(--surface-raised);
    }
    .chip-icon {
      color: var(--text-tertiary);
    }
    .chip-label {
      color: var(--text-tertiary);
    }
    .chip-value {
      color: var(--text);
      font-weight: 500;
    }

    /* Panneau filtres avancés (montant) */
    .advanced {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-5);
      padding: var(--space-4);
      background: var(--surface-raised);
      border: 0.5px solid var(--border);
      border-radius: var(--radius-md);
    }
    .adv-field {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .adv-field > span:first-child {
      font-size: var(--text-sm);
      color: var(--text-secondary);
    }
    .adv-field input {
      width: 120px;
      height: 40px;
      padding: 0 12px;
      background: var(--surface);
      border: 0.5px solid var(--border);
      border-radius: var(--radius-md);
      color: var(--text);
      font-family: var(--font-sans);
      font-size: 14px;
      font-variant-numeric: tabular-nums;
    }
    .adv-field input:focus {
      outline: none;
      border-color: var(--border-strong);
    }
    .adv-unit {
      color: var(--text-tertiary);
    }
    .btn.ghost.active {
      border-color: var(--accent);
      color: var(--text);
    }
    .chip lucide-icon:last-child {
      color: var(--text-tertiary);
    }

    /* Active filter chips */
    .active-row {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      margin-top: -6px;
    }
    .active-label {
      font-size: 13px;
      color: var(--text-tertiary);
    }
    .active-chip {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      font-family: var(--font-sans);
      font-size: 13px;
      font-weight: 500;
      padding: 5px 10px;
      border-radius: var(--radius-pill);
      cursor: pointer;
      background: var(--surface-raised);
      border: 0.5px solid var(--border-strong);
      color: var(--text);
    }
    .active-chip lucide-icon {
      color: var(--text-tertiary);
    }
    .active-chip.primary {
      background: var(--accent);
      border-color: var(--accent);
      color: var(--on-accent);
    }
    .active-chip.primary lucide-icon {
      color: var(--on-accent);
    }

    /* Card */
    .card {
      background: var(--surface-raised);
      border: 0.5px solid var(--border);
      border-radius: var(--radius-lg);
      padding: var(--space-4) var(--space-6) var(--space-5);
    }
    .summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 0 12px;
      border-bottom: 0.5px solid var(--border);
      margin-bottom: 4px;
    }
    .summary-count {
      font-size: 13px;
      color: var(--text-secondary);
    }
    .summary-count strong {
      color: var(--text);
    }
    .summary-totals {
      display: flex;
      gap: 18px;
      font-size: 13px;
      color: var(--text-secondary);
    }
    .amount {
      font-variant-numeric: tabular-nums;
      font-feature-settings: 'tnum';
      white-space: nowrap;
    }
    .summary-totals .amount {
      font-weight: 600;
    }
    .pos {
      color: var(--positive);
    }
    .neutral {
      color: var(--text);
    }

    /* Table */
    .txn-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    .txn-table th {
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: var(--text-tertiary);
      text-align: left;
      padding: 8px 0;
      border-bottom: 0.5px solid var(--border);
    }
    .txn-table td {
      padding: 13px 0;
      border-bottom: 0.5px solid var(--border);
      font-size: 13px;
      color: var(--text-tertiary);
      vertical-align: middle;
    }
    .txn-table tbody tr:last-child td {
      border-bottom: none;
    }
    .col-icon {
      width: 38px;
    }
    .col-amount {
      width: 118px;
      text-align: right;
    }
    .txn-table th:nth-child(3),
    .txn-table td:nth-child(3) {
      width: 132px;
    }
    .txn-table th:nth-child(4),
    .txn-table td:nth-child(4) {
      width: 150px;
    }
    .txn-table th:nth-child(5),
    .txn-table td:nth-child(5) {
      width: 90px;
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
    }
    .desc {
      font-size: 15px;
      font-weight: 500;
      color: var(--text);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .pill {
      display: inline-block;
      font-size: 12.5px;
      color: var(--text-secondary);
      background: var(--surface);
      border: 0.5px solid var(--border);
      padding: 4px 10px;
      border-radius: var(--radius-pill);
      white-space: nowrap;
    }
    .muted {
      color: var(--text-tertiary);
    }
    .account,
    .date {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .col-amount .amount {
      font-size: 15px;
      font-weight: 500;
      color: var(--text);
    }
    .col-amount .amount.pos {
      color: var(--positive);
    }

    /* States */
    .state {
      padding: var(--space-10) 0;
      text-align: center;
      color: var(--text-secondary);
      font-size: 14px;
    }
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

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
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
      transition: filter var(--dur) var(--ease), background var(--dur) var(--ease);
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
  `,
})
export class TransactionsPageComponent {
  private readonly service = inject(TransactionService);
  private readonly categoryService = inject(CategoryService);
  private readonly accountService = inject(AccountService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  readonly icons: {
    Plus: LucideIconData;
    Search: LucideIconData;
    Calendar: LucideIconData;
    ChevronDown: LucideIconData;
    Landmark: LucideIconData;
    SlidersHorizontal: LucideIconData;
    X: LucideIconData;
    Receipt: LucideIconData;
  } = {
    Plus,
    Search,
    Calendar,
    ChevronDown,
    Landmark,
    SlidersHorizontal,
    X,
    Receipt,
  };

  readonly filters = signal<TransactionFilters>({});
  readonly query = signal<string>('');
  readonly transactions = signal<Transaction[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly accounts = signal<Account[]>([]);
  readonly loading = signal(false);
  readonly period = signal<PeriodPreset | null>(null);
  readonly showAdvanced = signal(false);

  private queryDebounce?: ReturnType<typeof setTimeout>;

  private readonly catIcons: Record<string, LucideIconData> = {
    home: Landmark,
  };

  readonly received = computed(() =>
    eur(
      this.transactions()
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0),
      { plus: true },
    ),
  );
  readonly spent = computed(() =>
    eur(
      this.transactions()
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0),
    ),
  );

  readonly categoryLabel = computed(() => {
    const id = this.filters().categoryId;
    return id ? (this.categoryName(id) ?? 'Toutes') : 'Toutes';
  });
  readonly accountLabel = computed(() => {
    const id = this.filters().accountId;
    return id ? this.accountName(id) : 'Tous';
  });
  readonly typeLabel = computed(() => {
    const t = this.filters().type;
    return t === 'income' ? 'Revenu' : t === 'expense' ? 'Dépense' : 'Tous';
  });
  readonly periodLabel = computed(() => {
    const p = this.period();
    return p === 'month' ? 'Ce mois' : p === '30d' ? '30 derniers jours' : 'Tout';
  });

  readonly activeChips = computed<ActiveChip[]>(() => {
    const f = this.filters();
    const chips: ActiveChip[] = [];
    if (f.q) {
      chips.push({ key: 'q', label: `« ${f.q} »`, primary: true });
    }
    if (f.categoryId) {
      chips.push({
        key: 'categoryId',
        label: this.categoryName(f.categoryId) ?? 'Catégorie',
        primary: chips.length === 0,
      });
    }
    if (f.accountId) {
      chips.push({
        key: 'accountId',
        label: this.accountName(f.accountId),
        primary: chips.length === 0,
      });
    }
    if (f.type) {
      chips.push({
        key: 'type',
        label: f.type === 'income' ? 'Revenu' : 'Dépense',
        primary: chips.length === 0,
      });
    }
    if (this.period()) {
      chips.push({ key: 'period', label: this.periodLabel(), primary: chips.length === 0 });
    }
    if (f.minAmount != null) {
      chips.push({ key: 'minAmount', label: `≥ ${eur(f.minAmount)}`, primary: chips.length === 0 });
    }
    if (f.maxAmount != null) {
      chips.push({ key: 'maxAmount', label: `≤ ${eur(f.maxAmount)}`, primary: chips.length === 0 });
    }
    return chips;
  });

  constructor() {
    this.categoryService.list().subscribe({
      next: (cats) => this.categories.set(cats),
      error: () => this.categories.set([]),
    });
    this.accountService.list().subscribe({
      next: (accs) => this.accounts.set(accs),
      error: () => this.accounts.set([]),
    });
    this.fetch();
  }

  /** Re-fetch backend à chaque changement de filtre (jamais de filtrage client). */
  private fetch(): void {
    this.loading.set(true);
    this.service.search(this.filters()).subscribe({
      next: (txns) => {
        this.transactions.set(txns);
        this.loading.set(false);
      },
      error: () => {
        this.transactions.set([]);
        this.loading.set(false);
        this.snack.open('Impossible de charger les transactions.', 'OK', { duration: 4000 });
      },
    });
  }

  private patch(partial: Partial<TransactionFilters>): void {
    this.filters.update((f) => ({ ...f, ...partial }));
    this.fetch();
  }

  onQueryChange(value: string): void {
    this.query.set(value);
    clearTimeout(this.queryDebounce);
    this.queryDebounce = setTimeout(() => {
      this.patch({ q: value.trim() || null });
    }, 300);
  }

  setCategory(id: string | null): void {
    this.patch({ categoryId: id });
  }

  setAccount(id: string | null): void {
    this.patch({ accountId: id });
  }

  setType(type: TransactionType | null): void {
    this.patch({ type });
  }

  /** Preset de période → calcule from/to (locaux) puis re-fetch backend. */
  setPeriod(preset: PeriodPreset | null): void {
    if (!preset) {
      this.period.set(null);
      this.patch({ from: null, to: null });
      return;
    }
    const now = new Date();
    let from: Date;
    let to: Date;
    if (preset === 'month') {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else {
      to = now;
      from = new Date(now);
      from.setDate(now.getDate() - 29);
    }
    this.period.set(preset);
    this.patch({ from: this.toIso(from), to: this.toIso(to) });
  }

  toggleAdvanced(): void {
    this.showAdvanced.update((v) => !v);
  }

  setMinAmount(value: number | null): void {
    this.patch({ minAmount: value != null && `${value}` !== '' ? value : null });
  }

  setMaxAmount(value: number | null): void {
    this.patch({ maxAmount: value != null && `${value}` !== '' ? value : null });
  }

  removeFilter(key: keyof TransactionFilters | 'period'): void {
    if (key === 'period') {
      this.period.set(null);
      this.patch({ from: null, to: null });
      return;
    }
    if (key === 'q') {
      this.query.set('');
    }
    this.patch({ [key]: null } as Partial<TransactionFilters>);
  }

  /** Date locale → 'yyyy-MM-dd' (évite le décalage UTC de toISOString). */
  private toIso(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate(),
    ).padStart(2, '0')}`;
  }

  openAdd(): void {
    const ref = this.dialog.open(AddTransactionDialogComponent, {
      width: '520px',
      maxWidth: '94vw',
      autoFocus: false,
      panelClass: 'picsou-dialog',
    });
    ref.afterClosed().subscribe((created?: Transaction) => {
      if (created) {
        this.fetch();
      }
    });
  }

  // ── Helpers d'affichage ──
  categoryName(id: string | null): string | null {
    if (!id) {
      return null;
    }
    return this.categories().find((c) => c.id === id)?.name ?? null;
  }

  accountName(id: string | null): string {
    if (!id) {
      return '—';
    }
    return this.accounts().find((a) => a.id === id)?.name ?? '—';
  }

  categoryIcon(t: Transaction): LucideIconData {
    const cat = this.categories().find((c) => c.id === t.categoryId);
    return (cat?.iconKey && this.catIcons[cat.iconKey]) || CreditCard;
  }

  formatAmount(t: Transaction): string {
    return eur(t.type === 'income' ? t.amount : -t.amount, { plus: t.type === 'income' });
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return '—';
    }
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  }
}
