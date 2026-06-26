# AGENTS.md — Call Prep

Guide for AI agents working in this repository.

## Project summary

**Call Prep** is a static browser app that helps users prepare for video calls. It previews camera and microphone through a WebRTC loopback with a **2-second delay**, simulating how a remote participant would see and hear them.

- No backend, no analytics, no accounts
- All media processing runs client-side
- Deployed as static files on Vercel

## Tech stack

| Layer | Choice |
|-------|--------|
| UI | Native HTML, CSS, vanilla JS (ES modules) |
| Build / dev | Vite 6 + pnpm |
| E2E tests | Playwright (real UI, fake media devices) |
| Deploy | Vercel (`dist/`) |
| Persistence | `localStorage` only |

**Do not introduce** React, Vue, Tailwind, or other UI frameworks unless explicitly requested.

## Commands

```bash
pnpm install          # install deps
pnpm dev              # dev server at http://localhost:5173 (opens browser)
pnpm build            # production build → dist/
pnpm preview          # preview production build
pnpm test:e2e         # run all Playwright tests
pnpm test:e2e:ui      # Playwright UI mode
```

After any behavior change, run `pnpm test:e2e`. All tests must pass before finishing.

If Playwright browsers are missing: `pnpm exec playwright install chromium`

## Repository layout

```
index.html              # Landing page + app shell (SEO meta, JSON-LD)
privacy.html            # Privacy policy
contact.html            # Contact / feedback
css/styles.css          # All styles; light/dark via [data-theme]
js/
  app.js                # Entry point — calls initApp()
  storage.js            # localStorage (theme, devices, appStarted)
  webrtc.js             # LoopbackSession, device enumeration
  app/
    dom.js              # DOM element refs
    init.js             # Event wiring
    navigation.js       # Landing ↔ app transitions
    status.js           # Status message helper
    devices.js          # Populate camera/mic selects
    call-session.js     # Join / leave call, device switching
    video-view.js       # Delayed canvas preview
e2e/
  helpers.js            # Shared test utilities (openApp, clearStorage)
  landing.spec.js
  static-pages.spec.js
  call-app.spec.js
  theme.spec.js
vite.config.js
playwright.config.js
vercel.json
```

## Architecture

### User flow

1. **Landing** — SEO content, footer links (privacy, contact), **Start** button
2. **Start** — Hides landing, shows app. Lists devices via `enumerateDevices()` **without** requesting permissions
3. **Join test call** — Requests camera + mic (`getUserMedia`), starts WebRTC loopback, shows delayed preview
4. **In call** — User can switch camera/mic; button shows "In call" (disabled)
5. **Back to home** — Leaves call, stops tracks, returns to landing

### Permission rules (critical)

- **Never** call `getUserMedia` on Start or during initial device listing
- **Only** request media when user clicks **Join test call** (or when switching devices while already in call)
- Device labels are generic until after join; then `populateDevices({ labelsAvailable: true })` refreshes them

### WebRTC loopback (`js/webrtc.js`)

`LoopbackSession` connects two `RTCPeerConnection` instances to each other:

- Local tracks added to `pc1` → received on `pc2.ontrack`
- **Video delay**: frames buffered in a ring buffer, drawn to `<canvas>` 2s later (`DELAY_MS = 2000`)
- **Audio delay**: `AudioContext` + `DelayNode` (2s) → `#remote-audio`

Public API:

- `join({ videoDeviceId, audioDeviceId })` — get both tracks, negotiate
- `switchVideo(deviceId)` / `switchAudio(deviceId)` — replace track while in call
- `startVideoDelay(canvas)` — begin delayed canvas rendering
- `stop()` — cleanup tracks, peer connections, audio context

### Module responsibilities

| Module | Owns |
|--------|------|
| `storage.js` | `call-prep-settings` in localStorage |
| `app/dom.js` | Element refs; add new IDs here when changing HTML |
| `app/init.js` | Event listeners only — keep thin |
| `app/call-session.js` | Session lifecycle, join/leave, in-call state |
| `app/devices.js` | Select population; no media permissions |
| `app/video-view.js` | Canvas creation, placeholder toggle |
| `app/navigation.js` | showApp / showLanding; coordinates leave + reset |

Avoid circular imports. Current dependency direction: `init` → `navigation` / `call-session` → `devices` / `video-view` / `webrtc`.

### localStorage schema

Key: `call-prep-settings`

```json
{
  "theme": "light" | "dark" | null,
  "cameraId": "",
  "micId": "",
  "appStarted": false
}
```

## UI conventions

- Minimal, accessible markup (labels, `aria-*`, skip link)
- Themes: `document.documentElement.dataset.theme` = `"light"` | `"dark"`
- CSS custom properties in `css/styles.css`; use existing tokens (`--accent`, `--bg`, etc.)
- App sections toggled with `.hidden` class

## Testing conventions

- **Real UI only** — no mocking of app logic or WebRTC
- Playwright uses fake media: `--use-fake-device-for-media-stream`
- Split specs by area; reuse `e2e/helpers.js`
- Prefer role/label locators over brittle CSS selectors
- Avoid ambiguous `getByText` when multiple elements match — use `#status`, `getByRole('button', { name: ... })`

When adding a feature:

1. Add or update a focused spec file under `e2e/`
2. Use `openApp(page)` for app tests; `clearStorage(page)` when isolation matters
3. Assert permission deferral if touching the Start / Join flow

## Deployment

- `pnpm build` outputs to `dist/`
- `vercel.json`: build command + output directory
- Multi-page: `index.html`, `privacy.html`, `contact.html` — do not add SPA catch-all rewrites

## Planned expansion

The product roadmap includes speech-prep tools and other call rehearsal features. When adding new tools:

- Keep landing page crawlable (headings, descriptive text)
- Preserve privacy-first stance (no analytics, no server-side logic)
- Extend `js/app/` with new modules rather than growing a single file
- Add e2e coverage before merging behavior changes

## Checklist for agents

- [ ] Native JS/CSS only; match existing module patterns
- [ ] No premature `getUserMedia` — permissions only on user action
- [ ] Update `dom.js` + `index.html` together when adding UI elements
- [ ] Run `pnpm test:e2e` — all tests green
- [ ] Run `pnpm build` if HTML/entry points changed
- [ ] Keep changes focused; no unrelated refactors
