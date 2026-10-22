# Kanji Trainer

A web app for learning Japanese kanji by JLPT level, with spaced-repetition review, multiple-choice quizzes, stroke-order practice, and progress stored locally in the browser.

**Live site:** <https://kanji-trainer-eight.vercel.app>

## Features

- **JLPT decks** — N5 through N1, loaded on demand so the first page stays fast.
- **Spaced repetition** — review cards scheduled from your own right/wrong history.
- **Quizzes** — test meanings and readings for the level you're studying.
- **Writing practice** — trace kanji stroke by stroke using KanjiVG data.
- **Browse & sections** — explore the full deck or work through smaller groups.
- **Offline-friendly progress** — stats and scheduling are saved in `localStorage`; no account required.

## Tech stack

- React 19 + TypeScript
- Vite 8
- Tailwind CSS 4
- React Router 7

## Local development

Requires Node.js 22.12 or newer.

```bash
npm install
npm run dev
```

Open <http://localhost:5173>.

On Windows you can also double-click **Open Kanji Trainer.bat**, which starts the dev server and opens the browser.

## Build

```bash
npm run build
npm run preview
```

The production output is written to `dist/`.

## Data

- JLPT kanji decks and example sentences are generated from [kanjitest.online](https://www.kanjitest.online/) by `scripts/fetch-data.mjs` and `scripts/fetch-examples.mjs`.
- Stroke-order data comes from [KanjiVG](https://kanjivg.tagaini.net/), licensed under [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/).
- The generated deck files live in `src/data/`, and stroke JSON lives in `public/strokes/`.

To refresh the datasets:

```bash
npm run fetch-data
```

## Deployment

The app is a static single-page site. It is deployed on [Vercel](https://vercel.com/) with:

- **Framework preset:** Vite
- **Build command:** `npm run build`
- **Output directory:** `dist`

`vercel.json` rewrites all routes to `index.html`, so deep links such as `/n5/review` work on refresh. Every push to the production branch triggers a new deployment.
