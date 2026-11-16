export function deviceConstraint(deviceId, { strict = false } = {}) {
  if (!deviceId) return true;
  return { deviceId: strict ? { exact: deviceId } : { ideal: deviceId } };
}

export function videoOnlyConstraint(deviceId, options) {
  return { video: deviceConstraint(deviceId, options), audio: false };
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
