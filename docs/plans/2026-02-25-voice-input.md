# Voice Input Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a mic button to the interview textarea that uses the Web Speech API to append spoken words to the answer.

**Architecture:** All changes are in a single file (`public/js/views/interview.js`). A `SpeechRecognition` instance is created once per render cycle, toggled on/off by a mic button injected into the existing actions row. A small CSS pulse animation is added to `public/css/editor.css`.

**Tech Stack:** Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`), vanilla JS, existing CSS variables.

---

### Task 1: Add pulse animation to CSS

**Files:**
- Modify: `public/css/editor.css`

**Step 1: Add keyframe + recording class**

Open `public/css/editor.css` and append at the bottom:

```css
@keyframes mic-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.btn-recording {
  background: var(--danger, #dc3545) !important;
  color: #fff !important;
  animation: mic-pulse 1.2s ease-in-out infinite;
}
```

**Step 2: Verify**

Open `public/index.html` in browser dev tools — confirm no CSS parse errors in console.

**Step 3: Commit**

```bash
git add public/css/editor.css
git commit -m "feat: add mic-pulse animation for voice recording state"
```

---

### Task 2: Inject mic button into the interview UI

**Files:**
- Modify: `public/js/views/interview.js`

**Step 1: Add mic button to the HTML template**

In the `render()` function, find the `interview-actions` div (around line 59) and add the mic button. The full actions block should become:

```js
<div class="interview-actions">
  <button class="btn btn-primary btn-lg" id="save-next-btn">Save & Next</button>
  <button class="btn btn-secondary" id="skip-btn">Skip</button>
  <button class="btn btn-ghost" id="follow-up-btn">✨ AI Follow-Up</button>
  ${speechSupported ? `<button class="btn btn-secondary" id="mic-btn">🎙 Speak</button>` : ''}
</div>
${speechSupported ? `<div id="mic-status" style="font-size:0.82rem; color: var(--danger, #dc3545); min-height: 1.2em; margin-top: 6px;"></div>` : ''}
```

**Step 2: Add `speechSupported` constant at the top of `renderInterview`**

Right after the `let followUpHTML = '';` line (around line 16), add:

```js
const speechSupported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
```

**Step 3: Verify visually**

Load the interview view in Chrome. Confirm mic button appears. Load in Firefox — confirm mic button is absent (Firefox doesn't support Web Speech API).

**Step 4: Commit**

```bash
git add public/js/views/interview.js
git commit -m "feat: inject mic button into interview actions (hidden on unsupported browsers)"
```

---

### Task 3: Implement voice recording logic

**Files:**
- Modify: `public/js/views/interview.js`

**Step 1: Add `setupMic()` function**

After the `render()` function definition (around line 106), add this new function:

```js
function setupMic() {
  if (!speechSupported) return;
  const btn = document.getElementById('mic-btn');
  if (!btn) return;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  let isRecording = false;

  function setRecording(active) {
    isRecording = active;
    btn.textContent = active ? '⏹ Stop' : '🎙 Speak';
    btn.classList.toggle('btn-recording', active);
    const status = document.getElementById('mic-status');
    if (status) status.textContent = active ? '🔴 Listening…' : '';
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
      // auto-restart silently
      recognition.stop();
      recognition.start();
    }
  };

  recognition.onend = () => {
    if (isRecording) {
      // restart if user hasn't clicked Stop
      recognition.start();
    }
  };

  btn.addEventListener('click', () => {
    if (isRecording) {
      isRecording = false; // set before stop() so onend doesn't restart
      recognition.stop();
      setRecording(false);
    } else {
      recognition.start();
      setRecording(true);
    }
  });
}
```

**Step 2: Call `setupMic()` after `render()`**

At the bottom of `renderInterview`, the last line is `render();`. Change it to:

```js
render();
setupMic();
```

Wait — `render()` is called multiple times (on stage change, on reset, etc). Each call replaces the DOM, so `setupMic()` must be called after every `render()`.

Instead, add `setupMic()` at the end of the `render()` function itself, right before its closing `}`:

```js
  // at the end of render(), after all addEventListener calls:
  setupMic();
```

And remove the `setupMic()` call from the bottom of `renderInterview` if you added one there.

**Step 3: Verify manually**

1. Open interview in Chrome
2. Click 🎙 Speak — browser prompts for mic permission
3. Grant permission — button turns red, "🔴 Listening…" appears
4. Speak a sentence — text appears in textarea
5. Click ⏹ Stop — recording stops, text remains
6. Existing text in textarea + speaking → new words append with a space

**Step 4: Commit**

```bash
git add public/js/views/interview.js
git commit -m "feat: implement Web Speech API voice input in interview view"
```

---

### Task 4: Handle mic cleanup on navigation away

**Files:**
- Modify: `public/js/views/interview.js`

**Step 1: Store recognition reference and stop on navigation**

The `setupMic` function creates a new `recognition` instance each time `render()` is called. If the user navigates away mid-recording, the mic keeps listening. Fix by stopping recognition when a new render clears the DOM.

At the top of `renderInterview` (before the `render()` definition), add:

```js
let activeRecognition = null;
```

In `setupMic()`, after `const recognition = new SpeechRecognition();`, add:

```js
if (activeRecognition) {
  try { activeRecognition.stop(); } catch {}
}
activeRecognition = recognition;
```

**Step 2: Verify**

Start recording, then click "Browse Your Memories" or change the hash. Confirm the mic indicator in the browser tab disappears (no active audio capture).

**Step 3: Commit**

```bash
git add public/js/views/interview.js
git commit -m "fix: stop speech recognition when interview re-renders or user navigates away"
```
