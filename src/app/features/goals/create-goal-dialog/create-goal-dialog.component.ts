import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Check, LucideAngularModule, LucideIconData, Target, X } from 'lucide-angular';

import { CreateGoalRequest, Goal, GoalTemplate } from '../data/goal.models';
import { GoalService } from '../data/goal.service';

interface TemplateOption {
  value: GoalTemplate;
  label: string;
}

/**
 * Modal « Nouvel objectif » (handoff §11).
 * Nom · montant cible (héros Bebas) · échéance · modèle → GoalService.create.
 * Ferme en renvoyant le Goal créé pour que la liste re-fetch.
 */
@Component({
  selector: 'app-create-goal-dialog',
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
          <h2 class="title">Nouvel objectif</h2>
          <p class="subtitle">Donne-lui un nom, une cible et une échéance facultative.</p>
        </div>
        <button type="button" class="close" (click)="cancel()" aria-label="Fermer">
          <lucide-icon [img]="icons.X" [size]="18"></lucide-icon>
        </button>
      </header>

      <form [formGroup]="form" (ngSubmit)="submit()" class="body">
        <div class="field">
          <label class="label" for="name">Nom</label>
          <input
            id="name"
            class="text-box"
            type="text"
            placeholder="Ex. Voyage à Lisbonne"
            formControlName="name"
          />
          @if (showError('name')) {
            <span class="hint error">Le nom est requis.</span>
          }
        </div>

        <div class="field">
          <label class="label" for="target">Montant cible</label>
          <div class="amount-box" [class.invalid]="showError('targetAmount')">
            <input
              id="target"
              class="amount-input font-display amount"
              type="number"
              inputmode="decimal"
              min="0"
              step="0.01"
              placeholder="0,00"
              formControlName="targetAmount"
            />
            <span class="amount-currency font-display">€</span>
          </div>
          @if (showError('targetAmount')) {
            <span class="hint error">Saisis une cible supérieure à 0.</span>
          }
        </div>

        <div class="grid-2">
          <div class="field">
            <label class="label" for="deadline">Échéance</label>
            <div class="text-box date-box">
              <input id="deadline" type="date" formControlName="deadline" class="date-input" />
            </div>
          </div>
          <div class="field">
            <label class="label" for="template">Modèle</label>
            <mat-form-field appearance="outline" class="picsou-select" subscriptSizing="dynamic">
              <lucide-icon matPrefix [img]="icons.Target" [size]="16" class="prefix"></lucide-icon>
              <mat-select
                id="template"
                formControlName="template"
                panelClass="picsou-select-panel"
              >
                @for (t of templates; track t.value) {
                  <mat-option [value]="t.value">{{ t.label }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>
        </div>

        <footer class="actions">
          <button type="button" class="btn ghost" (click)="cancel()">Annuler</button>
          <button type="submit" class="btn primary" [disabled]="submitting()">
            <lucide-icon [img]="icons.Check" [size]="18"></lucide-icon>
            {{ submitting() ? 'Création…' : 'Créer l’objectif' }}
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
    .prefix {
      color: var(--text-secondary);
      display: inline-flex;
      flex-shrink: 0;
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
export class CreateGoalDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly goals = inject(GoalService);
  private readonly dialogRef = inject(MatDialogRef<CreateGoalDialogComponent, Goal>);
  private readonly snack = inject(MatSnackBar);

  readonly icons: { X: LucideIconData; Check: LucideIconData; Target: LucideIconData } = {
    X,
    Check,
    Target,
  };

  readonly templates: TemplateOption[] = [
    { value: 'savings', label: 'Épargne' },
    { value: 'travel', label: 'Voyage' },
    { value: 'purchase', label: 'Achat important' },
    { value: 'custom', label: 'Personnalisé' },
  ];

  readonly submitting = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    targetAmount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    deadline: [''],
    template: ['savings' as GoalTemplate],
  });

  showError(control: 'name' | 'targetAmount'): boolean {
    const c = this.form.controls[control];
    return c.invalid && (c.touched || c.dirty);
  }

  submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const req: CreateGoalRequest = {
      name: v.name.trim(),
      targetAmount: Number(v.targetAmount),
      deadline: v.deadline ? v.deadline : null,
      template: v.template,
    };
    this.submitting.set(true);
    this.goals.create(req).subscribe({
      next: (created) => this.dialogRef.close(created),
      error: () => {
        this.submitting.set(false);
        this.snack.open('Impossible de créer l’objectif. Réessaie.', 'OK', { duration: 4000 });
      },
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
