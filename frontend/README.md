# SmartWork Frontend PWA

React PWA + Vite frontend for SmartWork attendance system.

## Prerequisites

- Node.js 18+

## Installation

```bash
npm install
```

## Environment Setup

Copy `.env.example` to `.env` and configure the values:

```bash
cp .env.example .env
```

| Variable | Description |
| --- | --- |
| `VITE_API_URL` | Backend API base URL (default: `http://localhost:4000/api`) |
| `VITE_UPLOADS_BASE_URL` | Base URL for uploaded files served by backend (default: `http://localhost:4000`) |
| `VITE_FIREBASE_API_KEY` | Firebase API key for push notifications |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |

## Development

Starts the Vite dev server on port 3000:

```bash
npm run dev
```

The dev server proxies `/api` requests to the backend at `http://localhost:4000` by default.

## Building

Produces a production build in the `dist/` directory:

```bash
npm run build
```

## Preview

Preview the production build locally:

```bash
npm run preview
```

## Testing

Run the test suite with Vitest:

```bash
npm run test
```

## Linting

Run the TypeScript type check:

```bash
npm run lint
```

## PWA

The app is installable as a PWA with `manifest.json` and icons in the `public/` directory.
