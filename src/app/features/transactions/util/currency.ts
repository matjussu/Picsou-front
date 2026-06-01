// Format devise fr-FR, signe moins typographique (U+2212), conforme au handoff (picsou-ui.jsx eur()).
// 1 248,50 € · entrées préfixées « + » · zéro = 0,00 € · absence de donnée = « — ».

const EUR_FMT = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

const MINUS = '−'; // U+2212, pas le tiret ASCII
const NBSP = ' ';

/**
 * Formate un montant en euros.
 * @param value montant (number) ou null/undefined → « — »
 * @param opts.plus préfixe « + » pour les valeurs strictement positives (entrées)
 */
export function eur(value: number | null | undefined, opts: { plus?: boolean } = {}): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }
  const abs = EUR_FMT.format(Math.abs(value));
  if (value < 0) {
    return `${MINUS}${NBSP}${abs}`;
  }
  if (opts.plus && value > 0) {
    return `+${NBSP}${abs}`;
  }
  return abs;
}
