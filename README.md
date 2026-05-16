# Real-time Audio Monitor

Single-page browser project focused on real-time audio processing for an academic poster and live demo. The goal is to capture microphone input, reduce noise through destructive interference, modify amplitude, and give the user immediate audio and visual feedback in the browser.

## What This Project Aims to Do

- Request microphone access only after the user clicks **Start**
- Reduce noise by applying real-time signal processing to the live microphone input
- Modify signal amplitude to support the hearing-protection demo flow
- Route the processed signal to the browser audio output
- Show a live waveform visualization for signal behavior
- Show a live frequency spectrum visualization for signal energy
- Handle common browser errors such as permission denial or missing devices
- Keep state in memory only, with no backend or persistence

## Quick Setup

### Prerequisites

- Node.js
- A modern Chromium-based browser
- Microphone access and headphones for the full experience

### Install and run

```bash
npm install
npm start
```

Then open:

```text
http://localhost:8000
```

## Useful Scripts

```bash
npm start
```

Starts the local static server with `http-server` and opens the app.

```bash
npm test
```

Runs the unit tests with Jest.

```bash
npm run test:integration
```

Runs the browser integration check with Puppeteer.

## Project Structure

```text
Project
├── index.html
├── src
│   ├── main.js
│   ├── audio
│   │   ├── input.js
│   │   ├── processor.js
│   │   └── output.js
│   ├── visualization
│   │   ├── spectrum.js
│   │   └── waveform.js
│   └── ui
│       └── controls.js
├── styles
│   └── main.css
├── __tests__
│   ├── app.test.js
│   └── integration.js
├── package.json
└── jest.config.cjs
```

