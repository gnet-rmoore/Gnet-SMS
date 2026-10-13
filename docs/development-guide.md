# Development & Operations Guide

This document contains commands, setup recipes, and build processes used to maintain and run the School ERP Platform.

---

## 💻 Local Development Setup

### 1. Prerequisites
Ensure you have the following installed locally:
- **Node.js**: Version 18+ (LTS recommended)
- **npm** or **Yarn**

### 2. Environment Variables
Copy `.env.example` to `.env` and fill out any secrets:
```bash
cp .env.example .env
```

Ensure `DATABASE_URL` is configured correctly for your development database provider (SQLite/PostgreSQL).

### 3. Install Dependencies
Run npm install to populate the `node_modules` directory:
```bash
npm install
```

---

## 🗄️ Database Synchronization & Seeding

The platform utilizes **Prisma** as the Object-Relational Mapping (ORM) library. Use the following commands to initialize and populate the database during development:

### Synchronize Schema
Pushes your schema changes directly to the database without creating a migration file (ideal for early prototype development):
```bash
npx prisma db push
```

### Run DB Seeds
Populates the database with default institutions, admin users, subjects, classroom lists, sample exams, grade scales, and simulated grading records:
```bash
npx prisma db seed
```

### Prisma Studio
Open an interactive browser-based dashboard to view and edit database rows manually:
```bash
npx prisma studio
```

---

## 🛠️ Code Validation & Verification

Always validate and verify the code before pushing to production or initiating pull requests.

### Linting
Validates code for syntax errors, TypeScript compilation problems, or style warnings:
```bash
npm run lint
```

### Building the Application
Compiles the static frontend assets and packages the production-ready full-stack server:
```bash
npm run build
```

---

## 🚀 Production Deployment & Process

When deploying to production hosts (like Cloud Run or standard VPS), the build and start configuration inside `package.json` performs the following roles:

### Build Output Compilation
The build script performs a two-step compile:
```bash
vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs
```
1. **`vite build`**: Packages and minifies the React application into the `/dist` directory.
2. **`esbuild server.ts ...`**: Compiles the backend TypeScript entry point into a standalone, optimized CommonJS file (`dist/server.cjs`). This prevents module-resolution failures at runtime.

### Start Production Server
Starts the compiled backend server which handles API routing, database sessions, and serves frontend static assets:
```bash
npm run start
```
By default, the server binds to port **`3000`** and host **`0.0.0.0`** for compatibility with cloud routers.
