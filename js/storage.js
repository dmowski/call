const STORAGE_KEY = 'call-prep-settings';

const defaults = {
  theme: null,
  cameraId: '',
  micId: '',
  appStarted: false,
  inCall: false,
};

export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaults };
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return { ...defaults };
  }
}

export function saveSettings(partial) {
  const current = loadSettings();
  const next = { ...current, ...partial };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function getPreferredTheme() {
  const { theme } = loadSettings();
  if (theme === 'light' || theme === 'dark') return theme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
}

export function initTheme() {
  applyTheme(getPreferredTheme());
}

export function toggleTheme() {
  const current = getPreferredTheme();
  const next = current === 'dark' ? 'light' : 'dark';
  saveSettings({ theme: next });
  applyTheme(next);
  return next;
}

export function getSavedDeviceIds() {
  const { cameraId, micId } = loadSettings();
  return { cameraId, micId };
}

export function saveDeviceIds(cameraId, micId) {
  saveSettings({ cameraId, micId });
}

export function setAppStarted(started) {
  saveSettings({ appStarted: started });
}

export function wasAppStarted() {
  return loadSettings().appStarted;
}

export function setInCall(inCall) {
  saveSettings({ inCall });
}

export function wasInCall() {
  return loadSettings().inCall;
}
