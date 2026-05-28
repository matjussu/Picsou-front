import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" class="auth-form">
      <h1>Connexion à Picsou</h1>
      <mat-form-field appearance="outline">
        <mat-label>Email</mat-label>
        <input matInput formControlName="email" type="email" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Mot de passe</mat-label>
        <input matInput formControlName="password" type="password" />
      </mat-form-field>
      <button
        mat-flat-button
        color="primary"
        type="submit"
        [disabled]="form.invalid || loading"
      >
        {{ loading ? 'Connexion...' : 'Se connecter' }}
      </button>
      <a routerLink="/signup">Créer un compte</a>
    </form>
  `,
  styles: [
    `
      .auth-form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        max-width: 400px;
        margin: 4rem auto;
        padding: 2rem;
      }
      h1 {
        margin: 0 0 1rem 0;
        font-weight: 600;
      }
    `,
  ],
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private snack = inject(MatSnackBar);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });
  loading = false;

  submit(): void {
    if (this.form.invalid) {
      return;
    }
    this.loading = true;
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: () => {
        this.loading = false;
        this.snack.open('Identifiants invalides', 'OK', { duration: 3000 });
      },
    });
  }
}
