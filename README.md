# Intel Platform

Advanced Intelligence Management and Collection Platform — a full-stack modular application for managing intelligence operations, personnel, and data across multiple disciplines.

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS, Zustand, React Router v6, Axios |
| **Backend** | Node.js, Express, TypeScript, Knex.js, Socket.IO, JWT + bcryptjs + TOTP 2FA |
| **Database** | PostgreSQL 15 |
| **Real-time** | Socket.IO (WebSocket) |
| **Validation** | Zod |
| **Infrastructure** | Docker, Docker Compose, multi-stage builds |

## Quick Start

### Prerequisites
- Node.js 22+
- PostgreSQL 15+ (or use Docker)
- npm

### Development
```bash
# Install all dependencies
npm run install:all

# Start PostgreSQL (if using Docker)
docker compose up -d postgres

# Run both server + client in dev mode
npm run dev

# Or run separately
npm run dev:server   # Server on port 4000
npm run dev:client   # Client on port 5173 (proxies API to 4000)
```

### Production (Docker)
```bash
docker compose up -d --build
```

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | Server port |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USER` | `intel_admin` | Database user |
| `DB_PASSWORD` | `intel_secret_dev` | Database password |
| `DB_NAME` | `intel_platform` | Database name |
| `JWT_ACCESS_SECRET` | `dev-access-secret` | JWT access token secret |
| `JWT_REFRESH_SECRET` | `dev-refresh-secret` | JWT refresh token secret |
| `JWT_ACCESS_EXPIRES` | `15m` | Access token expiry |
| `JWT_REFRESH_EXPIRES` | `7d` | Refresh token expiry |
| `CORS_ORIGIN` | `*` | CORS allowed origin |
| `UPLOAD_DIR` | `./uploads` | File upload directory |
| `MAX_FILE_SIZE` | `52428800` (50MB) | Max upload size |
| `NODE_ENV` | `development` | Environment mode |
| `MAINTENANCE_MODE` | `false` | Maintenance mode toggle |
| `DEPLOY_SALT` | `default-salt-...` | JWT deploy salt |
| `RUN_SEEDS` | `false` | Auto-seed demo data |

## Scripts

### Root
| Script | Description |
|---|---|
| `npm run dev` | Start server + client concurrently |
| `npm run build` | Build server (tsc) + client (vite) |
| `npm run prod` | Build then start production |
| `npm run db:migrate` | Run database migrations |
| `npm run db:rollback` | Rollback migrations |
| `npm run db:seed` | Seed demo data |
| `npm run db:refresh` | Rollback + migrate + seed |
| `npm run lint` | TypeScript check (server + client) |

### Server (`server/`)
| Script | Description |
|---|---|
| `npm run dev` | Start with hot reload (`tsx watch`) |
| `npm run build` | Compile TypeScript |
| `npm run start` | Start production server |
| `npm run db:migrate` | Run migrations |
| `npm run lint` | TypeScript check |

### Client (`client/`)
| Script | Description |
|---|---|
| `npm run dev` | Vite dev server (port 5173) |
| `npm run build` | Production build |
| `npm run lint` | TypeScript check |

## Architecture

### Module System
The platform uses a **plugin-based modular architecture**. Each module contains:
- `index.ts` — manifest (name, version, category, permissions, API prefix, nav items)
- `router.ts` — Express routes (CRUD, search, file uploads)
- `migrations/` — Database schema migrations
- Client counterpart in `client/src/modules/<name>/` with pages, store, and API client

### Module Categories

| Category | Modules |
|---|---|
| **CORE INTEL** | Sources, Reports, Cases, Evidence, Threats, OSINT |
| **INT Disciplines** | SIGINT, GEOINT, FININT, CI, Biometrics |
| **Operations** | Missions, Targeting, Tasking, Collection Management |
| **Personnel** | Directory (Personnel), Org Chart, Training, Watch Center |
| **Dissemination** | Briefings, Liaison, Messaging |
| **Oversight** | Legal, Budget, Archive |
| **Foundation** | Auth, Admin, Dashboard, Search, Notifications |

### API Endpoints

| Module | API Prefix | Key Features |
|---|---|---|
| `admin` | `/api/admin` | User/role CRUD, audit logs, system health, **Data Manager** (full schema + data CRUD) |
| `analysis` | `/api/analysis` | Entity relationships, link analysis |
| `archive` | `/api/archive` | Archive records, declassification |
| `auth` | `/api/auth` | Login, register, 2FA, refresh tokens |
| `biometrics` | `/api/biometrics` | Biometric records, watchlists, encounters |
| `briefings` | `/api/briefings` | Intelligence briefings, distributions |
| `budget` | `/api/budget` | Program budgets, contracts |
| `cases` | `/api/cases` | Case management, members, sub-cases |
| `ci` | `/api/ci` | Counter-intelligence investigations |
| `collection-mgmt` | `/api/collection` | Collection requirements, assets, PIRs |
| `dashboard` | `/api/dashboard` | Dashboard widgets and metrics |
| `evidence` | `/api/evidence` | Evidence records, file uploads, chain of custody |
| `fint` | `/api/fint` | Financial intelligence entities and transactions |
| `geoint` | `/api/geoint` | Geospatial features and annotations |
| `legal` | `/api/legal` | Legal reviews, compliance checks |
| `liaison` | `/api/liaison` | External partners, MOUs, contact logs |
| `messaging` | `/api/messaging` | Secure messaging channels |
| `missions` | `/api/missions` | Mission plans, briefs, debriefs |
| `notifications` | `/api/notifications` | Real-time notification delivery |
| `org-chart` | `/api/org-chart` | Organizational units, personnel assignments |
| `osint` | `/api/osint` | OSINT collection tasks and items |
| `personal-management` | `/api/personnel` | Personnel records, clearances, skills |
| `reports` | `/api/reports` | Intelligence reports, versions, approval |
| `search` | `/api/search` | Cross-module global search |
| `sigint` | `/api/sigint` | Signals intelligence intercepts and emitters |
| `sources` | `/api/sources` | Intelligence sources, reliability matrix |
| `targeting` | `/api/targeting` | Target packages and nominations |
| `tasking` | `/api/tasking` | Tasking assignments and workflows |
| `threats` | `/api/threats` | Threat actors and indicators |
| `training` | `/api/training` | Courses, enrollments, after-action reports |
| `watch-center` | `/api/watch-center` | SITREPs, watch logs, shift schedules |

## Admin Features

### Data Manager (`/admin/data`)
Full administrative control over all database tables:
- **Table Browser** — Select any table from 70+ available tables
- **Schema Management** — Add, edit, or drop columns on any table with type selection
- **Data CRUD** — Create, read, update, delete any record across all modules
- **Schema View** — See column types, nullability, and defaults at a glance
- **Dynamic Tables** — All module data tables automatically reflect schema changes

### Other Admin Pages
- **Users** — Manage user accounts and roles
- **Audit Logs** — View system audit trail
- **System Health** — Monitor server status, uptime, memory
- **Bulk Import** — CSV import for bulk data
- **System Logs** — Live console log viewer

## Key Features

- **Modular Plugin Architecture** — All modules dynamically loaded at startup
- **JWT Authentication** with refresh tokens and TOTP two-factor auth
- **RBAC** — Role-based access control with fine-grained module permissions
- **API Key Authentication** — For external/automated access
- **Real-time Notifications** — Socket.IO with event bus integration
- **File Uploads** — Multer-based with configurable size limits
- **Global Search** — Cross-module search capability
- **Database Auto-migration** — Tables created automatically on server startup
- **Docker Production-Ready** — Multi-stage builds with health checks
- **Maintenance Mode** — Togglable system-wide maintenance mode
- **SPA Fallback** — Production Express server serves React SPA

## Default Login

| Role | Email | Password |
|---|---|---|
| Admin | `admin@intel.local` | `admin123!` (configurable via `ADMIN_PASSWORD` env var) |

## License

Private — All rights reserved.
