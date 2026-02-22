// Chapter writing with AI side panel

import { api } from '../api.js';
import { getState, setState } from '../state.js';
import { showToast } from '../components/toast.js';
import { createRichEditor } from '../components/rich-editor.js';
import { createAIPanel } from '../components/ai-panel.js';

export function renderEditor(container) {
  const state = getState();
  const pid = state.currentProjectId;
  if (!state.project || !pid) { window.location.hash = '#home'; return; }

  // Get chapter ID from hash params
  const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
  let chapterId = params.get('id');

  // Default to first chapter
  if (!chapterId && state.chapters.length > 0) {
    chapterId = state.chapters[0].id;
  }

  if (!chapterId || state.chapters.length === 0) {
    container.innerHTML = `
      <div class="content-center">
        <div class="empty-state">
          <div class="empty-icon">\u2712</div>
          <h3>Start writing</h3>
          <p>Create a new chapter and start writing from scratch.</p>
          <button class="btn btn-primary" id="create-and-write-btn">+ New Chapter</button>
          <a href="#chapters" class="btn btn-secondary" style="margin-left: 8px;">Go to Chapters</a>
        </div>
      </div>
    `;
    document.getElementById('create-and-write-btn')?.addEventListener('click', async () => {
      const chapter = await api.createChapter(pid, { title: 'Untitled Chapter' });
      setState({ chapters: [...getState().chapters, chapter] });
      window.location.hash = `#editor?id=${chapter.id}`;
    });
    return;
  }

  const chapter = state.chapters.find(c => c.id === chapterId);
  if (!chapter) {
    container.innerHTML = `<div class="content-center"><p>Chapter not found.</p><a href="#chapters">Back to Chapters</a></div>`;
    return;
  }

  // Get memories for this chapter
  const memories = (chapter.memoryIds || [])
    .map(id => state.memories.find(m => m.id === id))
    .filter(Boolean);

  let saveTimer = null;
  let saveStatus = 'Saved';
  let panelCollapsed = false;
  let editor = null;

  function render() {
    container.innerHTML = `
      <div class="content-wide">
        <div class="editor-header-bar">
          <select class="select" id="chapter-select">
            ${state.chapters.map(c => `<option value="${c.id}" ${c.id === chapterId ? 'selected' : ''}>${c.title || 'Untitled'}</option>`).join('')}
          </select>
          <span class="editor-save-status" id="save-status">${saveStatus}</span>
          <button class="btn btn-ghost btn-sm" id="toggle-panel">
            ${panelCollapsed ? 'Show' : 'Hide'} AI Panel
          </button>
        </div>

        <div class="editor-layout ${panelCollapsed ? 'panel-collapsed' : ''}">
          <div class="editor-main">
            <input type="text" class="editor-title-input" id="editor-title"
              value="${chapter.title || ''}" placeholder="Chapter title..." />
            <div id="rich-editor-container"></div>

            ${memories.length > 0 ? `
              <div class="editor-references">
                <h4>Reference Memories (${memories.length})</h4>
                ${memories.map(m => `
                  <div class="editor-ref-card">
                    <strong>${m.question}</strong><br/>
                    ${(m.answer || '').substring(0, 200)}${(m.answer || '').length > 200 ? '...' : ''}
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>

          ${!panelCollapsed ? '<div id="ai-panel-container"></div>' : ''}
        </div>
      </div>
    `;

    // Rich editor
    editor = createRichEditor(document.getElementById('rich-editor-container'), {
      placeholder: 'Start writing your chapter here...',
      initialContent: chapter.content || '',
      onChange: (html) => {
        saveStatus = 'Unsaved changes...';
        document.getElementById('save-status').textContent = saveStatus;
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => autoSave(html), 2000);
      },
      onImageUpload: async (file) => {
        try {
          const result = await api.uploadImage(pid, file);
          return result.url;
        } catch (err) {
          showToast('Image upload failed: ' + err.message, 'error');
          return null;
        }
      },
    });

    // AI Panel
    if (!panelCollapsed) {
      createAIPanel(document.getElementById('ai-panel-container'), {
        projectId: pid,
        getEditorText: () => editor.getTextContent(),
        chapterTitle: chapter.title || '',
        onApply: (html, appendHtml) => {
          if (appendHtml) {
            // Continue Writing: append to existing content
            editor.appendContent(appendHtml);
          } else {
            // Replace: standard apply behavior
            editor.replaceContent(html);
          }
        },
        onTitleApply: async (title) => {
          const titleInput = document.getElementById('editor-title');
          if (titleInput) titleInput.value = title;
          await api.updateChapter(pid, chapterId, { title });
          const chapters = state.chapters.map(c => c.id === chapterId ? { ...c, title } : c);
          setState({ chapters });
        },
        memories,
      });
    }

    // Chapter selector
    document.getElementById('chapter-select').addEventListener('change', (e) => {
      window.location.hash = `#editor?id=${e.target.value}`;
    });

    // Title
    document.getElementById('editor-title').addEventListener('change', async (e) => {
      const title = e.target.value.trim();
      await api.updateChapter(pid, chapterId, { title });
      const chapters = state.chapters.map(c => c.id === chapterId ? { ...c, title } : c);
      setState({ chapters });
    });

    // Toggle panel
    document.getElementById('toggle-panel').addEventListener('click', () => {
      panelCollapsed = !panelCollapsed;
      render();
    });
  }

  async function autoSave(html) {
    try {
      await api.updateChapter(pid, chapterId, { content: html });
      const chapters = getState().chapters.map(c => c.id === chapterId ? { ...c, content: html } : c);
      setState({ chapters });
      saveStatus = 'Saved';
      const el = document.getElementById('save-status');
      if (el) el.textContent = saveStatus;
    } catch {
      saveStatus = 'Save failed';
      const el = document.getElementById('save-status');
      if (el) el.textContent = saveStatus;
    }
  }

  render();
}
