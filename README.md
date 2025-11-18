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
