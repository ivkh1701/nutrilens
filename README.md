# NutriLens — Food & Calorie Tracker

A mobile-first food and calorie tracking web app with AI-powered meal analysis via Google Gemini.

## Features

- Email / password sign-up, sign-in, and password reset (Supabase Auth)
- Daily calorie goal with progress ring — shows achievement and over-goal warnings
- Take or upload a meal photo → Gemini identifies foods and estimates servings/macros
- Review and edit Gemini's estimates before saving
- Full food log with expandable meal details
- Daily, Weekly, Monthly, and Custom date-range reports with bar chart
- Goal history — changing your goal from a past date preserves historical accuracy
- Private photo storage (user-scoped paths, signed URLs)
- Row-level security: users can only access their own data

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18 + |
| npm | 9 + |
| Supabase CLI | 1.150+ (`npm i -g supabase`) |
| Google Cloud account | (for Gemini API key) |

---

## Quick start

### 1. Clone and install

```bash
git clone <repo-url>
cd nutrilens
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New project.
2. Note your **Project URL** and **anon public key** from Settings → API.

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

The `.env` file is git-ignored. Never commit it.

### 4. Run database migrations

Link your local CLI to the project and apply all migrations:

```bash
supabase login
supabase link --project-ref your-project-ref
supabase db push
```

This creates the following tables with RLS enabled:
- `profiles` — one row per user, stores timezone
- `calorie_goals` — full goal history with effective date ranges
- `meal_entries` — each logged meal
- `meal_foods` — individual food items within a meal
- `gemini_analyses` — raw validated Gemini output

It also creates the `meal-photos` private storage bucket.

> **Local dev alternative:** `supabase start` (requires Docker) runs a full local Supabase stack.

### 5. Set Edge Function secrets

The Gemini API key is stored as a Supabase secret — it **never** touches the browser.

```bash
# Get a Gemini API key from https://aistudio.google.com/app/apikey
supabase secrets set GEMINI_API_KEY=your-gemini-api-key

# The service-role key is auto-injected by Supabase; only set it for local dev:
# supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 6. Deploy the Edge Function

```bash
supabase functions deploy analyze-meal
```

This deploys `supabase/functions/analyze-meal/index.ts` to your project.

### 7. Start the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Architecture

```
Browser (React + TypeScript)
│
├── Supabase Auth (email / password, JWT)
├── Supabase Database (PostgreSQL + RLS)
├── Supabase Storage (private meal-photos bucket)
└── Supabase Edge Function: analyze-meal
        │
        ├── Validates caller JWT
        ├── Fetches private photo via service-role key
        └── Calls Gemini Vision API (key never leaves server)
```

### Key files

```
src/
  App.tsx                    # Auth gate + tab routing
  lib/
    supabase.ts              # Supabase client
    types.ts                 # All TypeScript types
    utils.ts                 # Pure calculation helpers
  contexts/
    AuthContext.tsx           # Auth state + methods
    ToastContext.tsx          # Toast notifications
  hooks/
    useMeals.ts              # Meal CRUD + summaries
    useGoal.ts               # Goal history + setGoal
  components/
    auth/AuthScreen.tsx       # Sign-in / sign-up / reset
    dashboard/Dashboard.tsx   # Main view
    dashboard/CalorieRing.tsx # Progress ring
    dashboard/PhotoUpload.tsx # Photo picker + Edge Function call
    foodlog/FoodLog.tsx       # Full meal history
    reports/Reports.tsx       # Charts + macro summaries
    goals/Goals.tsx           # Goal management
    modals/AnalysisModal.tsx  # Gemini review + edit step
    modals/GoalModal.tsx      # Update calorie goal

supabase/
  migrations/               # Versioned SQL (run via supabase db push)
  functions/analyze-meal/   # Deno Edge Function
```

---

## Security model

| Concern | How it's handled |
|---------|-----------------|
| Gemini API key | Supabase secret — only visible inside the Edge Function |
| Service-role key | Supabase secret — never exposed to browser |
| Photo access | Private bucket; user can only upload/read/delete their own `{userId}/...` paths |
| Database rows | Row-level security on all tables; `auth.uid() = user_id` check |
| JWT validation | Edge Function calls `supabase.auth.getUser()` before any Gemini call |
| Path traversal | Edge Function verifies `photo_path` starts with `{userId}/` |

---

## Running tests

```bash
npm test          # run once
npm run test:watch  # watch mode
```

Tests cover:
- `clamp` boundary behaviour
- `lastNDays` length, ordering, and today's date
- `goalForDate` — correct goal for historical and current dates
- Calorie ring percentage calculation
- `aggregateWeekly` / `aggregateMonthly` bucket counts
- `validateImageFile` — type and size validation

---

## Building for production

```bash
npm run build
npm run preview  # preview the production build locally
```

Deploy the `dist/` folder to any static host (Vercel, Netlify, Cloudflare Pages, etc.).

---

## Supabase email confirmation (production)

In `supabase/config.toml`, `enable_confirmations = false` for ease of local dev.

For production, set it to `true` and update your Supabase project's Auth settings so that sign-up triggers a confirmation email. Users won't be able to sign in until they confirm their email address.

---

## Known limitations

- The `conic-gradient` progress ring requires a modern browser (Chrome 69+, Firefox 83+, Safari 12.1+).
- File upload is limited to 10 MB per photo.
- Gemini estimates are approximations; users should always review before saving.
- The `exclude using gist` constraint on `calorie_goals` requires the `btree_gist` PostgreSQL extension. Run `create extension if not exists btree_gist;` if the migration fails.
