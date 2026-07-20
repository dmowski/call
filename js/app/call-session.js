import { requestJoinMedia } from './media-access.js';
import { LoopbackSession } from '../webrtc.js';
import { dom } from './dom.js';
import {
  populateDevices,
  restoreCameraSelection,
  restoreMicSelection,
  saveSelectedDevices,
  syncSelectsFromStream,
} from './devices.js';
import { joinErrorMessage } from './media-errors.js';
import { getSavedDelayMs, getSavedDeviceIds, setInCall } from '../storage.js';
import { log } from './logger.js';
import { setStatus } from './status.js';
import { showDelayedVideo, resetVideoView } from './video-view.js';
import { inCallStatusMessage, cameraSwitchedStatusMessage } from './delay-messages.js';

let session = null;
let inCall = false;

export function isInCall() {
  return inCall;
}

export function getSession() {
  return session;
}

export function setSessionDelay(delayMs) {
  session?.setDelay(delayMs);
}

export function getSessionDebugState() {
  return session?.getDebugState?.() ?? null;
}

export function resetJoinButton() {
  inCall = false;
  dom.joinCallBtn.disabled = false;
  dom.joinCallBtn.textContent = 'Join test call';
}

async function playDelayedAudio(stream) {
  dom.remoteAudio.srcObject = stream;

  try {
    await dom.remoteAudio.play();
    log('audio', 'remote audio playing', {
      paused: dom.remoteAudio.paused,
      trackCount: stream.getAudioTracks().length,
    });
  } catch (err) {
    log('audio', 'remote audio play failed', { error: err.message });
    throw err;
  }
}

function createSession() {
  if (session) return session;

  session = new LoopbackSession({
    delayMs: getSavedDelayMs(),
    onVideoReady: () => {
      log('video', 'onVideoReady callback');
      if (inCall) showDelayedVideo(session);
    },
    onAudioReady: playDelayedAudio,
  });
  return session;
}

export async function joinCall() {
  dom.joinCallBtn.disabled = true;
  setStatus('Joining test call…', 'active');
  log('call', 'join started');

  let stream;

  saveSelectedDevices();
  const { cameraId, micId } = getSavedDeviceIds();

  try {
    stream = await requestJoinMedia({
      videoDeviceId: cameraId || undefined,
      audioDeviceId: micId || undefined,
    });
    log('call', 'getUserMedia succeeded', {
      videoTracks: stream.getVideoTracks().length,
      audioTracks: stream.getAudioTracks().length,
    });
  } catch (err) {
    log('call', 'getUserMedia failed', { error: err.message, name: err.name });
    setInCall(false);
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
    await showDelayedVideo(session);

    dom.joinCallBtn.textContent = 'In call';
    setStatus(inCallStatusMessage(getSavedDelayMs()), 'active');
    setInCall(true);
    log('call', 'join complete', session.getDebugState());
  } catch (err) {
    log('call', 'join failed after getUserMedia', { error: err.message, name: err.name });
    stream.getTracks().forEach((track) => track.stop());
    setInCall(false);
    resetJoinButton();
    leaveCall();
    setStatus(`Could not join: ${await joinErrorMessage(err)}`, 'error');
  }
}

export async function onCameraChange() {
  saveSelectedDevices();
  if (!inCall || !session) return;

  const previousDeviceId = session.localStream.getVideoTracks()[0]?.getSettings().deviceId;

  try {
    setStatus('Switching camera…', 'active');
    await session.switchVideo(dom.cameraSelect.value || undefined);
    syncSelectsFromStream(session.localStream);
    setStatus(cameraSwitchedStatusMessage(getSavedDelayMs()), 'active');
  } catch (err) {
    restoreCameraSelection(previousDeviceId);
    setStatus(`Camera switch error: ${err.message}`, 'error');
  }
}

export async function onMicChange() {
  saveSelectedDevices();
  if (!inCall || !session) return;

  const previousDeviceId = session.localStream.getAudioTracks()[0]?.getSettings().deviceId;

  try {
    setStatus('Switching microphone…', 'active');
    await session.switchAudio(dom.micSelect.value || undefined);
    syncSelectsFromStream(session.localStream);
    setStatus('Microphone switched.', 'active');
  } catch (err) {
    restoreMicSelection(previousDeviceId);
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
