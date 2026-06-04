import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  ArrowUpRight,
  Calendar,
  Check,
  Landmark,
  LucideAngularModule,
  LucideIconData,
  ScanLine,
  Tag,
  X,
} from 'lucide-angular';
import { OcrService } from '../../insights/data/ocr.service';

import { AccountService } from '../data/account.service';
import { CategoryService } from '../data/category.service';
import {
  Account,
  Category,
  CreateTransactionRequest,
  Transaction,
  TransactionType,
  UpdateTransactionRequest,
} from '../data/transaction.models';
import { TransactionService } from '../data/transaction.service';
import { categoryIcon } from '../util/category-visual';

/**
 * Modal « Nouvelle transaction » (handoff §6).
 * Segmented Dépense/Revenu · montant héros Bebas + € · description · catégorie · date · compte.
 * Submit → TransactionService.create → ferme en renvoyant la transaction créée.
 * Bloc « Dépense partagée »/coloc différé P4 (hors scope).
 */
@Component({
  selector: 'app-add-transaction-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    LucideAngularModule,
  ],
  template: `
    <div class="dialog">
      <header class="head">
        <div>
          <h2 class="title">
            {{ editing ? 'Modifier la transaction' : 'Nouvelle transaction' }}
          </h2>
          <p class="subtitle">
            {{
              editing
                ? 'Ajuste les champs puis enregistre tes modifications.'
                : 'Renseigne une description et Picsou suggère la catégorie.'
            }}
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
        <!-- Scanner un reçu (OCR vision) → pré-remplit le formulaire (création seule) -->
        @if (!editing) {
          <label class="scan-btn" [class.busy]="scanning()">
            <lucide-icon [img]="icons.ScanLine" [size]="18"></lucide-icon>
            {{ scanning() ? 'Analyse du reçu…' : 'Scanner un reçu' }}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              (change)="scanReceipt($event)"
              [disabled]="scanning()"
              hidden
            />
          </label>
        }

        <!-- Segmented Dépense / Revenu -->
        <mat-button-toggle-group
          class="segmented"
          formControlName="type"
          aria-label="Type de transaction"
          hideSingleSelectionIndicator
        >
          <mat-button-toggle value="expense">
            <lucide-icon [img]="icons.ArrowUpRight" [size]="16"></lucide-icon>
            Dépense
          </mat-button-toggle>
          <mat-button-toggle value="income">
            <lucide-icon
              [img]="icons.ArrowUpRight"
              [size]="16"
              class="pos"
            ></lucide-icon>
            Revenu
          </mat-button-toggle>
        </mat-button-toggle-group>

        <!-- Montant (chiffre héros Bebas) -->
        <div class="field">
          <label class="label" for="amount">Montant</label>
          <div class="amount-box" [class.invalid]="showError('amount')">
            <input
              id="amount"
              class="amount-input font-display amount"
              type="number"
              inputmode="decimal"
              min="0"
              step="0.01"
              placeholder="0,00"
              formControlName="amount"
            />
            <span class="amount-currency font-display">€</span>
          </div>
          @if (showError('amount')) {
            <span class="hint error">Saisis un montant supérieur à 0.</span>
          }
        </div>

        <!-- Description -->
        <div class="field">
          <label class="label" for="description">Description</label>
          <input
            id="description"
            class="text-box"
            type="text"
            placeholder="Ex. Monoprix — courses"
            formControlName="description"
          />
          @if (showError('description')) {
            <span class="hint error">La description est requise.</span>
          }
        </div>

        <!-- Catégorie + Date -->
        <div class="grid-2">
          <div class="field">
            <label class="label" for="category">Catégorie</label>
            <mat-form-field
              appearance="outline"
              class="picsou-select"
              subscriptSizing="dynamic"
            >
              <lucide-icon
                matPrefix
                [img]="icons.Tag"
                [size]="17"
                class="prefix"
              ></lucide-icon>
              <mat-select
                id="category"
                formControlName="categoryId"
                placeholder="Choisir"
                panelClass="picsou-select-panel"
              >
                <mat-option [value]="null">Aucune</mat-option>
                @for (cat of categories(); track cat.id) {
                  <mat-option [value]="cat.id">
                    <lucide-icon
                      [img]="catIcon(cat.iconKey)"
                      [size]="16"
                      class="opt-icon"
                    ></lucide-icon>
                    {{ cat.name }}
                  </mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>

          <div class="field">
            <label class="label" for="date">Date</label>
            <div class="text-box date-box">
              <lucide-icon
                [img]="icons.Calendar"
                [size]="16"
                class="prefix"
              ></lucide-icon>
              <input
                id="date"
                type="date"
                formControlName="date"
                class="date-input"
              />
            </div>
          </div>
        </div>

        <!-- Compte (création seule : non modifiable côté API) -->
        @if (!editing) {
          <div class="field">
            <label class="label" for="account">Compte</label>
            <mat-form-field
              appearance="outline"
              class="picsou-select"
              subscriptSizing="dynamic"
            >
              <lucide-icon
                matPrefix
                [img]="icons.Landmark"
                [size]="16"
                class="prefix"
              ></lucide-icon>
              <mat-select
                id="account"
                formControlName="accountId"
                placeholder="Choisir un compte"
                panelClass="picsou-select-panel"
              >
                <mat-option [value]="null">Aucun</mat-option>
                @for (acc of accounts(); track acc.id) {
                  <mat-option [value]="acc.id">{{ acc.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>
        }

        <footer class="actions">
          <button type="button" class="btn ghost" (click)="cancel()">
            Annuler
          </button>
          <button type="submit" class="btn primary" [disabled]="submitting()">
            <lucide-icon [img]="icons.Check" [size]="18"></lucide-icon>
            {{ submitLabel() }}
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
      max-width: 420px;
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
      transition:
        color var(--dur-fast) var(--ease),
        border-color var(--dur-fast) var(--ease);
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

    /* Segmented control via MatButtonToggle */
    .segmented {
      display: flex;
      gap: 4px;
      padding: 4px;
      background: var(--surface);
      border: 0.5px solid var(--border);
      border-radius: var(--radius-md);
    }
    .segmented ::ng-deep .mat-button-toggle {
      flex: 1;
      background: transparent;
      border: none;
      color: var(--text-secondary);
    }
    .segmented ::ng-deep .mat-button-toggle + .mat-button-toggle {
      border-left: none;
    }
    .segmented ::ng-deep .mat-button-toggle .mat-button-toggle-label-content {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: 40px;
      line-height: 40px;
      padding: 0;
      font-size: 14.5px;
      font-weight: 500;
    }
    .segmented ::ng-deep .mat-button-toggle-checked {
      background: var(--surface-raised);
      border: 0.5px solid var(--border-strong);
      border-radius: var(--radius-sm);
      color: var(--text);
    }
    .segmented
      ::ng-deep
      .mat-button-toggle-checked
      .mat-button-toggle-label-content {
      font-weight: 600;
    }
    .segmented lucide-icon.pos {
      color: var(--positive);
    }

    /* Montant héros */
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
    /* masque les flèches du number input */
    .amount-input::-webkit-outer-spin-button,
    .amount-input::-webkit-inner-spin-button {
      appearance: none;
      margin: 0;
    }
    .amount-input {
      -moz-appearance: textfield;
    }
    .amount-currency {
      font-size: 30px;
      color: var(--text-tertiary);
    }

    /* Champ texte / date */
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
    .prefix {
      color: var(--text-secondary);
      display: inline-flex;
      flex-shrink: 0;
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

    /* Icône devant chaque catégorie dans le menu déroulant */
    .opt-icon {
      display: inline-flex;
      vertical-align: middle;
      margin-right: 8px;
      color: var(--text-secondary);
    }

    /* Material select restyled */
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
    .picsou-select ::ng-deep .mat-mdc-form-field-icon-prefix {
      padding: 0 8px 0 4px;
    }

    /* Actions */
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
      transition:
        filter var(--dur) var(--ease),
        background var(--dur) var(--ease);
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
    .scan-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 44px;
      padding: 11px 16px;
      border-radius: var(--radius-md);
      border: 0.5px dashed var(--border-strong);
      background: var(--surface);
      color: var(--text);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
    .scan-btn:hover {
      border-color: var(--accent);
    }
    .scan-btn.busy {
      opacity: 0.6;
      cursor: default;
    }
  `,
})
export class AddTransactionDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly transactions = inject(TransactionService);
  private readonly categoryService = inject(CategoryService);
  private readonly accountService = inject(AccountService);
  private readonly ocr = inject(OcrService);
  private readonly dialogRef = inject(
    MatDialogRef<AddTransactionDialogComponent, Transaction>,
  );
  private readonly snack = inject(MatSnackBar);
  /** Transaction à éditer (null → mode création). */
  private readonly data = inject<{ transaction?: Transaction } | null>(
    MAT_DIALOG_DATA,
    { optional: true },
  );

  /** true → édition d'une transaction existante ; false → création. */
  readonly editing = !!this.data?.transaction;

  readonly icons: {
    X: LucideIconData;
    ArrowUpRight: LucideIconData;
    Check: LucideIconData;
    Tag: LucideIconData;
    Calendar: LucideIconData;
    Landmark: LucideIconData;
    ScanLine: LucideIconData;
  } = {
    X,
    ArrowUpRight,
    Check,
    Tag,
    Calendar,
    Landmark,
    ScanLine,
  };

  readonly categories = signal<Category[]>([]);
  readonly accounts = signal<Account[]>([]);
  readonly submitting = signal(false);
  readonly scanning = signal(false);

  readonly form = this.fb.nonNullable.group({
    type: ['expense' as TransactionType, Validators.required],
    amount: [
      null as number | null,
      [Validators.required, Validators.min(0.01)],
    ],
    description: ['', Validators.required],
    categoryId: [null as string | null],
    date: [this.today(), Validators.required],
    accountId: [null as string | null],
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

    // Mode édition : pré-remplir le formulaire depuis la transaction existante.
    const t = this.data?.transaction;
    if (t) {
      this.form.patchValue({
        type: t.type,
        amount: t.amount,
        description: t.description,
        categoryId: t.categoryId,
        date: t.date,
        accountId: t.accountId,
      });
    }
  }

  /** Libellé du bouton principal selon le mode + état d'envoi. */
  submitLabel(): string {
    if (this.editing) {
      return this.submitting() ? 'Enregistrement…' : 'Enregistrer';
    }
    return this.submitting() ? 'Ajout…' : 'Ajouter la transaction';
  }

  /** Icône lucide d'une catégorie (menu déroulant). */
  catIcon(iconKey: string | null): LucideIconData {
    return categoryIcon(iconKey);
  }

  /** Scan d'un reçu (vision IA) → pré-remplit montant/description/date ; l'user confirme ensuite. */
  scanReceipt(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // permet de re-sélectionner le même fichier
    if (!file) {
      return;
    }
    this.scanning.set(true);
    this.ocr.scanReceipt(file).subscribe({
      next: (r) => {
        this.scanning.set(false);
        if (r.total != null) {
          this.form.controls.amount.setValue(r.total);
        }
        if (r.merchant) {
          this.form.controls.description.setValue(r.merchant);
        }
        if (r.date) {
          this.form.controls.date.setValue(r.date);
        }
        this.snack.open('Reçu scanné — vérifie puis valide.', 'OK', {
          duration: 2500,
        });
      },
      error: (err: HttpErrorResponse) => {
        this.scanning.set(false);
        const msg =
          err.status === 503
            ? 'Scan IA non configuré (clé absente).'
            : err.status === 400
              ? 'Format d’image non supporté (JPEG, PNG, WebP).'
              : 'Impossible de scanner le reçu. Réessaie.';
        this.snack.open(msg, 'OK', { duration: 4000 });
      },
    });
  }

  showError(control: 'amount' | 'description'): boolean {
    const c = this.form.controls[control];
    return c.invalid && (c.touched || c.dirty);
  }

  submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.submitting.set(true);

    const editId = this.data?.transaction?.id;
    if (editId) {
      // Édition : PATCH partiel (accountId non éditable côté API).
      const req: UpdateTransactionRequest = {
        amount: Number(v.amount),
        date: v.date,
        description: v.description.trim(),
        type: v.type,
        categoryId: v.categoryId,
      };
      this.transactions.update(editId, req).subscribe({
        next: (updated) => this.dialogRef.close(updated),
        error: () => {
          this.submitting.set(false);
          this.snack.open(
            'Impossible d’enregistrer la transaction. Réessaie.',
            'OK',
            { duration: 4000 },
          );
        },
      });
      return;
    }

    const req: CreateTransactionRequest = {
      amount: Number(v.amount),
      date: v.date,
      description: v.description.trim(),
      type: v.type,
      categoryId: v.categoryId,
      accountId: v.accountId,
    };
    this.transactions.create(req).subscribe({
      next: (created) => this.dialogRef.close(created),
      error: () => {
        this.submitting.set(false);
        this.snack.open(
          'Impossible d’ajouter la transaction. Réessaie.',
          'OK',
          {
            duration: 4000,
          },
        );
      },
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
