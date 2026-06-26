export function joinErrorMessage(error) {
  switch (error?.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'Camera or microphone access was blocked. Allow access in your browser settings, then try again.';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'No camera or microphone found. Connect a device and try again.';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'Your camera or microphone is in use by another app.';
    case 'OverconstrainedError':
      return 'Could not use the selected device. Try another camera or microphone.';
    default:
      return error?.message ?? 'Something went wrong while joining.';
  }
}
