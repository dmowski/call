import { log } from '../app/logger.js';
import { DELAY_MS } from './constants.js';
import { audioOnlyConstraint, videoOnlyConstraint } from './constraints.js';
import { AudioDelayPipeline } from './audio-delay.js';
import {
  negotiatePeers,
  wireConnectionLogging,
  wireIceCandidates,
} from './negotiation.js';
import { attachVideoStream, VideoDelayRenderer } from './video-delay.js';
import { createHiddenVideoElement } from './video-utils.js';

export class LoopbackSession {
  #delayMs;
  #pc1;
  #pc2;
  #localStream;
  #hiddenVideo;
  #videoDelay;
  #audioDelay;
  #onVideoReady;
  #onAudioReady;
  #negotiating = false;

  constructor({ delayMs = DELAY_MS, onVideoReady, onAudioReady } = {}) {
    this.#delayMs = delayMs;
    this.#onVideoReady = onVideoReady;
    this.#onAudioReady = onAudioReady;
    this.#localStream = new MediaStream();
    this.#hiddenVideo = createHiddenVideoElement();
    this.#videoDelay = new VideoDelayRenderer(this.#hiddenVideo, delayMs);
    this.#audioDelay = new AudioDelayPipeline(delayMs);

    this.#pc1 = new RTCPeerConnection();
    this.#pc2 = new RTCPeerConnection();

    wireConnectionLogging(this.#pc1, 'pc1');
    wireConnectionLogging(this.#pc2, 'pc2');
    wireIceCandidates(this.#pc1, this.#pc2, { from: 'pc1', to: 'pc2' });
    wireIceCandidates(this.#pc2, this.#pc1, { from: 'pc2', to: 'pc1' });

    this.#pc2.ontrack = (event) => {
      const stream = event.streams[0] ?? new MediaStream([event.track]);
      log('webrtc', 'remote track received', {
        kind: event.track.kind,
        trackId: event.track.id,
        streamId: stream.id,
      });

      if (event.track.kind === 'video') {
        attachVideoStream(this.#hiddenVideo, stream, this.#onVideoReady);
      }
      if (event.track.kind === 'audio') {
        this.#audioDelay.process(stream, this.#onAudioReady);
      }
    };

    log('webrtc', 'LoopbackSession created');
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
      framesDrawn: this.#videoDelay.framesDrawn,
      frameBufferLength: this.#videoDelay.frameBufferLength,
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
      audioContextState: this.#audioDelay.contextState,
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

  async switchVideo(deviceId) {
    if (!this.hasVideo()) return this.#addVideo(deviceId);

    const stream = await navigator.mediaDevices.getUserMedia(videoOnlyConstraint(deviceId));
    const [newTrack] = stream.getVideoTracks();
    const sender = this.#pc1.getSenders().find((s) => s.track?.kind === 'video');

    if (sender) {
      await sender.replaceTrack(newTrack);
    } else {
      this.#replaceTrack('video', newTrack);
      await this.#negotiate();
    }

    this.#swapLocalTrack('video', newTrack);
  }

  async switchAudio(deviceId) {
    if (!this.hasAudio()) return this.#addAudio(deviceId);

    const stream = await navigator.mediaDevices.getUserMedia(audioOnlyConstraint(deviceId));
    const [newTrack] = stream.getAudioTracks();
    const sender = this.#pc1.getSenders().find((s) => s.track?.kind === 'audio');

    if (sender) {
      await sender.replaceTrack(newTrack);
    } else {
      this.#replaceTrack('audio', newTrack);
      await this.#negotiate();
    }

    this.#swapLocalTrack('audio', newTrack);
  }

  async #addVideo(deviceId) {
    const stream = await navigator.mediaDevices.getUserMedia(videoOnlyConstraint(deviceId));
    const [track] = stream.getVideoTracks();
    this.#replaceTrack('video', track);
    await this.#negotiate();
    return track;
  }

  async #addAudio(deviceId) {
    const stream = await navigator.mediaDevices.getUserMedia(audioOnlyConstraint(deviceId));
    const [track] = stream.getAudioTracks();
    this.#replaceTrack('audio', track);
    await this.#negotiate();
    return track;
  }

  #swapLocalTrack(kind, newTrack) {
    const old = this.#localStream.getTracks().find((t) => t.kind === kind);
    if (old) {
      old.stop();
      this.#localStream.removeTrack(old);
    }
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
      await negotiatePeers(this.#pc1, this.#pc2);
    } finally {
      this.#negotiating = false;
    }
  }

  startVideoDelay(canvas) {
    return this.#videoDelay.start(canvas);
  }

  stop() {
    log('webrtc', 'session stopped');
    this.#videoDelay.stop();
    for (const track of this.#localStream.getTracks()) track.stop();
    this.#pc1.close();
    this.#pc2.close();
    this.#audioDelay.close();
    this.#hiddenVideo.srcObject = null;
    this.#hiddenVideo.remove();
  }
}
