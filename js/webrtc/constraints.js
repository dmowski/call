export const VIDEO_QUALITY_PRESETS = {
  sd: { width: 640, height: 360 },
  hd: { width: 1280, height: 720 },
};

export const DEFAULT_VIDEO_QUALITY = 'hd';

export function videoQualityConstraint(quality) {
  const preset = VIDEO_QUALITY_PRESETS[quality] ?? VIDEO_QUALITY_PRESETS[DEFAULT_VIDEO_QUALITY];
  return { width: { ideal: preset.width }, height: { ideal: preset.height } };
}

export function deviceConstraint(deviceId, { strict = false } = {}) {
  if (!deviceId) return true;
  return { deviceId: strict ? { exact: deviceId } : { ideal: deviceId } };
}

export function buildVideoConstraint(deviceId, { strict = false, quality = DEFAULT_VIDEO_QUALITY } = {}) {
  const device = deviceConstraint(deviceId, { strict });
  const size = videoQualityConstraint(quality);
  if (device === true) return size;
  return { ...device, ...size };
}

export function videoOnlyConstraint(deviceId, options) {
  return { video: buildVideoConstraint(deviceId, options), audio: false };
}

export function buildAudioConstraint(deviceId, { strict = false, noiseCancellation = true } = {}) {
  const device = deviceConstraint(deviceId, { strict });
  const processing = {
    noiseSuppression: noiseCancellation,
    echoCancellation: noiseCancellation,
  };
  if (device === true) return processing;
  return { ...device, ...processing };
}

export function audioOnlyConstraint(deviceId, options = {}) {
  const { strict = false, noiseCancellation = true } = options;
  return { audio: buildAudioConstraint(deviceId, { strict, noiseCancellation }), video: false };
}
