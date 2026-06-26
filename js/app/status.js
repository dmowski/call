import { dom } from './dom.js';

export function setStatus(message, state = '') {
  dom.statusEl.textContent = message;
  dom.statusEl.dataset.state = state;
}
