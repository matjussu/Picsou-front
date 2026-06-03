import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import {
  ArrowRight,
  Eye,
  EyeOff,
  LucideAngularModule,
  Mail,
} from 'lucide-angular';

import { AuthService } from '../../../core/auth/auth.service';
import { AuthBrandPanelComponent } from '../auth-brand-panel.component';
import { AUTH_STYLES } from '../auth-styles';

/**
 * Écran de connexion — design reproduit depuis screen-auth.jsx (split brand panel
 * + formulaire). La logique (ReactiveForms, validators, submit, AuthService) est
 * inchangée ; seule la couche visuelle s'aligne sur la maquette.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    LucideAngularModule,
    AuthBrandPanelComponent,
  ],
  template: `
    <div class="auth">
      <app-auth-brand-panel />

      <div class="form-col">
        <form [formGroup]="form" (ngSubmit)="submit()" class="form">
          <div class="mobile-logo">
            <span class="coin">P</span>
            <span class="wordmark font-display">PICSOU</span>
          </div>

          <h2>Bon retour</h2>
          <p class="sub">Connecte-toi pour retrouver ton tableau de bord.</p>

          <div class="fields">
            <div class="field">
              <label for="email">Email</label>
              <div class="input" [class.invalid]="showError('email')">
                <lucide-icon [img]="icons.Mail" [size]="17"></lucide-icon>
                <input
                  id="email"
                  formControlName="email"
                  type="email"
                  autocomplete="email"
                  placeholder="prenom@exemple.com"
                />
              </div>
              @if (showError('email')) {
                <span class="err">
                  {{
                    form.controls.email.hasError('required')
                      ? 'L\\'email est requis.'
                      : 'Format d\\'email invalide.'
                  }}
                </span>
              }
            </div>

            <div class="field">
              <div class="field-head">
                <label for="password">Mot de passe</label>
                <button type="button" class="link-or" (click)="forgot()">
                  Oublié&nbsp;?
                </button>
              </div>
              <div class="input" [class.invalid]="showError('password')">
                <input
                  id="password"
                  formControlName="password"
                  [type]="showPwd() ? 'text' : 'password'"
                  autocomplete="current-password"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  class="eye"
                  [attr.aria-label]="showPwd() ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
                  (click)="showPwd.set(!showPwd())"
                >
                  <lucide-icon
                    [img]="showPwd() ? icons.EyeOff : icons.Eye"
                    [size]="17"
                  ></lucide-icon>
                </button>
              </div>
              @if (showError('password')) {
                <span class="err">Le mot de passe est requis.</span>
              }
            </div>

            <button
              type="submit"
              class="submit"
              [disabled]="form.invalid || loading()"
            >
              @if (loading()) {
                <span class="spinner" aria-hidden="true"></span>
                Connexion…
              } @else {
                Se connecter
                <lucide-icon [img]="icons.ArrowRight" [size]="18"></lucide-icon>
              }
            </button>
          </div>

          <div class="sep">
            <span class="line"></span><span class="or">ou</span
            ><span class="line"></span>
          </div>

          <p class="switch">
            Pas encore de compte ?
            <a routerLink="/signup">Créer un compte</a>
          </p>
        </form>
      </div>
    </div>
  `,
  styles: [AUTH_STYLES],
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private snack = inject(MatSnackBar);

  readonly icons = { Mail, Eye, EyeOff, ArrowRight };
  readonly showPwd = signal(false);
  readonly loading = signal(false);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  showError(name: 'email' | 'password'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  forgot(): void {
    this.snack.open(
      'La récupération de mot de passe arrivera bientôt.',
      'OK',
      { duration: 3000 },
    );
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: () => {
        this.loading.set(false);
        this.snack.open('Identifiants invalides', 'OK', { duration: 3000 });
      },
    });
  }
}
