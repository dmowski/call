import { log } from '../app/logger.js';
import { DELAY_MS } from './constants.js';

export class AudioDelayPipeline {
  #delayMs;
  #audioContext = null;
  #delayNode = null;

  constructor(delayMs = DELAY_MS) {
    this.#delayMs = delayMs;
  }

  get contextState() {
    return this.#audioContext?.state ?? null;
  }

  async process(stream, onReady) {
    if (!this.#audioContext) {
      this.#audioContext = new AudioContext();
    }

    if (this.#audioContext.state === 'suspended') {
      await this.#audioContext.resume();
    }

    const maxDelay = Math.max(5, this.#delayMs / 1000 + 0.5);
    this.#delayNode = this.#audioContext.createDelay(maxDelay);
    this.#delayNode.delayTime.value = this.#delayMs / 1000;

    const source = this.#audioContext.createMediaStreamSource(stream);
    const destination = this.#audioContext.createMediaStreamDestination();

    source.connect(this.#delayNode);
    this.#delayNode.connect(destination);

    log('audio', 'delay pipeline ready', {
      audioContextState: this.#audioContext.state,
      delaySec: this.#delayMs / 1000,
    });

    await onReady?.(destination.stream);
  }

  close() {
    if (this.#audioContext) {
      this.#audioContext.close();
      this.#audioContext = null;
      this.#delayNode = null;
    }
  }
}
