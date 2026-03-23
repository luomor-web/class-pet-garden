# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ClassPetGarden is a gamified classroom management system combining point tracking with virtual pet raising. Teachers can manage multiple classes, evaluate students, and students raise pets that level up based on accumulated points.

## Build & Development Commands

```bash
# Install dependencies
npm install

# Development (runs both frontend :3001 and backend :3000)
npm start

# Frontend only (Vite dev server)
npm run dev

# Backend only (Express API)
npm run server

# Production build
npm run build        # Type-checks and builds frontend
npm run preview      # Preview production build

# Run tests
npm test             # Vitest (both frontend & backend)
npm run test:run     # Run once without watch
npm run test:coverage

# Server scripts
npm run stats        # View user/class statistics
```

## Architecture Overview

### Tech Stack
- **Frontend**: Vue 3 + TypeScript + Vite + Tailwind CSS + Pinia + Vue Router
- **Backend**: Node.js + Express + better-sqlite3 (ES Modules)
- **Testing**: Vitest with happy-dom (frontend), supertest (backend)

### Project Structure

```
class-pet-garden/
├── src/                          # Frontend source
│   ├── composables/              # Shared state (singletons)
│   │   ├── useAuth.ts            # Authentication state
│   │   ├── useClasses.ts         # Class management
│   │   ├── useStudents.ts        # Student data (shared across pages)
│   │   ├── useTags.ts            # Tag definitions
│   │   └── useToast.ts           # Toast notifications
│   ├── components/
│   │   ├── layout/               # PageLayout, Header
│   │   ├── modals/               # Class/Student/Evaluation/Pet modals
│   │   └── *.vue                 # Reusable components
│   ├── pages/                    # Route components (Home, Students, Ranking, etc.)
│   ├── data/pets.ts              # Pet definitions & level config
│   ├── router/index.ts           # Vue Router setup
│   └── types/index.ts            # TypeScript interfaces
│
├── server/
│   ├── index.js                  # Express entry point
│   ├── db.js                     # SQLite initialization
│   ├── routes/                   # API endpoints
│   │   ├── auth.js               # Login/register
│   │   ├── classes.js            # Class CRUD
│   │   ├── students.js           # Student CRUD + import
│   │   ├── evaluations.js        # Evaluation records
│   │   ├── rules.js              # Custom rules
│   │   ├── backup.js             # Backup/restore
│   │   └── settings.js           # App settings
│   ├── middleware/               # Auth, ownership checks
│   └── utils/                    # Password hashing, token utils
│
└── public/pets/                  # Pet images by breed/level
```

### Key Patterns

**State Management**: Uses composable singletons instead of Pinia stores. `useStudents.ts` maintains shared student state across pages - updates in one page reflect everywhere.

**Path Alias**: `@/` resolves to `src/` in both Vite and Vitest configs.

**API Proxy**: Vite proxies `/pet-garden/api` → `http://localhost:3000/api`

**Backend Structure**: Express app with modular routes. Each route file handles a domain (classes, students, evaluations). Uses `better-sqlite3` for synchronous DB operations.

### Pet System

- **25 pet types**: 18 normal + 7 mythical creatures
- **8 levels**: Experience thresholds `[40, 60, 80, 100, 120, 140, 160]`
- **Images**: Each pet has 8 level images at `public/pets/{pet-id}/lv{1-8}.png`
- **Status logic**: Points < -20 = dead, < 0 = injured, otherwise alive

### Database Schema

Single SQLite file (`server/pet-garden.db`) with tables:
- `users` - Teacher accounts (guest + admin)
- `classes` - Class groups
- `students` - Student records with pet assignment
- `evaluations` - Point records
- `evaluation_rules` - Scoring rules
- `tags` - Custom tags
- `settings` - App configuration

## Testing

Frontend tests use Vitest + @vue/test-utils + happy-dom:
```bash
# Run specific test file
npm test -- src/components/__tests__/StudentCard.test.ts

# Run with watch mode
npm test
```

Backend tests use Vitest + supertest:
```bash
# Run server tests
cd server && npm test
```

## Important Notes

1. **Backend uses ES Modules** - All server files use `import/export` syntax, not CommonJS
2. **Chinese comments** - Code comments are in Chinese; maintain this convention
3. **Strict TypeScript** - `noUnusedLocals`, `noUnusedParameters` enabled
4. **Tailwind-only styling** - No custom CSS; use Tailwind utility classes
5. **Pet images** - Stored in `public/pets/{pet-id}/lv{level}.png`; compress with `pngquant` before committing

## Related Documentation

- `AGENTS.md` - Detailed coding conventions and API reference
- `README.md` - User-facing documentation and feature overview
- `docs/PET_IMAGES_GUIDE.md` - Pet image generation workflow
