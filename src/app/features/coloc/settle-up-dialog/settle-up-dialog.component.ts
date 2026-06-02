import { Component, computed, inject, signal } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  ArrowRight,
  Check,
  LucideAngularModule,
  LucideIconData,
  X,
  Zap,
} from 'lucide-angular';

import { eur } from '../../transactions/util/currency';
import { Balance, Transfer } from '../data/coloc.models';
import { ColocService } from '../data/coloc.service';

export interface SettleUpData {
  groupId: string;
  balance: Balance;
  myUserId: string;
}

/**
 * Modal « Régler les comptes ». Affiche la suggestion simplifiée + la liste des virements
 * (présentationnelle), et « Tout marquer réglé » → settle-all (Picsou ne fait pas le virement).
 */
@Component({
  selector: 'app-settle-up-dialog',
  standalone: true,
  imports: [MatDialogModule, LucideAngularModule],
  template: `
    <div class="dialog">
      <header class="head">
        <div>
          <h2 class="title">Régler les comptes</h2>
          <p class="subtitle">
            Picsou ne fait pas le virement — tu règles toi-même, puis on marque
            les dépenses comme réglées.
          </p>
        </div>
        <button
          type="button"
          class="close"
          (click)="cancel()"
          aria-label="Fermer"
        >
          <lucide-icon [img]="icons.X" [size]="18"></lucide-icon>
        </button>
      </header>

      <div class="body">
        @if (transfers().length === 0) {
          <div class="empty">
            <lucide-icon
              [img]="icons.Check"
              [size]="20"
              class="ok"
            ></lucide-icon>
            <span>Tout est à jour — aucun virement à effectuer.</span>
          </div>
        } @else {
          <div class="tip">
            <lucide-icon
              [img]="icons.Zap"
              [size]="18"
              class="zap"
            ></lucide-icon>
            <div class="tip-text">
              <strong>Le plus simple :</strong> {{ suggestion() }}
              {{ transfers().length }} virement{{
                transfers().length > 1 ? 's' : ''
              }}
              au lieu de {{ naiveCount() }}.
            </div>
          </div>

          <span class="eyebrow">Transferts à effectuer</span>
          <div class="transfers">
            @for (t of transfers(); track $index) {
              <div class="transfer">
                <span class="ava">{{ initial(t.fromName) }}</span>
                <div class="tr-line">
                  <strong>{{ label(t.fromUserId, t.fromName) }}</strong>
                  <lucide-icon
                    [img]="icons.ArrowRight"
                    [size]="15"
                    class="arrow"
                  ></lucide-icon>
                  <strong>{{ label(t.toUserId, t.toName) }}</strong>
                </div>
                <span
                  class="amount tr-amount"
                  [class.pos]="t.toUserId === data.myUserId"
                  >{{ eur(t.amount) }}</span
                >
              </div>
            }
          </div>
        }

        <footer class="actions">
          <button type="button" class="btn ghost" (click)="cancel()">
            Annuler
          </button>
          <button
            type="button"
            class="btn primary"
            [disabled]="submitting() || transfers().length === 0"
            (click)="settleAll()"
          >
            <lucide-icon [img]="icons.Check" [size]="18"></lucide-icon>
            {{ submitting() ? 'Règlement…' : 'Tout marquer réglé' }}
          </button>
        </footer>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-4);
      padding: var(--space-6) var(--space-6) var(--space-5);
      border-bottom: 0.5px solid var(--border);
    }
    .title {
      margin: 0;
      font-size: var(--text-h2);
      font-weight: 600;
      letter-spacing: -0.3px;
      color: var(--text);
    }
    .subtitle {
      margin: 6px 0 0;
      font-size: 13.5px;
      color: var(--text-secondary);
      line-height: 1.5;
    }
    .close {
      width: 34px;
      height: 34px;
      border-radius: var(--radius-md);
      border: 0.5px solid var(--border);
      background: transparent;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      flex-shrink: 0;
    }
    .close:hover {
      color: var(--text);
      border-color: var(--border-strong);
    }
    .body {
      padding: var(--space-6);
    }
    .tip {
      display: flex;
      gap: 11px;
      padding: 14px 16px;
      margin-bottom: var(--space-5);
      background: rgba(255, 214, 10, 0.07);
      border: 0.5px solid rgba(255, 214, 10, 0.25);
      border-radius: var(--radius-md);
    }
    .zap {
      color: var(--accent);
      margin-top: 1px;
      flex-shrink: 0;
    }
    .tip-text {
      font-size: 14px;
      line-height: 1.55;
      color: var(--text);
    }
    .eyebrow {
      display: block;
      font-size: var(--text-meta);
      font-weight: 500;
      letter-spacing: 1.4px;
      text-transform: uppercase;
      color: var(--text-tertiary);
      margin-bottom: 12px;
    }
    .transfers {
      display: flex;
      flex-direction: column;
    }
    .transfer {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 0;
      border-bottom: 0.5px solid var(--border);
    }
    .transfer:last-child {
      border-bottom: none;
    }
    .ava {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-pill);
      background: var(--surface);
      border: 0.5px solid var(--border-strong);
      display: grid;
      place-items: center;
      font-size: 14px;
      font-weight: 600;
      color: var(--text);
    }
    .tr-line {
      flex: 1;
      font-size: 14.5px;
      color: var(--text);
      display: flex;
      align-items: center;
      gap: 7px;
    }
    .arrow {
      color: var(--text-tertiary);
    }
    .tr-amount {
      font-size: 16px;
      font-weight: 600;
      color: var(--text);
    }
    .tr-amount.pos {
      color: var(--positive);
    }
    .amount {
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .empty {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 18px 16px;
      background: var(--surface);
      border: 0.5px solid var(--border);
      border-radius: var(--radius-md);
      font-size: 14.5px;
      color: var(--text-secondary);
    }
    .ok {
      color: var(--positive);
    }
    .actions {
      display: flex;
      gap: 10px;
      margin-top: var(--space-6);
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
    .btn.ghost {
      flex: 1;
      background: transparent;
      color: var(--text);
      border-color: var(--border-strong);
    }
    .btn.ghost:hover {
      background: rgba(250, 247, 239, 0.04);
    }
    .btn.primary {
      flex: 2;
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
  `,
})
export class SettleUpDialogComponent {
  private readonly coloc = inject(ColocService);
  private readonly dialogRef =
    inject<MatDialogRef<SettleUpDialogComponent, boolean>>(MatDialogRef);
  private readonly snack = inject(MatSnackBar);
  readonly data = inject<SettleUpData>(MAT_DIALOG_DATA);

  readonly icons: {
    X: LucideIconData;
    Check: LucideIconData;
    Zap: LucideIconData;
    ArrowRight: LucideIconData;
  } = { X, Check, Zap, ArrowRight };
  readonly eur = eur;

  readonly submitting = signal(false);
  readonly transfers = computed(() => this.data.balance.transfers);

  /** Borne basse du nombre naïf de virements (nb de membres avec un solde non nul). */
  naiveCount(): number {
    const nonZero = this.data.balance.balances.filter(
      (b) => Math.abs(b.net) >= 0.005,
    ).length;
    return Math.max(nonZero, this.transfers().length);
  }

  suggestion(): string {
    return (
      this.transfers()
        .map(
          (t) =>
            `${this.label(t.fromUserId, t.fromName)} → ${this.label(t.toUserId, t.toName)} ${eur(t.amount)}`,
        )
        .join(', ') + ' —'
    );
  }

  label(userId: string, name: string): string {
    return userId === this.data.myUserId ? 'toi' : name;
  }

  initial(name: string): string {
    return (name.charAt(0) || '?').toUpperCase();
  }

  settleAll(): void {
    this.submitting.set(true);
    this.coloc.settleAll(this.data.groupId).subscribe({
      next: () => this.dialogRef.close(true),
      error: () => {
        this.submitting.set(false);
        this.snack.open('Impossible de régler. Réessaie.', 'OK', {
          duration: 4000,
        });
      },
    });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
