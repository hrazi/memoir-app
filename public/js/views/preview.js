// Full book preview (print-ready)

import { getState } from '../state.js';

export function renderPreview(container) {
  const state = getState();
  if (!state.project || !state.currentProjectId) { window.location.hash = '#home'; return; }

  const { project, chapters } = state;

  container.innerHTML = `
    <div class="content-center">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <h2 style="font-family: var(--font-serif);">Book Preview</h2>
        <a href="#export" class="btn btn-primary">Export Book</a>
      </div>

      ${chapters.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">\uD83D\uDC41</div>
          <h3>Nothing to preview yet</h3>
          <p>Write some chapters first, then come back to preview your book.</p>
          <a href="#chapters" class="btn btn-primary">Go to Chapters</a>
        </div>
      ` : `
        <div class="preview-book">
          <h1>${project.title || 'My Memoir'}</h1>
          ${project.author ? `<p class="book-author">by ${project.author}</p>` : ''}

          ${chapters.length > 1 ? `
            <div class="preview-toc">
              <h3>Table of Contents</h3>
              <ol>
                ${chapters.map((ch, i) => `
                  <li><a href="javascript:void(0)" class="toc-link" data-idx="${i}">${ch.title || `Chapter ${i + 1}`}</a></li>
                `).join('')}
              </ol>
            </div>
          ` : ''}

          ${chapters.map((ch, i) => `
            <div class="preview-chapter" id="preview-ch-${i}">
              <h2>${ch.title || `Chapter ${i + 1}`}</h2>
              <div class="preview-chapter-content">
                ${ch.content || '<p><em>No content written yet.</em></p>'}
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;

  // TOC scroll links
  container.querySelectorAll('.toc-link').forEach(link => {
    link.addEventListener('click', () => {
      const el = document.getElementById(`preview-ch-${link.dataset.idx}`);
      el?.scrollIntoView({ behavior: 'smooth' });
    });
  });
}
