// Browse/search/edit collected memories

import { api } from '../api.js';
import { getState, setState } from '../state.js';
import { stages, getStageClass } from '../prompts.js';
import { showToast } from '../components/toast.js';
import { showModal } from '../components/modal.js';

export function renderMemories(container) {
  const state = getState();
  const pid = state.currentProjectId;
  if (!state.project || !pid) { window.location.hash = '#home'; return; }

  let filterStage = 'all';
  let searchQuery = '';

  function render() {
    let memories = getState().memories;

    if (filterStage !== 'all') {
      memories = memories.filter(m => m.stageId === filterStage);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      memories = memories.filter(m =>
        m.question.toLowerCase().includes(q) || (m.answer || '').toLowerCase().includes(q)
      );
    }

    // Group by stage
    const grouped = {};
    memories.forEach(m => {
      if (!grouped[m.stageId]) grouped[m.stageId] = [];
      grouped[m.stageId].push(m);
    });

    container.innerHTML = `
      <div class="content-wide">
        <div class="memories-header">
          <h2>${memories.length} ${memories.length === 1 ? 'Memory' : 'Memories'}</h2>
          <div class="memories-filters">
            <input type="text" class="input" id="memory-search" placeholder="Search memories\u2026"
              style="width: 200px;" value="${searchQuery}" />
            <select class="select" id="stage-filter" style="width: 180px;">
              <option value="all">All Life Stages</option>
              ${stages.map(s => `<option value="${s.id}" ${filterStage === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
            </select>
          </div>
        </div>

        ${memories.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">\uD83D\uDCDD</div>
            <h3>No memories yet</h3>
            <p>Start the interview to begin collecting your memories.</p>
            <a href="#interview" class="btn btn-primary">Start Interview</a>
          </div>
        ` : Object.entries(grouped).map(([stageId, mems]) => {
          const stage = stages.find(s => s.id === stageId);
          return `
            <h3 class="stage-group-title">${stage?.name || stageId}</h3>
            <div class="card-grid">
              ${mems.map(m => `
                <div class="card memory-card ${getStageClass(m.stageId)}" data-id="${m.id}">
                  <div class="memory-question">${m.question}</div>
                  <div class="memory-answer">${escapeHTML(m.answer || '')}</div>
                  <div class="memory-meta">
                    <span class="memory-date">${formatDate(m.createdAt)}</span>
                    <div class="memory-actions">
                      <button class="btn btn-ghost btn-sm edit-memory-btn" data-id="${m.id}">Edit</button>
                      <button class="btn btn-ghost btn-sm delete-memory-btn" data-id="${m.id}" style="color: var(--danger)">Delete</button>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          `;
        }).join('')}
      </div>
    `;

    document.getElementById('memory-search')?.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      render();
    });

    document.getElementById('stage-filter')?.addEventListener('change', (e) => {
      filterStage = e.target.value;
      render();
    });

    container.querySelectorAll('.edit-memory-btn').forEach(btn => {
      btn.addEventListener('click', () => editMemory(btn.dataset.id));
    });

    container.querySelectorAll('.delete-memory-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteMemory(btn.dataset.id));
    });
  }

  function editMemory(id) {
    const memory = getState().memories.find(m => m.id === id);
    if (!memory) return;

    const overlay = document.getElementById('modal-overlay');
    overlay.innerHTML = `
      <div class="modal" style="max-width: 600px;">
        <h3>Edit Memory</h3>
        <p style="font-weight: 500; margin-bottom: 8px;">${memory.question}</p>
        <textarea class="textarea textarea-large" id="edit-memory-text" style="min-height: 200px;">${escapeHTML(memory.answer || '')}</textarea>
        <div class="modal-actions" style="margin-top: 16px;">
          <button class="btn btn-secondary modal-cancel">Cancel</button>
          <button class="btn btn-primary modal-save">Save</button>
        </div>
      </div>
    `;
    overlay.classList.remove('hidden');
    overlay.querySelector('.modal-cancel').onclick = () => overlay.classList.add('hidden');
    overlay.querySelector('.modal-save').onclick = async () => {
      const newAnswer = document.getElementById('edit-memory-text').value.trim();
      await api.updateMemory(pid, id, { answer: newAnswer });
      const memories = getState().memories.map(m => m.id === id ? { ...m, answer: newAnswer } : m);
      setState({ memories });
      overlay.classList.add('hidden');
      showToast('Memory updated', 'success');
      render();
    };
  }

  function deleteMemory(id) {
    showModal({
      title: 'Delete Memory',
      message: 'Are you sure you want to delete this memory? This cannot be undone.',
      confirmText: 'Delete',
      danger: true,
      onConfirm: async () => {
        await api.deleteMemory(pid, id);
        setState({ memories: getState().memories.filter(m => m.id !== id) });
        showToast('Memory deleted', 'default');
        render();
      },
    });
  }

  render();
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
