# Requirements Document

## Introduction

This document specifies the requirements for separating the SmartWork (PWA Absen CTI) application into two independent, self-contained projects: a **Backend API** project (Express.js + MySQL) and a **Frontend PWA** project (React + Vite). Currently both live in a single repository with a shared `package.json`, shared `.env`, and the backend serving static files for the frontend. The separation will give each project its own repository, dependencies, environment configuration, build pipeline, and deployment lifecycle, while preserving all existing functionality and the HTTP API contract that binds them.

## Glossary

- **Backend_Project**: The standalone Express.js API server project, containing all server-side code (`server/` directory contents), database access, cron jobs, middleware, routes, and services. Communicates exclusively via HTTP/JSON.
- **Frontend_Project**: The standalone React PWA project, containing all client-side code (`src/` directory contents), pages, components, hooks, state management, PWA manifest, and offline queue logic. Communicates with the Backend_Project exclusively via HTTP/JSON API calls.
- **API_Contract**: The documented set of HTTP endpoints, request/response schemas, and status codes that define the interface between the Backend_Project and Frontend_Project. The existing OpenAPI specification in `api-contract_smartwork.yaml` serves as the reference.
- **Shared_Types**: TypeScript type definitions (e.g., `User`, `AttendanceRecord`, `RequestRecord`, `Notification`, `OfficeLocation`, `HospitalLocation`, `Candidate`, `JobOpening`) that describe the shape of API responses and are currently defined in `src/types.ts` on the frontend.
- **API_Client**: The module in the Frontend_Project (`src/lib/api.ts`) responsible for making HTTP requests to the Backend_Project, including authentication token handling, error parsing, and base URL configuration.
- **VITE_API_URL**: The environment variable used by the Frontend_Project (read via `import.meta.env.VITE_API_URL`) to configure the API base URL for the Backend_Project.
- **Uploads_Directory**: The `public/uploads/` directory currently served by Express via `express.static('public')`, containing attendance photos and request attachments uploaded by users.
- **CORS**: Cross-Origin Resource Sharing configuration on the Backend_Project that allows the Frontend_Project (running on a different origin in development and potentially different domains in production) to make API requests.
- **PWA_Manifest**: The `manifest.json` file that makes the Frontend_Project installable as a Progressive Web App, defining app name, icons, start URL, and display mode.
- **Offline_Queue**: The IndexedDB-based mechanism (`src/lib/offlineQueue.ts`) on the Frontend_Project that stores attendance check-in/check-out operations when the device is offline and syncs them to the Backend_Project when connectivity returns.
- **Geofencing**: The server-side validation of GPS coordinates against office/hospital radius boundaries, controlled by the `ENABLE_GEOFENCING` environment variable on the Backend_Project.
- **JWT_Auth**: JSON Web Token-based authentication where the Backend_Project issues tokens on login and the Frontend_Project includes them in the `Authorization: Bearer` header for subsequent requests.
- **Multer_Upload**: The multipart form-data file upload handler on the Backend_Project (`requests.routes.js`) used for request attachments, which saves files to the Uploads_Directory.

## Requirements

### Requirement 1: Backend Project Structure

**User Story:** As a developer, I want the backend code to live in its own independent project with its own directory structure, so that it can be developed, built, and deployed independently from the frontend.

#### Acceptance Criteria

1. THE Backend_Project SHALL contain all server-side source files currently in the `server/` directory, reorganized into a clean project root (e.g., `src/index.js`, `src/db.js`, `src/middleware/auth.js`, `src/routes/*.routes.js`, `src/services/report.service.js`, `src/utils/date.js`, `src/utils/geo.js`, `src/cron.js`, `src/schema.sql`).
2. THE Backend_Project SHALL include its own `package.json` containing only backend dependencies: `express`, `cors`, `mysql2`, `bcryptjs`, `jsonwebtoken`, `multer`, `nodemailer`, `exceljs`, `dotenv`, and `date-fns`.
3. THE Backend_Project SHALL include its own `package.json` devDependencies containing only: `@types/express`, `@types/node`, and `tsx` (or equivalent for running ES module JavaScript).
4. THE Backend_Project SHALL include its own `.env` file containing only backend environment variables: `PORT`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `MAX_ACCURACY_METERS`, `ENABLE_GEOFENCING`, `EMAIL_USER`, `EMAIL_PASS`, and `APP_TIMEZONE`.
5. THE Backend_Project SHALL include its own `.env.example` file documenting all backend environment variables with placeholder values and descriptions.
6. THE Backend_Project SHALL include its own `.gitignore` file excluding `node_modules/`, `.env`, and the `uploads/` directory contents.
7. THE Backend_Project SHALL include its own `README.md` with instructions for setup, environment configuration, database initialization (`schema.sql`), and running the server.
8. THE Backend_Project SHALL define npm scripts: `start` (run production server), `dev` (run server with watch/restart), and `db:setup` (initialize database from schema).

### Requirement 2: Frontend Project Structure

**User Story:** As a developer, I want the frontend code to live in its own independent project with its own directory structure, so that it can be developed, built, and deployed independently from the backend.

#### Acceptance Criteria

1. THE Frontend_Project SHALL contain all client-side source files currently in the `src/` directory, reorganized into a clean project root (e.g., `src/App.tsx`, `src/main.tsx`, `src/pages/`, `src/components/`, `src/hooks/`, `src/lib/`, `src/store.ts`, `src/types.ts`).
2. THE Frontend_Project SHALL include its own `package.json` containing only frontend dependencies: `react`, `react-dom`, `react-router-dom`, `zustand`, `clsx`, `tailwind-merge`, `lucide-react`, `motion`, `leaflet`, `react-leaflet`, `firebase`, `idb`, `date-fns`, `jspdf`, `jspdf-autotable`, `xlsx`, `file-saver`, `exceljs`, and `react-use`.
3. THE Frontend_Project SHALL include its own `package.json` devDependencies containing only: `@vitejs/plugin-react`, `@tailwindcss/vite`, `vite`, `vitest`, `tailwindcss`, `autoprefixer`, `typescript`, `jsdom`, `@testing-library/jest-dom`, `@testing-library/react`, `@testing-library/user-event`, `@types/react`, `@types/react-dom`, `@types/leaflet`, `@types/file-saver`, and `@types/node`.
4. THE Frontend_Project SHALL include its own `.env` file containing only the `VITE_API_URL` variable and any Firebase configuration variables (`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`).
5. THE Frontend_Project SHALL include its own `.env.example` file documenting all frontend environment variables with placeholder values.
6. THE Frontend_Project SHALL include its own `.gitignore` file excluding `node_modules/`, `dist/`, and `.env`.
7. THE Frontend_Project SHALL include its own `README.md` with instructions for setup, environment configuration, development, and building for production.
8. THE Frontend_Project SHALL define npm scripts: `dev` (start Vite dev server), `build` (production build), `preview` (preview production build), `lint` (TypeScript type check), and `test` (run Vitest).
9. THE Frontend_Project SHALL include the `vite.config.ts`, `tsconfig.json`, `index.html`, and `public/` directory (containing `manifest.json`, `icon-192.svg`, `icon-512.svg`) within its project root.

### Requirement 3: API Communication and CORS Configuration

**User Story:** As a developer, I want the frontend and backend to communicate via HTTP API calls with proper CORS configuration, so that the frontend can make requests to the backend running on a different origin.

#### Acceptance Criteria

1. THE Backend_Project SHALL configure CORS middleware to allow requests from configurable origins, specified via a `CORS_ORIGIN` environment variable.
2. WHEN `CORS_ORIGIN` is set to `*`, THE Backend_Project SHALL allow requests from any origin (for development convenience).
3. WHEN `CORS_ORIGIN` is set to a specific URL or comma-separated list of URLs, THE Backend_Project SHALL only allow requests from those origins.
4. THE Backend_Project SHALL include `Authorization` and `Content-Type` in the CORS allowed headers.
5. THE Backend_Project SHALL allow `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, and `OPTIONS` as CORS allowed methods.
6. THE Frontend_Project SHALL read the `VITE_API_URL` environment variable to determine the Backend_Project's base API URL.
7. WHEN `VITE_API_URL` is not set, THE Frontend_Project SHALL default to `/api` as the API base URL (useful when served behind the same reverse proxy).
8. THE Frontend_Project SHALL include the JWT token in the `Authorization: Bearer` header for all authenticated API requests.
9. THE Frontend_Project SHALL handle API responses with the `ApiError` class to distinguish server error messages from network errors.
10. THE Backend_Project SHALL expose a `/api/health` endpoint returning `{ status: "ok" }` for health checks and deployment verification.

### Requirement 4: Static File and Upload Handling

**User Story:** As a developer, I want uploaded files (attendance photos, request attachments) to be served correctly by the backend and referenced by URL in the frontend, so that file storage and retrieval works after separation.

#### Acceptance Criteria

1. THE Backend_Project SHALL serve uploaded files from an `uploads/` directory using `express.static`.
2. THE Backend_Project SHALL expose uploaded files at the path `/uploads/<filename>` (e.g., `/uploads/requests/<filename>` for request attachments).
3. THE Backend_Project SHALL create the `uploads/` directory and any subdirectories (e.g., `uploads/requests/`) automatically on startup if they do not exist.
4. WHEN a user uploads a request attachment via multipart form-data, THE Backend_Project SHALL save the file to the `uploads/requests/` directory using multer disk storage and return the relative URL path in the response.
5. WHEN the frontend needs to display an uploaded file (e.g., attendance photo, profile photo, request attachment), THE Frontend_Project SHALL construct the full URL by prepending the backend's base origin to the relative path returned by the API.
6. THE Frontend_Project SHALL use a configurable `VITE_UPLOADS_BASE_URL` environment variable (defaulting to the same origin as `VITE_API_URL` without the `/api` suffix) to construct full URLs for uploaded files.
7. THE Backend_Project SHALL configure the multer upload destination directory path via an `UPLOADS_DIR` environment variable, defaulting to `uploads` (relative to the backend project root).
8. THE Backend_Project SHALL set a maximum request body size of 20mb for JSON requests (to accommodate base64-encoded attendance photos) and an appropriate file size limit for multipart uploads.

### Requirement 5: Environment Variable Separation

**User Story:** As a developer, I want each project to have its own `.env` file with only the variables it needs, so that configuration is clean and each project can be deployed independently with its own secrets.

#### Acceptance Criteria

1. THE Backend_Project SHALL load environment variables from its own `.env` file using `dotenv/config` at the entry point.
2. THE Backend_Project SHALL NOT reference any `VITE_`-prefixed environment variables.
3. THE Frontend_Project SHALL load environment variables through Vite's built-in environment variable handling (variables prefixed with `VITE_` are exposed to the client via `import.meta.env`).
4. THE Frontend_Project SHALL NOT reference any backend-only environment variables (e.g., `DB_HOST`, `JWT_SECRET`, `EMAIL_PASS`).
5. THE Backend_Project `.env.example` SHALL document all required variables with descriptions: `PORT` (server port, default 4000), `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET` (random hex string), `JWT_EXPIRES_IN` (e.g., 7d), `MAX_ACCURACY_METERS` (GPS accuracy threshold, default 75), `ENABLE_GEOFENCING` (boolean, default false), `EMAIL_USER`, `EMAIL_PASS` (app password for nodemailer), `APP_TIMEZONE` (default Asia/Jakarta), `CORS_ORIGIN` (allowed origins), and `UPLOADS_DIR` (uploads directory path).
6. THE Frontend_Project `.env.example` SHALL document all required variables with descriptions: `VITE_API_URL` (backend API base URL), `VITE_UPLOADS_BASE_URL` (base URL for uploaded files), and Firebase config variables (`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`).

### Requirement 6: Dependency Separation

**User Story:** As a developer, I want each project to have only the dependencies it actually needs, so that builds are faster, the dependency tree is cleaner, and there is no cross-contamination between frontend and backend packages.

#### Acceptance Criteria

1. THE Backend_Project `package.json` SHALL NOT include any frontend-only dependencies: `react`, `react-dom`, `react-router-dom`, `zustand`, `clsx`, `tailwind-merge`, `lucide-react`, `motion`, `leaflet`, `react-leaflet`, `firebase`, `idb`, `jspdf`, `jspdf-autotable`, `xlsx`, `file-saver`, `react-use`, `@vitejs/plugin-react`, `@tailwindcss/vite`, `vite`, `vitest`, `tailwindcss`, `autoprefixer`, `jsdom`, `@testing-library/*`, `@types/react`, `@types/react-dom`, `@types/leaflet`, `@types/file-saver`.
2. THE Frontend_Project `package.json` SHALL NOT include any backend-only dependencies: `express`, `cors`, `mysql2`, `bcryptjs`, `jsonwebtoken`, `multer`, `nodemailer`, `dotenv`, `@types/express`.
3. WHERE a dependency is used in both projects (e.g., `date-fns`, `exceljs`), each project SHALL list that dependency independently in its own `package.json`.
4. THE Backend_Project `package.json` SHALL set `"type": "module"` to support ES module imports.
5. THE Frontend_Project `package.json` SHALL set `"type": "module"` to support Vite's ES module ecosystem.
6. THE Backend_Project SHALL use `tsx` or `node --watch` for development mode (auto-restart on file changes) and plain `node` for production.

### Requirement 7: PWA Manifest and Service Worker

**User Story:** As a developer, I want the frontend to remain a valid installable PWA after separation, so that users can still install the app on their devices and use it as a standalone application.

#### Acceptance Criteria

1. THE Frontend_Project SHALL include the `public/manifest.json` file in its `public/` directory with the app name "SmartWork", start URL, display mode "standalone", theme color, background color, and icon references.
2. THE Frontend_Project SHALL include the PWA icon files (`icon-192.svg`, `icon-512.svg`) in its `public/` directory.
3. THE Frontend_Project `index.html` SHALL reference the manifest via `<link rel="manifest" href="/manifest.json" />` and set the theme color meta tag.
4. WHEN the Frontend_Project is built for production, THE Vite build SHALL copy the `public/` directory contents (including manifest and icons) to the `dist/` output directory.
5. THE Frontend_Project SHALL configure the Vite dev server to serve the `public/` directory contents at the root path.
6. THE Frontend_Project SHALL use relative paths for manifest icon references (e.g., `/icon-192.svg`) so the PWA works regardless of deployment path.

### Requirement 8: Shared Types and API Contract

**User Story:** As a developer, I want the frontend TypeScript types and the backend API responses to stay in sync, so that the frontend can correctly parse and display data returned by the backend.

#### Acceptance Criteria

1. THE Frontend_Project SHALL retain the `src/types.ts` file containing all shared type definitions (`User`, `AttendanceRecord`, `RequestRecord`, `Notification`, `OfficeLocation`, `HospitalLocation`, `MasterDepartment`, `MasterPosition`, `JobOpening`, `Candidate`, `GeoPoint`, `AccuracyQuality`, `AttendanceStatus`, `RequestType`, `RequestStatus`).
2. THE Frontend_Project `src/types.ts` SHALL remain the single source of truth for API response shapes on the frontend side.
3. THE Backend_Project SHALL ensure all API response field names match the field names expected by the Frontend_Project types (e.g., `checkInTime` not `check_in_time`, `photoUrl` not `photo_url` in DTO responses).
4. THE Backend_Project SHALL continue using the DTO transformation functions (e.g., `toUserDTO`, `toRecordDTO`, `toRequestDTO`, `toNotificationDTO`) to convert database column names (snake_case) to API response field names (camelCase) as expected by the frontend.
5. THE Backend_Project SHALL include the existing OpenAPI specification (`api-contract_smartwork.yaml`) in its project root as the authoritative API contract document.
6. WHEN the API contract changes, THE Backend_Project OpenAPI specification SHALL be updated to reflect the changes.

### Requirement 9: Vite Dev Server Proxy Configuration

**User Story:** As a developer, I want the Vite dev server to proxy API requests to the backend during local development, so that I can develop the frontend and backend locally without configuring CORS for every request.

#### Acceptance Criteria

1. THE Frontend_Project `vite.config.ts` SHALL configure a proxy for the `/api` path to the backend server URL (default `http://localhost:4000`).
2. THE Frontend_Project `vite.config.ts` SHALL set `changeOrigin: true` on the proxy configuration.
3. WHEN the developer sets `VITE_API_URL` to a relative path (e.g., `/api`), THE Frontend_Project SHALL use the Vite proxy for local development.
4. WHEN the developer sets `VITE_API_URL` to an absolute URL (e.g., `http://localhost:4000/api`), THE Frontend_Project SHALL make direct requests to that URL, bypassing the proxy.
5. THE Frontend_Project `vite.config.ts` SHALL retain the `@` alias pointing to the project root for path resolution.
6. THE Frontend_Project `vite.config.ts` SHALL retain the Vitest configuration with jsdom environment and setup files.

### Requirement 10: Build and Deployment Considerations

**User Story:** As a developer, I want each project to have a clear build process and deployment strategy, so that I can deploy the backend and frontend to different hosting environments independently.

#### Acceptance Criteria

1. THE Frontend_Project SHALL produce a production build in the `dist/` directory when `npm run build` (vite build) is executed.
2. THE Frontend_Project production build SHALL be a collection of static files (HTML, JS, CSS, images) that can be served by any static file server or CDN.
3. THE Frontend_Project production build SHALL have the `VITE_API_URL` baked into the JavaScript bundle at build time via Vite's environment variable substitution.
4. THE Backend_Project SHALL be deployable as a Node.js process running `node src/index.js` (or equivalent entry point) with environment variables configured on the host.
5. THE Backend_Project SHALL bind to `0.0.0.0` on the configured `PORT` to be accessible from outside the host machine.
6. THE Backend_Project SHALL handle `unhandledRejection` and `uncaughtException` events by logging errors without crashing the process.
7. WHEN deployed behind a reverse proxy (e.g., Nginx), THE Backend_Project SHALL correctly handle proxied requests with the same `/api` path prefix.
8. WHEN deployed behind a reverse proxy, THE Frontend_Project static files SHALL be served at the root path and API requests SHALL be proxied to the Backend_Project.

### Requirement 11: Offline Queue and Sync Behavior

**User Story:** As a developer, I want the offline queue mechanism to continue working after separation, so that users can still perform attendance check-in/check-out while offline and sync when connectivity returns.

#### Acceptance Criteria

1. THE Frontend_Project SHALL retain the `src/lib/offlineQueue.ts` module with IndexedDB-based storage for offline attendance operations.
2. WHEN the device is offline and a user performs check-in or check-out, THE Frontend_Project SHALL store the operation in the IndexedDB sync queue with the operation type and payload.
3. WHEN the device comes back online, THE Frontend_Project SHALL process the sync queue by sending queued operations to the Backend_Project via the API client.
4. WHEN a queued operation is successfully synced, THE Frontend_Project SHALL remove it from the IndexedDB sync queue.
5. WHEN a queued operation fails to sync, THE Frontend_Project SHALL log the error and retain the item in the queue for the next sync attempt.
6. THE Frontend_Project SHALL trigger sync queue processing on application startup if the device is online and on the browser `online` event.

### Requirement 12: Authentication and Session Management

**User Story:** As a developer, I want JWT-based authentication to continue working after separation, so that users can log in, maintain their session, and access protected routes.

#### Acceptance Criteria

1. THE Backend_Project SHALL issue a JWT token on successful login (both `/api/auth/login` and `/api/auth/login-admin`) containing the user ID and role, signed with `JWT_SECRET`, expiring after `JWT_EXPIRES_IN`.
2. THE Backend_Project SHALL validate JWT tokens on protected routes via the `requireAuth` middleware, returning 401 for missing or invalid tokens.
3. THE Frontend_Project SHALL store the JWT token in `localStorage` under the key `employee-pwa-token`.
4. THE Frontend_Project SHALL include the stored token in the `Authorization: Bearer` header for all authenticated API requests.
5. WHEN the Backend_Project returns a 401 response, THE Frontend_Project SHALL clear the token and redirect the user to the login page.
6. THE Frontend_Project SHALL restore the session on application startup by calling `/api/auth/me` with the stored token, and if the token is invalid, clear the token and set the unauthenticated state.

### Requirement 13: Database Schema and Migration

**User Story:** As a developer, I want the database schema to be part of the backend project, so that database initialization is self-contained in the backend repository.

#### Acceptance Criteria

1. THE Backend_Project SHALL include the `schema.sql` file in its project root (or a `db/` subdirectory).
2. THE Backend_Project SHALL include an npm script `db:setup` that executes the schema SQL against the configured MySQL database.
3. THE Backend_Project SHALL document the database setup process in the README, including MySQL version requirements, creating the database, and running the schema.
4. THE Backend_Project SHALL retain the connection pool configuration in `db.js` reading from environment variables with sensible defaults.
5. THE Backend_Project SHALL test the database connection on startup and log success or failure.

### Requirement 14: Cron Jobs and Background Tasks

**User Story:** As a developer, I want the daily absent check cron job to continue running in the backend project, so that employees who do not check in are automatically marked as absent.

#### Acceptance Criteria

1. THE Backend_Project SHALL retain the `cron.js` module with the daily absent check logic.
2. THE Backend_Project SHALL initialize the cron job on server startup by calling `initCron()` from the entry point.
3. THE cron job SHALL run at approximately 23:50 local time (or per `APP_TIMEZONE`) to mark absent employees.
4. THE Backend_Project SHALL log cron job execution and results to the console.
5. THE Backend_Project SHALL handle cron job errors gracefully by logging them without crashing the server process.
