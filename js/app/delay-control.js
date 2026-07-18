import { getSavedDelayMs, saveDelayMs } from '../storage.js';
import { dom } from './dom.js';
import { isInCall, setSessionDelay } from './call-session.js';
import { setStatus } from './status.js';
import {
  delayLabel,
  inCallStatusMessage,
  cameraSwitchedStatusMessage,
} from './delay-messages.js';

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
}
