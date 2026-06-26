export async function listMediaDevices() {
  if (!navigator.mediaDevices?.enumerateDevices) {
    return { cameras: [], mics: [] };
  }

  const devices = await navigator.mediaDevices.enumerateDevices();
  return {
    cameras: devices.filter((d) => d.kind === 'videoinput'),
    mics: devices.filter((d) => d.kind === 'audioinput'),
  };
}
