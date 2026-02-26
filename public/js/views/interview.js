// One-question-at-a-time guided interview

import { api } from '../api.js';
import { getState, setState } from '../state.js';
import { stages, totalQuestions, getQuestion, getAbsoluteIndex } from '../prompts.js';
import { showToast } from '../components/toast.js';
import { renderMarkdown } from '../components/markdown.js';

export function renderInterview(container) {
  const state = getState();
  const project = state.project;
  const pid = state.currentProjectId;
  if (!project || !pid) { window.location.hash = '#home'; return; }

  let stageIdx = project.interviewStage || 0;
  let qIdx = project.interviewQuestion || 0;
  let followUpHTML = '';
  let activeRecognition = null;
  const speechSupported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;

  function render() {
    const q = getQuestion(stageIdx, qIdx);
    if (!q) {
      // All questions done
      container.innerHTML = `
        <div class="interview-container">
          <h2 style="font-family: var(--font-serif); text-align: center; margin-bottom: 16px;">You\u2019ve answered all the questions!</h2>
          <p style="text-align: center; color: var(--text-light); margin-bottom: 24px;">
            What an incredible journey through your memories. You can always come back to answer skipped questions,
            or head to Memories to review what you\u2019ve written.
          </p>
          <div style="text-align: center;">
            <button class="btn btn-primary" id="restart-interview-btn">↩ Start Over</button>
            <a href="#memories" class="btn btn-secondary" style="margin-left: 8px;">Browse Your Memories</a>
            <a href="#chapters" class="btn btn-secondary" style="margin-left: 8px;">Organize Chapters</a>
          </div>
        </div>
      `;
      document.getElementById('restart-interview-btn').addEventListener('click', () => {
        stageIdx = 0;
        qIdx = 0;
        followUpHTML = '';
        saveProgress();
        render();
      });
      return;
    }

    const absIdx = getAbsoluteIndex(stageIdx, qIdx);
    const stage = stages[stageIdx];

    container.innerHTML = `
      <div class="interview-container">
        <div class="interview-stage">${stage.name}</div>
        <div class="interview-question">${q.question}</div>

        <textarea class="interview-textarea" id="interview-answer"
          placeholder="Take your time. There\u2019s no rush \u2014 write as much or as little as feels right\u2026"></textarea>

        ${followUpHTML}

        <div class="interview-actions">
          <button class="btn btn-primary btn-lg" id="save-next-btn">Save & Next</button>
          <button class="btn btn-secondary" id="skip-btn">Skip</button>
          <button class="btn btn-ghost" id="follow-up-btn">\u2728 AI Follow-Up</button>
          ${speechSupported ? `<button class="btn btn-secondary" id="mic-btn">\uD83C\uDF99 Speak</button>` : ''}
        </div>
        ${speechSupported ? `<div id="mic-status" style="font-size:0.82rem; color: var(--danger, #dc3545); min-height: 1.2em; margin-top: 6px;"></div>` : ''}

        <div class="interview-progress">
          Question ${qIdx + 1} of ${stage.questions.length} in ${stage.name} \u00B7 ${absIdx + 1} of ${totalQuestions} total
          <div class="interview-progress-bar">
            <div class="interview-progress-fill" style="width: ${((absIdx + 1) / totalQuestions) * 100}%"></div>
          </div>
        </div>

        <div class="interview-topic-switcher" style="text-align: center; margin-top: 16px;">
          <label style="display: inline; margin-right: 8px;">Change Topic:</label>
          <select class="select" id="stage-select" style="width: auto; display: inline-block;">
            ${stages.map((s, i) => `<option value="${i}" ${i === stageIdx ? 'selected' : ''}>${s.name} (${s.questions.length})</option>`).join('')}
          </select>
          <button class="btn btn-ghost btn-sm" id="reset-interview-btn" style="margin-left: 12px;">↩ Start Over</button>
        </div>
      </div>
    `;

    // Check if we already have a memory for this question
    const existingMemory = state.memories.find(m => m.stageId === q.stageId && m.questionIndex === qIdx);
    if (existingMemory) {
      document.getElementById('interview-answer').value = existingMemory.answer || '';
    }

    document.getElementById('save-next-btn').addEventListener('click', saveAndNext);
    document.getElementById('skip-btn').addEventListener('click', skipQuestion);
    document.getElementById('follow-up-btn').addEventListener('click', aiFollowUp);
    document.getElementById('stage-select').addEventListener('change', (e) => {
      stageIdx = parseInt(e.target.value);
      qIdx = 0;
      followUpHTML = '';
      saveProgress();
      render();
    });
    document.getElementById('reset-interview-btn').addEventListener('click', () => {
      if (!confirm('Reset to the first question? Your saved memories will be kept.')) return;
      stageIdx = 0;
      qIdx = 0;
      followUpHTML = '';
      saveProgress();
      render();
    });
    setupMic();
  }

  function setupMic() {
    if (!speechSupported) return;
    const btn = document.getElementById('mic-btn');
    if (!btn) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    if (activeRecognition) {
      try { activeRecognition.stop(); } catch {}
    }
    activeRecognition = recognition;
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    let isRecording = false;

    function setRecording(active) {
      isRecording = active;
      btn.textContent = active ? '\u23F9 Stop' : '\uD83C\uDF99 Speak';
      btn.classList.toggle('btn-recording', active);
      const status = document.getElementById('mic-status');
      if (status) status.textContent = active ? '\uD83D\uDD34 Listening\u2026' : '';
    }

    recognition.onresult = (e) => {
      const transcript = Array.from(e.results)
        .filter(r => r.isFinal)
        .map(r => r[0].transcript)
        .join('');
      if (!transcript) return;
      const ta = document.getElementById('interview-answer');
      if (!ta) return;
      const sep = ta.value && !ta.value.endsWith(' ') ? ' ' : '';
      ta.value += sep + transcript;
    };

    recognition.onerror = (e) => {
      if (e.error === 'not-allowed') {
        showToast('Microphone access was denied.', 'error');
        setRecording(false);
      } else if (e.error === 'no-speech' && isRecording) {
        recognition.stop();
        recognition.start();
      }
    };

    recognition.onend = () => {
      if (isRecording) {
        recognition.start();
      }
    };

    btn.addEventListener('click', () => {
      if (isRecording) {
        isRecording = false;
        recognition.stop();
        setRecording(false);
      } else {
        recognition.start();
        setRecording(true);
      }
    });
  }

  async function saveAndNext() {
    const answer = document.getElementById('interview-answer').value.trim();
    if (!answer) {
      showToast('Write something before saving, or click Skip.', 'error');
      return;
    }

    const q = getQuestion(stageIdx, qIdx);
    const existing = getState().memories.find(m => m.stageId === q.stageId && m.questionIndex === qIdx);

    if (existing) {
      await api.updateMemory(pid, existing.id, { answer });
      const memories = getState().memories.map(m => m.id === existing.id ? { ...m, answer } : m);
      setState({ memories });
    } else {
      const memory = await api.createMemory(pid, {
        stage: q.stage,
        stageId: q.stageId,
        stageIndex: stageIdx,
        questionIndex: qIdx,
        question: q.question,
        answer,
      });
      setState({ memories: [...getState().memories, memory] });
    }

    showToast('Memory saved!', 'success');
    advanceQuestion();
  }

  function skipQuestion() {
    advanceQuestion();
  }

  function advanceQuestion() {
    const stage = stages[stageIdx];
    if (qIdx + 1 < stage.questions.length) {
      qIdx++;
    } else if (stageIdx + 1 < stages.length) {
      stageIdx++;
      qIdx = 0;
    } else {
      stageIdx = stages.length;
      qIdx = 0;
    }
    followUpHTML = '';
    saveProgress();
    render();
  }

  async function saveProgress() {
    const project = { ...getState().project, interviewStage: stageIdx, interviewQuestion: qIdx };
    await api.saveProject(pid, project);
    setState({ project });
  }

  async function aiFollowUp() {
    const answer = document.getElementById('interview-answer').value.trim();
    if (!answer) {
      showToast('Write an answer first, then ask for follow-up questions.', 'error');
      return;
    }

    const q = getQuestion(stageIdx, qIdx);
    const btn = document.getElementById('follow-up-btn');
    btn.disabled = true;
    btn.textContent = 'Thinking...';

    try {
      const result = await api.aiFollowUp(pid, q.question, answer);
      if (result.error) {
        showToast(result.error, 'error');
        btn.disabled = false;
        btn.textContent = '\u2728 AI Follow-Up';
      } else {
        followUpHTML = `
          <div class="follow-up-container">
            <h4>Follow-up questions to explore:</h4>
            ${renderMarkdown(result.text)}
          </div>
        `;
        const savedAnswer = answer;
        render();
        document.getElementById('interview-answer').value = savedAnswer;
      }
    } catch (err) {
      showToast('Could not get follow-up questions.', 'error');
      btn.disabled = false;
      btn.textContent = '\u2728 AI Follow-Up';
    }
  }

  render();
}
