import { test, expect } from '@playwright/test';
import {
  openApp,
  joinTestCall,
  waitForDelayedMedia,
  getCanvasHasContent,
  getAudioIsActive,
  getDebugState,
} from './helpers.js';

test.describe('Media playback after join', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
    await joinTestCall(page);
  });

  test('renders non-empty video on delayed canvas', async ({ page }) => {
    await waitForDelayedMedia(page);

    const hasContent = await getCanvasHasContent(page);
    const debug = await getDebugState(page);

    expect(hasContent, `Canvas empty. Debug: ${JSON.stringify(debug?.state)}`).toBe(true);
    expect(debug?.state?.hiddenVideo?.videoWidth).toBeGreaterThan(0);
    expect(debug?.state?.framesDrawn).toBeGreaterThan(0);
  });

  test('plays delayed audio through remote audio element', async ({ page }) => {
    await waitForDelayedMedia(page);

    const audioActive = await getAudioIsActive(page);
    const debug = await getDebugState(page);

    expect(audioActive, `Audio inactive. Debug: ${JSON.stringify(debug?.state)}`).toBe(true);
    expect(debug?.state?.audioContextState).toBe('running');
  });

  test('webrtc loopback reaches connected state', async ({ page }) => {
    await waitForDelayedMedia(page, 1000);

    const debug = await getDebugState(page);
    expect(debug?.state?.pc2?.connectionState).toBe('connected');
    expect(debug?.state?.hasVideoTrack).toBe(true);
    expect(debug?.state?.hasAudioTrack).toBe(true);
  });
});
