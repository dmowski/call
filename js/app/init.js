import { initTheme, toggleTheme, wasAppStarted } from '../storage.js';
import { dom } from './dom.js';
import { populateDevices } from './devices.js';
import { joinCall, onCameraChange, onMicChange, getSessionDebugState } from './call-session.js';
import { showApp, showLanding } from './navigation.js';
import { exposeDebugApi } from './logger.js';

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

  if (wasAppStarted()) {
    showApp();
    populateDevices();
  }
}
