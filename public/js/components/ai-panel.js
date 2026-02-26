// AI assistant slide-in panel

import { api } from '../api.js';
import { showToast } from './toast.js';
import { renderMarkdown } from './markdown.js';

export function createAIPanel(container, { projectId, chapterTitle = '', getEditorText, onApply, onTitleApply, memories = [] } = {}) {
  let resultArea = null;

  function render() {
    const isEmpty = !getEditorText?.() || getEditorText().trim().length < 10;
    const hasMemories = memories.length > 0;

    container.innerHTML = `
      <div class="ai-panel">
        <h3>\u2728 AI Assistant</h3>

        ${isEmpty && hasMemories ? `
        <div class="ai-section-label">Start Here</div>
        <button class="ai-tool-btn ai-tool-btn--featured" data-tool="draft-from-memories">
          <h4>\uD83D\uDCDD Write from Memories</h4>
          <p>Generate an opening draft using the ${memories.length} memor${memories.length === 1 ? 'y' : 'ies'} in this chapter</p>
        </button>
        ` : ''}

        <div class="ai-section-label">Writing</div>
        <button class="ai-tool-btn" data-tool="expand">
          <h4>\uD83D\uDCDD Expand Notes</h4>
          <p>Turn bullet points or rough notes into narrative prose</p>
        </button>
        <button class="ai-tool-btn" data-tool="continue">
          <h4>\u270F\uFE0F Continue Writing</h4>
          <p>AI picks up where you left off, matching your voice</p>
        </button>
        <button class="ai-tool-btn" data-tool="dialogue">
          <h4>\uD83D\uDCAC Write Dialogue</h4>
          <p>Transform narrative into vivid conversation scenes</p>
        </button>

        <div class="ai-section-label">Enhancement</div>
        <button class="ai-tool-btn" data-tool="polish">
          <h4>\u2728 Polish Writing</h4>
          <p>Improve clarity, flow, and emotional resonance</p>
        </button>
        <button class="ai-tool-btn" data-tool="sensory">
          <h4>\uD83C\uDF3F Add Sensory Details</h4>
          <p>Enrich with sights, sounds, smells, and textures</p>
        </button>

        <div class="ai-section-label">Insights</div>
        <button class="ai-tool-btn" data-tool="follow-up">
          <h4>\u2753 Ask Me More</h4>
          <p>Get follow-up questions to dig deeper into your story</p>
        </button>
        <button class="ai-tool-btn" data-tool="suggest-title">
          <h4>\uD83C\uDFF7\uFE0F Suggest Titles</h4>
          <p>Get evocative chapter title ideas</p>
        </button>
        <button class="ai-tool-btn" data-tool="summarize">
          <h4>\uD83D\uDCCB Summarize Chapter</h4>
          <p>Generate a concise chapter summary</p>
        </button>

        <div class="ai-result-area"></div>
      </div>
    `;
    resultArea = container.querySelector('.ai-result-area');

    container.querySelectorAll('.ai-tool-btn').forEach(btn => {
      btn.addEventListener('click', () => handleTool(btn.dataset.tool));
    });
  }

  async function handleTool(tool) {
    const text = getEditorText?.();
    if (tool !== 'draft-from-memories' && (!text || text.trim().length < 10)) {
      showToast('Write some text first, then use AI tools to help.', 'error');
      return;
    }

    resultArea.innerHTML = `<div class="ai-loading"><div class="spinner"></div><p>Thinking...</p></div>`;

    try {
      let result;
      const memoryText = memories.map(m => `${m.question}: ${m.answer}`).join('\n\n');

      switch (tool) {
        case 'expand':
          result = await api.aiExpand(projectId, text, memoryText || undefined);
          break;
        case 'polish':
          result = await api.aiPolish(projectId, text);
          break;
        case 'follow-up':
          result = await api.aiFollowUp(projectId, '', text);
          break;
        case 'continue':
          result = await api.aiContinue(projectId, text, memoryText || undefined);
          break;
        case 'sensory':
          result = await api.aiSensoryDetails(projectId, text);
          break;
        case 'dialogue':
          result = await api.aiDialogue(projectId, text);
          break;
        case 'suggest-title':
          result = await api.aiSuggestTitle(projectId, text);
          break;
        case 'summarize':
          result = await api.aiSummarize(projectId, text);
          break;
        case 'draft-from-memories':
          result = await api.aiDraftFromMemories(projectId, memories, chapterTitle);
          break;
      }

      if (result.error) {
        resultArea.innerHTML = `<div class="ai-result"><p style="color: var(--danger)">${result.error}</p></div>`;
        return;
      }

      // Determine which actions to show based on tool type
      const infoOnly = tool === 'follow-up' || tool === 'summarize';
      const isTitleSuggestion = tool === 'suggest-title';
      const isContinue = tool === 'continue';
      const isDraft = tool === 'draft-from-memories';

      let actionsHTML = '';
      if (isTitleSuggestion) {
        actionsHTML = `
          <div class="ai-actions">
            <button class="btn btn-ghost btn-sm ai-dismiss">Dismiss</button>
          </div>
          <div class="ai-title-picks"></div>
        `;
      } else if (isDraft) {
        actionsHTML = `
          <div class="ai-actions">
            <button class="btn btn-primary btn-sm ai-apply">Insert into Editor</button>
            <button class="btn btn-ghost btn-sm ai-dismiss">Dismiss</button>
          </div>
        `;
      } else if (!infoOnly) {
        actionsHTML = `
          <div class="ai-actions">
            <button class="btn btn-primary btn-sm ai-apply">Append to Editor</button>
            <button class="btn btn-ghost btn-sm ai-dismiss">Dismiss</button>
          </div>
        `;
      }

      resultArea.innerHTML = `
        <div class="ai-result">
          <div>${renderMarkdown(result.text)}</div>
          ${actionsHTML}
        </div>
      `;

      // Handle title suggestions — make each title clickable
      if (isTitleSuggestion) {
        const picksContainer = resultArea.querySelector('.ai-title-picks');
        const titles = result.text.split('\n')
          .map(line => line.replace(/^\d+[\.\)]\s*/, '').replace(/^[""]|[""]$/g, '').trim())
          .filter(t => t.length > 0 && t.length < 80);

        titles.forEach(title => {
          const btn = document.createElement('button');
          btn.className = 'btn btn-secondary btn-sm ai-title-option';
          btn.textContent = title;
          btn.addEventListener('click', () => {
            onTitleApply?.(title);
            resultArea.innerHTML = '';
            showToast('Title applied!', 'success');
          });
          picksContainer.appendChild(btn);
        });
      }

      resultArea.querySelector('.ai-apply')?.addEventListener('click', () => {
        const html = result.text.split('\n\n').map(p => `<p>${p.trim()}</p>`).join('');
        if (isDraft) {
          onApply?.(html, null); // replace editor content
          resultArea.innerHTML = '';
          render(); // refresh panel to hide "Write from Memories" button
          showToast('Draft inserted!', 'success');
        } else {
          onApply?.(null, '\n\n' + renderMarkdown(result.text)); // append with markdown
          resultArea.innerHTML = '';
          showToast('Appended to editor', 'success');
        }
      });

      resultArea.querySelector('.ai-dismiss')?.addEventListener('click', () => {
        resultArea.innerHTML = '';
      });
    } catch (err) {
      resultArea.innerHTML = `<div class="ai-result"><p style="color: var(--danger)">Error: ${err.message}</p></div>`;
    }
  }

  render();
  return { render };
}
