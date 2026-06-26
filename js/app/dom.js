export const $ = (sel) => document.querySelector(sel);

export const dom = {
  landing: $('#landing'),
  app: $('#app'),
  startBtn: $('#start-btn'),
  backBtn: $('#back-btn'),
  themeToggle: $('#theme-toggle'),
  cameraSelect: $('#camera-select'),
  micSelect: $('#mic-select'),
  joinCallBtn: $('#join-call-btn'),
  videoPlaceholder: $('#video-placeholder'),
  remoteVideo: $('#remote-video'),
  remoteAudio: $('#remote-audio'),
  statusEl: $('#status'),
  participantTile: $('#participant-tile'),
};
