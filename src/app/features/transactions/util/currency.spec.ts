import { eur, eurCompact } from './currency';

// fr-FR utilise des espaces insécables variables (U+00A0 / U+202F) ; on matche
// avec « . » (n'importe quel séparateur) pour des assertions robustes.

describe('eur', () => {
  it('formate un montant positif en fr-FR', () => {
    expect(eur(1248.5)).toMatch(/^1.248,50.€$/);
  });

  it('utilise le moins typographique U+2212 pour les negatifs', () => {
    expect(eur(-10)).toContain('−');
    expect(eur(-10)).not.toContain('-');
  });

  it('prefixe + pour les entrees avec plus:true', () => {
    expect(eur(1240, { plus: true }).startsWith('+')).toBe(true);
  });

  it('rend le tiret cadratin pour null/undefined/NaN', () => {
    expect(eur(null)).toBe('—');
    expect(eur(undefined)).toBe('—');
    expect(eur(NaN)).toBe('—');
  });
});

describe('eurCompact', () => {
  it('abrege les milliers en « k € »', () => {
    expect(eurCompact(2329.1)).toMatch(/^2,3.k.€$/);
    expect(eurCompact(1093.28)).toMatch(/^1,1.k.€$/);
  });

  it('garde les petits montants entiers (sans « k »)', () => {
    expect(eurCompact(850)).toMatch(/^850.€$/);
    expect(eurCompact(850)).not.toContain('k');
    expect(eurCompact(0)).toMatch(/^0.€$/);
  });

  it('reste court (anti-chevauchement)', () => {
    expect(eurCompact(98765).length).toBeLessThanOrEqual(10);
  });

  it('rend le tiret cadratin pour absence de donnee', () => {
    expect(eurCompact(null)).toBe('—');
    expect(eurCompact(NaN)).toBe('—');
  });
});
