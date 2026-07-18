export function delayLabel(delayMs) {
  if (delayMs === 0) return 'You (live)';
  return `You (${delayMs / 1000}s delay)`;
}

export function inCallStatusMessage(delayMs) {
  if (delayMs === 0) return 'In call — live preview, no delay.';
  return `In call — audio and video delayed by ${delayMs / 1000} seconds.`;
}

export function cameraSwitchedStatusMessage(delayMs) {
  if (delayMs === 0) return 'Camera switched — live preview.';
  return `Camera switched — preview shows ${delayMs / 1000} second delay.`;
}
