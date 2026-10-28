# Kanji Trainer

A web app for learning Japanese kanji by JLPT level, with spaced-repetition review, multiple-choice quizzes, stroke-order practice, and cloud-synced progress.

**Live site:** <https://kanji-trainer-eight.vercel.app>

## Features

- **JLPT decks** — N5 through N1, loaded on demand so the first page stays fast.
- **Spaced repetition** — review cards scheduled from your own right/wrong history.
- **Quizzes** — test meanings and readings for the level you're studying.
- **Writing practice** — trace kanji stroke by stroke using KanjiVG data.
- **Browse & sections** — explore the full deck or work through smaller groups.
- **Vocabulary lessons** — study themed word lists (starting with N5 Lessons 18–19) and quiz both directions.
- **Accounts** — passwordless email sign-in with a magic link.
- **Cloud progress** — SRS state syncs across devices, with `localStorage` kept as an offline cache.
- **Self-service account deletion** — removes the account and cloud progress from Settings.

Every app route requires sign-in. When someone signs in for the first time on a browser that already has anonymous progress, that progress is merged into the account per kanji.

## Tech stack

- React 19 + TypeScript
- Vite 8
- Tailwind CSS 4
- React Router 7
- Supabase Auth + Postgres

## Local development

Requires Node.js 22.12 or newer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Fill `.env.local` with the Supabase project URL and publishable key:

```dotenv
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

Open <http://localhost:5173>. In the Supabase dashboard, add `http://localhost:5173/**` to **Authentication → URL Configuration → Redirect URLs**.

On Windows you can also double-click **Open Kanji Trainer.bat**, which starts the dev server and opens the browser.

## Build

```bash
npm run build
npm run preview
```

The production output is written to `dist/`.

## Supabase setup

1. Create a Supabase project and enable the Email auth provider.
2. Add these redirect URLs in **Authentication → URL Configuration**:
   - `http://localhost:5173/**`
   - `https://kanji-trainer-eight.vercel.app/**`
   - `https://kanji-trainer-*-ismail20.vercel.app/**` (preview deployments)
3. Set **Site URL** to `https://kanji-trainer-eight.vercel.app`.
4. Configure custom SMTP for magic-link delivery.
5. Run the SQL files in `supabase/migrations/` in order from the SQL Editor.

The migrations create:

- `public.progress` — one JSONB row per user, protected by RLS.
- `public.delete_my_account()` — a locked-down function that can only delete the signed-in caller's account.

No service-role key is needed by the web app. It only uses the publishable key, and RLS restricts every user to their own progress row.

## Progress storage

- Cloud is the source of truth once an account is in use.
- `localStorage` caches the latest snapshot so the app still opens if the network is briefly unavailable.
- Cards carry an `updatedAt` timestamp. A first sign-in merges anonymous local cards with cloud cards by timestamp; later sign-ins use the cloud snapshot unless there are unsynced local edits.
- Level resets write a `resetAt` marker so old cloud cards cannot reappear after a reset.
- **Settings → Progress backup** still exports and imports JSON backups.

## Data

- JLPT kanji decks and example sentences are generated from [kanjitest.online](https://www.kanjitest.online/) by `scripts/fetch-data.mjs` and `scripts/fetch-examples.mjs`.
- Stroke-order data comes from [KanjiVG](https://kanjivg.tagaini.net/), licensed under [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/).
- The generated deck files live in `src/data/`, and stroke JSON lives in `public/strokes/`.

To refresh the datasets:

```bash
npm run fetch-data
```

## Deployment

The app is a static single-page site deployed on [Vercel](https://vercel.com/):

- **Framework preset:** Vite
- **Build command:** `npm run build`
- **Output directory:** `dist`

Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to the Vercel project for Production and Preview environments. `vercel.json` rewrites all routes to `index.html`, so deep links such as `/n5/review` work on refresh. Every push to the production branch triggers a new deployment.
