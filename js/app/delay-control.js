import { getSavedDelayMs, saveDelayMs, getSavedMirrorPreview, saveMirrorPreview } from '../storage.js';
import { dom } from './dom.js';
import { isInCall, setSessionDelay } from './call-session.js';
import { setStatus } from './status.js';
import {
  delayLabel,
  inCallStatusMessage,
} from './delay-messages.js';

export function applyMirrorPreview(mirror) {
  dom.participantTile.classList.toggle('mirror-preview', mirror);
  dom.mirrorToggle.setAttribute('aria-pressed', String(mirror));
}

function syncToolbarSelection(delayMs) {
  const input = dom.delayOptions.querySelector(`input[value="${delayMs}"]`);
  if (input instanceof HTMLInputElement) input.checked = true;
}

function updatePreviewChrome(delayMs) {
  dom.participantLabel.textContent = delayLabel(delayMs);
  syncToolbarSelection(delayMs);
}

export function initDelayControl() {
  updatePreviewChrome(getSavedDelayMs());
  applyMirrorPreview(getSavedMirrorPreview());

  dom.delayOptions.addEventListener('change', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.name !== 'delay') return;

    const delayMs = Number(input.value);
    saveDelayMs(delayMs);
    updatePreviewChrome(delayMs);

    if (isInCall()) {
      setSessionDelay(delayMs);
      setStatus(inCallStatusMessage(delayMs), 'active');
    }
  });

  dom.mirrorToggle.addEventListener('click', () => {
    const mirror = dom.mirrorToggle.getAttribute('aria-pressed') !== 'true';
    saveMirrorPreview(mirror);
    applyMirrorPreview(mirror);
  });
}
