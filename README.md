# Call Preflight

Run a quick preflight check before your next video call. Call Preflight runs a WebRTC loopback in your browser so you can see yourself and hear your voice with a **2-second delay** — the same latency a remote participant would experience.

No accounts. No analytics. No server-side processing.

## Features

- **Camera preview** — switch webcams and check framing, lighting, and background
- **Microphone check** — hear yourself through a delayed audio loopback
- **Realistic simulation** — video and audio routed through WebRTC, delayed by 2 seconds
- **Device memory** — selected camera, mic, and theme saved in `localStorage`
- **Light / dark theme** — follows system preference or manual toggle
- **Privacy-first** — media never leaves your browser

## How it works

1. Click **Start preflight** to open the app (no camera/mic permission yet)
2. Choose your camera and microphone
3. Click **Join test call** — browser asks for permission, then starts the loopback
4. Preview delayed video and hear delayed audio; switch devices while in call

Under the hood, two `RTCPeerConnection` instances connect to each other. Video frames are buffered and drawn to a canvas 2 seconds later; audio passes through a Web Audio `DelayNode`.

## Getting started

Requires [Node.js](https://nodejs.org/) and [pnpm](https://pnpm.io/).

```bash
pnpm install
pnpm dev
```

Opens [http://localhost:5173](http://localhost:5173) with hot reload.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Dev server (opens browser) |
| `pnpm build` | Production build → `dist/` |
| `pnpm preview` | Preview production build locally |
| `pnpm test:e2e` | Run Playwright end-to-end tests |
| `pnpm test:e2e:ui` | Playwright interactive UI |

First time running tests:

```bash
pnpm exec playwright install chromium
```

## Deploy

Built for [Vercel](https://vercel.com/) as a static site.

```bash
pnpm build
```

`vercel.json` is configured with `buildCommand: pnpm build` and `outputDirectory: dist`.

## Project structure

```
index.html          Landing page + app
privacy.html        Privacy policy
contact.html        Contact & feedback
css/styles.css      Styles (native CSS, theme tokens)
js/
  app.js            Entry point
  storage.js        localStorage helpers
  webrtc.js         WebRTC loopback session
  app/              UI modules (devices, call session, navigation, …)
e2e/                Playwright tests
```

For AI/agent context and architecture details, see [AGENTS.md](./AGENTS.md).

## Tech stack

- Native HTML, CSS, JavaScript (ES modules)
- [Vite](https://vite.dev/) — dev server and build
- [Playwright](https://playwright.dev/) — e2e tests (real UI, fake media devices)

## Privacy

All processing happens locally in your browser. Preferences are stored in `localStorage` on your device. No audio or video is sent to any external server.

See [privacy.html](./privacy.html) for the full policy.

## Feedback

Questions or suggestions? See [contact.html](./contact.html) or email [dmowski.alex@gmail.com](mailto:dmowski.alex@gmail.com).

## License

Private project.
