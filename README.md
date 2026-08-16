# TokTickIT — IT Service Desk

TokTickIT (ตอกติ๊กกิต) is an IT service desk application for Account and Access, Hardware, Software, and Network requests. This project is built as part of CPE 334 — Introduction to Software Engineering in the Age of AI Agents.

## Tech Stack

| Layer      | Technology                          |
| ---------- | ----------------------------------- |
| Frontend   | React + TypeScript + Vite + Bootstrap |
| Backend    | Node.js + Express + TypeScript      |
| Database   | PostgreSQL + Prisma ORM             |
| Testing    | Vitest + Supertest                  |
| Workflow   | Git + GitHub Projects + PR Reviews  |

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- [PostgreSQL](https://www.postgresql.org/) running locally
- [Git](https://git-scm.com/)

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/toktickit.git
cd toktickit
```

### 2. Set up the backend

```bash
cd server
cp .env.example .env        # then edit .env with your DB credentials
npm install
npx prisma migrate dev      # create database tables
npx prisma db seed           # seed initial data
npm run dev                  # starts the API on http://localhost:3000
```

### 3. Set up the frontend

```bash
cd client
npm install
npm run dev                  # starts the UI on http://localhost:5173
```

### 4. Open the app

Navigate to [http://localhost:5173](http://localhost:5173) in your browser.

## Running Tests

```bash
# Backend tests (Supertest)
cd server
npm test

# Frontend tests (Vitest)
cd client
npm test
```

## Project Structure

```
toktickit/
├── client/                  # React + Vite frontend
│   ├── src/                 # Application source code
│   ├── tests/               # Frontend tests (Vitest)
│   └── package.json
├── server/                  # Express backend
│   ├── prisma/              # Schema, migrations, seed
│   ├── src/                 # API source code
│   ├── tests/               # Backend tests (Supertest)
│   └── package.json
├── docs/                    # Documentation
│   └── lab-01/
│       ├── ai_use.md
│       ├── reviewer.md
│       └── tests.md
├── .gitignore
└── README.md
```

## Environment Variables

### Server (`server/.env`)

| Variable       | Description                        | Example                                                              |
| -------------- | ---------------------------------- | -------------------------------------------------------------------- |
| `DATABASE_URL` | PostgreSQL connection string       | `postgresql://toktickit:toktickit@localhost:5432/toktickit?schema=public` |
| `PORT`         | API server port                    | `3000`                                                               |

### Client (`client/.env`)

| Variable       | Description          | Example                    |
| -------------- | -------------------- | -------------------------- |
| `VITE_API_URL` | Backend API base URL | `http://localhost:3000`    |

## Git Workflow

- `main` — stable release branch
- `lab1-staging` — Lab 1 integration branch
- `feature/*` — individual feature branches per Issue

All features are developed on feature branches, merged into `lab1-staging` via Pull Request with peer review, then released to `main`.