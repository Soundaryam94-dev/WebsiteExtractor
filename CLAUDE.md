# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (`backend/`)
```bash
npm run dev       # tsx watch — restarts on file save
npm run build     # tsc → dist/
npm start         # node dist/server.js
```

### Frontend (`frontend/`)
```bash
npm run dev       # Next.js dev server on port 3000
npm run build     # production build
npm run lint      # ESLint
```

No test suite exists in this repository.

## Local Development Setup

Two processes must run simultaneously:

| Process | Directory | Port | Command |
|---------|-----------|------|---------|
| Backend | `backend/` | 4000 | `npm run dev` |
| Frontend | `frontend/` | 3000 | `npm run dev` |

**Environment files required:**
- `backend/.env` → `PORT=4000` and `FRONTEND_URL=http://localhost:3000`
- `frontend/.env.local` → `NEXT_PUBLIC_API_URL=http://localhost:4000`

Playwright installs Chromium automatically via `postinstall`.

## Architecture

### Request flow

1. User submits URL on the Next.js home page (`/`)
2. Browser navigates to `/processing?url=...` which calls `POST /api/extract`
3. Backend launches a Chromium browser via Playwright, scrapes the URL, runs 5 extraction modules in parallel, then streams a ZIP back
4. Frontend receives the ZIP as a Blob and auto-downloads it

### Backend structure (`backend/src/`)

```
server.ts          Express entry — CORS, rate-limit (10 req/15 min), /health, mounts api/
api/extract.ts     POST /api/extract — Zod validation, blocks private IPs, calls scraper
scraper/index.ts   Playwright: launches Chromium, anti-bot spoofing, image route interception,
                   scroll-to-lazy-load, then fans out to all 5 extractors
extractor/
  colors.ts        CSS custom properties → hex/rgb → frequency scoring → ColorPalette
  typography.ts    @font-face + computed styles → heading/body/button/caption fonts + sizes
  content.ts       OG meta → framework JSON blobs → DOM headings/paragraphs/buttons/links
  images.ts        Meta tags → DOM img/source → CSS backgrounds → CategorizedImage[]
  techstack.ts     5-layer detector (window globals, DOM, JS bundles, CSS files, headers)
zip/builder.ts     Assembles ZIP: Images/, Content/, Design System/, Colour Palette/,
                   Typography/, Tech Stack/, README.md
```

### Tech stack detection layers (in order, `extractor/techstack.ts`)

1. **`page.evaluate()`** — window globals (`window.React`, `window.__NEXT_DATA__`), DOM selectors, fiber key inspection on DOM nodes, computed CSS variables, script/link src attributes
2. **JS bundle fetch** — downloads up to 5 app JS files (80 KB each, sorted to prefer `main/app/bundle/index/vendor` filenames), scans minified content for `React.createElement`, `createStore`, `__webpack_require__`, Angular `ɵfac`, etc.
3. **Inline `<script>` scan** — extracts content of all `<script>` tags without `src=`
4. **CSS file fetch** — downloads up to 4 stylesheets (60 KB each), checks `--tw-` custom properties, Bootstrap grid classes, MUI class patterns
5. **HTML regex scan** — all `src=`/`href=` attribute values, raw HTML patterns (`__NEXT_DATA__`, `/_next/static/`, `wp-content`, etc.)
6. **Response headers** — `server`, `x-powered-by`, `cf-ray`, `x-vercel-id`, `set-cookie` names reveal hosting, backend framework, runtime

Technologies are tagged with a `TechCategory` key (e.g. `fe-framework`, `be-runtime`, `hosting`) and grouped by `TECH_GROUPS` (exported from `techstack.ts`, imported by `builder.ts` for consistent HTML output).

### Frontend structure (`frontend/app/`)

```
page.tsx                     Hero with URL input → navigates to /processing
processing/page.tsx          Thin server component wrapper
processing/ProcessingClient.tsx  Client component: fake step progress UI (3.5s/step),
                                 fetch → blob → auto-download
components/
  HeroSection.tsx + UrlInput.tsx   Input form, client-side URL validation
  Navbar.tsx
  Prism.tsx + Prism.css            OGL WebGL animated 3D background
```

### Deployment

Backend is deployed on **Render.com** (`render.yaml`). Pushing to `main` on GitHub triggers an automatic redeploy (free tier spins down after 15 min idle — first request after idle is slow).

Frontend is deployed on **Vercel** (`.vercel/` config present).

## Key Constraints

- **Next.js version is 16** (`frontend/CLAUDE.md` warns it has breaking changes vs. training data — check `node_modules/next/dist/docs/` before editing frontend routing or API conventions)
- Scraper sets `waitUntil: "commit"` (first byte) then waits separately for `domcontentloaded` and `networkidle` — changing these timeouts directly affects scrape reliability vs. speed
- Image route interception happens at the browser level inside `scraper/index.ts` before any extractor runs; the captured buffers are passed through `ScrapeResult.capturedImages`
- `TECH_GROUPS` is the single source of truth for category grouping — it is exported from `techstack.ts` and imported by `builder.ts`; changing it affects both detection output and ZIP HTML layout
