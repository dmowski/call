export function deviceConstraint(deviceId) {
  if (!deviceId) return true;
  return { deviceId: { ideal: deviceId } };
}

export function videoOnlyConstraint(deviceId) {
  return { video: deviceConstraint(deviceId), audio: false };
}

export function audioOnlyConstraint(deviceId) {
  return { audio: deviceConstraint(deviceId), video: false };
}
