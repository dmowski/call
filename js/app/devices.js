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
  const { cameras, mics } = await listMediaDevices();
  const { cameraId, micId } = getSavedDeviceIds();

  fillSelect(
    dom.cameraSelect,
    cameras,
    'Camera',
    cameraId,
    labelsAvailable ? 'No cameras found' : 'Camera (join to detect)',
  );
  fillSelect(
    dom.micSelect,
    mics,
    'Microphone',
    micId,
    labelsAvailable ? 'No microphones found' : 'Microphone (join to detect)',
  );
}

export function saveSelectedDevices() {
  saveDeviceIds(dom.cameraSelect.value, dom.micSelect.value);
}
