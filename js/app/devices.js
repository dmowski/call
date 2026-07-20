import { getSavedDeviceIds, saveDeviceIds } from '../storage.js';
import { listMediaDevices } from '../webrtc.js';
import { dom } from './dom.js';

function deviceLabel(device, fallbackPrefix) {
  return device.label || `${fallbackPrefix} ${device.deviceId.slice(0, 6) || 'default'}`;
}

function fillSelect(select, devices, fallbackPrefix, savedId, emptyLabel) {
  select.replaceChildren();

  if (devices.length === 0) {
    select.append(new Option(emptyLabel, ''));
    select.disabled = true;
    return;
  }

  select.disabled = false;
  for (const device of devices) {
    select.append(new Option(deviceLabel(device, fallbackPrefix), device.deviceId));
  }

  if (savedId && devices.some((d) => d.deviceId === savedId)) {
    select.value = savedId;
  }
}

export async function populateDevices({ labelsAvailable = false } = {}) {
  if (!navigator.mediaDevices?.enumerateDevices) {
    fillSelect(dom.cameraSelect, [], 'Camera', '', 'Unavailable — use localhost or HTTPS');
    fillSelect(dom.micSelect, [], 'Microphone', '', 'Unavailable — use localhost or HTTPS');
    return;
  }

  try {
    const { cameras, mics } = await listMediaDevices();
    const { cameraId, micId } = getSavedDeviceIds();

    fillSelect(
      dom.cameraSelect,
      cameras,
      'Camera',
      cameraId,
      labelsAvailable ? 'No cameras found' : 'Default camera (selected on join)',
    );
    fillSelect(
      dom.micSelect,
      mics,
      'Microphone',
      micId,
      labelsAvailable ? 'No microphones found' : 'Default microphone (selected on join)',
    );
  } catch {
    fillSelect(dom.cameraSelect, [], 'Camera', '', 'Could not list cameras');
    fillSelect(dom.micSelect, [], 'Microphone', '', 'Could not list microphones');
  }
}

function syncSelectFromTrack(select, track) {
  if (!track) return;

  const deviceId = track.getSettings().deviceId;
  if (!deviceId) return;
  if (![...select.options].some((o) => o.value === deviceId)) return;

  // Some browsers (and Playwright fake devices) report "default" while enumerateDevices lists concrete ids.
  if (deviceId === 'default' && select.value && select.value !== 'default') return;

  select.value = deviceId;
}

export function syncSelectsFromStream(stream) {
  syncSelectFromTrack(dom.cameraSelect, stream.getVideoTracks()[0]);
  syncSelectFromTrack(dom.micSelect, stream.getAudioTracks()[0]);
  saveSelectedDevices();
}

export function saveSelectedDevices() {
  saveDeviceIds(dom.cameraSelect.value, dom.micSelect.value);
}

export function restoreMicSelection(deviceId) {
  if (deviceId && [...dom.micSelect.options].some((o) => o.value === deviceId)) {
    dom.micSelect.value = deviceId;
  }
  saveSelectedDevices();
}

export function restoreCameraSelection(deviceId) {
  if (deviceId && [...dom.cameraSelect.options].some((o) => o.value === deviceId)) {
    dom.cameraSelect.value = deviceId;
  }
  saveSelectedDevices();
}
