# TokTickIT — IT Service Desk

TokTickIT (ตอกติ๊กกิต) is an IT service desk application for Account and Access, Hardware, Software, and Network requests. This project is built as part of CPE 334 — Introduction to Software Engineering in the Age of AI Agents.

## Tech Stack

| Layer      | Technology                          |
| ---------- | ----------------------------------- |
| Frontend   | React + TypeScript + Vite + Bootstrap (Zen Green Design System) |
| Backend    | Node.js + Express + TypeScript + Multer |
| Database   | PostgreSQL + Prisma ORM             |
| Testing    | Vitest + React Testing Library + Supertest + Playwright |
| Workflow   | Git + GitHub Projects + PR Reviews  |

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- [Docker](https://www.docker.com/) / [PostgreSQL](https://www.postgresql.org/) (port 5433 or 5432)
- [Git](https://git-scm.com/)

## Getting Started

### 1. Database Setup (Docker)

```bash
docker compose up -d
```

### 2. Set up the backend

```bash
cd server
cp .env.example .env        # ensure DATABASE_URL matches postgres port
npm install
npx prisma migrate dev      # create/migrate database tables
npx prisma db seed          # seed categories, requesters, and systems
npm run dev                 # starts API on http://localhost:3000
```

### 3. Set up the frontend

```bash
cd client
npm install
npm run dev                 # starts UI on http://localhost:5173
```

### 4. Open the app

Navigate to [http://localhost:5173](http://localhost:5173) in your browser.

## Running Tests

```bash
# Backend unit & integration tests (34 tests passing)
cd server
npm test

# Frontend component tests (22 tests passing)
cd ../client
npm test

# Playwright End-to-End user journey tests
cd ..
npx playwright test e2e/lab-02/
```

## Project Structure

```
toktickit/
├── client/                  # React + Vite frontend (Zen Green System)
│   ├── src/                 # Application source code
│   ├── tests/               # Frontend component tests (Vitest)
│   └── package.json
├── server/                  # Express backend
│   ├── prisma/              # Schema, migrations, seed
│   ├── src/                 # API source code
│   ├── uploads/             # Attachment disk storage (UUID)
│   ├── tests/               # Backend API tests (Supertest)
│   └── package.json
├── e2e/                     # End-to-End test suites
│   └── lab-02/
│       └── requester-ticket-flow.spec.ts
├── docs/                    # Documentation
│   ├── lab-01/              # Lab 1 deliverables
│   └── lab-02/              # Lab 2 Sprint deliverables
│       ├── specification.md # Sprint engineering specification
│       ├── ui-spec.md       # Zen Green UI specification
│       ├── api-spec.md      # REST API contracts
│       ├── tests.md         # Traceability matrix & test plan
│       ├── reviewer.md      # Peer review records (@FramePongrit, @Leviathan-c137)
│       └── ai_use.md        # AI prompt & reflection record
├── playwright.config.ts     # Playwright configuration
├── docker-compose.yml       # PostgreSQL database container
├── .gitignore
└── README.md
```

## Environment Variables

### Server (`server/.env`)

| Variable       | Description                        | Example                                                              |
| -------------- | ---------------------------------- | -------------------------------------------------------------------- |
| `DATABASE_URL` | PostgreSQL connection string       | `postgresql://postgres:postgres@localhost:5433/toktickit?schema=public` |
| `PORT`         | API server port                    | `3000`                                                               |

### Client (`client/.env`)

| Variable       | Description          | Example                    |
| -------------- | -------------------- | -------------------------- |
| `VITE_API_URL` | Backend API base URL | `http://localhost:3000`    |

## Git Workflow

- `main` — stable production release branch
- `lab2-staging` — Lab 2 Sprint integration branch
- `feature/lab2-*` — individual increment feature branches per Issue

All features are developed on dedicated feature branches, merged into `lab2-staging` via Pull Request with peer review and DoD verification, then released into `main` via Release PR.