import { dom } from './dom.js';
import { log } from './logger.js';

function isTileFullscreen() {
  return document.fullscreenElement === dom.participantTile;
}

async function toggleFullscreen() {
  try {
    if (isTileFullscreen()) {
      await document.exitFullscreen();
    } else {
      await dom.participantTile.requestFullscreen();
    }
  } catch (err) {
    log('video', 'fullscreen toggle failed', { error: err.message });
  }
}

function syncButton() {
  const active = isTileFullscreen();
  dom.fullscreenToggle.setAttribute('aria-pressed', String(active));
  dom.fullscreenToggle.textContent = active ? 'Exit full screen' : 'Full screen';
}

export function initFullscreenControl() {
  if (!document.fullscreenEnabled) {
    dom.fullscreenToggle.classList.add('hidden');
    return;
  }

  dom.fullscreenToggle.addEventListener('click', toggleFullscreen);
  dom.participantTile.addEventListener('click', () => {
    if (!dom.videoPlaceholder.classList.contains('hidden')) return;
    toggleFullscreen();
  });
  document.addEventListener('fullscreenchange', syncButton);
}
