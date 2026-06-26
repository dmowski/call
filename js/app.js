import {
  initTheme,
  toggleTheme,
  getSavedDeviceIds,
  saveDeviceIds,
  setAppStarted,
  wasAppStarted,
} from './storage.js';
import { LoopbackSession, listMediaDevices, requestPermissions } from './webrtc.js';

const $ = (sel) => document.querySelector(sel);

const landing = $('#landing');
const app = $('#app');
const startBtn = $('#start-btn');
const backBtn = $('#back-btn');
const themeToggle = $('#theme-toggle');
const cameraSelect = $('#camera-select');
const micSelect = $('#mic-select');
const enableCameraBtn = $('#enable-camera-btn');
const enableMicBtn = $('#enable-mic-btn');
const videoPlaceholder = $('#video-placeholder');
const remoteVideo = $('#remote-video');
const remoteAudio = $('#remote-audio');
const statusEl = $('#status');
const participantTile = $('#participant-tile');

let session = null;
let delayedCanvas = null;
let cameraEnabled = false;
let micEnabled = false;

function setStatus(message, state = '') {
  statusEl.textContent = message;
  statusEl.dataset.state = state;
}

function showApp() {
  landing.classList.add('hidden');
  app.classList.remove('hidden');
  setAppStarted(true);
}

function showLanding() {
  stopSession();
  app.classList.add('hidden');
  landing.classList.remove('hidden');
  setAppStarted(false);
  cameraEnabled = false;
  micEnabled = false;
  enableCameraBtn.disabled = false;
  enableMicBtn.disabled = false;
  enableCameraBtn.textContent = 'Enable camera';
  enableMicBtn.textContent = 'Enable mic';
  setStatus('');
}

function stopSession() {
  if (session) {
    session.stop();
    session = null;
  }
  if (delayedCanvas) {
    delayedCanvas.remove();
    delayedCanvas = null;
  }
  remoteVideo.classList.add('hidden');
  remoteVideo.srcObject = null;
  remoteAudio.srcObject = null;
  videoPlaceholder.classList.remove('hidden');
}

function ensureCanvas() {
  if (delayedCanvas) return delayedCanvas;

  delayedCanvas = document.createElement('canvas');
  delayedCanvas.className = 'delayed-canvas';
  delayedCanvas.setAttribute('aria-label', 'Delayed camera preview');
  participantTile.insertBefore(delayedCanvas, remoteVideo);
  return delayedCanvas;
}

function showDelayedVideo() {
  videoPlaceholder.classList.add('hidden');
  remoteVideo.classList.add('hidden');
  const canvas = ensureCanvas();
  canvas.classList.remove('hidden');
  session.startVideoDelay(canvas);
}

async function populateDevices() {
  await requestPermissions();
  const { cameras, mics } = await listMediaDevices();
  const { cameraId, micId } = getSavedDeviceIds();

  cameraSelect.replaceChildren();
  micSelect.replaceChildren();

  if (cameras.length === 0) {
    cameraSelect.append(new Option('No cameras found', ''));
  } else {
    for (const cam of cameras) {
      const opt = new Option(cam.label || `Camera ${cam.deviceId.slice(0, 6)}`, cam.deviceId);
      cameraSelect.append(opt);
    }
    if (cameraId && cameras.some((c) => c.deviceId === cameraId)) {
      cameraSelect.value = cameraId;
    }
  }

  if (mics.length === 0) {
    micSelect.append(new Option('No microphones found', ''));
  } else {
    for (const mic of mics) {
      const opt = new Option(mic.label || `Microphone ${mic.deviceId.slice(0, 6)}`, mic.deviceId);
      micSelect.append(opt);
    }
    if (micId && mics.some((m) => m.deviceId === micId)) {
      micSelect.value = micId;
    }
  }
}

function createSession() {
  if (session) return session;

  session = new LoopbackSession({
    onVideoReady: () => {
      if (cameraEnabled) showDelayedVideo();
    },
    onAudioReady: (stream) => {
      remoteAudio.srcObject = stream;
    },
  });
  return session;
}

async function onEnableCamera() {
  enableCameraBtn.disabled = true;
  setStatus('Starting camera…', 'active');

  try {
    createSession();
    const deviceId = cameraSelect.value || undefined;
    await session.enableVideo(deviceId);
    cameraEnabled = true;
    saveDeviceIds(cameraSelect.value, micSelect.value);
    showDelayedVideo();
    enableCameraBtn.textContent = 'Camera enabled';
    setStatus('Camera active — preview shows 2 second delay.', 'active');
  } catch (err) {
    enableCameraBtn.disabled = false;
    setStatus(`Camera error: ${err.message}`, 'error');
  }
}

async function onEnableMic() {
  enableMicBtn.disabled = true;
  setStatus('Starting microphone…', 'active');

  try {
    createSession();
    const deviceId = micSelect.value || undefined;
    await session.enableAudio(deviceId);
    micEnabled = true;
    saveDeviceIds(cameraSelect.value, micSelect.value);
    enableMicBtn.textContent = 'Mic enabled';
    setStatus(
      cameraEnabled
        ? 'Camera and mic active — audio and video delayed by 2 seconds.'
        : 'Mic active — hear yourself with 2 second delay.',
      'active',
    );
  } catch (err) {
    enableMicBtn.disabled = false;
    setStatus(`Microphone error: ${err.message}`, 'error');
  }
}

async function onCameraChange() {
  saveDeviceIds(cameraSelect.value, micSelect.value);
  if (!cameraEnabled || !session) return;

  try {
    setStatus('Switching camera…', 'active');
    await session.switchVideo(cameraSelect.value || undefined);
    setStatus('Camera switched — preview shows 2 second delay.', 'active');
  } catch (err) {
    setStatus(`Camera switch error: ${err.message}`, 'error');
  }
}

async function onMicChange() {
  saveDeviceIds(cameraSelect.value, micSelect.value);
  if (!micEnabled || !session) return;

  try {
    setStatus('Switching microphone…', 'active');
    await session.switchAudio(micSelect.value || undefined);
    setStatus('Microphone switched.', 'active');
  } catch (err) {
    setStatus(`Mic switch error: ${err.message}`, 'error');
  }
}

function init() {
  initTheme();

  themeToggle.addEventListener('click', toggleTheme);
  startBtn.addEventListener('click', () => {
    showApp();
    populateDevices();
  });
  backBtn.addEventListener('click', showLanding);
  enableCameraBtn.addEventListener('click', onEnableCamera);
  enableMicBtn.addEventListener('click', onEnableMic);
  cameraSelect.addEventListener('change', onCameraChange);
  micSelect.addEventListener('change', onMicChange);

  if (wasAppStarted()) {
    showApp();
    populateDevices();
  }
}

init();
