import { Component } from '@angular/core';
import {
  LucideAngularModule,
  Sparkles,
  TrendingDown,
  Users,
} from 'lucide-angular';

/**
 * Panneau de marque sombre des écrans d'auth (login/signup), reproduit depuis
 * screen-auth.jsx. Présentationnel. Masqué sous 860px (l'auth passe en colonne
 * formulaire seule sur mobile).
 */
@Component({
  selector: 'app-auth-brand-panel',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <aside class="panel">
      <svg class="coin-motif" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="46" />
        <circle cx="50" cy="50" r="33" />
        <text x="50" y="68" text-anchor="middle" class="coin-p">P</text>
      </svg>

      <div class="brand">
        <img class="coin" src="/assets/branding/logo-picsou.png" alt="Picsou" />
        <span class="wordmark font-display">PICSOU</span>
      </div>

      <div class="headline">
        <h1 class="font-display">
          REPRENDS LE<br />CONTRÔLE DE<br /><span class="or">TON ARGENT.</span>
        </h1>
        <p>
          Le tracker pensé pour la vie en coloc&#8201;: dépenses partagées,
          projections honnêtes, et une IA qui t'explique ton mois en une phrase.
        </p>
      </div>

      <ul class="features">
        @for (f of features; track f.label) {
          <li>
            <span class="f-icon">
              <lucide-icon [img]="f.icon" [size]="17"></lucide-icon>
            </span>
            <span>{{ f.label }}</span>
          </li>
        }
      </ul>
    </aside>
  `,
  styles: `
    /* Le host est étiré en hauteur par .auth (flex row, align-items:stretch),
       mais sans display propre le .panel interne gardait sa hauteur de contenu
       (~559px) → bande morte sous le panneau de marque en bas d'écran. On passe
       le host en flex pour que .panel remplisse toute la hauteur étirée ;
       flex-shrink:0 préserve la largeur fixe du panneau côté .auth. */
    :host {
      display: flex;
      flex-shrink: 0;
    }
    .panel {
      width: 528px;
      flex-shrink: 0;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: var(--space-12);
      background: linear-gradient(165deg, #1d1c15 0%, #0c0c0c 62%);
      border-right: 0.5px solid var(--border);
    }
    .coin-motif {
      position: absolute;
      right: -150px;
      bottom: -130px;
      width: 460px;
      height: 460px;
      opacity: 0.06;
      fill: none;
      stroke: var(--accent);
      stroke-width: 1.5;
      pointer-events: none;
    }
    .coin-p {
      font-family: var(--font-display);
      font-size: 38px;
      fill: var(--accent);
      stroke: none;
    }
    .brand {
      position: relative;
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }
    .coin {
      height: 48px;
      width: auto;
      object-fit: contain;
      flex-shrink: 0;
    }
    .wordmark {
      font-size: 32px;
      letter-spacing: 1.5px;
      color: var(--text);
    }
    .headline {
      position: relative;
    }
    .headline h1 {
      margin: 0;
      font-size: 66px;
      line-height: 0.92;
      letter-spacing: 1px;
      color: var(--text);
    }
    .headline .or {
      color: var(--accent);
    }
    .headline p {
      margin: var(--space-5) 0 0;
      font-size: var(--text-body);
      color: var(--text-secondary);
      line-height: 1.6;
      max-width: 380px;
    }
    .features {
      position: relative;
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }
    .features li {
      display: flex;
      align-items: center;
      gap: 13px;
      font-size: 15px;
      font-weight: 500;
      color: var(--text);
    }
    .f-icon {
      width: 34px;
      height: 34px;
      border-radius: var(--radius-md);
      display: grid;
      place-items: center;
      background: rgba(255, 214, 10, 0.1);
      border: 0.5px solid rgba(255, 214, 10, 0.25);
      color: var(--accent);
    }

    @media (max-width: 860px) {
      .panel {
        display: none;
      }
    }
  `,
})
export class AuthBrandPanelComponent {
  readonly features = [
    { icon: Users, label: 'Split coloc en temps réel' },
    { icon: TrendingDown, label: 'Projection fin de mois' },
    { icon: Sparkles, label: 'Insight AI en français' },
  ];
}
