import { queryMediaPermissionStates } from './media-access.js';

export async function joinErrorMessage(error) {
  switch (error?.name) {
    case 'SecurityError':
      return (
        error.message ||
        'Camera and microphone require a secure connection. Open http://localhost:5173 (not a network IP) or deploy via HTTPS.'
      );
    case 'NotSupportedError':
      return (
        error.message ||
        'Camera and microphone are not available in this browser. Open the page in Chrome, Safari, or Firefox.'
      );
    case 'NotAllowedError':
    case 'PermissionDeniedError': {
      const states = await queryMediaPermissionStates();
      if (states.camera === 'denied' || states.microphone === 'denied') {
        return (
          'Camera or microphone access is blocked for this site. ' +
          'Click the lock icon in your address bar → Site settings → Allow camera and microphone, then reload.'
        );
      }
      return (
        'Camera or microphone access was blocked. ' +
        'Allow access when prompted, or reset site permissions in your browser settings. ' +
        'Embedded browser previews (e.g. IDE panels) cannot access media — open this page in your system browser.'
      );
    }
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'No camera or microphone found. Connect a device and try again.';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'Your camera or microphone is in use by another app. Close other apps and try again.';
    case 'OverconstrainedError':
      return 'Could not use the selected device. Try another camera or microphone.';
    default:
      return error?.message ?? 'Something went wrong while joining.';
  }
}
