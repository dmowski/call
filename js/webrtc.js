export const DELAY_MS = 2000;

function deviceConstraint(deviceId) {
  if (!deviceId) return true;
  return { deviceId: { ideal: deviceId } };
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

  constructor({ delayMs = DELAY_MS, onVideoReady, onAudioReady } = {}) {
    this.#delayMs = delayMs;
    this.#onVideoReady = onVideoReady;
    this.#onAudioReady = onAudioReady;
    this.#localStream = new MediaStream();
    this.#hiddenVideo = document.createElement('video');
    this.#hiddenVideo.playsInline = true;
    this.#hiddenVideo.muted = true;

    this.#pc1 = new RTCPeerConnection();
    this.#pc2 = new RTCPeerConnection();

    this.#pc1.onicecandidate = (e) => {
      if (e.candidate) this.#pc2.addIceCandidate(e.candidate);
    };
    this.#pc2.onicecandidate = (e) => {
      if (e.candidate) this.#pc1.addIceCandidate(e.candidate);
    };

    this.#pc2.ontrack = (event) => {
      const [track] = event.streams[0]?.getTracks() ?? [event.track];
      if (track.kind === 'video') this.#attachVideoTrack(event.streams[0] ?? new MediaStream([track]));
      if (track.kind === 'audio') this.#attachAudioTrack(event.streams[0] ?? new MediaStream([track]));
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

  async attachStream(stream) {
    for (const track of stream.getTracks()) {
      this.#replaceTrack(track.kind, track);
    }

    await this.#negotiate();
    return stream;
  }

  /** @deprecated use attachStream — kept for clarity in tests */
  async join() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    return this.attachStream(stream);
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
  }

  async #negotiate() {
    if (this.#negotiating) return;
    this.#negotiating = true;
    try {
      const offer = await this.#pc1.createOffer();
      await this.#pc1.setLocalDescription(offer);
      await this.#pc2.setRemoteDescription(offer);
      const answer = await this.#pc2.createAnswer();
      await this.#pc2.setLocalDescription(answer);
      await this.#pc1.setRemoteDescription(answer);
    } finally {
      this.#negotiating = false;
    }
  }

  #attachVideoTrack(stream) {
    this.#hiddenVideo.srcObject = stream;
    this.#hiddenVideo.play().catch(() => {});
    this.#onVideoReady?.(this.#hiddenVideo);
  }

  #attachAudioTrack(stream) {
    if (!this.#audioContext) {
      this.#audioContext = new AudioContext();
    }
    if (this.#audioContext.state === 'suspended') {
      this.#audioContext.resume();
    }

    const maxDelay = Math.max(5, this.#delayMs / 1000 + 0.5);
    this.#audioDelayNode = this.#audioContext.createDelay(maxDelay);
    this.#audioDelayNode.delayTime.value = this.#delayMs / 1000;

    const source = this.#audioContext.createMediaStreamSource(stream);
    const destination = this.#audioContext.createMediaStreamDestination();

    source.connect(this.#audioDelayNode);
    this.#audioDelayNode.connect(destination);

    this.#onAudioReady?.(destination.stream);
  }

  startVideoDelay(canvas) {
    this.#stopVideoDelay();
    const ctx = canvas.getContext('2d');

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
          const frame = this.#frameBuffer.find((f) => f.time >= target) ?? this.#frameBuffer[0];
          if (frame) {
            ctx.drawImage(frame.canvas, 0, 0, w, h);
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
  }

  stop() {
    this.#stopVideoDelay();
    for (const track of this.#localStream.getTracks()) track.stop();
    this.#pc1.close();
    this.#pc2.close();
    if (this.#audioContext) {
      this.#audioContext.close();
      this.#audioContext = null;
    }
    this.#hiddenVideo.srcObject = null;
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

