import { LoopbackSession } from '../webrtc.js';
import { dom } from './dom.js';
import { populateDevices, saveSelectedDevices } from './devices.js';
import { setStatus } from './status.js';
import { showDelayedVideo, resetVideoView } from './video-view.js';

let session = null;
let inCall = false;

export function isInCall() {
  return inCall;
}

export function resetJoinButton() {
  inCall = false;
  dom.joinCallBtn.disabled = false;
  dom.joinCallBtn.textContent = 'Join test call';
}

function createSession() {
  if (session) return session;

  session = new LoopbackSession({
    onVideoReady: () => {
      if (inCall) showDelayedVideo(session);
    },
    onAudioReady: (stream) => {
      dom.remoteAudio.srcObject = stream;
    },
  });
  return session;
}

export async function joinCall() {
  dom.joinCallBtn.disabled = true;
  setStatus('Joining test call…', 'active');

  try {
    createSession();
    await session.join({
      videoDeviceId: dom.cameraSelect.value || undefined,
      audioDeviceId: dom.micSelect.value || undefined,
    });

    inCall = true;
    saveSelectedDevices();
    await populateDevices({ labelsAvailable: true });
    showDelayedVideo(session);

    dom.joinCallBtn.textContent = 'In call';
    setStatus('In call — audio and video delayed by 2 seconds.', 'active');
  } catch (err) {
    resetJoinButton();
    leaveCall();
    setStatus(`Could not join: ${err.message}`, 'error');
  }
}

export async function onCameraChange() {
  saveSelectedDevices();
  if (!inCall || !session) return;

  try {
    setStatus('Switching camera…', 'active');
    await session.switchVideo(dom.cameraSelect.value || undefined);
    setStatus('Camera switched — preview shows 2 second delay.', 'active');
  } catch (err) {
    setStatus(`Camera switch error: ${err.message}`, 'error');
  }
}

export async function onMicChange() {
  saveSelectedDevices();
  if (!inCall || !session) return;

  try {
    setStatus('Switching microphone…', 'active');
    await session.switchAudio(dom.micSelect.value || undefined);
    setStatus('Microphone switched.', 'active');
  } catch (err) {
    setStatus(`Mic switch error: ${err.message}`, 'error');
  }
}

export function leaveCall() {
  if (session) {
    session.stop();
    session = null;
  }
  inCall = false;
  resetVideoView();
}
