import { getSavedNoiseCancellation, saveNoiseCancellation } from '../storage.js';
import { dom } from './dom.js';
import { isInCall, setNoiseCancellation } from './call-session.js';
import { setStatus } from './status.js';

function syncToggle(checked) {
  dom.noiseCancellationToggle.checked = checked;
}

export function initNoiseCancellationControl() {
  syncToggle(getSavedNoiseCancellation());

  dom.noiseCancellationToggle.addEventListener('change', async () => {
    const enabled = dom.noiseCancellationToggle.checked;
    saveNoiseCancellation(enabled);

    if (!isInCall()) return;

    try {
      await setNoiseCancellation(enabled);
      setStatus(enabled ? 'Noise cancellation on.' : 'Noise cancellation off.', 'active');
    } catch (err) {
      dom.noiseCancellationToggle.checked = !enabled;
      saveNoiseCancellation(!enabled);
      setStatus(`Could not update noise cancellation: ${err.message}`, 'error');
    }
  });
}