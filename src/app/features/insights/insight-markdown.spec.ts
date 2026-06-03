import { renderInsightMarkdown } from './insight-markdown';

describe('renderInsightMarkdown', () => {
  it('retourne une chaîne vide pour null/undefined/vide', () => {
    expect(renderInsightMarkdown(null)).toBe('');
    expect(renderInsightMarkdown(undefined)).toBe('');
    expect(renderInsightMarkdown('')).toBe('');
  });

  it('rend le gras **…** en <strong>', () => {
    expect(renderInsightMarkdown('Avec **2 610,00 €** de revenus')).toBe(
      '<p>Avec <strong>2 610,00 €</strong> de revenus</p>',
    );
  });

  it('rend les titres ## et ### en <h3>/<h4>', () => {
    expect(renderInsightMarkdown('## Résumé')).toBe('<h3>Résumé</h3>');
    expect(renderInsightMarkdown('### Détail')).toBe('<h4>Détail</h4>');
  });

  it('rend les listes - … en <ul><li>', () => {
    expect(renderInsightMarkdown('- un\n- deux')).toBe(
      '<ul><li>un</li><li>deux</li></ul>',
    );
  });

  it('laisse les emoji intacts', () => {
    expect(renderInsightMarkdown('Excellent mois ! 🎉')).toBe(
      '<p>Excellent mois ! 🎉</p>',
    );
  });

  it('échappe le HTML avant conversion (anti-XSS)', () => {
    const out = renderInsightMarkdown('<script>alert(1)</script> **x**');
    expect(out).not.toContain('<script>');
    expect(out).toContain('&lt;script&gt;');
    expect(out).toContain('<strong>x</strong>');
  });

  it('gère un format LLM réaliste (titre + gras + emoji + paragraphes)', () => {
    const src = '## Résumé de juin 2026\n\nExcellent mois ! Avec **2 610,00 € de revenus** 🎉';
    const out = renderInsightMarkdown(src);
    expect(out).toBe(
      '<h3>Résumé de juin 2026</h3><p>Excellent mois ! Avec <strong>2 610,00 € de revenus</strong> 🎉</p>',
    );
  });
});
