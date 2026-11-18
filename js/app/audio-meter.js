import { dom } from './dom.js';
import { log } from './logger.js';

const MIN_DB = -60;
const MAX_DB = 0;
const YELLOW_DB = -20;
const RED_DB = -10;
const SEGMENT_WIDTH = 6;
const SEGMENT_GAP = 2;
const RELEASE_DB_PER_SEC = 30;
const PEAK_HOLD_MS = 1200;
const PEAK_RELEASE_DB_PER_SEC = 15;
const READOUT_INTERVAL_MS = 100;

let audioContext = null;
let analyser = null;
let source = null;
let samples = null;
let frameId = null;
let level = MIN_DB;
let peak = MIN_DB;
let peakAt = 0;
let lastFrameAt = 0;
let lastReadoutAt = 0;

function dbToRatio(db) {
  return (Math.min(Math.max(db, MIN_DB), MAX_DB) - MIN_DB) / (MAX_DB - MIN_DB);
}

function zoneColor(db) {
  if (db >= RED_DB) return 'hsl(0 84% 56%)';
  if (db >= YELLOW_DB) {
    const t = (db - YELLOW_DB) / (RED_DB - YELLOW_DB);
    return `hsl(${48 - t * 18} 95% 50%)`;
  }
  const t = dbToRatio(db) / dbToRatio(YELLOW_DB);
  return `hsl(${142 - t * 52} 70% 45%)`;
}

function formatDb(db) {
  if (db <= MIN_DB) return '−∞';
  return `${db < 0 ? '−' : ''}${Math.abs(Math.round(db))}`;
}

function resizeCanvas() {
  const canvas = dom.audioMeterCanvas;
  const dpr = window.devicePixelRatio || 1;
  const width = Math.round(canvas.clientWidth * dpr);
  const height = Math.round(canvas.clientHeight * dpr);
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
}

function draw() {
  const canvas = dom.audioMeterCanvas;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const { width, height } = canvas;
  const segW = SEGMENT_WIDTH * dpr;
  const gap = SEGMENT_GAP * dpr;
  const count = Math.max(1, Math.floor((width + gap) / (segW + gap)));
  const offColor = getComputedStyle(canvas).getPropertyValue('--meter-off').trim();

  const litExact = dbToRatio(level) * count;
  const peakIndex = peak > MIN_DB ? Math.min(count - 1, Math.floor(dbToRatio(peak) * count)) : -1;

  ctx.clearRect(0, 0, width, height);
  for (let i = 0; i < count; i += 1) {
    const x = i * (segW + gap);
    const segDb = MIN_DB + ((i + 0.5) / count) * (MAX_DB - MIN_DB);

    ctx.globalAlpha = 1;
    ctx.fillStyle = offColor;
    ctx.fillRect(x, 0, segW, height);

    const fill = Math.min(1, Math.max(0, litExact - i));
    if (fill > 0 || i === peakIndex) {
      ctx.globalAlpha = i === peakIndex ? 1 : fill;
      ctx.fillStyle = zoneColor(segDb);
      ctx.fillRect(x, 0, segW, height);
    }
  }
  ctx.globalAlpha = 1;
}

function updateReadout(now, force = false) {
  if (!force && now - lastReadoutAt < READOUT_INTERVAL_MS) return;
  lastReadoutAt = now;

  const rounded = Math.round(Math.max(level, MIN_DB));
  dom.audioMeter.setAttribute('aria-valuenow', String(rounded));
  dom.audioMeter.dataset.zone = level >= RED_DB ? 'loud' : level >= YELLOW_DB ? 'strong' : 'ok';
  dom.audioMeterValue.textContent = formatDb(level);
}

function measureDb() {
  analyser.getFloatTimeDomainData(samples);
  let sum = 0;
  for (const s of samples) sum += s * s;
  const rms = Math.sqrt(sum / samples.length);
  return rms > 0 ? 20 * Math.log10(rms) : MIN_DB;
}

function tick(now) {
  const dt = lastFrameAt ? (now - lastFrameAt) / 1000 : 0;
  lastFrameAt = now;

  const target = Math.max(measureDb(), MIN_DB);
  level = target > level ? level + (target - level) * 0.6 : Math.max(target, level - RELEASE_DB_PER_SEC * dt);

  if (level >= peak) {
    peak = level;
    peakAt = now;
  } else if (now - peakAt > PEAK_HOLD_MS) {
    peak = Math.max(level, peak - PEAK_RELEASE_DB_PER_SEC * dt);
  }

  draw();
  updateReadout(now);
  frameId = requestAnimationFrame(tick);
}

function resumeOnGesture() {
  const resume = () => audioContext?.resume();
  document.addEventListener('pointerdown', resume, { once: true });
  document.addEventListener('keydown', resume, { once: true });
}

function resetLevels() {
  level = MIN_DB;
  peak = MIN_DB;
  lastFrameAt = 0;
}

export function stopAudioMeter() {
  if (frameId) cancelAnimationFrame(frameId);
  frameId = null;
  source?.disconnect();
  source = null;
  analyser = null;
  audioContext?.close();
  audioContext = null;
  resetLevels();
  draw();
  updateReadout(0, true);
  dom.audioMeterValue.textContent = '—';
}

export async function startAudioMeter(stream) {
  const [track] = stream.getAudioTracks();
  stopAudioMeter();
  if (!track) return;

  audioContext = new AudioContext();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 1024;
  samples = new Float32Array(analyser.fftSize);
  source = audioContext.createMediaStreamSource(new MediaStream([track]));
  source.connect(analyser);

  if (audioContext.state === 'suspended') {
    await audioContext.resume().catch(() => {});
    if (audioContext.state === 'suspended') resumeOnGesture();
  }

  log('audio', 'level meter started', { trackId: track.id, contextState: audioContext.state });
  frameId = requestAnimationFrame(tick);
}

export function initAudioMeter() {
  resizeCanvas();
  new ResizeObserver(() => {
    resizeCanvas();
    draw();
  }).observe(dom.audioMeterCanvas);
  new MutationObserver(() => draw()).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  draw();
}
