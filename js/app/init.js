import { initTheme, toggleTheme, wasAppStarted, wasInCall } from '../storage.js';
import { dom } from './dom.js';
import { populateDevices } from './devices.js';
import { joinCall, onCameraChange, onMicChange, getSessionDebugState } from './call-session.js';
import { showApp, showLanding } from './navigation.js';
import { exposeDebugApi, log } from './logger.js';

async function restoreSession() {
  if (wasInCall()) {
    log('app', 'restoring in-call session');
    showApp();
    await populateDevices();
    await joinCall();
    return;
  }

  if (wasAppStarted()) {
    showApp();
    await populateDevices();
  }
}

export function initApp() {
  initTheme();
  exposeDebugApi(getSessionDebugState);

  dom.themeToggle.addEventListener('click', toggleTheme);
  dom.startBtn.addEventListener('click', () => {
    showApp();
    populateDevices();
  });
  dom.backBtn.addEventListener('click', showLanding);
  dom.joinCallBtn.addEventListener('click', joinCall);
  dom.cameraSelect.addEventListener('change', onCameraChange);
  dom.micSelect.addEventListener('change', onMicChange);

  restoreSession();
}
