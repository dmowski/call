export function deviceConstraint(deviceId, { strict = false } = {}) {
  if (!deviceId) return true;
  return { deviceId: strict ? { exact: deviceId } : { ideal: deviceId } };
}

export function videoOnlyConstraint(deviceId, options) {
  return { video: deviceConstraint(deviceId, options), audio: false };
}

export function audioOnlyConstraint(deviceId, options) {
  return { audio: deviceConstraint(deviceId, options), video: false };
}
