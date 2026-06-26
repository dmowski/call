export function waitForVideoDimensions(video, timeoutMs = 8000) {
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

export function createHiddenVideoElement() {
  const video = document.createElement('video');
  video.className = 'hidden-source-video';
  video.playsInline = true;
  video.muted = true;
  video.autoplay = true;
  video.setAttribute('aria-hidden', 'true');
  document.body.appendChild(video);
  return video;
}
