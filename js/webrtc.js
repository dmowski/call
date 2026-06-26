import { log } from './app/logger.js';

export const DELAY_MS = 2000;

function deviceConstraint(deviceId) {
  if (!deviceId) return true;
  return { deviceId: { ideal: deviceId } };
}

function waitForIceGathering(pc) {
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

function waitForVideoDimensions(video, timeoutMs = 8000) {
  if (video.videoWidth > 0 && video.videoHeight > 0) return Promise.resolve();

  return new Promise((resolve) => {
    const done = () => {
      video.removeEventListener('loadedmetadata', done);
      video.removeEventListener('resize', done);
      resolve();
    };
    video.addEventListener('loadedmetadata', done);
    video.addEventListener('resize', done);
    setTimeout(done, timeoutMs);
  });
}

export class LoopbackSession {
  #delayMs;
  #pc1;
  #pc2;
  #localStream;
  #hiddenVideo;
  #audioContext;
  #audioDelayNode;
  #videoFrameId;
  #frameBuffer = [];
  #onVideoReady;
  #onAudioReady;
  #negotiating = false;
  #framesDrawn = 0;

  constructor({ delayMs = DELAY_MS, onVideoReady, onAudioReady } = {}) {
    this.#delayMs = delayMs;
    this.#onVideoReady = onVideoReady;
    this.#onAudioReady = onAudioReady;
    this.#localStream = new MediaStream();
    this.#hiddenVideo = document.createElement('video');
    this.#hiddenVideo.className = 'hidden-source-video';
    this.#hiddenVideo.playsInline = true;
    this.#hiddenVideo.muted = true;
    this.#hiddenVideo.autoplay = true;
    this.#hiddenVideo.setAttribute('aria-hidden', 'true');
    document.body.appendChild(this.#hiddenVideo);

    this.#pc1 = new RTCPeerConnection();
    this.#pc2 = new RTCPeerConnection();

    this.#wireConnectionState(this.#pc1, 'pc1');
    this.#wireConnectionState(this.#pc2, 'pc2');

    this.#pc1.onicecandidate = (e) => {
      if (e.candidate) {
        this.#pc2.addIceCandidate(e.candidate).catch((err) => {
          log('webrtc', 'pc2 addIceCandidate failed', { error: err.message });
        });
      }
    };
    this.#pc2.onicecandidate = (e) => {
      if (e.candidate) {
        this.#pc1.addIceCandidate(e.candidate).catch((err) => {
          log('webrtc', 'pc1 addIceCandidate failed', { error: err.message });
        });
      }
    };

    this.#pc2.ontrack = (event) => {
      const stream = event.streams[0] ?? new MediaStream([event.track]);
      log('webrtc', 'remote track received', {
        kind: event.track.kind,
        trackId: event.track.id,
        streamId: stream.id,
      });

      if (event.track.kind === 'video') this.#attachVideoTrack(stream);
      if (event.track.kind === 'audio') this.#attachAudioTrack(stream);
    };

    log('webrtc', 'LoopbackSession created');
  }

  #wireConnectionState(pc, label) {
    pc.onconnectionstatechange = () => {
      log('webrtc', `${label} connection state`, { state: pc.connectionState });
    };
    pc.oniceconnectionstatechange = () => {
      log('webrtc', `${label} ICE state`, { state: pc.iceConnectionState });
    };
  }

  get localStream() {
    return this.#localStream;
  }

  hasVideo() {
    return this.#localStream.getVideoTracks().length > 0;
  }

  hasAudio() {
    return this.#localStream.getAudioTracks().length > 0;
  }

  getDebugState() {
    return {
      hasVideoTrack: this.hasVideo(),
      hasAudioTrack: this.hasAudio(),
      framesDrawn: this.#framesDrawn,
      frameBufferLength: this.#frameBuffer.length,
      hiddenVideo: {
        videoWidth: this.#hiddenVideo.videoWidth,
        videoHeight: this.#hiddenVideo.videoHeight,
        readyState: this.#hiddenVideo.readyState,
        paused: this.#hiddenVideo.paused,
      },
      pc1: {
        connectionState: this.#pc1.connectionState,
        iceConnectionState: this.#pc1.iceConnectionState,
      },
      pc2: {
        connectionState: this.#pc2.connectionState,
        iceConnectionState: this.#pc2.iceConnectionState,
      },
      audioContextState: this.#audioContext?.state ?? null,
    };
  }

  async attachStream(stream) {
    log('webrtc', 'attachStream', {
      videoTracks: stream.getVideoTracks().length,
      audioTracks: stream.getAudioTracks().length,
    });

    for (const track of stream.getTracks()) {
      this.#replaceTrack(track.kind, track);
    }

    await this.#negotiate();
    return stream;
  }

  async enableVideo(deviceId) {
    const constraints = {
      video: deviceConstraint(deviceId),
      audio: false,
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    const [track] = stream.getVideoTracks();

    this.#replaceTrack('video', track);
    await this.#negotiate();
    return track;
  }

  async enableAudio(deviceId) {
    const constraints = {
      audio: deviceConstraint(deviceId),
      video: false,
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    const [track] = stream.getAudioTracks();

    this.#replaceTrack('audio', track);
    await this.#negotiate();
    return track;
  }

  async switchVideo(deviceId) {
    if (!this.hasVideo()) return this.enableVideo(deviceId);

    const constraints = {
      video: deviceConstraint(deviceId),
      audio: false,
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    const [newTrack] = stream.getVideoTracks();
    const sender = this.#pc1.getSenders().find((s) => s.track?.kind === 'video');

    if (sender) {
      await sender.replaceTrack(newTrack);
    } else {
      this.#replaceTrack('video', newTrack);
      await this.#negotiate();
    }

    const old = this.#localStream.getVideoTracks()[0];
    if (old) old.stop();
    this.#localStream.removeTrack(old);
    this.#localStream.addTrack(newTrack);
  }

  async switchAudio(deviceId) {
    if (!this.hasAudio()) return this.enableAudio(deviceId);

    const constraints = {
      audio: deviceConstraint(deviceId),
      video: false,
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    const [newTrack] = stream.getAudioTracks();
    const sender = this.#pc1.getSenders().find((s) => s.track?.kind === 'audio');

    if (sender) {
      await sender.replaceTrack(newTrack);
    } else {
      this.#replaceTrack('audio', newTrack);
      await this.#negotiate();
    }

    const old = this.#localStream.getAudioTracks()[0];
    if (old) old.stop();
    this.#localStream.removeTrack(old);
    this.#localStream.addTrack(newTrack);
  }

  #replaceTrack(kind, track) {
    const existing = this.#localStream.getTracks().filter((t) => t.kind === kind);
    for (const t of existing) {
      t.stop();
      this.#localStream.removeTrack(t);
      const sender = this.#pc1.getSenders().find((s) => s.track === t);
      if (sender) this.#pc1.removeTrack(sender);
    }
    this.#localStream.addTrack(track);
    this.#pc1.addTrack(track, this.#localStream);
    log('webrtc', 'local track added', { kind, trackId: track.id });
  }

  async #negotiate() {
    if (this.#negotiating) return;
    this.#negotiating = true;

    try {
      log('webrtc', 'negotiation started');

      const offer = await this.#pc1.createOffer();
      await this.#pc1.setLocalDescription(offer);
      await waitForIceGathering(this.#pc1);

      await this.#pc2.setRemoteDescription(this.#pc1.localDescription);
      const answer = await this.#pc2.createAnswer();
      await this.#pc2.setLocalDescription(answer);
      await waitForIceGathering(this.#pc2);

      await this.#pc1.setRemoteDescription(this.#pc2.localDescription);
      log('webrtc', 'negotiation complete');
    } finally {
      this.#negotiating = false;
    }
  }

  async #attachVideoTrack(stream) {
    this.#hiddenVideo.srcObject = stream;

    try {
      await this.#hiddenVideo.play();
    } catch (err) {
      log('video', 'hidden video play failed', { error: err.message });
    }

    await waitForVideoDimensions(this.#hiddenVideo);
    log('video', 'hidden video ready', {
      width: this.#hiddenVideo.videoWidth,
      height: this.#hiddenVideo.videoHeight,
      readyState: this.#hiddenVideo.readyState,
    });

    this.#onVideoReady?.(this.#hiddenVideo);
  }

  async #attachAudioTrack(stream) {
    if (!this.#audioContext) {
      this.#audioContext = new AudioContext();
    }

    if (this.#audioContext.state === 'suspended') {
      await this.#audioContext.resume();
    }

    const maxDelay = Math.max(5, this.#delayMs / 1000 + 0.5);
    this.#audioDelayNode = this.#audioContext.createDelay(maxDelay);
    this.#audioDelayNode.delayTime.value = this.#delayMs / 1000;

    const source = this.#audioContext.createMediaStreamSource(stream);
    const destination = this.#audioContext.createMediaStreamDestination();

    source.connect(this.#audioDelayNode);
    this.#audioDelayNode.connect(destination);

    log('audio', 'delay pipeline ready', {
      audioContextState: this.#audioContext.state,
      delaySec: this.#delayMs / 1000,
    });

    await this.#onAudioReady?.(destination.stream);
  }

  async startVideoDelay(canvas) {
    this.#stopVideoDelay();
    this.#framesDrawn = 0;

    await waitForVideoDimensions(this.#hiddenVideo);

    const ctx = canvas.getContext('2d');
    log('video', 'starting delayed canvas render', {
      width: this.#hiddenVideo.videoWidth,
      height: this.#hiddenVideo.videoHeight,
    });

    const draw = () => {
      if (this.#hiddenVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        const w = this.#hiddenVideo.videoWidth;
        const h = this.#hiddenVideo.videoHeight;

        if (w && h) {
          if (canvas.width !== w) canvas.width = w;
          if (canvas.height !== h) canvas.height = h;

          const offscreen = document.createElement('canvas');
          offscreen.width = w;
          offscreen.height = h;
          offscreen.getContext('2d').drawImage(this.#hiddenVideo, 0, 0);

          this.#frameBuffer.push({ time: performance.now(), canvas: offscreen });

          const cutoff = performance.now() - this.#delayMs - 500;
          this.#frameBuffer = this.#frameBuffer.filter((f) => f.time > cutoff);

          const target = performance.now() - this.#delayMs;
          const eligible = this.#frameBuffer.filter((f) => f.time <= target);
          const frame = eligible.at(-1) ?? this.#frameBuffer.at(-1);

          if (frame) {
            ctx.drawImage(frame.canvas, 0, 0, w, h);
            this.#framesDrawn += 1;
          }
        }
      }

      this.#videoFrameId = requestAnimationFrame(draw);
    };

    this.#videoFrameId = requestAnimationFrame(draw);
  }

  #stopVideoDelay() {
    if (this.#videoFrameId) {
      cancelAnimationFrame(this.#videoFrameId);
      this.#videoFrameId = null;
    }
    this.#frameBuffer = [];
    this.#framesDrawn = 0;
  }

  stop() {
    log('webrtc', 'session stopped');
    this.#stopVideoDelay();
    for (const track of this.#localStream.getTracks()) track.stop();
    this.#pc1.close();
    this.#pc2.close();
    if (this.#audioContext) {
      this.#audioContext.close();
      this.#audioContext = null;
    }
    this.#hiddenVideo.srcObject = null;
    this.#hiddenVideo.remove();
  }
}

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
