import { requestJoinMedia } from './media-access.js';
import { LoopbackSession } from '../webrtc.js';
import { dom } from './dom.js';
import { populateDevices, saveSelectedDevices, syncSelectsFromStream } from './devices.js';
import { joinErrorMessage } from './media-errors.js';
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

  let stream;

  try {
    stream = await requestJoinMedia();
  } catch (err) {
    resetJoinButton();
    setStatus(`Could not join: ${await joinErrorMessage(err)}`, 'error');
    return;
  }

  try {
    createSession();
    await session.attachStream(stream);

    inCall = true;
    await populateDevices({ labelsAvailable: true });
    syncSelectsFromStream(stream);
    saveSelectedDevices();
    showDelayedVideo(session);

    dom.joinCallBtn.textContent = 'In call';
    setStatus('In call — audio and video delayed by 2 seconds.', 'active');
  } catch (err) {
    stream.getTracks().forEach((track) => track.stop());
    resetJoinButton();
    leaveCall();
    setStatus(`Could not join: ${await joinErrorMessage(err)}`, 'error');
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
