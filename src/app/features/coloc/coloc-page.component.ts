import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import {
  Check,
  LucideAngularModule,
  LucideIconData,
  Plus,
  Receipt,
  Send,
  Users,
} from 'lucide-angular';

import { TokenStorageService } from '../../core/auth/token-storage.service';
import { ColocRealtimeService } from '../../core/realtime/coloc-realtime.service';
import { eur } from '../transactions/util/currency';
import {
  AddSharedExpenseDialogComponent,
  AddSharedExpenseData,
} from './add-shared-expense-dialog/add-shared-expense-dialog.component';
import {
  Balance,
  ColocEvent,
  GroupDetail,
  SharedExpense,
} from './data/coloc.models';
import { ColocService } from './data/coloc.service';
import {
  SettleUpData,
  SettleUpDialogComponent,
} from './settle-up-dialog/settle-up-dialog.component';

interface RelativeBalance {
  name: string;
  amount: number; // > 0 : on te doit ; < 0 : tu lui dois
}

/**
 * Écran Coloc (handoff screen-coloc.jsx) : dépenses partagées, bilan simplifié, membres, temps réel.
 * Données 100% backend ; bandeau live alimenté par le canal STOMP /topic/coloc/{groupId}.
 */
@Component({
  selector: 'app-coloc-page',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <header class="topbar">
      <div>
        <span class="eyebrow">{{
          group()
            ? group()!.name + ' · ' + memberCount() + ' membres'
            : 'Colocation'
        }}</span>
        <h1 class="title">Coloc</h1>
      </div>
      <div class="actions">
        <span class="live-pill" title="Mises à jour en temps réel">
          <span class="live-dot"></span>
          Temps réel
        </span>
        <button
          type="button"
          class="btn subtle"
          (click)="openAddExpense()"
          [disabled]="!group()"
        >
          <lucide-icon [img]="icons.Plus" [size]="18"></lucide-icon>
          Dépense partagée
        </button>
        <button
          type="button"
          class="btn primary"
          (click)="openSettle()"
          [disabled]="!group()"
        >
          <lucide-icon [img]="icons.Send" [size]="18"></lucide-icon>
          Régler
        </button>
      </div>
    </header>

    <section class="body">
      @if (loading()) {
        <div class="grid">
          <div class="card skeleton tall"></div>
          <div class="card skeleton tall"></div>
        </div>
      } @else if (errored()) {
        <div class="card error-card" role="alert">
          <strong>Impossible de charger la coloc.</strong>
          <button type="button" class="btn ghost sm" (click)="reload()">
            Réessayer
          </button>
        </div>
      } @else if (!group()) {
        <div class="card empty">
          <span class="empty-icon"
            ><lucide-icon [img]="icons.Users" [size]="28"></lucide-icon
          ></span>
          <h2 class="empty-title">Aucune colocation</h2>
          <p class="empty-body">
            Tu ne fais partie d'aucune coloc pour l'instant. Une fois invité
            dans un groupe, tes dépenses partagées et ton bilan apparaîtront
            ici.
          </p>
        </div>
      } @else {
        @if (liveEvent(); as ev) {
          <div class="live-banner" role="status">
            <span class="ava sm">{{ initial(ev.actorName) }}</span>
            <span class="live-text">
              <strong>{{ ev.actorName }}</strong>
              {{
                ev.type === 'expense.settled'
                  ? 'a réglé des comptes'
                  : 'a ajouté'
              }}
              @if (ev.type !== 'expense.settled') {
                « {{ ev.description }} »
              }
              @if (ev.amount != null) {
                · <strong>{{ eur(ev.amount) }}</strong>
              }
            </span>
            <span class="live-time">à l'instant</span>
          </div>
        }

        <div class="grid">
          <!-- gauche : dépenses partagées -->
          <div class="card">
            <div class="section-head">
              <h2 class="section-title">Dépenses partagées</h2>
            </div>
            @if (expenses().length === 0) {
              <p class="muted">Aucune dépense partagée pour l'instant.</p>
            } @else {
              <div class="shared-list">
                @for (s of expenses(); track s.id) {
                  <div class="shared-row" [class.settled]="s.settled">
                    <span class="cat-icon"
                      ><lucide-icon
                        [img]="icons.Receipt"
                        [size]="18"
                      ></lucide-icon
                    ></span>
                    <div class="shared-main">
                      <div class="shared-title">
                        {{ s.description }}
                        @if (s.settled) {
                          <span class="badge"
                            ><lucide-icon
                              [img]="icons.Check"
                              [size]="13"
                            ></lucide-icon>
                            Réglé</span
                          >
                        }
                      </div>
                      <div class="shared-sub">
                        {{ shortDate(s.date) }} · Payé par
                        <strong [class.me]="s.payerUserId === myUserId">{{
                          s.payerUserId === myUserId ? 'toi' : s.payerName
                        }}</strong>
                        · total {{ eur(s.total) }}
                      </div>
                    </div>
                    <div class="shared-share">
                      <span class="share-label">ta part</span>
                      <span class="amount">{{
                        s.yourShare != null ? eur(s.yourShare) : '—'
                      }}</span>
                    </div>
                  </div>
                }
              </div>
            }
          </div>

          <!-- droite : bilan + membres -->
          <div class="col">
            <div class="card">
              <span class="eyebrow">Ton bilan</span>
              <div class="net">
                <span
                  class="net-amount font-display"
                  [class.pos]="(balance()?.yourNet ?? 0) > 0"
                  >{{ eur(balance()?.yourNet ?? 0) }}</span
                >
                <span class="net-label">net à régler</span>
              </div>
              <div class="balances">
                @for (b of relativeBalances(); track b.name) {
                  <div class="balance-row">
                    <span class="ava">{{ initial(b.name) }}</span>
                    <div class="balance-id">
                      <span class="balance-name">{{ b.name }}</span>
                      <span class="balance-rel">{{
                        b.amount > 0 ? 'te doit' : 'tu lui dois'
                      }}</span>
                    </div>
                    <span class="amount" [class.pos]="b.amount > 0">{{
                      eur(absAmount(b.amount))
                    }}</span>
                  </div>
                }
                @if (relativeBalances().length === 0) {
                  <p class="muted">Tu es à jour — rien à régler.</p>
                }
              </div>
              <button
                type="button"
                class="btn primary full"
                (click)="openSettle()"
                [disabled]="relativeBalances().length === 0"
              >
                <lucide-icon [img]="icons.Send" [size]="18"></lucide-icon>
                Régler les comptes
              </button>
            </div>

            <div class="card">
              <div class="section-head">
                <h2 class="section-title">Membres</h2>
              </div>
              <div class="members">
                @for (m of group()!.members; track m.userId) {
                  <div class="member">
                    <span class="ava" [class.accent]="m.userId === myUserId">{{
                      initial(m.firstName)
                    }}</span>
                    <span class="member-name"
                      >{{ m.firstName }}
                      @if (m.userId === myUserId) {
                        <span class="muted"> · toi</span>
                      }
                    </span>
                    @if (m.role === 'admin') {
                      <span class="role">admin</span>
                    }
                  </div>
                }
              </div>
            </div>
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
      gap: var(--space-4);
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
      align-items: center;
      gap: 10px;
    }
    .live-pill {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      font-size: 12.5px;
      font-weight: 500;
      color: var(--positive);
      background: rgba(47, 191, 132, 0.1);
      border: 0.5px solid rgba(47, 191, 132, 0.3);
      padding: 7px 12px;
      border-radius: var(--radius-pill);
    }
    .live-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--positive);
      box-shadow: 0 0 0 3px rgba(47, 191, 132, 0.25);
      animation: livePulse 1.8s var(--ease) infinite;
    }
    @keyframes livePulse {
      0%,
      100% {
        opacity: 1;
      }
      50% {
        opacity: 0.4;
      }
    }
    .body {
      padding: var(--space-6) var(--space-8);
      max-width: var(--container-max);
      display: flex;
      flex-direction: column;
      gap: var(--space-5);
    }
    .card {
      background: var(--surface-raised);
      border: 0.5px solid var(--border);
      border-radius: var(--radius-lg);
      padding: var(--space-5) var(--space-6);
    }
    .grid {
      display: grid;
      grid-template-columns: 1.45fr 1fr;
      gap: var(--space-5);
      align-items: start;
    }
    .col {
      display: flex;
      flex-direction: column;
      gap: var(--space-5);
    }
    .section-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 4px;
    }
    .section-title {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--text);
    }
    .muted {
      color: var(--text-tertiary);
      font-size: 14px;
    }

    /* Live banner */
    .live-banner {
      display: flex;
      align-items: center;
      gap: 11px;
      padding: 12px 16px;
      background: var(--surface);
      border: 0.5px solid var(--border);
      border-radius: var(--radius-md);
    }
    .live-text {
      font-size: 14px;
      color: var(--text-secondary);
    }
    .live-text strong {
      color: var(--text);
      font-weight: 600;
    }
    .live-time {
      margin-left: auto;
      font-size: 12.5px;
      color: var(--text-tertiary);
    }

    /* Shared expenses */
    .shared-list {
      display: flex;
      flex-direction: column;
      margin-top: 4px;
    }
    .shared-row {
      display: grid;
      grid-template-columns: 38px 1fr auto;
      align-items: center;
      gap: 14px;
      padding: 13px 0;
      border-bottom: 0.5px solid var(--border);
    }
    .shared-row:last-child {
      border-bottom: none;
    }
    .shared-row.settled {
      opacity: 0.55;
    }
    .cat-icon {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-md);
      background: var(--surface);
      border: 0.5px solid var(--border);
      color: var(--text-secondary);
      display: grid;
      place-items: center;
    }
    .shared-main {
      min-width: 0;
    }
    .shared-title {
      font-size: 15px;
      font-weight: 500;
      color: var(--text);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .badge {
      font-size: 11.5px;
      font-weight: 500;
      color: var(--positive);
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .shared-sub {
      font-size: 12.5px;
      color: var(--text-tertiary);
      margin-top: 2px;
    }
    .shared-sub .me {
      color: var(--accent);
    }
    .shared-share {
      text-align: right;
    }
    .share-label {
      display: block;
      font-size: 11.5px;
      color: var(--text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }

    /* Balance */
    .net {
      display: flex;
      align-items: baseline;
      gap: 10px;
      margin: 10px 0 4px;
    }
    .net-amount {
      font-size: 46px;
      letter-spacing: 0.5px;
      color: var(--text);
    }
    .net-amount.pos {
      color: var(--positive);
    }
    .net-label {
      font-size: 14px;
      color: var(--text-secondary);
    }
    .balances {
      margin-top: 12px;
    }
    .balance-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 0;
      border-bottom: 0.5px solid var(--border);
    }
    .balance-id {
      flex: 1;
      min-width: 0;
    }
    .balance-name {
      display: block;
      font-size: 15px;
      font-weight: 600;
      color: var(--text);
    }
    .balance-rel {
      display: block;
      font-size: 13px;
      color: var(--text-secondary);
    }

    /* Members */
    .members {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-top: 6px;
    }
    .member {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 0;
    }
    .member-name {
      flex: 1;
      font-size: 14.5px;
      font-weight: 500;
      color: var(--text);
    }
    .role {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: var(--text-tertiary);
      border: 0.5px solid var(--border);
      border-radius: var(--radius-pill);
      padding: 2px 8px;
    }

    /* Avatars */
    .ava {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-pill);
      background: var(--surface);
      border: 0.5px solid var(--border-strong);
      display: grid;
      place-items: center;
      font-size: 15px;
      font-weight: 600;
      color: var(--text);
      flex-shrink: 0;
    }
    .ava.sm {
      width: 28px;
      height: 28px;
      font-size: 12px;
    }
    .ava.accent {
      border-color: var(--accent);
      color: var(--accent);
    }

    .amount {
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
      font-size: 17px;
      font-weight: 600;
      color: var(--text);
    }
    .amount.pos {
      color: var(--positive);
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
    .btn.full {
      width: 100%;
      margin-top: 18px;
    }
    .btn.primary {
      background: var(--accent);
      color: var(--on-accent);
    }
    .btn.primary:hover:not(:disabled) {
      filter: brightness(1.05);
    }
    .btn.subtle {
      background: var(--surface);
      color: var(--text);
      border-color: var(--border-strong);
    }
    .btn.subtle:hover:not(:disabled) {
      border-color: var(--accent);
    }
    .btn.ghost {
      background: transparent;
      color: var(--text);
      border-color: var(--border-strong);
    }
    .btn:disabled {
      opacity: 0.5;
      cursor: default;
    }

    /* Empty / error / skeleton */
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
      display: grid;
      place-items: center;
    }
    .empty-title {
      margin: 0;
      font-size: 21px;
      font-weight: 600;
      color: var(--text);
    }
    .empty-body {
      margin: 0;
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
    .skeleton {
      background: var(--surface);
      animation: pulse 1.2s var(--ease) infinite;
      border: none;
    }
    .tall {
      height: 320px;
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

    @media (max-width: 1024px) {
      .grid {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class ColocPageComponent implements OnDestroy {
  private readonly coloc = inject(ColocService);
  private readonly realtime = inject(ColocRealtimeService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly tokens = inject(TokenStorageService);

  readonly icons: {
    Plus: LucideIconData;
    Send: LucideIconData;
    Users: LucideIconData;
    Check: LucideIconData;
    Receipt: LucideIconData;
  } = { Plus, Send, Users, Check, Receipt };
  readonly eur = eur;
  readonly myUserId = this.tokens.getUserId() ?? '';

  readonly loading = signal(true);
  readonly errored = signal(false);
  readonly group = signal<GroupDetail | null>(null);
  readonly expenses = signal<SharedExpense[]>([]);
  readonly balance = signal<Balance | null>(null);
  readonly liveEvent = signal<ColocEvent | null>(null);

  readonly memberCount = computed(() => this.group()?.members.length ?? 0);

  /** Soldes relatifs au user courant, dérivés des virements simplifiés. */
  readonly relativeBalances = computed<RelativeBalance[]>(() => {
    const transfers = this.balance()?.transfers ?? [];
    const rows: RelativeBalance[] = [];
    for (const t of transfers) {
      if (t.toUserId === this.myUserId) {
        rows.push({ name: t.fromName, amount: t.amount });
      } else if (t.fromUserId === this.myUserId) {
        rows.push({ name: t.toName, amount: -t.amount });
      }
    }
    return rows;
  });

  private realtimeSub?: Subscription;

  constructor() {
    this.load();
  }

  ngOnDestroy(): void {
    this.realtimeSub?.unsubscribe();
  }

  reload(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.errored.set(false);
    this.coloc.listGroups().subscribe({
      next: (groups) => {
        if (groups.length === 0) {
          this.group.set(null);
          this.loading.set(false);
          return;
        }
        this.loadGroup(groups[0].id);
      },
      error: () => {
        this.loading.set(false);
        this.errored.set(true);
      },
    });
  }

  private loadGroup(groupId: string): void {
    this.coloc.getGroup(groupId).subscribe({
      next: (detail) => {
        this.group.set(detail);
        this.refresh(groupId);
        this.subscribeRealtime(groupId);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.errored.set(true);
      },
    });
  }

  private refresh(groupId: string): void {
    this.coloc
      .listExpenses(groupId)
      .subscribe({ next: (e) => this.expenses.set(e) });
    this.coloc
      .balances(groupId)
      .subscribe({ next: (b) => this.balance.set(b) });
  }

  private subscribeRealtime(groupId: string): void {
    this.realtimeSub?.unsubscribe();
    this.realtimeSub = this.realtime.events(groupId).subscribe({
      next: (event) => {
        this.liveEvent.set(event);
        this.refresh(groupId);
      },
    });
  }

  openAddExpense(): void {
    const detail = this.group();
    if (!detail) {
      return;
    }
    const data: AddSharedExpenseData = {
      groupId: detail.id,
      members: detail.members,
      myUserId: this.myUserId,
    };
    const ref = this.dialog.open(AddSharedExpenseDialogComponent, {
      width: '560px',
      maxWidth: '94vw',
      autoFocus: false,
      panelClass: 'picsou-dialog',
      data,
    });
    ref.afterClosed().subscribe((created?: SharedExpense) => {
      if (created) {
        this.refresh(detail.id);
        this.snack.open('Dépense partagée ajoutée.', 'OK', { duration: 2500 });
      }
    });
  }

  openSettle(): void {
    const detail = this.group();
    const bal = this.balance();
    if (!detail || !bal) {
      return;
    }
    const data: SettleUpData = {
      groupId: detail.id,
      balance: bal,
      myUserId: this.myUserId,
    };
    const ref = this.dialog.open(SettleUpDialogComponent, {
      width: '500px',
      maxWidth: '94vw',
      autoFocus: false,
      panelClass: 'picsou-dialog',
      data,
    });
    ref.afterClosed().subscribe((settled?: boolean) => {
      if (settled) {
        this.refresh(detail.id);
        this.snack.open('Comptes réglés.', 'OK', { duration: 2500 });
      }
    });
  }

  initial(name: string): string {
    return (name.charAt(0) || '?').toUpperCase();
  }

  absAmount(n: number): number {
    return Math.abs(n);
  }

  shortDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return iso;
    }
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  }
}
