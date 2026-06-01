import { Component } from '@angular/core';

/**
 * Écran Transactions (Phase 2).
 * Fondation posée : top bar + zone contenu. La liste filtrée backend + le tableau + le modal
 * d'ajout sont câblés dans l'étape suivante (services HTTP + Material Table + Dialog).
 */
@Component({
  selector: 'app-transactions-page',
  standalone: true,
  template: `
    <header class="topbar">
      <h1 class="title">Transactions</h1>
    </header>
    <section class="body">
      <p class="placeholder">Écran Transactions — fondation design system posée (Phase 2).</p>
    </section>
  `,
  styles: `
    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-6) var(--space-8);
      border-bottom: 0.5px solid var(--border);
    }
    .title {
      margin: 0;
      font-size: 26px;
      font-weight: 600;
      letter-spacing: -0.4px;
      color: var(--text);
    }
    .body {
      padding: var(--space-8);
      max-width: var(--container-max);
    }
    .placeholder {
      color: var(--text-secondary);
    }
  `,
})
export class TransactionsPageComponent {}
