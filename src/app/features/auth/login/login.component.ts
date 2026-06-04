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
  PlayCircle,
} from 'lucide-angular';
import { TimeoutError, timeout } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { AuthBrandPanelComponent } from '../auth-brand-panel.component';
import { AUTH_STYLES } from '../auth-styles';

/**
 * Compte de démonstration seedé (profil Spring `demo`, voir DemoSeed.java).
 * Identifiants volontairement publics : ils donnent accès à un compte de
 * démo peuplé, sans aucune donnée réelle. OK de les embarquer côté front.
 */
const DEMO_EMAIL = 'matteo@picsou.demo';
const DEMO_PASSWORD = 'Demo-Password-123';

/**
 * Le back tourne sur le free tier de Render : le premier appel après une
 * période d'inactivité réveille l'instance (cold start ~50 s). On laisse une
 * marge confortable avant de considérer la connexion comme échouée.
 */
const DEMO_LOGIN_TIMEOUT_MS = 90_000;

/** Styles propres à la page de login (le bouton démo n'existe pas sur signup). */
const LOGIN_STYLES = `
    .demo {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      width: 100%;
      min-height: 50px;
      margin-bottom: 28px;
      padding: var(--space-3) var(--space-4);
      border: 0.5px solid var(--border-strong);
      border-radius: var(--radius-md);
      background: var(--surface);
      color: var(--text);
      font-family: var(--font-sans);
      font-size: 15px;
      font-weight: 600;
      line-height: 1.35;
      text-align: center;
      cursor: pointer;
      transition:
        border-color var(--dur-fast) var(--ease),
        background var(--dur-fast) var(--ease);
    }
    .demo:hover:not(:disabled) {
      border-color: var(--text-tertiary);
      background: color-mix(in srgb, var(--surface) 96%, var(--text));
    }
    .demo:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
    .demo .spinner {
      border-color: color-mix(in srgb, var(--accent) 35%, transparent);
      border-top-color: var(--accent);
    }
  `;

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
            <img class="coin" src="/assets/branding/logo-picsou.png" alt="Picsou" />
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
              [disabled]="form.invalid || loading() || demoLoading()"
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

          <button
            type="button"
            class="demo"
            [disabled]="loading() || demoLoading()"
            (click)="loginDemo()"
          >
            @if (demoLoading()) {
              <span class="spinner" aria-hidden="true"></span>
              Connexion à la démo… (jusqu'à ~1 min au premier chargement)
            } @else {
              <lucide-icon [img]="icons.PlayCircle" [size]="18"></lucide-icon>
              Voir la démo
            }
          </button>

          <p class="switch">
            Pas encore de compte ?
            <a routerLink="/signup">Créer un compte</a>
          </p>
        </form>
      </div>
    </div>
  `,
  styles: [AUTH_STYLES, LOGIN_STYLES],
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private snack = inject(MatSnackBar);

  readonly icons = { Mail, Eye, EyeOff, ArrowRight, PlayCircle };
  readonly showPwd = signal(false);
  readonly loading = signal(false);
  readonly demoLoading = signal(false);

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

  /**
   * Connexion en un clic au compte de démo seedé, pour que le jury accède au
   * dashboard peuplé sans saisir d'identifiants. Réutilise le flow d'auth
   * standard ; ajoute un timeout généreux pour absorber le cold start Render.
   */
  loginDemo(): void {
    this.demoLoading.set(true);
    this.auth
      .login(DEMO_EMAIL, DEMO_PASSWORD)
      .pipe(timeout(DEMO_LOGIN_TIMEOUT_MS))
      .subscribe({
        next: () => this.router.navigate(['/dashboard']),
        error: (err) => {
          this.demoLoading.set(false);
          const message =
            err instanceof TimeoutError
              ? 'La démo met trop de temps à répondre. Réessaie dans un instant.'
              : 'Connexion à la démo impossible pour le moment. Réessaie dans un instant.';
          this.snack.open(message, 'OK', { duration: 5000 });
        },
      });
  }
}
