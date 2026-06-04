import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  Check,
  LucideAngularModule,
  LucideIconData,
  ScanLine,
  X,
} from 'lucide-angular';

import { OcrService } from '../../insights/data/ocr.service';
import { Account } from '../../transactions/data/transaction.models';
import { AccountService } from '../../transactions/data/account.service';
import { eur } from '../../transactions/util/currency';
import {
  AddSharedExpenseRequest,
  Member,
  SharedExpense,
  SplitMethod,
} from '../data/coloc.models';
import { ColocService } from '../data/coloc.service';

export interface AddSharedExpenseData {
  groupId: string;
  members: Member[];
  myUserId: string;
}

/**
 * Modal « Dépense partagée » — split égal ou personnalisé (extension du design system, validée
 * Matteo). Le payeur est le user courant. En custom : champ montant par membre + total/restant live,
 * bouton désactivé si la somme ≠ total.
 */
@Component({
  selector: 'app-add-shared-expense-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    LucideAngularModule,
  ],
  template: `
    <div class="dialog">
      <header class="head">
        <div>
          <h2 class="title">Dépense partagée</h2>
          <p class="subtitle">
            Tu as payé — choisis qui partage et comment répartir.
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

      <form [formGroup]="form" (ngSubmit)="submit()" class="body">
        <!-- Scanner un ticket (OCR vision) → ouvre la caméra du téléphone et
             pré-remplit montant + description ; l'user vérifie puis valide. -->
        <label class="scan-btn" [class.busy]="scanning()">
          <lucide-icon [img]="icons.ScanLine" [size]="18"></lucide-icon>
          {{
            scanning()
              ? 'Lecture du ticket… (jusqu’à ~1 min au 1er scan)'
              : 'Scanner un ticket'
          }}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            (change)="scanReceipt($event)"
            [disabled]="scanning()"
            hidden
          />
        </label>

        <div class="field">
          <label class="label" for="desc">Description</label>
          <input
            id="desc"
            class="text-box"
            type="text"
            placeholder="Ex. Courses Carrefour"
            formControlName="description"
          />
          @if (showError('description')) {
            <span class="hint error">La description est requise.</span>
          }
        </div>

        <div class="field">
          <label class="label" for="total">Montant total</label>
          <div class="amount-box" [class.invalid]="showError('total')">
            <input
              id="total"
              class="amount-input font-display amount"
              type="number"
              inputmode="decimal"
              min="0"
              step="0.01"
              placeholder="0,00"
              formControlName="total"
            />
            <span class="amount-currency font-display">€</span>
          </div>
          @if (showError('total')) {
            <span class="hint error">Saisis un montant supérieur à 0.</span>
          }
        </div>

        <div class="grid-2">
          <div class="field">
            <label class="label" for="date">Date</label>
            <div class="text-box date-box">
              <input
                id="date"
                type="date"
                formControlName="date"
                class="date-input"
              />
            </div>
          </div>
          <div class="field">
            <label class="label" for="account">Compte</label>
            <mat-form-field
              appearance="outline"
              class="picsou-select"
              subscriptSizing="dynamic"
            >
              <mat-select
                id="account"
                formControlName="accountId"
                panelClass="picsou-select-panel"
              >
                @for (a of accounts(); track a.id) {
                  <mat-option [value]="a.id">{{ a.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>
        </div>

        <div class="field">
          <span class="label">Répartition</span>
          <div class="seg">
            <button
              type="button"
              class="seg-btn"
              [class.active]="splitMethod() === 'equal'"
              (click)="setSplit('equal')"
            >
              Égal
            </button>
            <button
              type="button"
              class="seg-btn"
              [class.active]="splitMethod() === 'custom'"
              (click)="setSplit('custom')"
            >
              Personnalisé
            </button>
          </div>
        </div>

        <div class="field">
          <span class="label">Participants</span>
          <div class="members">
            @for (m of data.members; track m.userId) {
              <div class="member-row">
                <button
                  type="button"
                  class="member-toggle"
                  [class.on]="isSelected(m.userId)"
                  (click)="toggle(m.userId)"
                  [attr.aria-pressed]="isSelected(m.userId)"
                >
                  <span class="ava">{{ initial(m.firstName) }}</span>
                  <span class="member-name"
                    >{{ m.firstName }}
                    @if (m.userId === data.myUserId) {
                      <span class="me"> · toi</span>
                    }
                  </span>
                  @if (isSelected(m.userId)) {
                    <lucide-icon
                      [img]="icons.Check"
                      [size]="16"
                      class="tick"
                    ></lucide-icon>
                  }
                </button>
                @if (splitMethod() === 'custom' && isSelected(m.userId)) {
                  <div class="custom-amount">
                    <input
                      class="custom-input amount"
                      type="number"
                      inputmode="decimal"
                      min="0"
                      step="0.01"
                      placeholder="0,00"
                      [value]="customAmounts()[m.userId] ?? ''"
                      (input)="setCustom(m.userId, $event)"
                    />
                    <span class="cur">€</span>
                  </div>
                }
              </div>
            }
          </div>
          @if (splitMethod() === 'equal') {
            <span class="hint"
              >Partagé en {{ selectedCount() }} —
              {{ perHeadLabel() }} chacun.</span
            >
          } @else {
            <div class="custom-summary" [class.bad]="!customMatches()">
              <span>Réparti : {{ eur(customSum()) }}</span>
              <span>Restant : {{ eur(remaining()) }}</span>
            </div>
          }
        </div>

        <footer class="actions">
          <button type="button" class="btn ghost" (click)="cancel()">
            Annuler
          </button>
          <button type="submit" class="btn primary" [disabled]="!canSubmit()">
            <lucide-icon [img]="icons.Check" [size]="18"></lucide-icon>
            {{ submitting() ? 'Ajout…' : 'Ajouter la dépense' }}
          </button>
        </footer>
      </form>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .dialog {
      display: flex;
      flex-direction: column;
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
      display: flex;
      flex-direction: column;
      gap: var(--space-5);
    }
    .scan-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 48px;
      padding: 11px 16px;
      border-radius: var(--radius-md);
      border: 0.5px dashed var(--border-strong);
      background: var(--surface);
      color: var(--text);
      font-size: 14px;
      font-weight: 600;
      text-align: center;
      cursor: pointer;
    }
    .scan-btn:hover {
      border-color: var(--accent);
    }
    .scan-btn.busy {
      opacity: 0.6;
      cursor: default;
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 7px;
    }
    .label {
      font-size: 12.5px;
      font-weight: 500;
      color: var(--text-secondary);
    }
    .hint {
      font-size: 12px;
      color: var(--text-tertiary);
    }
    .hint.error {
      color: var(--danger);
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-4);
    }
    .amount-box {
      display: flex;
      align-items: center;
      gap: 10px;
      height: 64px;
      padding: 0 var(--space-4);
      background: var(--surface);
      border: 0.5px solid var(--border-strong);
      border-radius: var(--radius-md);
    }
    .amount-box.invalid {
      border-color: var(--danger);
    }
    .amount-input {
      flex: 1;
      min-width: 0;
      border: none;
      background: transparent;
      color: var(--text);
      font-size: 38px;
      letter-spacing: 1px;
      line-height: 1;
    }
    .amount-input::placeholder {
      color: var(--text-tertiary);
    }
    .amount-input:focus {
      outline: none;
    }
    .amount-input::-webkit-outer-spin-button,
    .amount-input::-webkit-inner-spin-button {
      appearance: none;
      margin: 0;
    }
    .amount-currency {
      font-size: 30px;
      color: var(--text-tertiary);
    }
    .text-box {
      display: flex;
      align-items: center;
      gap: 10px;
      height: 46px;
      padding: 0 var(--space-4);
      background: var(--surface);
      border: 0.5px solid var(--border-strong);
      border-radius: var(--radius-md);
      font-size: 15px;
      color: var(--text);
      font-family: var(--font-sans);
      width: 100%;
    }
    input.text-box::placeholder {
      color: var(--text-tertiary);
    }
    input.text-box:focus {
      outline: none;
      border-color: var(--accent);
    }
    .date-box:focus-within {
      border-color: var(--accent);
    }
    .date-input {
      flex: 1;
      min-width: 0;
      border: none;
      background: transparent;
      color: var(--text);
      font-family: var(--font-sans);
      font-size: 15px;
    }
    .date-input:focus {
      outline: none;
    }
    .date-input::-webkit-calendar-picker-indicator {
      filter: invert(0.6);
      cursor: pointer;
    }
    .picsou-select {
      width: 100%;
    }
    .picsou-select ::ng-deep .mat-mdc-text-field-wrapper {
      background: var(--surface);
      border-radius: var(--radius-md);
    }
    .picsou-select ::ng-deep .mdc-notched-outline > * {
      border-color: var(--border-strong) !important;
    }
    .picsou-select ::ng-deep .mat-mdc-form-field-infix {
      min-height: 46px;
      padding-top: 11px;
      padding-bottom: 11px;
    }

    /* Segmented control */
    .seg {
      display: inline-flex;
      gap: 4px;
      padding: 4px;
      background: var(--surface);
      border: 0.5px solid var(--border);
      border-radius: var(--radius-md);
      width: fit-content;
    }
    .seg-btn {
      border: none;
      background: transparent;
      color: var(--text-secondary);
      font-family: var(--font-sans);
      font-size: 13.5px;
      font-weight: 600;
      padding: 8px 18px;
      border-radius: var(--radius-sm);
      cursor: pointer;
    }
    .seg-btn.active {
      background: var(--surface-raised);
      color: var(--text);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
    }

    /* Members */
    .members {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .member-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .member-toggle {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 11px;
      padding: 9px 12px;
      background: var(--surface);
      border: 0.5px solid var(--border);
      border-radius: var(--radius-md);
      cursor: pointer;
      color: var(--text-secondary);
      text-align: left;
    }
    .member-toggle.on {
      border-color: var(--accent);
      color: var(--text);
    }
    .ava {
      width: 30px;
      height: 30px;
      border-radius: var(--radius-pill);
      background: var(--surface-raised);
      border: 0.5px solid var(--border-strong);
      display: grid;
      place-items: center;
      font-size: 13px;
      font-weight: 600;
      color: var(--text);
    }
    .member-name {
      flex: 1;
      font-size: 14.5px;
      font-weight: 500;
    }
    .me {
      color: var(--text-tertiary);
      font-weight: 400;
    }
    .tick {
      color: var(--accent);
    }
    .custom-amount {
      display: flex;
      align-items: center;
      gap: 6px;
      width: 120px;
      padding: 0 12px;
      height: 44px;
      background: var(--surface);
      border: 0.5px solid var(--border-strong);
      border-radius: var(--radius-md);
    }
    .custom-input {
      flex: 1;
      min-width: 0;
      border: none;
      background: transparent;
      color: var(--text);
      font-size: 15px;
      text-align: right;
    }
    .custom-input:focus {
      outline: none;
    }
    .custom-input::-webkit-outer-spin-button,
    .custom-input::-webkit-inner-spin-button {
      appearance: none;
      margin: 0;
    }
    .cur {
      color: var(--text-tertiary);
      font-size: 14px;
    }
    .custom-summary {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      color: var(--text-secondary);
      font-variant-numeric: tabular-nums;
    }
    .custom-summary.bad {
      color: var(--danger);
    }

    .actions {
      display: flex;
      gap: 10px;
      margin-top: 4px;
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
export class AddSharedExpenseDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly coloc = inject(ColocService);
  private readonly accountService = inject(AccountService);
  private readonly dialogRef =
    inject<MatDialogRef<AddSharedExpenseDialogComponent, SharedExpense>>(
      MatDialogRef,
    );
  private readonly snack = inject(MatSnackBar);
  private readonly ocr = inject(OcrService);
  readonly data = inject<AddSharedExpenseData>(MAT_DIALOG_DATA);

  readonly icons: {
    X: LucideIconData;
    Check: LucideIconData;
    ScanLine: LucideIconData;
  } = { X, Check, ScanLine };
  readonly eur = eur;

  readonly accounts = signal<Account[]>([]);
  readonly submitting = signal(false);
  readonly scanning = signal(false);
  readonly splitMethod = signal<SplitMethod>('equal');
  readonly selected = signal<Set<string>>(
    new Set(this.data.members.map((m) => m.userId)),
  );
  readonly customAmounts = signal<Record<string, number | null>>({});

  readonly form = this.fb.nonNullable.group({
    description: ['', Validators.required],
    total: [null as number | null, [Validators.required, Validators.min(0.01)]],
    date: [new Date().toISOString().slice(0, 10), Validators.required],
    accountId: ['', Validators.required],
  });

  readonly selectedCount = computed(() => this.selected().size);
  readonly customSum = computed(() =>
    Object.entries(this.customAmounts())
      .filter(([id]) => this.selected().has(id))
      .reduce((s, [, v]) => s + (Number(v) || 0), 0),
  );
  readonly remaining = computed(() =>
    this.round2((this.form.controls.total.value ?? 0) - this.customSum()),
  );
  readonly customMatches = computed(
    () => Math.abs(this.remaining()) < 0.005 && this.selectedCount() > 0,
  );

  readonly canSubmit = computed(() => {
    if (this.submitting() || this.selectedCount() === 0) {
      return false;
    }
    const base = this.form.valid;
    return this.splitMethod() === 'custom'
      ? base && this.customMatches()
      : base;
  });

  constructor() {
    this.accountService.list().subscribe({
      next: (list) => {
        this.accounts.set(list);
        if (list.length > 0) {
          this.form.controls.accountId.setValue(list[0].id);
        }
      },
      error: () => this.accounts.set([]),
    });
  }

  setSplit(method: SplitMethod): void {
    this.splitMethod.set(method);
  }

  isSelected(userId: string): boolean {
    return this.selected().has(userId);
  }

  toggle(userId: string): void {
    const next = new Set(this.selected());
    if (next.has(userId)) {
      next.delete(userId);
    } else {
      next.add(userId);
    }
    this.selected.set(next);
  }

  setCustom(userId: string, event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    this.customAmounts.set({
      ...this.customAmounts(),
      [userId]: raw === '' ? null : Number(raw),
    });
  }

  perHeadLabel(): string {
    const total = this.form.controls.total.value ?? 0;
    const n = this.selectedCount();
    return n > 0 ? eur(this.round2(total / n)) : '—';
  }

  initial(name: string): string {
    return (name.charAt(0) || '?').toUpperCase();
  }

  /**
   * Scan d'un ticket (vision IA) → ouvre la caméra du téléphone, puis pré-remplit montant et
   * description de la dépense partagée. L'utilisateur vérifie et corrige avant de valider, donc une
   * extraction partielle ou une photo illisible reste rattrapable à la main.
   */
  scanReceipt(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // permet de re-scanner le même fichier
    if (!file) {
      return;
    }
    this.scanning.set(true);
    this.ocr.scanReceipt(file).subscribe({
      next: (r) => {
        this.scanning.set(false);
        if (r.total != null) {
          this.form.controls.total.setValue(r.total);
        }
        if (r.merchant) {
          this.form.controls.description.setValue(r.merchant);
        }
        if (r.date) {
          this.form.controls.date.setValue(r.date);
        }
        this.snack.open('Ticket scanné — vérifie puis valide la dépense.', 'OK', {
          duration: 2500,
        });
      },
      error: (err: HttpErrorResponse) => {
        this.scanning.set(false);
        const msg =
          err.status === 503
            ? 'Scan IA non configuré (clé absente).'
            : err.status === 400
              ? 'Image illisible ou format non supporté (JPEG, PNG, WebP).'
              : 'Impossible de scanner le ticket. Réessaie ou saisis à la main.';
        this.snack.open(msg, 'OK', { duration: 4000 });
      },
    });
  }

  showError(control: 'description' | 'total'): boolean {
    const c = this.form.controls[control];
    return c.invalid && (c.touched || c.dirty);
  }

  submit(): void {
    if (!this.canSubmit()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const ids = this.data.members
      .map((m) => m.userId)
      .filter((id) => this.selected().has(id));
    const req: AddSharedExpenseRequest = {
      payerUserId: this.data.myUserId,
      accountId: v.accountId,
      description: v.description.trim(),
      date: v.date,
      total: Number(v.total),
      splitMethod: this.splitMethod(),
      participantUserIds: this.splitMethod() === 'equal' ? ids : null,
      customParts:
        this.splitMethod() === 'custom'
          ? ids.map((id) => ({
              userId: id,
              amount: Number(this.customAmounts()[id] ?? 0),
            }))
          : null,
    };
    this.submitting.set(true);
    this.coloc.addExpense(this.data.groupId, req).subscribe({
      next: (created) => this.dialogRef.close(created),
      error: () => {
        this.submitting.set(false);
        this.snack.open('Impossible d’ajouter la dépense. Réessaie.', 'OK', {
          duration: 4000,
        });
      },
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }

  private round2(n: number): number {
    return Math.round(n * 100) / 100;
  }
}
