export function assertMediaEnvironment() {
  if (!window.isSecureContext) {
    throw new DOMException(
      'Camera and microphone require a secure connection. Open http://localhost:5173 or use HTTPS.',
      'SecurityError',
    );
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    throw new DOMException(
      'Camera and microphone are not available in this browser. Try Chrome, Safari, or Firefox.',
      'NotSupportedError',
    );
  }
}

async function collectTrack(getStream) {
  try {
    const stream = await getStream();
    return stream.getTracks();
  } catch {
    return [];
  }
}

export async function requestJoinMedia() {
  assertMediaEnvironment();

  try {
    return await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  } catch (combinedError) {
    if (combinedError.name !== 'NotAllowedError' && combinedError.name !== 'NotFoundError') {
      throw combinedError;
    }

    const tracks = [
      ...(await collectTrack(() =>
        navigator.mediaDevices.getUserMedia({ video: true, audio: false }),
      )),
      ...(await collectTrack(() =>
        navigator.mediaDevices.getUserMedia({ audio: true, video: false }),
      )),
    ];

    if (tracks.length === 0) throw combinedError;
    return new MediaStream(tracks);
  }
}

export async function queryMediaPermissionStates() {
  if (!navigator.permissions?.query) {
    return { camera: 'unknown', microphone: 'unknown' };
  }

  const states = { camera: 'unknown', microphone: 'unknown' };

  for (const name of ['camera', 'microphone']) {
    try {
      const result = await navigator.permissions.query({ name });
      states[name] = result.state;
    } catch {
      /* unsupported in this browser */
    }
  }

  return states;
}
