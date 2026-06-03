/** Styles partagés des écrans d'auth (login/signup) : split brand panel + formulaire. */
export const AUTH_STYLES = `
    :host {
      display: block;
    }
    .auth {
      min-height: 100vh;
      display: flex;
      background: var(--bg);
      color: var(--text);
    }
    .form-col {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-10);
    }
    .form {
      width: 100%;
      max-width: 380px;
    }
    .mobile-logo {
      display: none;
      align-items: center;
      gap: var(--space-3);
      margin-bottom: var(--space-8);
    }
    .mobile-logo .coin {
      width: 34px;
      height: 34px;
      border-radius: var(--radius-pill);
      background: var(--accent);
      color: var(--on-accent);
      font-family: var(--font-display);
      font-size: 22px;
      display: grid;
      place-items: center;
    }
    .mobile-logo .wordmark {
      font-size: 25px;
      letter-spacing: 1.5px;
    }
    h2 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
      letter-spacing: -0.4px;
      color: var(--text);
    }
    .sub {
      margin: var(--space-2) 0 var(--space-8);
      font-size: 15px;
      color: var(--text-secondary);
    }
    .fields {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 7px;
    }
    .field-head {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .field label {
      font-size: 13px;
      font-weight: 500;
      color: var(--text-secondary);
    }
    .link-or {
      background: transparent;
      border: none;
      padding: 0;
      font-size: 13px;
      color: var(--accent);
      cursor: pointer;
      font-weight: 500;
    }
    .input {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      height: 50px;
      padding: 0 15px;
      background: var(--surface);
      border: 0.5px solid var(--border-strong);
      border-radius: var(--radius-md);
      color: var(--text-tertiary);
      transition: border-color var(--dur-fast) var(--ease);
    }
    .input:focus-within {
      border-color: var(--text-tertiary);
    }
    .input.invalid {
      border-color: var(--danger);
    }
    .input input {
      flex: 1;
      min-width: 0;
      background: transparent;
      border: none;
      outline: none;
      color: var(--text);
      font-family: var(--font-sans);
      font-size: 15px;
    }
    .input input::placeholder {
      color: var(--text-tertiary);
    }
    .eye {
      display: inline-flex;
      background: transparent;
      border: none;
      color: var(--text-tertiary);
      cursor: pointer;
      padding: 0;
    }
    .eye:hover {
      color: var(--text-secondary);
    }
    .err {
      font-size: 12.5px;
      color: var(--danger);
    }
    .submit {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      width: 100%;
      min-height: 50px;
      margin-top: 6px;
      border: none;
      border-radius: var(--radius-md);
      background: var(--accent);
      color: var(--on-accent);
      font-family: var(--font-sans);
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: filter var(--dur-fast) var(--ease);
    }
    .submit:hover:not(:disabled) {
      filter: brightness(1.05);
    }
    .submit:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid color-mix(in srgb, var(--on-accent) 35%, transparent);
      border-top-color: var(--on-accent);
      border-radius: var(--radius-pill);
      display: inline-block;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
    .legal {
      margin: var(--space-4) 0 0;
      font-size: 12.5px;
      color: var(--text-tertiary);
      line-height: 1.5;
    }
    .sep {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      margin: 28px 0;
    }
    .sep .line {
      flex: 1;
      height: 1px;
      background: var(--border);
    }
    .sep .or {
      font-size: 13px;
      color: var(--text-tertiary);
    }
    .switch {
      margin: 0;
      text-align: center;
      font-size: 14.5px;
      color: var(--text-secondary);
    }
    .switch a {
      color: var(--accent);
      font-weight: 600;
      text-decoration: none;
    }
    .switch a:hover {
      text-decoration: underline;
    }
    @media (max-width: 860px) {
      .mobile-logo {
        display: flex;
      }
      .form-col {
        padding: var(--space-6);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .spinner {
        animation: none;
      }
    }
  `;
