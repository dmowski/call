import { log } from '../app/logger.js';
import { waitForVideoDimensions } from './video-utils.js';

export class VideoDelayRenderer {
  #delayMs;
  #sourceVideo;
  #frameBuffer = [];
  #frameId = null;
  #framesDrawn = 0;

  constructor(sourceVideo, delayMs) {
    this.#sourceVideo = sourceVideo;
    this.#delayMs = delayMs;
  }

  get framesDrawn() {
    return this.#framesDrawn;
  }

  get frameBufferLength() {
    return this.#frameBuffer.length;
  }

  async start(canvas) {
    this.stop();
    this.#framesDrawn = 0;
    await waitForVideoDimensions(this.#sourceVideo);

    const ctx = canvas.getContext('2d');
    log('video', 'starting delayed canvas render', {
      width: this.#sourceVideo.videoWidth,
      height: this.#sourceVideo.videoHeight,
    });

    const draw = () => {
      if (this.#sourceVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        const w = this.#sourceVideo.videoWidth;
        const h = this.#sourceVideo.videoHeight;

        if (w && h) {
          if (canvas.width !== w) canvas.width = w;
          if (canvas.height !== h) canvas.height = h;

          const offscreen = document.createElement('canvas');
          offscreen.width = w;
          offscreen.height = h;
          offscreen.getContext('2d').drawImage(this.#sourceVideo, 0, 0);

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

      this.#frameId = requestAnimationFrame(draw);
    };

    this.#frameId = requestAnimationFrame(draw);
  }

  stop() {
    if (this.#frameId) {
      cancelAnimationFrame(this.#frameId);
      this.#frameId = null;
    }
    this.#frameBuffer = [];
    this.#framesDrawn = 0;
  }
}

export async function attachVideoStream(video, stream, onReady) {
  video.srcObject = stream;

  try {
    await video.play();
  } catch (err) {
    log('video', 'hidden video play failed', { error: err.message });
  }

  await waitForVideoDimensions(video);
  log('video', 'hidden video ready', {
    width: video.videoWidth,
    height: video.videoHeight,
    readyState: video.readyState,
  });

  onReady?.(video);
}
