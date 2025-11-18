# Phase 1: Initialize Repository - Detailed Guide

## Overview
This guide walks you through setting up your NCAA Volleyball Bracket project from scratch using Cursor and Claude Code.

---

## Decision: Monorepo vs Separate Repos

### Option 1: Monorepo (RECOMMENDED for this project)
**Structure:**
```
ncaa-volleyball-bracket/
├── frontend/          # React + Vite
├── backend/           # Node.js + Express + Prisma
├── package.json       # Root package.json for scripts
└── README.md
```

**Pros:**
- ✅ Easier to manage for solo developer
- ✅ Share types between frontend and backend
- ✅ Single git repository
- ✅ Deploy both parts together
- ✅ Simpler for Cursor/Claude Code to work with

**Cons:**
- ❌ Slightly more complex deployment setup

### Option 2: Separate Repos
**Structure:**
```
ncaa-volleyball-bracket-frontend/
└── (React app)

ncaa-volleyball-bracket-backend/
└── (Node.js API)
```

**Pros:**
- ✅ Complete separation of concerns
- ✅ Independent deployment
- ✅ Simpler CI/CD per repo

**Cons:**
- ❌ More repos to manage
- ❌ Harder to share TypeScript types
- ❌ More context switching

**RECOMMENDATION: Go with Monorepo for easier development**

---

## Step-by-Step: Monorepo Setup

### Step 1: Create Project Directory

```bash
# Create main project folder
mkdir ncaa-volleyball-bracket
cd ncaa-volleyball-bracket

# Initialize git
git init

# Create .gitignore
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.pnp
.pnp.js

# Environment variables
.env
.env.local
.env.*.local

# Build outputs
dist/
build/
*.log

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Database
*.db
*.db-journal

# Prisma
prisma/migrations/
EOF
```

### Step 2: Create Root Package.json

```bash
# Initialize npm
npm init -y
```

Edit the generated `package.json`:

```json
{
  "name": "ncaa-volleyball-bracket",
  "version": "1.0.0",
  "description": "NCAA Women's Volleyball Tournament Bracket System",
  "private": true,
  "workspaces": [
    "frontend",
    "backend"
  ],
  "scripts": {
    "install:all": "npm install && npm install --workspace=frontend && npm install --workspace=backend",
    "dev": "concurrently \"npm run dev --workspace=backend\" \"npm run dev --workspace=frontend\"",
    "dev:frontend": "npm run dev --workspace=frontend",
    "dev:backend": "npm run dev --workspace=backend",
    "build": "npm run build --workspace=frontend && npm run build --workspace=backend",
    "prisma:studio": "npm run prisma:studio --workspace=backend"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

Install the root dependencies:
```bash
npm install
```

### Step 3: Set Up Frontend (React + Vite)

```bash
# Create frontend with Vite
npm create vite@latest frontend -- --template react-ts

# Navigate to frontend
cd frontend

# Install additional dependencies
npm install axios react-router-dom zustand tailwindcss postcss autoprefixer

# Initialize Tailwind
npx tailwindcss init -p
```

**Configure Tailwind** - Edit `frontend/tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

**Update** `frontend/src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Update** `frontend/package.json` scripts:
```json
{
  "scripts": {
    "dev": "vite --port 3000",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview"
  }
}
```

**Create** `frontend/.env.local`:
```env
VITE_API_URL=http://localhost:5000/api
```

Return to root:
```bash
cd ..
```

### Step 4: Set Up Backend (Node.js + Express + Prisma)

```bash
# Create backend directory
mkdir backend
cd backend

# Initialize npm
npm init -y

# Install dependencies
npm install express cors dotenv jsonwebtoken bcryptjs
npm install @prisma/client
npm install -D typescript @types/express @types/cors @types/node @types/jsonwebtoken @types/bcryptjs tsx nodemon prisma

# Initialize TypeScript
npx tsc --init
```

**Update** `backend/package.json`:
```json
{
  "name": "backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "nodemon --exec tsx src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio",
    "prisma:seed": "tsx prisma/seed.ts"
  },
  "dependencies": {
    "@prisma/client": "^5.7.0",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "jsonwebtoken": "^9.0.2"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/node": "^20.10.5",
    "nodemon": "^3.0.2",
    "prisma": "^5.7.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3"
  }
}
```

**Update** `backend/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

**Create** `backend/.env`:
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/volleyball_bracket?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# Server
PORT=5000
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
```

Return to root:
```bash
cd ..
```

### Step 5: Set Up Prisma

```bash
cd backend

# Initialize Prisma
npx prisma init
```

This creates:
- `prisma/schema.prisma`
- `.env` (if it doesn't exist)

**Edit** `backend/prisma/schema.prisma`:
```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id          String       @id @default(uuid())
  email       String       @unique
  displayName String?
  createdAt   DateTime     @default(now())
  
  predictions Prediction[]
  
  @@map("users")
}

model Match {
  id          String    @id @default(uuid())
  round       Int       // 1-6 (Round of 64, 32, 16, 8, 4, Championship)
  matchNumber Int
  team1       String
  team2       String
  winner      String?   // "team1" or "team2" when completed
  completed   Boolean   @default(false)
  matchDate   DateTime
  scrapedAt   DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  sets        Set[]
  predictions Prediction[]
  
  @@map("matches")
}

model Set {
  id          String   @id @default(uuid())
  matchId     String
  setNumber   Int      // 1-5
  team1Score  Int
  team2Score  Int
  createdAt   DateTime @default(now())
  
  match       Match    @relation(fields: [matchId], references: [id], onDelete: Cascade)
  
  @@index([matchId])
  @@map("sets")
}

model Prediction {
  id                 String   @id @default(uuid())
  userId             String
  matchId            String
  predictedWinner    String   // "team1" or "team2"
  predictedTotalSets Int      // 3, 4, or 5
  pointsEarned       Int?     // null until match completes
  createdAt          DateTime @default(now())
  
  user               User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  match              Match    @relation(fields: [matchId], references: [id], onDelete: Cascade)
  
  @@unique([userId, matchId]) // Each user can only predict each match once
  @@index([userId])
  @@index([matchId])
  @@map("predictions")
}
```

Return to root:
```bash
cd ..
```

### Step 6: Create Basic Backend Structure

```bash
cd backend

# Create directory structure
mkdir -p src/routes src/controllers src/middleware src/utils src/types
```

**Create** `backend/src/index.ts`:
```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Routes will be added here
// app.use('/api/auth', authRoutes);
// app.use('/api/matches', matchRoutes);
// app.use('/api/predictions', predictionRoutes);
// app.use('/api/leaderboard', leaderboardRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
```

Return to root:
```bash
cd ..
```

### Step 7: Create Basic Frontend Structure

```bash
cd frontend

# Create directory structure
mkdir -p src/components src/pages src/services src/hooks src/types src/utils
```

**Update** `frontend/src/App.tsx`:
```typescript
import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          NCAA Women's Volleyball Bracket
        </h1>
        <p className="text-xl text-gray-600">
          Coming Soon...
        </p>
      </div>
    </div>
  )
}

export default App
```

Return to root:
```bash
cd ..
```

### Step 8: Create Root README

**Create** `README.md`:
```markdown
# NCAA Women's Volleyball Tournament Bracket

A full-stack application for predicting NCAA Women's Volleyball tournament results with live scoring and leaderboards.

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript + Prisma
- **Database**: PostgreSQL

## Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL (or use Supabase/Neon free tier)
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone <your-repo-url>
cd ncaa-volleyball-bracket
```

2. Install all dependencies
```bash
npm run install:all
```

3. Set up environment variables
- Copy `backend/.env.example` to `backend/.env`
- Copy `frontend/.env.local.example` to `frontend/.env.local`
- Update with your database credentials

4. Set up database
```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
cd ..
```

5. Run development servers
```bash
npm run dev
```

This starts:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## Project Structure

```
ncaa-volleyball-bracket/
├── frontend/          # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── types/
│   └── package.json
├── backend/           # Express backend
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   └── utils/
│   ├── prisma/
│   │   └── schema.prisma
│   └── package.json
└── package.json       # Root package.json
```

## Available Scripts

- `npm run dev` - Run both frontend and backend
- `npm run dev:frontend` - Run only frontend
- `npm run dev:backend` - Run only backend
- `npm run build` - Build both apps
- `npm run prisma:studio` - Open Prisma Studio

## Database Setup

### Option 1: Local PostgreSQL
Install PostgreSQL and create a database:
```bash
createdb volleyball_bracket
```

### Option 2: Supabase (Free Tier)
1. Go to https://supabase.com
2. Create a new project
3. Copy the connection string to `backend/.env`

### Option 3: Neon (Free Tier)
1. Go to https://neon.tech
2. Create a new project
3. Copy the connection string to `backend/.env`

## Next Steps

See `01-initialize-repository-guide.md` for detailed setup instructions.
See `ncaa-volleyball-bracket-implementation-plan.md` for full implementation plan.
```

### Step 9: Initialize Git Repository

```bash
# Make sure you're in the root directory
git add .
git commit -m "Initial project setup with frontend and backend"

# Create GitHub repository (optional but recommended)
# Go to github.com and create a new repository
# Then:
git remote add origin <your-github-repo-url>
git branch -M main
git push -u origin main
```

### Step 10: Verify Everything Works

```bash
# Test that all installations worked
npm run install:all

# Test backend
cd backend
npm run dev
# Should see: "🚀 Server running on http://localhost:5000"
# Open http://localhost:5000/health in browser
# Press Ctrl+C to stop

# Test frontend (in new terminal)
cd frontend
npm run dev
# Should see: "VITE v5.x.x ready in XXX ms"
# Open http://localhost:3000 in browser
# Press Ctrl+C to stop

# Test both together (from root directory)
npm run dev
# Both should start
```

---

## Database Setup (Choose One)

### Option A: Local PostgreSQL Setup

1. **Install PostgreSQL**
   - Mac: `brew install postgresql`
   - Windows: Download from postgresql.org
   - Linux: `sudo apt install postgresql`

2. **Start PostgreSQL**
   ```bash
   # Mac
   brew services start postgresql
   
   # Linux
   sudo systemctl start postgresql
   ```

3. **Create Database**
   ```bash
   psql postgres
   CREATE DATABASE volleyball_bracket;
   \q
   ```

4. **Update .env**
   ```env
   DATABASE_URL="postgresql://localhost:5432/volleyball_bracket"
   ```

### Option B: Supabase Setup (RECOMMENDED - Free & Easy)

1. Go to https://supabase.com
2. Sign up/login
3. Click "New Project"
4. Fill in:
   - Name: volleyball-bracket
   - Database Password: (generate strong password)
   - Region: (closest to you)
5. Wait for project to be created
6. Go to Settings > Database
7. Copy "Connection String" (URI format)
8. Update `backend/.env`:
   ```env
   DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
   ```

### Option C: Neon Setup (Also Free)

1. Go to https://neon.tech
2. Sign up/login
3. Create new project
4. Copy connection string
5. Update `backend/.env`

### Run Migrations

Once database is set up:
```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
```

---

## Troubleshooting

### "Cannot find module" errors
```bash
# Delete all node_modules and reinstall
rm -rf node_modules frontend/node_modules backend/node_modules
npm run install:all
```

### Prisma client not generating
```bash
cd backend
npx prisma generate
```

### Port already in use
```bash
# Kill process on port 3000 or 5000
# Mac/Linux
lsof -ti:3000 | xargs kill -9
lsof -ti:5000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Database connection errors
- Check DATABASE_URL in .env
- Verify database is running
- Check firewall settings
- For Supabase/Neon, verify connection string is correct

---

## What's Next?

After completing this setup, you should have:
- ✅ Git repository initialized
- ✅ Frontend (React + Vite + Tailwind) running
- ✅ Backend (Express + TypeScript) running
- ✅ Prisma connected to database
- ✅ Both apps communicating

**Next Phase**: Phase 2 - Core Bracket Features
- Build the bracket UI
- Create match endpoints
- Implement prediction submission

See the main implementation plan for detailed next steps!
