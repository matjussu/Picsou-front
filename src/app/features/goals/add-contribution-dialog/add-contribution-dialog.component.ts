import { Component, Inject, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Check, LucideAngularModule, LucideIconData, X } from 'lucide-angular';

import { AddContributionRequest, Contribution } from '../data/goal.models';
import { GoalService } from '../data/goal.service';

export interface AddContributionData {
  goalId: string;
  goalName: string;
}

/**
 * Modal « Ajouter une contribution » (handoff §11 détail).
 * Montant (héros Bebas) + date → GoalService.addContribution → ferme avec la Contribution créée.
 */
@Component({
  selector: 'app-add-contribution-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, LucideAngularModule],
  template: `
    <div class="dialog">
      <header class="head">
        <div>
          <h2 class="title">Ajouter une contribution</h2>
          <p class="subtitle">Vers « {{ data.goalName }} ».</p>
        </div>
        <button type="button" class="close" (click)="cancel()" aria-label="Fermer">
          <lucide-icon [img]="icons.X" [size]="18"></lucide-icon>
        </button>
      </header>

      <form [formGroup]="form" (ngSubmit)="submit()" class="body">
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

        <div class="field">
          <label class="label" for="date">Date</label>
          <div class="text-box date-box">
            <input id="date" type="date" formControlName="date" class="date-input" />
          </div>
        </div>

        <footer class="actions">
          <button type="button" class="btn ghost" (click)="cancel()">Annuler</button>
          <button type="submit" class="btn primary" [disabled]="submitting()">
            <lucide-icon [img]="icons.Check" [size]="18"></lucide-icon>
            {{ submitting() ? 'Ajout…' : 'Ajouter' }}
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
    .amount-input {
      -moz-appearance: textfield;
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
export class AddContributionDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly goals = inject(GoalService);
  private readonly dialogRef = inject(
    MatDialogRef<AddContributionDialogComponent, Contribution>,
  );
  private readonly snack = inject(MatSnackBar);

  readonly icons: { X: LucideIconData; Check: LucideIconData } = { X, Check };

  readonly submitting = signal(false);

  readonly form = this.fb.nonNullable.group({
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    date: [this.today(), Validators.required],
  });

  constructor(@Inject(MAT_DIALOG_DATA) public readonly data: AddContributionData) {}

  showError(control: 'amount'): boolean {
    const c = this.form.controls[control];
    return c.invalid && (c.touched || c.dirty);
  }

  submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const req: AddContributionRequest = { amount: Number(v.amount), date: v.date };
    this.submitting.set(true);
    this.goals.addContribution(this.data.goalId, req).subscribe({
      next: (created) => this.dialogRef.close(created),
      error: () => {
        this.submitting.set(false);
        this.snack.open('Impossible d’ajouter la contribution. Réessaie.', 'OK', {
          duration: 4000,
        });
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
