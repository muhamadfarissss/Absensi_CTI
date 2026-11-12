# Implementation Plan: Code Cleanup

## Overview

This implementation plan covers a comprehensive code cleanup pass across both the backend (`backend/`) and frontend (`frontend/`) projects. The cleanup is a pure refactoring task with zero behavioral changes. It addresses five themes: code hygiene (dead code, unused imports, duplicate functions, redundant middleware), structural reorganization (splitting monolithic `hrd.routes.js` and `api.ts`), consistency (JWT payload, error handling, response formats, commenting), type safety (replacing `any` types with proper TypeScript interfaces), and tooling/documentation (constants extraction, JSDoc/TSDoc, ESLint, Prettier, validation middleware).

The plan is organized into backend foundation tasks first (constants, validation, DTOs, middleware), followed by backend cleanup (dead code, HRD split, duplicate functions), then backend consistency tasks (error handling, JSDoc, ESLint), and finally frontend tasks (API split, type fixes, store cleanup, TSDoc, ESLint). Property-based tests are included as sub-tasks for the four correctness properties defined in the design.

## Tasks

- [x] 1. Backend foundation - constants, validation middleware, DTOs, middleware fixes, and test setup
  - [x] 1.1 Create `backend/src/constants.js` with all extracted magic numbers
    - Define: `BODY_LIMIT_MB` (20), `DEFAULT_HOSPITAL_RADIUS_METERS` (200), `BCRYPT_SALT_ROUNDS` (10), `CRON_CHECK_INTERVAL_MS` (10 * 60 * 1000), `CRON_TARGET_HOUR` (23), `CRON_TARGET_MINUTE` (50), `JWT_EMPLOYEE_EXPIRES_IN` ("7d"), `JWT_ADMIN_EXPIRES_IN` ("12h"), `DB_POOL_LIMIT` (10)
    - Export all constants as named exports
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.9, 13.10_

  - [x] 1.2 Create `backend/src/middleware/validate.js` with schema-based validation middleware
    - Implement `validate(schema)` function that returns Express middleware
    - Schema accepts `body`, `query`, `params` sections with field definitions (`type`, `required`)
    - On validation failure, return 400 with `{ message: "..." }` listing specific errors
    - On success, call `next()` to proceed to route handler
    - Include JSDoc documenting schema definition format and usage as Express middleware
    - _Requirements: 17.1, 17.2, 17.3, 17.6, 17.8, 14.8_

  - [x] 1.3 Move `requireAdmin` from `hrd.routes.js` to `middleware/auth.js`; remove unused `signToken` function
    - Move `requireAdmin` function to `middleware/auth.js` as a named export alongside `requireAuth`
    - Remove `signToken` function entirely (unused, uses `{ sub: userId }` inconsistent with `{ id, role }` payload)
    - Add JSDoc to `requireAuth` and `requireAdmin` describing what they check and when they call `next()` vs send error
    - _Requirements: 3.4, 5.1, 5.2, 14.7_

  - [x] 1.4 Extract DTOs into `backend/src/dto/` modules and update route file imports
    - Create `dto/user.dto.js` (toUserDTO from auth.routes.js), `dto/attendance.dto.js` (toRecordDTO from attendance.routes.js), `dto/request.dto.js` (toRequestDTO from requests.routes.js), `dto/notification.dto.js` (toNotificationDTO from notifications.routes.js)
    - Add JSDoc to each DTO function documenting input row shape and output object shape
    - Update `auth.routes.js`, `attendance.routes.js`, `requests.routes.js`, `notifications.routes.js`, `profile.routes.js` to import DTOs from `dto/` modules instead of cross-route imports
    - _Requirements: 14.4, 14.1_

  - [x] 1.5 Set up Vitest + fast-check for backend
    - Create `backend/vitest.config.js` with node environment and globals enabled
    - Add `vitest` and `fast-check` to backend devDependencies in `package.json`
    - Add `test` and `test:properties` scripts to `package.json`
    - Create `backend/tests/properties/` directory
    - _Requirements: 12.2_

  - [ ]* 1.6 Write property test: JWT round-trip consistency
    - **Property 1: JWT round-trip consistency**
    - **Validates: Requirements 5.1, 5.2**
    - Test that signing a JWT with `{ id, role }` payload and verifying with `requireAuth` logic produces the same `id` and `role`
    - Use fast-check with minimum 100 iterations
    - Target: `backend/tests/properties/jwt.test.js`

  - [ ]* 1.7 Write property test: Validation utility correctness
    - **Property 3: Validation utility correctness**
    - **Validates: Requirements 17.2, 17.3, 17.6**
    - Test that `validate()` middleware correctly distinguishes valid from invalid inputs
    - When all required fields present with correct types, `next()` is called; otherwise 400 with `message` field
    - Use fast-check with minimum 100 iterations
    - Target: `backend/tests/properties/validate.test.js`

- [x] 2. Backend dead code and unused imports cleanup
  - [x] 2.1 Remove commented-out register handler and unused `signToken` import from `auth.routes.js`
    - Remove the old commented-out register handler block entirely
    - Remove `signToken` from imports (no longer exported from auth.js after 1.3)
    - Verify no commented-out code blocks exceeding 3 consecutive lines remain
    - _Requirements: 1.1, 1.2, 1.3, 4.1_

  - [x] 2.2 Remove `dotenv` import and `dotenv.config()` call from `db.js`
    - Remove `import dotenv from "dotenv"` and `dotenv.config()` since `index.js` already loads env via `import "dotenv/config"`
    - _Requirements: 4.3, 4.5_

- [x] 3. Backend HRD routes split and redundant middleware removal
  - [x] 3.1 Create 13 domain sub-route files under `backend/src/routes/hrd/`
    - Create: `admin.routes.js`, `hospitals.routes.js`, `departments.routes.js`, `positions.routes.js`, `dashboard.routes.js`, `attendance.routes.js`, `employees.routes.js`, `leaves.routes.js`, `reports.routes.js`, `offices.routes.js`, `kpi.routes.js`, `recruitment.routes.js`, `notifications.routes.js`
    - Each file exports a `Router()` with routes defined relative to `/api/hrd` mount prefix
    - Move `getIndonesianDayName` helper from `hrd.routes.js` to `hrd/attendance.routes.js`
    - Add file-level header comment to each file identifying the domain and listing endpoints
    - Sub-route files must NOT call `router.use(requireAuth)` or `router.use(requireAdmin)` — inherited from index
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.4_

  - [x] 3.2 Rewrite `hrd.routes.js` as index composer with central auth
    - Import `requireAuth` and `requireAdmin` from `middleware/auth.js`
    - Import all 13 sub-route files
    - Apply `router.use(requireAuth, requireAdmin)` centrally before mounting sub-routers
    - Mount all sub-routers on a single `Router()` instance
    - Export the composed router as default, preserving the same mounting point in `index.js`
    - _Requirements: 2.3, 3.4, 12.5_

  - [x] 3.3 Remove redundant `router.use(requireAuth)` from 5 route files
    - Remove from: `attendance.routes.js`, `requests.routes.js`, `notifications.routes.js`, `profile.routes.js`, `office.routes.js`
    - These routes are already mounted with `requireAuth` in `index.js`
    - Also remove route-level `requireAuth` from `/locations` in `attendance.routes.js` if auth is already applied at router level
    - Verify all previously protected endpoints remain protected after removal
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 3.4 Remove unused `request` import from `"https"` in HRD sub-route files
    - Search all 13 HRD sub-route files for `import request from "https"` and remove if unused
    - _Requirements: 4.2, 4.5_

- [x] 4. Checkpoint - Backend structural changes complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Backend duplicate function consolidation
  - [x] 5.1 Consolidate `formatISO` in `report.service.js`
    - Remove the closure-defined `formatISO` inside `hitungPeriode`
    - Move the module-level `formatISO` definition to the top of the file (before `hitungPeriode`)
    - Ensure both `hitungPeriode` and `ambilData` use the single module-level `formatISO`
    - _Requirements: 6.1, 6.3_

  - [x] 5.2 Consolidate `haversineDistanceMeters` and `calculateDistance` in `geo.js`; update call sites
    - Remove `calculateDistance` function (mathematically identical to `haversineDistanceMeters`)
    - Keep single `haversineDistanceMeters` function
    - Update all call sites in `attendance.routes.js` to use `haversineDistanceMeters` instead of `calculateDistance`
    - _Requirements: 6.2, 6.3_

  - [ ]* 5.3 Write property test: Haversine distance correctness
    - **Property 2: Haversine distance correctness**
    - **Validates: Requirements 6.2, 6.3**
    - Test that consolidated `haversineDistanceMeters` returns non-negative finite values for any coordinates
    - Test symmetry: `d(a,b) === d(b,a)` for any coordinate pairs
    - Use fast-check with minimum 100 iterations
    - Target: `backend/tests/properties/geo.test.js`

- [x] 6. Backend constants integration into source files
  - [x] 6.1 Update `index.js`, `cron.js`, `db.js`, and `middleware/auth.js` to use constants from `constants.js`
    - `index.js`: Replace `"20mb"` literal with `BODY_LIMIT_MB` constant (e.g., `${BODY_LIMIT_MB}mb`)
    - `cron.js`: Replace `10 * 60 * 1000` with `CRON_CHECK_INTERVAL_MS`, `23` with `CRON_TARGET_HOUR`, `50` with `CRON_TARGET_MINUTE`
    - `db.js`: Replace pool limit `10` with `DB_POOL_LIMIT` constant
    - `middleware/auth.js`: Replace `"7d"` with `JWT_EMPLOYEE_EXPIRES_IN`, `"12h"` with `JWT_ADMIN_EXPIRES_IN`
    - _Requirements: 13.2, 13.5, 13.6, 13.7, 13.8, 5.3_

  - [x] 6.2 Update HRD sub-route files to use constants from `constants.js`
    - Replace hospital radius `200` with `DEFAULT_HOSPITAL_RADIUS_METERS` in hospitals routes
    - Replace bcrypt salt rounds `10` with `BCRYPT_SALT_ROUNDS` in admin/employee creation routes
    - _Requirements: 13.3, 13.4_

- [x] 7. Backend route handler refactoring - validation migration, error handling, and response formats
  - [x] 7.1 Refactor route handlers to use `validate()` middleware, replacing inline validation checks
    - Replace `if (!name || !email)` style inline checks with `validate({ body: { name: { type: 'string', required: true }, ... } })` middleware
    - Apply to all route handlers with inline validation in both non-HRD routes and HRD sub-routes
    - Preserve exact same validation rules and error messages — no new rules that reject currently-accepted requests
    - _Requirements: 17.4, 17.5, 17.7_

  - [x] 7.2 Standardize error handling (try/catch), response formats, and commenting style across all route handlers
    - Ensure all route handlers wrap main logic in try/catch with appropriate HTTP status codes (409 for `ER_DUP_ENTRY`, 404 for not found, 500 for unexpected)
    - Standardize success responses: data under named keys (`{ user }`, `{ records }`, `{ hospitals }`), action confirmations include `message` field
    - Standardize error responses: include `message` field with human-readable description
    - Preserve all existing response body key names, field names, and nesting structure
    - Standardize inline comments to Indonesian language consistently within each file
    - Standardize section separator comments to consistent character length and style
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 10.1, 10.2, 10.3_

  - [ ]* 7.3 Write property test: Validation rule preservation
    - **Property 4: Validation rule preservation**
    - **Validates: Requirements 17.5, 17.7**
    - Test that schema-based validation produces the same accept/reject decision as original inline checks
    - No request previously accepted by inline check is rejected by schema validation, and vice versa
    - Use fast-check with minimum 100 iterations
    - Target: `backend/tests/properties/validate-preservation.test.js`

- [x] 8. Backend JSDoc documentation
  - [x] 8.1 Add JSDoc to all exported functions in route files and file-level header comments
    - Add `@param` tags for each parameter and `@returns` tag for return value
    - Add `@throws` tag for functions that throw errors as part of their contract
    - Add file-level header comments to all route files describing the domain and listing endpoints
    - _Requirements: 14.1, 14.2, 14.5_

  - [x] 8.2 Add JSDoc to DTO functions documenting input row shape and output object shape
    - Use `@typedef` annotations for database row shapes and output DTO shapes
    - Document each field with type information
    - _Requirements: 14.4_

  - [x] 8.3 Add JSDoc to middleware functions and utility functions
    - Add JSDoc to `requireAuth`, `requireAdmin` in `middleware/auth.js` describing checks and `next()` vs error response behavior
    - Add JSDoc to `validate()` in `middleware/validate.js` (if not already done in 1.2)
    - Add JSDoc to utility functions in `date.js` and `geo.js` with parameter descriptions and return value descriptions
    - Add JSDoc to service functions in `report.service.js`
    - _Requirements: 14.6, 14.7, 14.8_

- [x] 9. Backend ESLint and Prettier setup
  - [x] 9.1 Create `backend/eslint.config.js` (flat config) with recommended rules for Express.js + ES modules
    - Use `@eslint/js` recommended config
    - Set `ecmaVersion: 2024`, `sourceType: "module"`
    - Set `no-unused-vars` and `prefer-const` to `"warn"` to avoid blocking build on existing style issues
    - Set `no-console` to `"off"` (backend uses console.error for logging)
    - Ignore `node_modules/` and `uploads/`
    - _Requirements: 15.1, 15.6_

  - [x] 9.2 Create `backend/.prettierrc`, `backend/.eslintignore`, and `backend/.prettierignore`
    - `.prettierrc`: 2-space indent, double quotes, semicolons, printWidth 100, trailingComma "es5"
    - `.eslintignore` and `.prettierignore`: exclude `node_modules/`, `uploads/`, `dist/`, `*.min.js`
    - _Requirements: 15.3, 15.7, 15.8_

  - [x] 9.3 Add `eslint`, `prettier` to backend devDependencies; add `lint` and `format` scripts to `package.json`
    - Add devDependencies: `eslint`, `prettier`
    - Add scripts: `"lint": "eslint ."`, `"format": "prettier --write \"src/**/*.{js,ts,tsx}\""`
    - _Requirements: 15.4, 15.9_

- [x] 10. Checkpoint - Backend complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Frontend API module split
  - [x] 11.1 Create `frontend/src/lib/api/shared.ts` with shared utilities
    - Move `ApiError` class, `request` helper, `getToken`, `setToken`, `clearToken`, `getUploadUrl` from `api.ts`
    - Add `requestFormData` helper for multipart uploads (mirrors `request` helper's auth and error handling but uses FormData)
    - Export `GeoPayload` type if used across modules
    - _Requirements: 8.2, 11.2_

  - [x] 11.2 Create domain API modules under `frontend/src/lib/api/`
    - `auth.api.ts`: apiRegister, apiLogin, apiGetMe, apiGetDepartments, apiGetPositions
    - `attendance.api.ts`: apiGetTodayAttendance, apiGetAttendanceHistory, apiCheckIn, apiCheckOut, apiGetAttendanceLocations
    - `requests.api.ts`: apiGetRequests, apiSubmitRequest
    - `notifications.api.ts`: apiGetNotifications, apiMarkNotificationRead
    - `profile.api.ts`: apiUpdateProfile
    - `office.api.ts`: apiGetOffice
    - `hrd.api.ts`: All HRD API functions (hospitals, employees, attendance, KPI, recruitment, etc.)
    - Each module imports shared utilities from `shared.ts`
    - Preserve every exported function name, parameter signature, and return type exactly
    - _Requirements: 8.1, 8.4_

  - [x] 11.3 Create `frontend/src/lib/api/index.ts` barrel export; replace `api.ts` with re-export barrel
    - `api/index.ts`: re-export all API functions and types from domain modules
    - Replace `frontend/src/lib/api.ts` with a re-export barrel: `export * from "./api/index"`
    - This preserves existing import paths (`import { apiLogin } from "../lib/api"`)
    - _Requirements: 8.3, 8.4_

- [x] 12. Frontend TypeScript type fixes
  - [x] 12.1 Add new interfaces to `frontend/src/types.ts`
    - Add: `CreateEmployeePayload`, `UpdateEmployeePayload`, `KpiRecord`, `UpdateKpiPayload`, `KpiTemplate`, `KpiDynamicEvaluation`, `KpiDynamicResponse`, `IncidentDetail`, `EmployeeReportResponse`, `UpdateCandidatePayload`
    - Follow existing `types.ts` pattern of exported `interface` declarations
    - Organize by domain: employee management, KPI, reports, recruitment
    - _Requirements: 7.9_

  - [x] 12.2 Replace `any` types in API functions with proper interfaces
    - `apiHrdCreateEmployee`: use `CreateEmployeePayload` for payload parameter
    - `apiHrdUpdateEmployee`: use `UpdateEmployeePayload` for payload parameter
    - `apiHrdUpdateKpi`: use `UpdateKpiPayload` for payload parameter
    - `apiHrdUpdateCandidate`: use `UpdateCandidatePayload` for payload parameter
    - `apiHrdGetKpi`: return `KpiRecord[]` instead of `any[]`
    - `apiHrdGetKpiTemplates`, `apiHrdCreateKpiTemplate`, `apiHrdGetKpiDynamic`, `apiHrdSaveKpiDynamic`: use `KpiTemplate`, `KpiDynamicEvaluation`, `KpiDynamicResponse` interfaces
    - `apiHrdGetEmployeeReport`: type `incidentDetails` array with `IncidentDetail` interface
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [x] 13. Frontend store cleanup and constants extraction
  - [x] 13.1 Remove unused `id` import and commented-out `fetchAllUserData` block from `store.ts`
    - Remove unused `id` import from `date-fns/locale`
    - Remove commented-out `fetchAllUserData` function block (dead code)
    - _Requirements: 4.4, 11.3_

  - [x] 13.2 Type response variables and fix `submitRequest` in `store.ts`
    - Replace `any` casts in `fetchAllUserData` and `fetchHrdData` with proper API response interfaces
    - Refactor `submitRequest` to use `requestFormData` helper from `api/shared.ts` instead of calling `fetch` directly
    - Preserve all exported store state shape, action signatures, and persistence behavior
    - _Requirements: 7.8, 11.1, 11.2, 11.4_

  - [x] 13.3 Extract magic numbers in `image.ts` into named constants
    - Define `IMAGE_MAX_WIDTH_PX` (800) and `IMAGE_COMPRESSION_QUALITY` (0.7) as module-level constants
    - Update `compressImageFile` to use these constants as default parameter values
    - _Requirements: 13.8, 13.9, 13.10_

- [x] 14. Frontend TSDoc documentation
  - [x] 14.1 Add TSDoc comments to all exported frontend functions
    - Add `@param` tags for each parameter and `@returns` tag for return value
    - Cover all exported functions in `api/` modules, `store.ts`, `image.ts`, `geo.ts`, `fcm.ts`, `utils.ts`, `offlineQueue.ts`
    - Documentation must not change runtime behavior or introduce new dependencies
    - _Requirements: 14.3, 14.8_

- [x] 15. Frontend ESLint and Prettier setup
  - [x] 15.1 Create `frontend/eslint.config.js` (flat config) with React hooks rules and TypeScript support
    - Use `@eslint/js` recommended, `typescript-eslint` recommended configs
    - Include `eslint-plugin-react-hooks` with recommended rules
    - Set `@typescript-eslint/no-explicit-any` and `@typescript-eslint/no-unused-vars` to `"warn"`
    - Ignore `dist/` and `node_modules/`
    - _Requirements: 15.2, 15.6_

  - [x] 15.2 Create `frontend/.prettierrc`, `frontend/.eslintignore`, and `frontend/.prettierignore`
    - `.prettierrc`: 2-space indent, double quotes, semicolons, printWidth 100, trailingComma "es5"
    - `.eslintignore` and `.prettierignore`: exclude `node_modules/`, `dist/`, `build/`, `*.min.js`
    - _Requirements: 15.3, 15.7, 15.8_

  - [x] 15.3 Add ESLint, Prettier, and React/TypeScript ESLint plugins to frontend devDependencies; add `lint` and `format` scripts
    - Add devDependencies: `eslint`, `prettier`, `typescript-eslint`, `eslint-plugin-react-hooks`
    - Add scripts: `"lint": "eslint ."`, `"format": "prettier --write \"src/**/*.{js,ts,tsx}\""`
    - _Requirements: 15.5, 15.9_

- [x] 16. Checkpoint - Frontend complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 17. Final verification
  - [x] 17.1 Run TypeScript compilation check on frontend
    - Run `npx tsc --noEmit` in frontend directory to verify no TypeScript errors
    - _Requirements: 7.9, 12.2_

  - [x] 17.2 Run ESLint on both backend and frontend projects
    - Run `npm run lint` in both `backend/` and `frontend/` directories
    - Verify no blocking errors (warnings are acceptable for existing style issues)
    - _Requirements: 15.1, 15.2, 15.6_

  - [x] 17.3 Verify no behavioral changes - all API endpoints respond identically
    - Verify all existing API endpoints respond with the same HTTP status codes and response body shapes as before cleanup
    - Verify authentication flow (login, session hydration, protected routes) works identically
    - Verify no new runtime errors introduced by refactoring
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 18. Final checkpoint - All complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties using fast-check (Properties 1-4 from design)
- Unit tests and smoke tests validate specific examples, structural changes, and configuration
- Integration tests verify behavioral preservation across before/after comparison
- The design uses JavaScript for backend and TypeScript for frontend (not pseudocode), so implementation language is already determined
- Backend test setup (Vitest + fast-check) is included in Task 1 as a prerequisite for property tests
- All refactoring must preserve zero behavioral changes — no new features, no API changes
- No new production dependencies; only devDependencies for linting/formatting/testing tools are allowed

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.5"] },
    { "id": 1, "tasks": ["1.3", "1.4"] },
    { "id": 2, "tasks": ["2.1", "2.2", "1.6", "1.7"] },
    { "id": 3, "tasks": ["3.1", "3.3"] },
    { "id": 4, "tasks": ["3.2", "3.4", "5.1", "5.2"] },
    { "id": 5, "tasks": ["5.3", "6.1", "6.2"] },
    { "id": 6, "tasks": ["7.1"] },
    { "id": 7, "tasks": ["7.2", "7.3"] },
    { "id": 8, "tasks": ["8.1", "8.2", "8.3"] },
    { "id": 9, "tasks": ["9.1", "9.2", "9.3", "11.1"] },
    { "id": 10, "tasks": ["11.2"] },
    { "id": 11, "tasks": ["11.3", "12.1", "13.1", "13.3"] },
    { "id": 12, "tasks": ["12.2", "13.2"] },
    { "id": 13, "tasks": ["14.1", "15.1", "15.2", "15.3"] },
    { "id": 14, "tasks": ["17.1", "17.2", "17.3"] }
  ]
}
```
