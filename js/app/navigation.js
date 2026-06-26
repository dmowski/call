import { setAppStarted, setInCall } from '../storage.js';
import { dom } from './dom.js';
import { leaveCall, resetJoinButton } from './call-session.js';
import { setStatus } from './status.js';

export function showApp() {
  dom.landing.classList.add('hidden');
  dom.app.classList.remove('hidden');
  setAppStarted(true);
}

export function showLanding() {
  leaveCall();
  dom.app.classList.add('hidden');
  dom.landing.classList.remove('hidden');
  setAppStarted(false);
  setInCall(false);
  resetJoinButton();
  setStatus('');
}
