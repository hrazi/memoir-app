// Organize chapters, drag-to-reorder

import { api } from '../api.js';
import { getState, setState } from '../state.js';
import { stages } from '../prompts.js';
import { showToast } from '../components/toast.js';
import { showModal } from '../components/modal.js';
import { makeDraggable } from '../components/drag-list.js';

export function renderChapters(container) {
  const state = getState();
  const pid = state.currentProjectId;
  if (!state.project || !pid) { window.location.hash = '#home'; return; }

  let selectedChapterId = getState().chapters[0]?.id || null;
  let pendingSuggestions = null;

  function render() {
    const chapters = getState().chapters;
    const memories = getState().memories;
    const selected = chapters.find(c => c.id === selectedChapterId);

    // Get unassigned memories
    const assignedIds = new Set(chapters.flatMap(c => c.memoryIds || []));
    const unassigned = memories.filter(m => !assignedIds.has(m.id));

    container.innerHTML = `
      <div class="content-wide">
        <div class="memories-header">
          <h2>Chapters</h2>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-primary" id="add-chapter-btn">+ Add Chapter</button>
            <button class="btn btn-secondary" id="ai-suggest-btn">\u2728 AI Suggest Structure</button>
          </div>
        </div>

        ${pendingSuggestions ? `
          <div class="suggestions-panel" style="background: var(--bg-card, #f8f9fa); border: 1px solid var(--border, #dee2e6); border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <h3 style="margin: 0 0 16px; font-size: 1rem;">AI Suggested Structure</h3>
            <div class="suggestions-list">
              ${pendingSuggestions.map((s, i) => `
                <div class="suggestion-row" data-index="${i}" style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                  <input type="text" class="input suggestion-title-input" data-index="${i}" value="${(s.title || '').replace(/"/g, '&quot;')}" placeholder="Chapter title" style="flex: 1;" />
                  <span style="color: var(--text-muted); font-size: 0.85rem; white-space: nowrap;">${s.memoryIds.length} ${s.memoryIds.length === 1 ? 'memory' : 'memories'}</span>
                  <button class="btn btn-ghost btn-sm remove-suggestion-btn" data-index="${i}" style="color: var(--danger); font-size: 1.2rem; padding: 2px 8px;">\u00D7</button>
                </div>
              `).join('')}
            </div>
            ${pendingSuggestions.length === 0 ? '<p style="color: var(--text-muted); font-size: 0.85rem;">All suggestions removed.</p>' : ''}
            <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px;">
              ${pendingSuggestions.length > 0 ? '<button class="btn btn-primary" id="apply-suggestions-btn">Add Chapters</button>' : ''}
              <button class="btn btn-secondary" id="cancel-suggestions-btn">Cancel</button>
            </div>
          </div>
        ` : ''}

        ${chapters.length === 0 && memories.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">\uD83D\uDCD6</div>
            <h3>No chapters yet</h3>
            <p>Start by collecting some memories in the interview, then organize them into chapters.</p>
            <a href="#interview" class="btn btn-primary">Start Interview</a>
          </div>
        ` : `
          <div class="chapters-layout">
            <div class="chapter-list">
              <h3>Chapters (drag to reorder)</h3>
              <div id="chapter-items">
                ${chapters.map((ch, i) => `
                  <div class="chapter-item drag-item ${ch.id === selectedChapterId ? 'active' : ''}"
                       data-id="${ch.id}" draggable="true">
                    <span class="drag-handle">\u2261</span>
                    <span>${i + 1}. ${ch.title || 'Untitled'}</span>
                  </div>
                `).join('')}
              </div>
              ${chapters.length === 0 ? '<p style="color: var(--text-muted); font-size: 0.85rem; padding: 8px;">Click "Add Chapter" to get started</p>' : ''}
            </div>

            <div class="chapter-detail">
              ${selected ? `
                <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: start; margin-bottom: 16px;">
                  <div style="flex: 1; min-width: 200px;">
                    <input type="text" class="input" id="chapter-title-input" value="${selected.title || ''}" placeholder="Chapter title" style="font-family: var(--font-serif); font-size: 1.1rem; font-weight: 600;" />
                  </div>
                  <div style="display: flex; gap: 8px;">
                    <a href="#editor?id=${selected.id}" class="btn btn-primary btn-sm">Write</a>
                    <button class="btn btn-danger btn-sm" id="delete-chapter-btn">Delete</button>
                  </div>
                </div>

                <h4 style="font-size: 0.85rem; color: var(--text-light); margin-bottom: 8px;">
                  Memories in this chapter (${(selected.memoryIds || []).length})
                </h4>
                <div class="chapter-memories-list" id="chapter-memories">
                  ${(selected.memoryIds || []).map(mid => {
                    const mem = memories.find(m => m.id === mid);
                    if (!mem) return '';
                    return `
                      <div class="chapter-memory-item drag-item" data-id="${mid}" draggable="true">
                        <span class="drag-handle">\u2261</span>
                        <span class="memory-text">${mem.question}: ${(mem.answer || '').substring(0, 80)}...</span>
                        <button class="btn btn-ghost btn-sm remove-memory-btn" data-id="${mid}" style="color: var(--danger);">\u00D7</button>
                      </div>
                    `;
                  }).join('')}
                  ${(selected.memoryIds || []).length === 0 ? '<p style="color: var(--text-muted); font-size: 0.85rem; padding: 12px;">Drag memories here or click "Add" below</p>' : ''}
                </div>

                ${unassigned.length > 0 ? `
                  <h4 style="font-size: 0.85rem; color: var(--text-light); margin: 20px 0 8px;">
                    Unassigned memories (${unassigned.length})
                  </h4>
                  <div style="max-height: 300px; overflow-y: auto;">
                    ${unassigned.map(m => `
                      <div class="chapter-memory-item" style="cursor: default;">
                        <span class="memory-text">${m.question}: ${(m.answer || '').substring(0, 80)}...</span>
                        <button class="btn btn-ghost btn-sm add-memory-btn" data-id="${m.id}">Add</button>
                      </div>
                    `).join('')}
                  </div>
                ` : ''}
              ` : `
                <div class="empty-state">
                  <p>Select a chapter from the left to see its details</p>
                </div>
              `}
            </div>
          </div>
        `}
      </div>
    `;

    // Event listeners
    document.getElementById('add-chapter-btn')?.addEventListener('click', addChapter);
    document.getElementById('ai-suggest-btn')?.addEventListener('click', aiSuggest);
    document.getElementById('delete-chapter-btn')?.addEventListener('click', () => deleteChapter(selectedChapterId));

    // Suggestion panel listeners
    container.querySelectorAll('.suggestion-title-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.index);
        if (pendingSuggestions && pendingSuggestions[idx]) {
          pendingSuggestions[idx].title = e.target.value.trim();
        }
      });
    });

    container.querySelectorAll('.remove-suggestion-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index);
        if (pendingSuggestions) {
          pendingSuggestions.splice(idx, 1);
          render();
        }
      });
    });

    document.getElementById('apply-suggestions-btn')?.addEventListener('click', async () => {
      if (!pendingSuggestions || pendingSuggestions.length === 0) return;
      const toAdd = [...pendingSuggestions];
      pendingSuggestions = null;

      const newChapters = [];
      for (const sug of toAdd) {
        const chapter = await api.createChapter(pid, { title: sug.title, memoryIds: sug.memoryIds });
        newChapters.push(chapter);
      }
      setState({ chapters: [...getState().chapters, ...newChapters] });
      selectedChapterId = newChapters[0]?.id || selectedChapterId;
      render();
      showToast(`${newChapters.length} chapter${newChapters.length === 1 ? '' : 's'} added!`, 'success');
    });

    document.getElementById('cancel-suggestions-btn')?.addEventListener('click', () => {
      pendingSuggestions = null;
      render();
    });

    document.getElementById('chapter-title-input')?.addEventListener('change', async (e) => {
      await api.updateChapter(pid, selectedChapterId, { title: e.target.value.trim() });
      const chapters = getState().chapters.map(c =>
        c.id === selectedChapterId ? { ...c, title: e.target.value.trim() } : c
      );
      setState({ chapters });
      render();
    });

    // Chapter selection
    container.querySelectorAll('.chapter-item').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('.drag-handle')) return;
        selectedChapterId = el.dataset.id;
        render();
      });
    });

    // Remove memory from chapter
    container.querySelectorAll('.remove-memory-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ch = getState().chapters.find(c => c.id === selectedChapterId);
        const memoryIds = (ch.memoryIds || []).filter(id => id !== btn.dataset.id);
        await api.updateChapter(pid, selectedChapterId, { memoryIds });
        const chapters = getState().chapters.map(c =>
          c.id === selectedChapterId ? { ...c, memoryIds } : c
        );
        setState({ chapters });
        render();
      });
    });

    // Add memory to chapter
    container.querySelectorAll('.add-memory-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ch = getState().chapters.find(c => c.id === selectedChapterId);
        const memoryIds = [...(ch.memoryIds || []), btn.dataset.id];
        await api.updateChapter(pid, selectedChapterId, { memoryIds });
        const chapters = getState().chapters.map(c =>
          c.id === selectedChapterId ? { ...c, memoryIds } : c
        );
        setState({ chapters });
        render();
      });
    });

    // Drag to reorder chapters
    const chapterItems = document.getElementById('chapter-items');
    if (chapterItems) {
      makeDraggable(chapterItems, {
        itemSelector: '.chapter-item',
        onReorder: async (ids) => {
          const reordered = await api.reorderChapters(pid, ids);
          setState({ chapters: reordered });
          render();
        },
      });
    }

    // Drag to reorder memories in chapter
    const chapterMemories = document.getElementById('chapter-memories');
    if (chapterMemories) {
      makeDraggable(chapterMemories, {
        itemSelector: '.chapter-memory-item',
        onReorder: async (ids) => {
          await api.updateChapter(pid, selectedChapterId, { memoryIds: ids });
          const chapters = getState().chapters.map(c =>
            c.id === selectedChapterId ? { ...c, memoryIds: ids } : c
          );
          setState({ chapters });
        },
      });
    }
  }

  async function addChapter() {
    const chapter = await api.createChapter(pid, { title: `Chapter ${getState().chapters.length + 1}` });
    setState({ chapters: [...getState().chapters, chapter] });
    selectedChapterId = chapter.id;
    render();
    showToast('Chapter added', 'success');
  }

  async function deleteChapter(id) {
    showModal({
      title: 'Delete Chapter',
      message: 'Delete this chapter? Memories will not be deleted, just unassigned.',
      confirmText: 'Delete',
      danger: true,
      onConfirm: async () => {
        await api.deleteChapter(pid, id);
        const chapters = getState().chapters.filter(c => c.id !== id);
        setState({ chapters });
        selectedChapterId = chapters[0]?.id || null;
        render();
        showToast('Chapter deleted', 'default');
      },
    });
  }

  async function aiSuggest() {
    const memories = getState().memories;
    if (memories.length < 3) {
      showToast('Collect at least 3 memories before asking for AI structure suggestions.', 'error');
      return;
    }

    const btn = document.getElementById('ai-suggest-btn');
    btn.disabled = true;
    btn.textContent = 'Thinking...';

    try {
      const result = await api.aiSuggestStructure(pid, memories);
      if (result.error) {
        showToast(result.error, 'error');
        render();
        return;
      }

      // Parse the JSON response
      let suggestions;
      try {
        const text = result.text.trim();
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        suggestions = JSON.parse(jsonMatch ? jsonMatch[0] : text);
      } catch {
        showToast('Could not parse AI suggestions. Try again.', 'error');
        render();
        return;
      }

      // Populate pending suggestions for inline review
      pendingSuggestions = suggestions.map(sug => ({
        title: sug.title,
        memoryIds: (sug.memoryIndices || [])
          .map(i => memories[i - 1]?.id)
          .filter(Boolean),
      }));
    } catch (err) {
      showToast('Error getting AI suggestions.', 'error');
    }
    render();
  }

  render();
}
