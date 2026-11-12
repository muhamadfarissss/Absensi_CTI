# Implementation Plan: Backend-Frontend Separation

## Overview

This implementation plan separates the PWA Absen CTI monorepo into two independent, self-contained projects: a **Backend** project (`backend/`) with Express.js + MySQL and a **Frontend** project (`frontend/`) with React PWA + Vite. Each project gets its own `package.json`, `.env`, `.gitignore`, `README.md`, and build/deploy lifecycle. The key code changes are: backend CORS configuration from `CORS_ORIGIN`, backend `express.static('uploads')` replacing `express.static('public')`, backend multer destination driven by `UPLOADS_DIR` env var, and frontend `getUploadUrl()` helper for constructing full upload URLs from relative API paths.

## Tasks

- [x] 1. Backend project setup and file migration
  - [x] 1.1 Create `backend/package.json` with backend-only dependencies (`express`, `cors`, `mysql2`, `bcryptjs`, `jsonwebtoken`, `multer`, `nodemailer`, `exceljs`, `dotenv`, `date-fns`), devDependencies (`@types/express`, `@types/node`, `tsx`), `"type": "module"`, and npm scripts (`start`, `dev` using tsx watch, `db:setup`)
    - _Requirements: 1.2, 1.3, 1.8, 6.1, 6.4, 6.6_
  - [x] 1.2 Create `backend/.env`, `backend/.env.example`, `backend/.gitignore`, and `backend/README.md`
    - `.env` and `.env.example` must contain only backend variables: `PORT`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `MAX_ACCURACY_METERS`, `ENABLE_GEOFENCING`, `EMAIL_USER`, `EMAIL_PASS`, `APP_TIMEZONE`, `CORS_ORIGIN`, `UPLOADS_DIR`
    - `.gitignore` must exclude `node_modules/`, `.env`, and `uploads/` directory contents
    - `README.md` must document setup, env config, database init from `schema.sql`, and running the server
    - _Requirements: 1.4, 1.5, 1.6, 1.7, 5.1, 5.2, 5.5_
  - [x] 1.3 Move all `server/` source files into `backend/src/` preserving directory structure
    - `server/index.js` → `backend/src/index.js`
    - `server/db.js` → `backend/src/db.js`
    - `server/cron.js` → `backend/src/cron.js`
    - `server/schema.sql` → `backend/src/schema.sql` (or `backend/schema.sql`)
    - `server/middleware/auth.js` → `backend/src/middleware/auth.js`
    - `server/routes/*.routes.js` → `backend/src/routes/*.routes.js` (7 route files)
    - `server/services/report.service.js` → `backend/src/services/report.service.js`
    - `server/utils/date.js` → `backend/src/utils/date.js`
    - `server/utils/geo.js` → `backend/src/utils/geo.js`
    - Update all relative import paths if needed (e.g., `../db.js` remains valid since directory structure is preserved)
    - _Requirements: 1.1, 8.4, 13.1_
  - [x] 1.4 Move `schema.sql` and `api-contract_smartwork.yaml` to backend project root
    - `schema.sql` at `backend/schema.sql` (or `backend/db/schema.sql`)
    - `api-contract_smartwork.yaml` at `backend/api-contract_smartwork.yaml`
    - _Requirements: 8.5, 13.1_
  - [ ]* 1.5 Write property test: Backend excludes VITE-prefixed environment variables
    - **Property 11: Backend Excludes VITE-Prefixed Variables**
    - **Validates: Requirements 5.2**
    - Scan all backend source files and assert none reference `VITE_`-prefixed variables
  - [ ]* 1.6 Write property test: Backend excludes frontend-only dependencies
    - **Property 13: Backend Excludes Frontend Dependencies**
    - **Validates: Requirements 6.1**
    - Assert `backend/package.json` does not include any frontend-only dependency names (react, react-dom, vite, leaflet, firebase, etc.)
  - [ ]* 1.7 Write property test: Shared dependencies listed independently in both projects
    - **Property 15: Shared Dependencies in Both Projects**
    - **Validates: Requirements 6.3**
    - Assert `date-fns` and `exceljs` appear in both `backend/package.json` and `frontend/package.json`
  - [ ]* 1.8 Write property test: DTO field name mapping (snake_case to camelCase)
    - **Property 16: DTO Field Name Mapping**
    - **Validates: Requirements 8.3, 8.4**
    - For generated DB rows with snake_case columns, assert `toUserDTO`, `toRecordDTO`, `toRequestDTO`, `toNotificationDTO` produce camelCase output matching `types.ts`
  - [ ]* 1.9 Write property test: JWT token generation contains user ID and role
    - **Property 20: JWT Token Generation**
    - **Validates: Requirements 12.1**
    - For generated user IDs and roles, assert issued JWT contains `id` and `role` in payload, is signed with `JWT_SECRET`, and expires after `JWT_EXPIRES_IN`
  - [ ]* 1.10 Write property test: JWT token validation rejects invalid tokens
    - **Property 21: JWT Token Validation**
    - **Validates: Requirements 12.2**
    - For valid, expired, malformed, and missing tokens, assert `requireAuth` middleware passes valid tokens and returns 401 for invalid/missing tokens
  - [ ]* 1.11 Write property test: Cron job error handling does not crash server
    - **Property 25: Cron Job Error Handling**
    - **Validates: Requirements 14.5**
    - For generated error types during cron execution, assert errors are caught and logged without crashing the process

- [x] 2. Backend entry point and upload handling modifications
  - [x] 2.1 Modify `backend/src/index.js` with CORS config, static uploads, health endpoint, auto-create directories, and process error handlers
    - Replace `app.use(cors())` with configurable CORS reading `CORS_ORIGIN` env var (`*` → `origin: true`, specific URLs → split by comma)
    - Set CORS `allowedHeaders: ["Authorization", "Content-Type"]` and `methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]`
    - Replace `app.use(express.static('public'))` with `app.use("/uploads", express.static(uploadsPath))` where `uploadsPath` resolves from `UPLOADS_DIR` env var (default `uploads`)
    - Auto-create `uploads/` and `uploads/requests/` directories on startup using `fs.mkdirSync(..., { recursive: true })`
    - Keep `express.json({ limit: "20mb" })` for base64 photo payloads
    - Keep `/api/health` endpoint returning `{ status: "ok" }`
    - Keep process-level `unhandledRejection` and `uncaughtException` handlers
    - Keep `app.listen(PORT, "0.0.0.0", ...)` binding and `initCron()` call
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.10, 4.1, 4.2, 4.3, 4.7, 4.8, 10.4, 10.5, 10.6, 14.2_
  - [x] 2.2 Modify `backend/src/routes/requests.routes.js` multer destination to use `UPLOADS_DIR` env var
    - Replace hardcoded `const uploadDir = "public/uploads/requests/"` with `path.join(process.env.UPLOADS_DIR || "uploads", "requests")`
    - Keep auto-create directory logic with `fs.mkdirSync(..., { recursive: true })`
    - Keep `attachmentUrl` returning relative path `/uploads/requests/<filename>`
    - _Requirements: 4.4, 4.7_
  - [ ]* 2.3 Write property test: CORS origin configuration
    - **Property 1: CORS Origin Configuration**
    - **Validates: Requirements 3.1, 3.2, 3.3**
    - For generated `CORS_ORIGIN` values (single URL, comma-separated list, `*`), assert `Access-Control-Allow-Origin` header matches configuration
  - [ ]* 2.4 Write property test: CORS allowed headers include Authorization and Content-Type
    - **Property 2: CORS Allowed Headers**
    - **Validates: Requirements 3.4**
    - For preflight OPTIONS requests, assert `Access-Control-Allow-Headers` includes both `Authorization` and `Content-Type`
  - [ ]* 2.5 Write property test: CORS allowed methods include all required methods
    - **Property 3: CORS Allowed Methods**
    - **Validates: Requirements 3.5**
    - For preflight OPTIONS requests, assert `Access-Control-Allow-Methods` includes GET, POST, PUT, PATCH, DELETE, OPTIONS
  - [ ]* 2.6 Write property test: Static file serving for uploads
    - **Property 7: Static File Serving for Uploads**
    - **Validates: Requirements 4.1, 4.2**
    - For generated filenames and subdirectories created in `uploads/`, assert backend serves them at `/uploads/<path>` via `express.static`
  - [ ]* 2.7 Write property test: Unhandled error resilience
    - **Property 24: Unhandled Error Resilience**
    - **Validates: Requirements 10.6**
    - For generated error values as `unhandledRejection` and `uncaughtException`, assert process logs error and continues running
  - [ ]* 2.8 Write property test: Multer file upload returns relative URL
    - **Property 8: Multer File Upload Returns Relative URL**
    - **Validates: Requirements 4.4**
    - For generated file uploads via multipart form-data, assert file is saved to `uploads/requests/` and response contains relative URL `/uploads/requests/<filename>`
  - [ ]* 2.9 Write property test: UPLOADS_DIR configuration resolution
    - **Property 10: UPLOADS_DIR Configuration Resolution**
    - **Validates: Requirements 4.7**
    - For generated `UPLOADS_DIR` values (set or unset), assert multer destination directory resolves to configured path, defaulting to `uploads` when unset

- [x] 3. Checkpoint - Backend complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Frontend project setup and file migration
  - [x] 4.1 Create `frontend/package.json` with frontend-only dependencies (`react`, `react-dom`, `react-router-dom`, `zustand`, `clsx`, `tailwind-merge`, `lucide-react`, `motion`, `leaflet`, `react-leaflet`, `firebase`, `idb`, `date-fns`, `jspdf`, `jspdf-autotable`, `xlsx`, `file-saver`, `exceljs`, `react-use`), devDependencies (`@vitejs/plugin-react`, `@tailwindcss/vite`, `vite`, `vitest`, `tailwindcss`, `autoprefixer`, `typescript`, `jsdom`, `@testing-library/jest-dom`, `@testing-library/react`, `@testing-library/user-event`, `@types/react`, `@types/react-dom`, `@types/leaflet`, `@types/file-saver`, `@types/node`), `"type": "module"`, and npm scripts (`dev`, `build`, `preview`, `lint`, `test`)
    - _Requirements: 2.2, 2.3, 2.8, 6.2, 6.5_
  - [x] 4.2 Create `frontend/.env`, `frontend/.env.example`, `frontend/.gitignore`, and `frontend/README.md`
    - `.env` and `.env.example` must contain only frontend variables: `VITE_API_URL`, `VITE_UPLOADS_BASE_URL`, and Firebase config (`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`)
    - `.gitignore` must exclude `node_modules/`, `dist/`, and `.env`
    - `README.md` must document setup, env config, development, and building for production
    - _Requirements: 2.4, 2.5, 2.6, 2.7, 5.3, 5.4, 5.6_
  - [x] 4.3 Move all `src/` source files into `frontend/src/` preserving directory structure
    - Move `src/App.tsx`, `src/main.tsx`, `src/store.ts`, `src/types.ts`, `src/index.css`, `src/setupTests.ts`, `src/vite-env.d.ts`
    - Move `src/pages/` (including `src/pages/hrd/` subdirectory with all HRD page components)
    - Move `src/components/` (BottomNav, HRDNotificationModal, Layout, MiniMap, Skeleton)
    - Move `src/hooks/useCamera.ts`
    - Move `src/lib/` (api.ts, fcm.ts, geo.ts, image.ts, offlineQueue.ts, utils.ts)
    - Move `src/utils/exportUtils.ts`
    - Move `src/tests/` and `src/__tests__/` test directories
    - _Requirements: 2.1, 8.1, 8.2, 11.1_
  - [x] 4.4 Move `index.html`, `vite.config.ts`, `tsconfig.json`, and `public/` directory to frontend root
    - Move `public/manifest.json`, `public/icon-192.svg`, `public/icon-512.svg` into `frontend/public/`
    - Move `index.html` to `frontend/index.html`
    - Move `vite.config.ts` to `frontend/vite.config.ts` (retain `/api` proxy to `localhost:4000` with `changeOrigin: true`, `@` alias, vitest config with jsdom)
    - Move `tsconfig.json` to `frontend/tsconfig.json`
    - _Requirements: 2.9, 7.1, 7.2, 7.3, 9.1, 9.2, 9.5, 9.6_
  - [ ]* 4.5 Write property test: Frontend excludes backend-only environment variables
    - **Property 12: Frontend Excludes Backend-Only Variables**
    - **Validates: Requirements 5.4**
    - Scan all frontend source files and assert none reference backend-only env vars (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `EMAIL_USER`, `EMAIL_PASS`)
  - [ ]* 4.6 Write property test: Frontend excludes backend-only dependencies
    - **Property 14: Frontend Excludes Backend Dependencies**
    - **Validates: Requirements 6.2**
    - Assert `frontend/package.json` does not include any backend-only dependency names (express, cors, mysql2, bcryptjs, jsonwebtoken, multer, nodemailer, dotenv)
  - [ ]* 4.7 Write property test: Offline queue stores operations in IndexedDB
    - **Property 17: Offline Queue Storage**
    - **Validates: Requirements 11.2**
    - For generated check-in/check-out payloads (varying lat/lng/accuracy/photoUrl), assert operation is stored in IndexedDB with correct type (`CHECK_IN` or `CHECK_OUT`) and payload
  - [ ]* 4.8 Write property test: Offline queue sync success removes items
    - **Property 18: Offline Queue Sync Success Removes Items**
    - **Validates: Requirements 11.3, 11.4**
    - For queued operations and successful sync responses, assert synced items are removed from IndexedDB queue
  - [ ]* 4.9 Write property test: Offline queue sync failure retains items
    - **Property 19: Offline Queue Sync Failure Retains Items**
    - **Validates: Requirements 11.5**
    - For queued operations and failed sync responses (API error, network failure), assert failed items remain in IndexedDB queue
  - [ ]* 4.10 Write property test: 401 response clears token and redirects to login
    - **Property 22: 401 Response Clears Token and Redirects**
    - **Validates: Requirements 12.5**
    - For API responses with HTTP 401 status, assert stored JWT token is cleared from localStorage and user is redirected to login page
  - [ ]* 4.11 Write property test: Session restoration handles valid, invalid, and missing tokens
    - **Property 23: Session Restoration**
    - **Validates: Requirements 12.6**
    - For valid, invalid/expired, and missing token states, assert `hydrateSession` restores authenticated state when valid, clears token and sets unauthenticated state when invalid/missing

- [x] 5. Frontend API client modifications
  - [x] 5.1 Modify `frontend/src/lib/api.ts` to add `UPLOADS_BASE_URL` and `getUploadUrl()` helper
    - Add `UPLOADS_BASE_URL` constant derived from `import.meta.env.VITE_UPLOADS_BASE_URL` or `API_BASE_URL.replace(/\/api\/?$/, "")` as fallback
    - Add exported `getUploadUrl(relativePath: string | null | undefined): string | null` function that returns `null` for falsy input, returns input as-is if already absolute (starts with `http`), otherwise prepends `UPLOADS_BASE_URL`
    - Keep existing `API_BASE_URL`, `getToken`, `setToken`, `clearToken`, `ApiError`, and `request<T>` unchanged
    - _Requirements: 4.5, 4.6, 3.6, 3.7, 3.8, 3.9_
  - [ ]* 5.2 Write property test: API base URL resolution
    - **Property 4: API Base URL Resolution**
    - **Validates: Requirements 3.6, 3.7**
    - For generated `VITE_API_URL` values (absolute URL, relative path, or unset), assert API client resolves base URL correctly (uses provided value or defaults to `/api`)
  - [ ]* 5.3 Write property test: JWT Authorization header inclusion
    - **Property 5: JWT Authorization Header Inclusion**
    - **Validates: Requirements 3.8, 12.4**
    - For generated token values and request paths, assert `Authorization: Bearer <token>` header is included when token is present in localStorage
  - [ ]* 5.4 Write property test: ApiError captures response details
    - **Property 6: ApiError Captures Response Details**
    - **Validates: Requirements 3.9**
    - For generated HTTP error responses (varying status, message, code), assert `ApiError` captures status, message, and optional code from response body
  - [ ]* 5.5 Write property test: Uploads URL construction
    - **Property 9: Uploads URL Construction**
    - **Validates: Requirements 4.5, 4.6**
    - For generated relative upload paths and `VITE_UPLOADS_BASE_URL` configurations (explicit or derived from `VITE_API_URL`), assert `getUploadUrl()` constructs correct full URL

- [x] 6. Final checkpoint - All complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties using `fast-check`
- Unit tests validate specific examples and edge cases
- Backend tests use mock MySQL pool and mock Express request/response
- Frontend tests use jsdom environment with mocked `fetch` and `localStorage`
- The design uses JavaScript for backend and TypeScript for frontend (not pseudocode), so implementation language is already determined

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "4.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4", "4.2", "4.3", "4.4", "1.6", "1.7", "4.6"] },
    { "id": 2, "tasks": ["2.1", "2.2", "5.1", "1.8", "1.9", "1.10", "1.11", "4.7", "4.8", "4.9", "4.10", "4.11"] },
    { "id": 3, "tasks": ["1.5", "2.3", "2.4", "2.5", "2.6", "2.7", "2.8", "2.9", "4.5", "5.2", "5.3", "5.4", "5.5"] }
  ]
}
```
