import { log } from './logger.js';
import { dom } from './dom.js';

let delayedCanvas = null;

export function ensureCanvas() {
  if (delayedCanvas) return delayedCanvas;

  delayedCanvas = document.createElement('canvas');
  delayedCanvas.className = 'delayed-canvas';
  delayedCanvas.setAttribute('aria-label', 'Delayed camera preview');
  dom.participantTile.insertBefore(delayedCanvas, dom.remoteVideo);
  return delayedCanvas;
}

export async function showDelayedVideo(session) {
  dom.videoPlaceholder.classList.add('hidden');
  dom.remoteVideo.classList.add('hidden');
  const canvas = ensureCanvas();
  canvas.classList.remove('hidden');
  await session.startVideoDelay(canvas);
  log('video', 'delayed canvas visible', {
    width: canvas.width,
    height: canvas.height,
  });
}

export function resetVideoView() {
  if (delayedCanvas) {
    delayedCanvas.remove();
    delayedCanvas = null;
  }
  dom.remoteVideo.classList.add('hidden');
  dom.remoteVideo.srcObject = null;
  dom.remoteAudio.srcObject = null;
  dom.videoPlaceholder.classList.remove('hidden');
}
