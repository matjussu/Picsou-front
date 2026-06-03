/**
 * Rendu markdown minimal et sûr pour la prose des insights IA (texte émis par le
 * LLM via notre backend). Couvre ce que le modèle produit réellement : titres
 * `#`/`##`/`###`, gras `**…**`, italique `*…*`, listes `- `/`* `, paragraphes et
 * sauts de ligne. Les emoji passent tels quels.
 *
 * Sécurité : le HTML spécial est échappé AVANT toute conversion, et le résultat
 * est ensuite re-sanitizé par Angular au binding `[innerHTML]` (DomSanitizer).
 * On ne produit que des balises de mise en forme (strong/em/h3/h4/ul/li/p/br).
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function inline(s: string): string {
  return escapeHtml(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

export function renderInsightMarkdown(src: string | null | undefined): string {
  if (!src) {
    return '';
  }
  const lines = src.split(/\r?\n/);
  const out: string[] = [];
  let inList = false;
  const closeList = (): void => {
    if (inList) {
      out.push('</ul>');
      inList = false;
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      closeList();
      continue;
    }
    if (/^###\s+/.test(line)) {
      closeList();
      out.push('<h4>' + inline(line.replace(/^###\s+/, '')) + '</h4>');
    } else if (/^##\s+/.test(line)) {
      closeList();
      out.push('<h3>' + inline(line.replace(/^##\s+/, '')) + '</h3>');
    } else if (/^#\s+/.test(line)) {
      closeList();
      out.push('<h3>' + inline(line.replace(/^#\s+/, '')) + '</h3>');
    } else if (/^[-*]\s+/.test(line)) {
      if (!inList) {
        out.push('<ul>');
        inList = true;
      }
      out.push('<li>' + inline(line.replace(/^[-*]\s+/, '')) + '</li>');
    } else {
      closeList();
      out.push('<p>' + inline(line) + '</p>');
    }
  }
  closeList();
  return out.join('');
}
