import { getSavedVideoQuality, saveVideoQuality } from '../storage.js';
import { dom } from './dom.js';
import { isInCall, setVideoQuality } from './call-session.js';
import { setStatus } from './status.js';

function syncSelection(quality) {
  const input = dom.qualityOptions.querySelector(`input[value="${quality}"]`);
  if (input instanceof HTMLInputElement) input.checked = true;
}

export function initVideoQualityControl() {
  syncSelection(getSavedVideoQuality());

  dom.qualityOptions.addEventListener('change', async (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.name !== 'quality') return;

    const previous = getSavedVideoQuality();
    const quality = input.value;
    saveVideoQuality(quality);

    if (!isInCall()) return;

    try {
      await setVideoQuality(quality);
      setStatus(`Video quality set to ${quality.toUpperCase()}.`, 'active');
    } catch (err) {
      saveVideoQuality(previous);
      syncSelection(previous);
      setStatus(`Could not change video quality: ${err.message}`, 'error');
    }
  });
}
