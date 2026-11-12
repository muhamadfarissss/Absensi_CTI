# SmartWork Backend API

Express.js + MySQL backend for the SmartWork attendance PWA. Provides JWT authentication, attendance check-in/check-out with geofencing, HRD management endpoints, leave/request approvals, email notifications, and Excel report generation.

## Prerequisites

- **Node.js** 18 or higher
- **MySQL** 5.7 or higher

## Installation

```bash
npm install
```

## Environment Setup

Copy the example env file and configure the values for your environment:

```bash
cp .env.example .env
```

Edit `.env` and set the required variables:

| Variable              | Description                                           | Default                  |
| --------------------- | ----------------------------------------------------- | ------------------------ |
| `PORT`                | Port the Express server listens on                    | `4000`                   |
| `DB_HOST`             | MySQL host                                            | `127.0.0.1`              |
| `DB_PORT`             | MySQL port                                            | `3306`                   |
| `DB_USER`             | MySQL username                                        | `root`                   |
| `DB_PASSWORD`         | MySQL password                                        | _(empty)_                |
| `DB_NAME`             | MySQL database name                                   | `absensi_cti3`           |
| `JWT_SECRET`          | Secret key for signing JWT tokens (use a long random hex string) | _(required)_   |
| `JWT_EXPIRES_IN`      | JWT token expiry                                       | `7d`                     |
| `MAX_ACCURACY_METERS` | GPS accuracy threshold in meters                       | `75`                     |
| `ENABLE_GEOFENCING`   | Enable/disable server-side geofence validation         | `false`                  |
| `EMAIL_USER`           | Gmail account for nodemailer                          | _(required)_             |
| `EMAIL_PASS`          | Gmail app password for nodemailer                     | _(required)_             |
| `APP_TIMEZONE`        | Timezone for cron job scheduling                      | `Asia/Jakarta`           |
| `CORS_ORIGIN`         | Allowed CORS origins (`*` or comma-separated URLs)    | `*`                      |
| `UPLOADS_DIR`         | Directory for uploaded files (relative to project root) | `uploads`              |

Generate a strong `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Database Setup

Create the MySQL database:

```sql
CREATE DATABASE absensi_cti3;
```

Initialize the schema by running the setup script:

```bash
npm run db:setup
```

This executes `schema.sql` against the configured database.

## Running

Development (auto-restart on file changes):

```bash
npm run dev
```

Production:

```bash
npm start
```

The server binds to `0.0.0.0` on the configured `PORT` so it is accessible from outside the host machine.

## API Documentation

The OpenAPI specification for all endpoints, request/response schemas, and status codes is available in [`api-contract_smartwork.yaml`](api-contract_smartwork.yaml).

A health check endpoint is available at `GET /api/health` which returns `{ status: "ok" }`.
