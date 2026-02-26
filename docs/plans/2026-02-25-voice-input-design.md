# Voice Input Design — Interview View

**Date:** 2026-02-25
**Approach:** Web Speech API (client-side, no cost, no new backend)

## Goal

Add a mic button to the interview textarea so users can speak their answers instead of typing. Transcribed text appends to any existing answer text.

## UI

- A `🎙 Speak` button appears next to the existing action buttons (Save & Next, Skip, AI Follow-Up)
- While recording: button turns red, shows `⏹ Stop`, pulses subtly
- A status line below the textarea reads `🔴 Listening...` while active
- On unsupported browsers: mic button is hidden entirely (no error, no broken UI)

## Behavior

- Click mic → browser prompts mic permission (once, remembered by browser)
- Transcribed words are appended to the textarea with a space separator
- `continuous: true` keeps recording until the user clicks Stop
- `no-speech` errors auto-restart recognition silently so silence doesn't end the session
- `not-allowed` error → toast: "Microphone access was denied."
- Click Stop → recording ends, all text is preserved in textarea

## Implementation

All changes in `public/js/views/interview.js` only. No new files.

1. Feature-detect `SpeechRecognition` / `webkitSpeechRecognition` at render time
2. Inject mic button into the `interview-actions` div only if supported
3. Create recognition instance: `continuous: true`, `interimResults: false`, `lang: 'en-US'`
4. On `result`: append final transcript to `#interview-answer` value
5. On `error`: handle `not-allowed` (toast) and `no-speech` (auto-restart)
6. Toggle `isRecording` state, update button text/style on `start`/`end`
7. Add pulse keyframe animation inline or in `editor.css`

## Out of Scope

- Interim/live word preview while speaking
- Language selection
- Firefox support (not supported by Web Speech API)
- Whisper/cloud transcription
