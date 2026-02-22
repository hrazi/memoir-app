// Lightweight markdown-to-HTML for AI responses
// Handles: bold, italic, headings, lists, line breaks

export function renderMarkdown(text) {
  if (!text) return '';
  let html = text
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Split into blocks by double newline
  const blocks = html.split(/\n{2,}/);
  const rendered = blocks.map(block => {
    const trimmed = block.trim();
    if (!trimmed) return '';

    // Headings
    if (/^#{1,4}\s/.test(trimmed)) {
      const level = trimmed.match(/^(#{1,4})\s/)[1].length;
      const text = trimmed.replace(/^#{1,4}\s+/, '');
      return `<h${level + 2}>${inlineFormat(text)}</h${level + 2}>`;
    }

    // Unordered list (-, *, •)
    if (/^[\-\*\u2022]\s/m.test(trimmed)) {
      const items = trimmed.split(/\n/).filter(l => l.trim());
      const lis = items.map(li => `<li>${inlineFormat(li.replace(/^\s*[\-\*\u2022]\s+/, ''))}</li>`).join('');
      return `<ul>${lis}</ul>`;
    }

    // Numbered list
    if (/^\d+[\.\)]\s/m.test(trimmed)) {
      const items = trimmed.split(/\n/).filter(l => l.trim());
      const lis = items.map(li => `<li>${inlineFormat(li.replace(/^\s*\d+[\.\)]\s+/, ''))}</li>`).join('');
      return `<ol>${lis}</ol>`;
    }

    // Regular paragraph — preserve single newlines as <br>
    return `<p>${inlineFormat(trimmed).replace(/\n/g, '<br>')}</p>`;
  });

  return rendered.filter(Boolean).join('');
}

function inlineFormat(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
}
