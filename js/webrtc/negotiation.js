import { log } from '../app/logger.js';

export function waitForIceGathering(pc) {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();

  return new Promise((resolve) => {
    const done = () => {
      pc.removeEventListener('icegatheringstatechange', onChange);
      resolve();
    };
    const onChange = () => {
      if (pc.iceGatheringState === 'complete') done();
    };
    pc.addEventListener('icegatheringstatechange', onChange);
    setTimeout(done, 5000);
  });
}

export async function negotiatePeers(pc1, pc2) {
  log('webrtc', 'negotiation started');

  const offer = await pc1.createOffer();
  await pc1.setLocalDescription(offer);
  await waitForIceGathering(pc1);

  await pc2.setRemoteDescription(pc1.localDescription);
  const answer = await pc2.createAnswer();
  await pc2.setLocalDescription(answer);
  await waitForIceGathering(pc2);

  await pc1.setRemoteDescription(pc2.localDescription);
  log('webrtc', 'negotiation complete');
}

export function wireIceCandidates(pcFrom, pcTo, labels = {}) {
  const { from = 'pc', to = 'pc' } = labels;
  pcFrom.onicecandidate = (e) => {
    if (e.candidate) {
      pcTo.addIceCandidate(e.candidate).catch((err) => {
        log('webrtc', `${to} addIceCandidate failed`, { error: err.message });
      });
    }
  };
}

export function wireConnectionLogging(pc, label) {
  pc.onconnectionstatechange = () => {
    log('webrtc', `${label} connection state`, { state: pc.connectionState });
  };
  pc.oniceconnectionstatechange = () => {
    log('webrtc', `${label} ICE state`, { state: pc.iceConnectionState });
  };
}
