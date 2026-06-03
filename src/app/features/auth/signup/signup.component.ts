import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import {
  Check,
  Eye,
  EyeOff,
  LucideAngularModule,
  Mail,
  User,
} from 'lucide-angular';

import { AuthService } from '../../../core/auth/auth.service';
import { AuthBrandPanelComponent } from '../auth-brand-panel.component';
import { AUTH_STYLES } from '../auth-styles';

/**
 * Écran d'inscription — design reproduit depuis screen-auth.jsx (split brand panel
 * + formulaire). La logique (ReactiveForms, validators, submit, AuthService) est
 * inchangée ; seule la couche visuelle s'aligne sur la maquette. Au succès →
 * onboarding présentationnel.
 */
@Component({
  selector: 'app-signup',
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

          <h2>Créer ton compte</h2>
          <p class="sub">Quelques infos et tu démarres en 2 minutes.</p>

          <div class="fields">
            <div class="field">
              <label for="firstName">Prénom</label>
              <div class="input" [class.invalid]="showError('firstName')">
                <lucide-icon [img]="icons.User" [size]="17"></lucide-icon>
                <input
                  id="firstName"
                  formControlName="firstName"
                  autocomplete="given-name"
                  placeholder="Marie"
                />
              </div>
              @if (showError('firstName')) {
                <span class="err">Le prénom est requis.</span>
              }
            </div>

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
              <label for="password">Mot de passe</label>
              <div class="input" [class.invalid]="showError('password')">
                <input
                  id="password"
                  formControlName="password"
                  [type]="showPwd() ? 'text' : 'password'"
                  autocomplete="new-password"
                  placeholder="8 caractères minimum"
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
                <span class="err">
                  {{
                    form.controls.password.hasError('required')
                      ? 'Le mot de passe est requis.'
                      : 'Au moins 8 caractères.'
                  }}
                </span>
              }
            </div>

            <button
              type="submit"
              class="submit"
              [disabled]="form.invalid || loading()"
            >
              @if (loading()) {
                <span class="spinner" aria-hidden="true"></span>
                Création…
              } @else {
                Créer mon compte
                <lucide-icon [img]="icons.Check" [size]="18"></lucide-icon>
              }
            </button>
          </div>

          <p class="legal">
            En créant un compte, tu acceptes les conditions d'utilisation et la
            politique de confidentialité de Picsou.
          </p>

          <div class="sep">
            <span class="line"></span><span class="or">ou</span
            ><span class="line"></span>
          </div>

          <p class="switch">
            Déjà un compte ?
            <a routerLink="/login">Se connecter</a>
          </p>
        </form>
      </div>
    </div>
  `,
  styles: [AUTH_STYLES],
})
export class SignupComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private snack = inject(MatSnackBar);

  readonly icons = { User, Mail, Eye, EyeOff, Check };
  readonly showPwd = signal(false);
  readonly loading = signal(false);

  form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  showError(name: 'firstName' | 'email' | 'password'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    const { firstName, email, password } = this.form.getRawValue();
    this.auth.signup(email, password, firstName).subscribe({
      next: () => this.router.navigate(['/onboarding']),
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        const msg =
          err.status === 409 ? 'Email déjà utilisé' : 'Erreur lors de la création';
        this.snack.open(msg, 'OK', { duration: 3000 });
      },
    });
  }
}
