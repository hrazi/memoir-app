// Download as HTML/Text/JSON

import { api } from '../api.js';
import { getState } from '../state.js';
import { showToast } from '../components/toast.js';

export function renderExport(container) {
  const state = getState();
  const pid = state.currentProjectId;
  if (!state.project || !pid) { window.location.hash = '#home'; return; }

  const { chapters, memories } = state;

  container.innerHTML = `
    <div class="content-center">
      <h2 style="font-family: var(--font-serif); margin-bottom: 8px;">Export Your Book</h2>
      <p style="color: var(--text-light); margin-bottom: 32px;">
        Download your memoir in different formats. Your data always stays on your computer.
      </p>

      <div class="export-options">
        <div class="card export-card" id="export-pdf">
          <div class="export-icon">\uD83D\uDCC3</div>
          <h3>PDF</h3>
          <p>Print-ready PDF with beautiful typography. Perfect for sharing or printing.</p>
        </div>

        <div class="card export-card" id="export-html">
          <div class="export-icon">\uD83C\uDF10</div>
          <h3>Styled HTML</h3>
          <p>Print-ready HTML file with beautiful typography. Open in a browser and print to PDF.</p>
        </div>

        <div class="card export-card" id="export-text">
          <div class="export-icon">\uD83D\uDCC4</div>
          <h3>Plain Text</h3>
          <p>Simple text file you can open anywhere. Great for pasting into other tools.</p>
        </div>

        <div class="card export-card" id="export-json">
          <div class="export-icon">\uD83D\uDCBE</div>
          <h3>Full Backup (JSON)</h3>
          <p>Complete data export including all memories, chapters, and settings.</p>
        </div>
      </div>

      <div style="margin-top: 40px; padding: 20px; background: var(--bg-warm); border-radius: var(--radius-lg);">
        <h3 style="font-size: 0.95rem; margin-bottom: 8px;">Your Book at a Glance</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(90px, 1fr)); gap: 16px; text-align: center;">
          <div>
            <div style="font-size: 1.5rem; font-weight: 600; color: var(--accent);">${memories.length}</div>
            <div style="font-size: 0.82rem; color: var(--text-light);">Memories</div>
          </div>
          <div>
            <div style="font-size: 1.5rem; font-weight: 600; color: var(--accent);">${chapters.length}</div>
            <div style="font-size: 0.82rem; color: var(--text-light);">Chapters</div>
          </div>
          <div>
            <div style="font-size: 1.5rem; font-weight: 600; color: var(--accent);">${countWords(chapters)}</div>
            <div style="font-size: 0.82rem; color: var(--text-light);">Words Written</div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('export-pdf').addEventListener('click', () => {
    if (chapters.length === 0) { showToast('Write some chapters first.', 'error'); return; }
    exportPDF(state.project, chapters);
  });

  document.getElementById('export-html').addEventListener('click', async () => {
    if (chapters.length === 0) { showToast('Write some chapters first.', 'error'); return; }
    await api.exportHTML(pid);
    showToast('HTML file downloaded!', 'success');
  });

  document.getElementById('export-text').addEventListener('click', async () => {
    if (chapters.length === 0) { showToast('Write some chapters first.', 'error'); return; }
    await api.exportText(pid);
    showToast('Text file downloaded!', 'success');
  });

  document.getElementById('export-json').addEventListener('click', async () => {
    await api.exportJSON(pid);
    showToast('Backup downloaded!', 'success');
  });
}

function exportPDF(project, chapters) {
  const title = project.title || 'My Memoir';
  const author = project.author || '';

  const chaptersHTML = chapters.map((ch, i) => `
    <div class="chapter" style="page-break-before: always;">
      <h2>${ch.title || `Chapter ${i + 1}`}</h2>
      <div class="chapter-content">${ch.content || ''}</div>
    </div>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=Inter:wght@400;500;600&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Lora', Georgia, serif;
    color: #2C2C2C;
    line-height: 1.8;
    padding: 0;
  }
  .title-page {
    text-align: center;
    padding: 120px 40px 80px;
    page-break-after: always;
  }
  .title-page h1 {
    font-size: 2.4rem;
    font-weight: 600;
    margin-bottom: 12px;
  }
  .title-page .author {
    font-size: 1.2rem;
    color: #6B6B6B;
  }
  .toc {
    padding: 40px;
    page-break-after: always;
  }
  .toc h3 {
    font-size: 1.1rem;
    margin-bottom: 16px;
    font-family: 'Inter', sans-serif;
  }
  .toc ol {
    padding-left: 24px;
  }
  .toc li {
    margin: 8px 0;
    font-size: 1rem;
    color: #2D6A4F;
  }
  .chapter {
    padding: 40px;
  }
  .chapter h2 {
    font-size: 1.6rem;
    margin-bottom: 20px;
    padding-bottom: 8px;
    border-bottom: 1px solid #E5E0DB;
  }
  .chapter-content {
    font-size: 1.05rem;
    line-height: 1.8;
  }
  .chapter-content p { margin-bottom: 0.8em; }
  .chapter-content img { max-width: 100%; height: auto; margin: 0.8em 0; display: block; }
  .chapter-content blockquote {
    border-left: 3px solid #2D6A4F;
    padding-left: 1em;
    margin: 0.8em 0;
    color: #6B6B6B;
    font-style: italic;
  }
  @media print {
    body { padding: 0; }
    .title-page { padding: 160px 40px 80px; }
    .chapter { padding: 20px 0; }
    .toc { padding: 20px 0; }
  }
</style>
</head>
<body>
  <div class="title-page">
    <h1>${title}</h1>
    ${author ? `<p class="author">by ${author}</p>` : ''}
  </div>
  ${chapters.length > 1 ? `
    <div class="toc">
      <h3>Table of Contents</h3>
      <ol>
        ${chapters.map((ch, i) => `<li>${ch.title || `Chapter ${i + 1}`}</li>`).join('')}
      </ol>
    </div>
  ` : ''}
  ${chaptersHTML}
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    showToast('Pop-up blocked. Please allow pop-ups for this site.', 'error');
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.print();
  };
}

function countWords(chapters) {
  const text = chapters.map(c => c.content || '').join(' ');
  const plain = text.replace(/<[^>]+>/g, ' ');
  const words = plain.trim().split(/\s+/).filter(w => w.length > 0);
  return words.length;
}
