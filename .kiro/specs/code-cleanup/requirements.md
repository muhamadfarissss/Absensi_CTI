# Requirements Document

## Introduction

This specification defines requirements for a comprehensive code cleanup pass across both the backend (`backend/`) and frontend (`frontend/`) projects of the PWA Absen CTI application. The goal is to improve code quality, maintainability, consistency, and type safety without changing any existing functionality or API behavior. This is a pure refactoring task — no new features are added, and all existing endpoints, UI pages, and data flows must continue to work identically after cleanup.

The cleanup addresses: dead code removal, large file splitting, duplicate function elimination, redundant middleware removal, import cleanup, consistent error handling patterns, TypeScript type safety improvements, consistent commenting style, extraction of magic numbers into named constants, JSDoc/TSDoc documentation coverage, ESLint and Prettier tooling setup, standardized API response formats, and a centralized input validation layer.

## Glossary

- **Backend**: The Express.js + MySQL API server located in `backend/`
- **Frontend**: The React PWA + Vite + TypeScript application located in `frontend/`
- **HRD Routes**: The monolithic `backend/src/routes/hrd.routes.js` file containing all HRD/admin API endpoints (~2151 lines)
- **Dead Code**: Commented-out code blocks or unused imports/variables/functions that serve no runtime purpose
- **Redundant Middleware**: Auth middleware applied more than once to the same route path (e.g., both at mount time in `index.js` and inside the route file)
- **DTO Function**: A data transfer object function that transforms raw database rows into API response objects (e.g., `toUserDTO`, `toRecordDTO`, `toRequestDTO`)
- **signToken**: A JWT signing helper in `backend/src/middleware/auth.js` that uses `{ sub: userId }` payload, inconsistent with the `{ id, role }` payload used by all login routes
- **formatISO**: A date formatting utility that converts a Date to a `YYYY-MM-DD` string; currently duplicated in `report.service.js`
- **Any Type**: The TypeScript `any` keyword used in frontend API function signatures, which bypasses compile-time type checking
- **Magic Number**: A hardcoded numeric or string literal embedded directly in source code logic rather than defined as a named constant (e.g., `20` for upload MB limit, `75` for GPS accuracy threshold, `200` for default radius)
- **JSDoc**: A documentation comment format for JavaScript using `/** ... */` blocks with `@param`, `@returns`, `@throws` tags
- **TSDoc**: The TypeScript equivalent of JSDoc, including type annotations in documentation comments
- **ESLint**: A static code analysis tool for identifying problematic patterns in JavaScript and TypeScript code
- **Prettier**: An opinionated code formatter that enforces a consistent style across the codebase
- **Validation Middleware**: An Express middleware function that validates request body, query, or params before the route handler executes, returning a 400 response with field-level error messages if validation fails

## Requirements

### Requirement 1: Remove Dead Code and Commented-Out Blocks

**User Story:** As a developer, I want all dead code and commented-out code blocks removed, so that the codebase contains only active, executable code that is easier to read and maintain.

#### Acceptance Criteria

1. WHEN the `auth.routes.js` file is reviewed, THE Backend SHALL have the old commented-out register handler block removed entirely
2. WHEN any backend or frontend source file is reviewed, THE Codebase SHALL contain zero commented-out code blocks exceeding 3 consecutive lines
3. WHEN any backend or frontend source file is reviewed, THE Codebase SHALL contain no commented-out executable code that duplicates or overlaps with an active implementation of the same logic

### Requirement 2: Split the Monolithic HRD Routes File

**User Story:** As a developer, I want the `hrd.routes.js` file split into focused, domain-specific modules, so that each file is manageable, easier to navigate, and follows single-responsibility principles.

#### Acceptance Criteria

1. WHEN the HRD routes are refactored, THE Backend SHALL split `hrd.routes.js` into separate route files organized by domain, with each file containing only the routes for one domain area
2. THE split route files SHALL cover at minimum the following domains: admin registration, hospitals CRUD, departments CRUD, positions CRUD, dashboard, attendance/reports, employees CRUD, leaves/approvals, KPI (including dynamic KPI), recruitment, offices CRUD, and HRD notifications
3. WHEN the HRD routes are split, THE Backend SHALL create an `hrd.routes.js` index file (or equivalent) that imports and composes all sub-route files into a single router exported as the default, preserving the same mounting point in `index.js`
4. WHEN any split HRD route file is reviewed, THE file SHALL contain a header comment identifying the domain it covers
5. WHILE the HRD routes are split, THE Backend SHALL preserve every existing API endpoint path, HTTP method, request body shape, and response body shape exactly as before the split

### Requirement 3: Remove Redundant Middleware Usage

**User Story:** As a developer, I want authentication middleware applied exactly once per route group, so that there is no duplicated auth checking that adds confusion and unnecessary overhead.

#### Acceptance Criteria

1. WHEN a route group is mounted with `requireAuth` in `index.js`, THE corresponding route file SHALL NOT also call `router.use(requireAuth)` at the file level for that same group
2. WHEN the `attendance.routes.js` file is refactored, THE `/locations` route SHALL have its route-level `requireAuth` removed if auth is already applied at the router or mount level
3. WHILE route files are refactored for redundant middleware, THE Backend SHALL preserve the requirement that all endpoints that were previously protected remain protected after cleanup
4. WHEN the `hrd.routes.js` file is split, THE `requireAdmin` middleware SHALL be applied centrally at the shared mount point in the HRD index file, so that all split sub-routers inherit protection automatically

### Requirement 4: Remove Unused Imports and Variables

**User Story:** As a developer, I want all unused imports and variables removed, so that the code compiles cleanly without warnings and has no dead references.

#### Acceptance Criteria

1. WHEN the backend source files are reviewed, THE Backend SHALL have the `signToken` import removed from `auth.routes.js` if it is not used in that file
2. WHEN the backend source files are reviewed, THE Backend SHALL have the `request` import from `"https"` removed from `hrd.routes.js` (or its split successors) if it is not used
3. WHEN the backend source files are reviewed, THE `dotenv` import and `dotenv.config()` call in `db.js` SHALL be removed, since `index.js` already loads environment variables via `import "dotenv/config"` before `db.js` is required
4. WHEN the frontend source files are reviewed, THE Frontend SHALL have the unused `id` import from `"date-fns/locale"` removed from `store.ts`
5. WHEN any backend or frontend source file is reviewed, THE file SHALL contain no imports that are not referenced elsewhere in the same file

### Requirement 5: Fix JWT Payload Inconsistency

**User Story:** As a developer, I want JWT token signing and verification to use a consistent payload structure, so that authentication does not break due to mismatched field names.

#### Acceptance Criteria

1. WHEN the `signToken` function in `auth.js` is reviewed, THE function SHALL use a payload structure consistent with what `requireAuth` expects (i.e., `id` and `role` fields), or be removed if no code calls it
2. WHEN the `requireAuth` middleware reads the JWT payload, THE middleware SHALL consistently read the same field names that all token-signing locations set
3. WHILE the JWT payload structure is fixed, THE Backend SHALL preserve the existing token expiration times for employee login (7 days) and admin login (12 hours)

### Requirement 6: Remove Duplicate Functions

**User Story:** As a developer, I want duplicate function definitions eliminated, so that there is a single source of truth for each utility function.

#### Acceptance Criteria

1. WHEN `report.service.js` is reviewed, THE file SHALL contain exactly one definition of `formatISO`, defined at module level and used by both `hitungPeriode` and `ambilData`
2. WHEN the backend `utils/geo.js` is reviewed, THE file SHALL have the `haversineDistanceMeters` and `calculateDistance` functions consolidated into a single shared implementation, with all call sites updated to use the unified function
3. WHEN any utility function is consolidated, THE Backend SHALL preserve the identical return value and behavior for all existing call sites

### Requirement 7: Fix Frontend TypeScript Type Safety

**User Story:** As a developer, I want all `any` types in the frontend API layer replaced with proper TypeScript types, so that the compiler catches type errors at build time.

#### Acceptance Criteria

1. WHEN `api.ts` is reviewed, THE `apiHrdCreateEmployee` function SHALL have its `payload` parameter typed with an explicit interface instead of `any`
2. WHEN `api.ts` is reviewed, THE `apiHrdUpdateEmployee` function SHALL have its `payload` parameter typed with an explicit interface instead of `any`
3. WHEN `api.ts` is reviewed, THE `apiHrdUpdateKpi` function SHALL have its `payload` parameter typed with an explicit interface instead of `any`
4. WHEN `api.ts` is reviewed, THE `apiHrdUpdateCandidate` function SHALL have its `payload` parameter typed with an explicit interface instead of `any`
5. WHEN `api.ts` is reviewed, THE `apiHrdGetKpi` function SHALL return a typed array instead of `any[]`
6. WHEN `api.ts` is reviewed, THE `apiHrdGetKpiTemplates`, `apiHrdCreateKpiTemplate`, `apiHrdGetKpiDynamic`, and `apiHrdSaveKpiDynamic` functions SHALL use explicit interfaces for template and evaluation types instead of `any`
7. WHEN `api.ts` is reviewed, THE `apiHrdGetEmployeeReport` function SHALL have its `incidentDetails` array typed with an explicit interface instead of `any[]`
8. WHEN `store.ts` is reviewed, THE fetch functions (`fetchAllUserData`, `fetchHrdData`) SHALL have their intermediate response variables typed with the proper API response interfaces instead of `any`
9. WHEN any new TypeScript interface is introduced to replace `any`, THE interface SHALL be defined in `types.ts` and exported for reuse across the frontend

### Requirement 8: Improve API File Organization

**User Story:** As a developer, I want the large `api.ts` file split into domain-focused modules, so that related API functions are grouped together and easier to find.

#### Acceptance Criteria

1. WHEN `api.ts` is refactored, THE Frontend SHALL split the file into domain-focused modules (e.g., `auth.api.ts`, `attendance.api.ts`, `requests.api.ts`, `hrd.api.ts`, `notifications.api.ts`, `profile.api.ts`)
2. WHEN `api.ts` is split, THE Frontend SHALL preserve a shared `request` helper function and `ApiError` class accessible to all split API modules
3. WHEN `api.ts` is split, THE Frontend SHALL create a barrel `index.ts` in the `lib` directory that re-exports all API functions, so that existing import paths in pages and components continue to work without modification
4. WHILE `api.ts` is split, THE Frontend SHALL preserve every exported function name, parameter signature (after type fixes), and return type exactly as before

### Requirement 9: Establish Consistent Error Handling Pattern

**User Story:** As a developer, I want a consistent error handling pattern across all backend route handlers, so that error responses are predictable and debugging is easier.

#### Acceptance Criteria

1. WHEN any backend route handler is reviewed, THE handler SHALL wrap its main logic in a `try/catch` block that catches errors and returns a JSON error response with an appropriate HTTP status code
2. WHEN a backend route handler catches an expected error (e.g., duplicate entry, not found), THE handler SHALL return the specific HTTP status code for that error (e.g., 409 for `ER_DUP_ENTRY`, 404 for not found)
3. WHEN a backend route handler catches an unexpected error, THE handler SHALL log the error to `console.error` and return a 500 status with a generic message
4. WHEN the backend error handling is standardized, THE Backend SHALL preserve the existing error message text and HTTP status codes for all endpoints, so that frontend error handling behavior remains unchanged

### Requirement 10: Standardize Commenting Style

**User Story:** As a developer, I want consistent commenting style across the codebase, so that comments are easy to understand and maintain.

#### Acceptance Criteria

1. WHEN any backend or frontend source file is reviewed, THE inline code comments SHALL use a single language consistently within each file (Indonesian, since the existing codebase predominantly uses Indonesian comments)
2. WHEN any backend or frontend source file is reviewed, THE function-level documentation comments SHALL follow a consistent format (e.g., JSDoc-style or block comments) within each project
3. WHEN any backend or frontend source file is reviewed, THE section separator comments (e.g., `// =====...====`) SHALL use a consistent character length and style within each project

### Requirement 11: Clean Up Frontend Store Type Usage

**User Story:** As a developer, I want the Zustand store cleaned up of type hacks and unnecessary defensive casting, so that the store relies on proper TypeScript types throughout.

#### Acceptance Criteria

1. WHEN `store.ts` is reviewed, THE `fetchAllUserData` and `fetchHrdData` functions SHALL use typed API response objects instead of casting intermediate variables to `any`
2. WHEN `store.ts` is reviewed, THE `submitRequest` function SHALL use the shared `request` helper from `api.ts` instead of calling `fetch` directly, so that error handling is consistent with other API calls
3. WHEN `store.ts` is reviewed, THE commented-out `fetchAllUserData` function block SHALL be removed as dead code
4. WHILE `store.ts` is refactored, THE Frontend SHALL preserve all exported store state shape, action signatures, and persistence behavior exactly as before

### Requirement 12: Ensure No Behavioral Changes After Cleanup

**User Story:** As a developer, I want the cleanup to be a pure refactoring with zero behavioral changes, so that the application works identically before and after the cleanup.

#### Acceptance Criteria

1. WHEN the backend cleanup is complete, THE Backend SHALL have all existing API endpoints responding with the same HTTP status codes and response body shapes as before
2. WHEN the frontend cleanup is complete, THE Frontend SHALL compile without TypeScript errors using the existing build configuration
3. WHEN the cleanup is complete, THE application SHALL have no new runtime errors introduced by the refactoring
4. WHEN the cleanup is complete, THE existing authentication flow (login, session hydration, protected routes) SHALL continue to work identically
5. WHEN the HRD routes file is split, THE `requireAdmin` middleware SHALL be applied centrally at the shared mount point in the HRD index file, so that all split sub-routers inherit protection automatically without requiring per-file re-application

### Requirement 13: Extract Constants and Magic Numbers

**User Story:** As a developer, I want all magic numbers and hardcoded values extracted into named constants, so that their meaning is self-documenting and they can be changed in one place.

#### Acceptance Criteria

1. WHEN the backend source files are reviewed, THE Backend SHALL extract hardcoded numeric and string literals used in application logic into named constants defined at the module level or in a shared constants file
2. WHEN `index.js` is reviewed, THE `20mb` JSON body size limit SHALL be extracted into a named constant (e.g., `BODY_LIMIT_MB`) or read from an environment variable with a default value
3. WHEN `hrd.routes.js` (or its split successors) is reviewed, THE default hospital radius value of `200` meters SHALL be extracted into a named constant
4. WHEN `hrd.routes.js` (or its split successors) is reviewed, THE bcrypt salt rounds value of `10` SHALL be extracted into a named constant
5. WHEN `cron.js` is reviewed, THE cron check interval (`10 * 60 * 1000` milliseconds) and the target check time (`23:50`) SHALL be extracted into named constants
6. WHEN `db.js` is reviewed, THE connection pool limit of `10` SHALL be extracted into a named constant or read from an environment variable with a default value
7. WHEN `middleware/auth.js` is reviewed, THE JWT expiration times (`7d` for employee, `12h` for admin) SHALL be extracted into named constants
8. WHEN the frontend source files are reviewed, THE Frontend SHALL extract hardcoded numeric literals in application logic into named constants (e.g., `800` maxWidth and `0.7` quality in `image.ts`)
9. WHEN a magic number is extracted into a constant, THE constant name SHALL be descriptive of its purpose (e.g., `DEFAULT_HOSPITAL_RADIUS_METERS`, not `RADIUS`)
10. WHEN a magic number is extracted into a constant, THE constant SHALL be defined close to where it is used (module-level) or in a shared constants file if used across multiple files

### Requirement 14: Add JSDoc/TSDoc Documentation

**User Story:** As a developer, I want all exported functions and key internal functions documented with JSDoc or TSDoc comments, so that their purpose, parameters, return values, and thrown errors are clear without reading the implementation.

#### Acceptance Criteria

1. WHEN any backend exported function is reviewed, THE function SHALL have a JSDoc comment block that describes its purpose, includes `@param` tags for each parameter, and includes an `@returns` tag describing the return value
2. WHEN any backend function throws errors as part of its contract (e.g., validation functions), THE JSDoc comment SHALL include an `@throws` tag describing the error condition
3. WHEN any frontend exported function is reviewed, THE function SHALL have a TSDoc comment block that describes its purpose, includes `@param` tags for each parameter, and includes an `@returns` tag describing the return value
4. WHEN DTO functions (e.g., `toUserDTO`, `toRecordDTO`, `toRequestDTO`) are reviewed, THE functions SHALL have JSDoc comments documenting the input row shape and the output object shape
5. WHEN route handler files are reviewed, THE file-level header SHALL include a brief description of the domain the file covers and list the endpoints defined in the file
6. WHEN utility functions in `utils/date.js` and `utils/geo.js` are reviewed, THE functions SHALL have JSDoc comments including parameter descriptions and return value descriptions
7. WHEN middleware functions (`requireAuth`, `requireAdmin`) are reviewed, THE functions SHALL have JSDoc comments describing what they check and when they call `next()` versus when they send an error response
8. WHILE JSDoc/TSDoc documentation is added, THE documentation SHALL not change any runtime behavior or introduce new dependencies

### Requirement 15: Set Up ESLint and Prettier for Both Projects

**User Story:** As a developer, I want ESLint and Prettier configured for both backend and frontend projects, so that code style and quality are enforced consistently and automatically.

#### Acceptance Criteria

1. WHEN the backend project is configured, THE Backend SHALL have an ESLint configuration file (flat config format) with rules appropriate for an Express.js + ES modules project
2. WHEN the frontend project is configured, THE Frontend SHALL have an ESLint configuration file (flat config format) with rules appropriate for a React + TypeScript + Vite project, including React hooks rules
3. WHEN either project is configured, THE project SHALL have a Prettier configuration file that enforces consistent formatting (indentation, quotes, semicolons, line width)
4. WHEN the backend `package.json` is updated, THE Backend SHALL include `eslint` and `prettier` in devDependencies, and add `lint` and `format` scripts to the scripts section
5. WHEN the frontend `package.json` is updated, THE Frontend SHALL include `eslint`, `prettier`, and the appropriate React/TypeScript ESLint plugins in devDependencies, and add `lint` and `format` scripts to the scripts section
6. WHEN the ESLint configuration is created, THE configuration SHALL not produce errors on existing code that would block the build; existing code style issues SHALL be set to warning level initially where fixing them immediately would risk behavioral changes
7. WHEN the Prettier configuration is created, THE configuration SHALL use a line width, indentation, and quote style consistent with the majority of the existing codebase to minimize the diff
8. WHEN ESLint and Prettier are configured, THE Backend and Frontend SHALL each have a `.eslintignore` and `.prettierignore` file that excludes `node_modules/`, build output directories, and generated files
9. WHILE ESLint and Prettier are set up, THE configuration SHALL not introduce any new production/runtime dependencies or change the application's behavior; devDependencies for linting and formatting tools (eslint, prettier, plugins) are expected and allowed

### Requirement 16: Standardize API Response Formats

**User Story:** As a developer, I want all API responses to follow a consistent shape, so that the frontend can parse responses predictably and error handling is uniform.

#### Acceptance Criteria

1. WHEN a successful backend API response that returns data is reviewed, THE response SHALL follow the existing convention of returning the data under a named key (e.g., `{ user: ... }`, `{ records: [...] }`, `{ hospitals: [...] }`), preserving the current key names
2. WHEN a successful backend API response that confirms an action (e.g., create, update, delete) is reviewed, THE response SHALL include a `message` field with a human-readable confirmation string, preserving the current message text
3. WHEN a backend error response is returned, THE response SHALL include a `message` field with a human-readable error description, preserving the current error message text and HTTP status codes
4. WHEN a backend route handler returns a created resource, THE response SHALL include the created resource under its appropriate key name (e.g., `{ message: "...", hospital: {...} }`), preserving the current response shape
5. WHILE response formats are standardized, THE Backend SHALL NOT change any existing response body key names, field names, or nesting structure, so that frontend parsing remains unchanged
6. WHEN the backend response patterns are documented, THE Backend SHALL define the response shape conventions (success and error) in a shared module or documentation comment, so that new endpoints follow the same pattern

### Requirement 17: Add Input Validation Layer

**User Story:** As a developer, I want a centralized input validation layer for backend route handlers, so that validation logic is consistent, reusable, and not duplicated inline in each handler.

#### Acceptance Criteria

1. WHEN the backend validation layer is implemented, THE Backend SHALL create a reusable validation utility or middleware that accepts a schema definition and validates `req.body`, `req.query`, or `req.params` against it
2. WHEN the validation utility detects missing required fields, THE utility SHALL return a 400 response with a `message` field listing the missing or invalid fields
3. WHEN the validation utility detects a field with an incorrect type or format, THE utility SHALL return a 400 response with a `message` field describing the expected format
4. WHEN existing route handlers are refactored to use the validation layer, THE handlers SHALL have their inline validation checks (e.g., `if (!name || !email)` blocks) replaced with calls to the validation utility
5. WHEN existing route handlers are refactored to use the validation layer, THE Backend SHALL preserve the exact same validation rules and error messages that the inline checks currently enforce
6. WHEN the validation utility is applied to a route, THE utility SHALL call `next()` to pass control to the route handler only if validation passes, and SHALL short-circuit with a 400 response if validation fails
7. WHILE the validation layer is implemented, THE Backend SHALL NOT add new validation rules that would reject requests currently accepted by the existing inline checks
8. WHEN the validation utility is reviewed, THE utility SHALL be documented with JSDoc describing the schema definition format and how to use it as Express middleware
