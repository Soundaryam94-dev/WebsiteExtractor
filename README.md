# Website Extractor

Paste any public URL and receive a structured ZIP file containing the site's color palette, typography, images, text content, design system, and technology stack — all extracted by a real Chromium browser in 15–30 seconds.

**Live demo:** https://website-extractor-pi.vercel.app

---

## Table of Contents

1. [What You Get](#what-you-get)
2. [What I Implemented](#what-i-implemented)
3. [How It Works](#how-it-works)
4. [Local Development](#local-development)
5. [Project Structure](#project-structure)
6. [API Reference](#api-reference)
7. [Extraction Modules](#extraction-modules)
8. [Tech Stack](#tech-stack)
9. [Deployment](#deployment)
10. [Errors & Solutions](#errors--solutions)
11. [Known Limitations](#known-limitations)

---

## What You Get

Every extraction produces a ZIP with seven folders:

| Folder | Contents |
|---|---|
| `Images/` | Up to 30 images sorted into `Logo/`, `Hero/`, `Product/`, `Icons/`, `Illustrations/`, `Background/`, `Thumbnails/` |
| `Colour Palette/` | `palette.json` + `palette.html` — primary, secondary, accent, background + up to 24 extracted swatches |
| `Typography/` | `typography.json` + `typography.html` — heading, body, button, caption fonts with live previews and full size table |
| `Content/` | `content.json` + `content.html` — headings, paragraphs, buttons, nav items, links |
| `Design System/` | `design-system.json` + self-contained `index.html` SPA + `styles.css` with CSS custom properties |
| `Tech Stack/` | `techstack.json` + `techstack.html` — detected libraries, frameworks, hosting, analytics |
| `README.md` | Quick-start guide and design token summary |

---

## What I Implemented

This section documents every technical feature and decision made during the build.

---

### 1. Headless Browser Scraper

**File:** `backend/src/scraper/index.ts`

The core of the project. Instead of fetching raw HTML like a basic scraper, a real Chromium browser is launched via Playwright so that JavaScript-rendered content, computed CSS, and lazy-loaded images are all available.

**Anti-bot fingerprint spoofing**

Most sites detect headless browsers by checking `navigator.webdriver`, hardware concurrency, installed plugins, and the Permissions API. I spoofed all of these before any page load:

```typescript
Object.defineProperty(navigator, "webdriver", { get: () => undefined });
Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 8 });
Object.defineProperty(navigator, "plugins", { get: () => [ /* Chrome PDF Plugin, etc. */ ] });
window.chrome = { runtime: {}, loadTimes: () => ({}), csi: () => ({}), app: {} };
```

**Image interception during page load**

Rather than downloading images separately after scraping (which misses auth cookies and CDN-signed URLs), I intercepted image responses at the browser network level. Every PNG, JPEG, WebP, AVIF, SVG, GIF, and ICO between 1 KB and 5 MB was captured into memory as the page loaded:

```typescript
await page.route(/\.(png|jpe?g|gif|webp|svg|ico|avif)(\?.*)?$/i, async (route) => {
  const response = await route.fetch();
  if (response.ok() && capturedImages.length < 30) {
    const body = await response.body();
    if (body.length > 1024 && body.length < 5 * 1024 * 1024) {
      capturedImages.push({ filename, buffer: body, category });
    }
  }
  await route.fulfill({ response });
});
```

**`waitUntil: "commit"` navigation strategy**

Using `waitUntil: "domcontentloaded"` as the primary trigger caused bot-protected sites (Cloudflare) to stall indefinitely. I changed to `"commit"` (first byte received) as the primary trigger, then separately awaited `domcontentloaded` and `networkidle` with capped timeouts. This resolves immediately even on challenge pages.

**Scroll-to-lazy-load**

After the page settled, I scrolled to 50% → 100% → 0% of the page height with small delays between each to trigger lazy-loaded images and content that only appear when scrolled into view.

**Parallel extraction**

All five extractors run simultaneously via `Promise.all()`. No sequential bottleneck — scraping and all five extractions complete in roughly the same time as the slowest single extractor.

---

### 2. Color Palette Extractor

**File:** `backend/src/extractor/colors.ts`

Colors are collected from four layers and merged by a frequency scoring system, so the most prominent colors on the page win.

| Layer | Weight | Source |
|---|---|---|
| `theme-color` meta tag | 50 pts | Most reliable brand color signal |
| `msapplication-TileColor` meta | 30 pts | Windows tile color, usually the brand color |
| CSS custom properties (`--color-*`, `--primary`, `--brand`) | 40 pts each | Design system tokens on modern sites |
| Semantic elements (nav, header, buttons, links) | 6–15 pts each | Computed `color` and `backgroundColor` |
| Raw HTML hex/rgb values | 5 pts each | Broad coverage fallback |
| SVG `fill`/`stroke` attributes | 4 pts each | Logos and icons |

After merging, all values are normalized to 6-digit hex, then separated into chromatic (colored) and neutral (grey/white/black). The final palette is:
- **Primary** = highest-scored chromatic color
- **Secondary** = second chromatic color
- **Accent** = third chromatic (falls back to primary)
- **Background** = lightest neutral color
- **All** = up to 24 ranked unique colors

---

### 3. Typography Extractor

**File:** `backend/src/extractor/typography.ts`

Fonts are resolved through a 5-level priority chain to avoid picking up system fonts or third-party widget fonts:

1. Browser `@font-face` rules — fonts the site explicitly loads (highest confidence)
2. Computed `fontFamily` on headings (`h1`–`h4`), body (`p`, `body`), buttons, captions
3. `@font-face` declarations inside `<style>` blocks — `<script>` blocks are deliberately excluded because third-party analytics scripts embed unrelated `font-family` declarations that would pollute the result
4. Google Fonts `<link>` tag — parsed from the `family=` parameter in the URL
5. Frequency-ranked `font-family:` declarations in `<style>` blocks

System fonts (`-apple-system`, `system-ui`, `Arial`, `Helvetica`, `sans-serif`, etc.) are filtered out at every level. Outputs four named roles: `headingFont`, `bodyFont`, `buttonFont`, `captionFont`, plus a `sizes` map for every element type found on the page.

---

### 4. Content Extractor

**File:** `backend/src/extractor/content.ts`

Text content is gathered from four layers, then merged with case-insensitive deduplication (browser DOM results take priority):

1. **OG / meta tags** — `og:title`, `og:description`, `og:site_name`, `description`
2. **Framework-embedded JSON** — `__NEXT_DATA__` (Next.js SSR), `window.__NUXT__`, `window.__STORE__`, and `application/ld+json` schema blocks. These are embedded in the raw HTML so they yield content even when a site's bot protection blocks the browser from rendering
3. **Live DOM** — `h1`–`h6`, `[role="heading"]`, paragraphs, buttons, CTA links, nav items — up to 30 headings, 20 paragraphs, 10 buttons, 15 nav items
4. **HTML regex fallback** — `<h1>`–`<h6>` and `<p>` tags parsed directly from the raw HTML string as a last resort

---

### 5. Image Extractor & Categorizer

**File:** `backend/src/extractor/images.ts`

Images are discovered in two phases:

**Phase 1 — Discovery**
- OG/meta: `og:image`, `twitter:image`, `og:image:secure_url`, `apple-touch-icon`, PNG favicon
- DOM: `<img>` `src`, `data-src`, `data-lazy`, `srcset`; CSS `background-image` on the first 500 elements; SVG `<image>` elements

**Phase 2 — Classification by URL path**

| Category | Matched path patterns |
|---|---|
| `logo` | `logo`, `brand`, `wordmark`, `logotype` |
| `hero` | `hero`, `banner`, `cover`, `masthead`, `splash` |
| `icon` | `icon`, `sprite`, `favicon`, any `.svg` |
| `thumbnail` | `thumb`, `thumbnail`, `preview` |
| `background` | `bg-`, `background`, `backdrop`, `pattern`, `texture` |
| `illustration` | `illustration`, `drawing`, `artwork` |
| `product` | `product`, `item`, `catalog` |

In the ZIP builder, browser-intercepted images (already in memory with correct cookies) are added first, then server-side downloads cover any remaining URL-discovered images. All non-raster formats (WebP, AVIF, GIF) are converted to PNG using Sharp.

---

### 6. Tech Stack Detector — 5-Layer Detection

**File:** `backend/src/extractor/techstack.ts`

This was the most complex module. A single detection method gives incomplete results on most sites, so I implemented five sequential layers:

**Layer 1 — Browser globals and DOM inspection (`page.evaluate`)**

Checks `window` globals: `window.React`, `window.__NEXT_DATA__`, `window.dataLayer` (GTM), `window.__vue_app__`, `window.angular`, `window.Shopify`, `window.gtag`, and more.

The key challenge here was detecting **React in production builds**. Production React removes `window.React` entirely. The only reliable signal is the fiber key that React attaches to rendered DOM nodes. I inspect up to 20 DOM elements looking for keys starting with `__reactFiber$`, `__reactInternalInstance$`, `__reactEvents$`, or `__reactProps$`:

```typescript
const isReactEl = (el: Element | null) =>
  el ? Object.keys(el).some(k =>
    k.startsWith("__reactFiber") ||
    k.startsWith("__reactInternalInstance") ||
    k.startsWith("__reactEvents") ||
    k.startsWith("__reactProps")
  ) : false;
```

**Layer 2 — JS bundle fetch and scan**

Downloads up to 5 application scripts and scans their minified content for library fingerprints. Scripts are sorted to prefer `main`, `app`, `bundle`, `index`, `vendor` filenames before slicing, so the most important files are always included. Known third-party domains (GTM, GA, Facebook, Hotjar, Sentry, etc.) are excluded from the fetch list. Each file is capped at 80 KB.

Detected in bundles: `React.createElement`, `__webpack_require__`, `createStore` (Redux), Angular `ɵfac`, Vue `createApp`, `createRouter`, and more.

**Layer 3 — Inline `<script>` scan**

All `<script>` tag bodies without `src=` are extracted from the HTML and scanned with the same patterns as Layer 2. This catches apps that inline their critical bundle or embed store data.

**Layer 4 — CSS file fetch**

Downloads up to 4 stylesheets (60 KB each) and scans for:
- **Tailwind** — `--tw-ring-color` or any `--tw-` prefixed custom property (injected by Tailwind's preflight)
- **Bootstrap** — `.container`, `.row`, `.col-md-` class patterns
- **Material UI** — `.MuiButton-root`, `.MuiTypography-root` class patterns

**Layer 5 — HTML attribute regex + response headers**

Scans all `src=` and `href=` attribute values for `/_next/static/` (Next.js App Router), `/wp-content/` (WordPress), `.php` extensions, service worker paths.

Response headers directly reveal infrastructure: `server` → Nginx/Apache/Caddy, `x-powered-by` → Express/PHP/ASP.NET, `cf-ray` → Cloudflare, `x-vercel-id` → Vercel, `set-cookie` names → Laravel (`laravel_session`), Rails (`_session_id`), Django (`csrftoken`).

**Next.js App Router detection (special case)**

Next.js v13+ (App Router) removed `__NEXT_DATA__` and the `#__next` root element that older detection relied on. I added detection via `/_next/static/` asset paths and the `<next-route-announcer>` custom element, which are present on every App Router page:

```typescript
next: !!(
  w.__NEXT_DATA__ ||
  document.querySelector("#__next") ||
  document.querySelector("next-route-announcer") ||
  document.querySelector("[data-next-router-state-tree]") ||
  hasScript("/_next/static/") ||
  hasLink("/_next/static/")
)
```

**Techstack cleanup**

Removed 17 WEBSITES entries that had no corresponding detection code (Qwik, shadcn/ui, Headless UI, Less, Notion, FastAPI, Flask, Deno, Bun, Rust, GitHub Pages, and others). Removed Lodash, Underscore.js, and Moment.js detections entirely — these are deprecated or in the wrong category. Tightened Firebase detection to require actual Firebase domain patterns instead of a bare `"firebase"` string match that caused false positives.

---

### 7. ZIP Builder

**File:** `backend/src/zip/builder.ts`

Streams a ZIP directly to the Express response using `archiver` so no temporary file is written to disk. The archive is built in parallel — non-image sections (JSON, HTML files) are appended synchronously while images are downloaded asynchronously.

Each section generates both a JSON file (machine-readable) and a self-contained HTML preview (human-readable, opens in any browser with no server needed).

Image downloads use native Node `fetch` (no axios dependency) with an 8-second timeout and a 5 MB size cap per image.

**Tech Stack HTML — flat badge layout**

The tech stack HTML was redesigned to show only technology names as flat colored badges grouped by category, with no sub-category row labels and no confidence border styling. One section per group (Frontend, Backend, Platform, Analytics, Infrastructure), each with a colored header and a count badge.

---

### 8. Frontend Processing UI

**File:** `frontend/app/processing/ProcessingClient.tsx`

The processing page shows a 7-step progress animation that runs independently of the actual backend (each step advances every 3.5 seconds, capped at 90% until the API responds). This gives the user constant visual feedback even though the backend doesn't stream progress events.

**Render cold-start handling (the most important frontend feature)**

Before making the extraction request, the frontend pings `GET /health` with a 6-second timeout. If the backend is cold (connection refused or timeout), it retries every 3.5 seconds for up to 65 seconds. During this time the UI switches to an amber "Waking up" state with the message "Starting up server — this takes up to 60s on first use":

```
Normal state:    purple spinner  →  "In progress"
Waking state:   amber  spinner  →  "Waking up"  +  footer: "Server is cold — warming up, please wait…"
```

Once `/health` responds successfully, the actual `POST /api/extract` request is made.

**Contextual error states**

Five different error types are recognized and shown with a specific title, explanation, and advice:

| Error | Title shown |
|---|---|
| Bot detection keywords | "Site Blocked Our Request" |
| HTTP 401/403 | "Access Denied" |
| Timeout keywords | "Page Took Too Long" |
| Rate limit | "Too Many Requests" |
| Network / "Failed to fetch" | "Server Unavailable" |

---

### 9. Code Cleanup

**Removed dead `activeIndex` state** (`ProcessingClient.tsx`)

`useState(0)` was destructured as `[, setActiveIndex]` — the value was thrown away and never read. The `setActiveIndex(i)` calls inside `markActive()` caused unnecessary re-renders with no effect on the UI. Both the state declaration and all setter calls were removed.

**Replaced `axios` with native `fetch`** (`builder.ts`)

`axios` was the only external HTTP dependency that wasn't essential — Node 18 (Render's runtime) has `fetch` built in. The replacement uses `AbortController` for the 8-second timeout and checks `arrayBuffer.byteLength` for the 5 MB size cap. This removed axios and its 15 transitive packages (~3 MB) from the backend.

---

## How It Works

```
User submits URL
  └─ UrlInput validates → router.push(/processing?url=...)
       └─ ProcessingClient mounts
            ├─ Step timer starts (3.5s per step, visual only)
            └─ GET /health — retry up to 65s (Render cold start)
                 └─ POST /api/extract { url }
                      ├─ Zod validates URL
                      ├─ Blocks private IPs (localhost, 10.x, 192.168.x)
                      └─ scrape(url)
                           ├─ Launch Chromium (anti-bot spoofing)
                           ├─ page.route() — intercept image responses
                           ├─ page.goto(url, { waitUntil: "commit" })
                           ├─ waitForLoadState("domcontentloaded")
                           ├─ waitForLoadState("networkidle", max 12s)
                           ├─ Scroll 50% → 100% → 0% (lazy load)
                           └─ Promise.all([
                                extractImages(),     → CategorizedImage[]
                                extractColors(),     → ColorPalette
                                extractTypography(), → Typography
                                extractContent(),    → PageContent
                                extractTechStack()   → TechStack
                              ])
                      └─ buildZip(data, res) — streams ZIP
  └─ Browser receives blob → URL.createObjectURL → auto-download
```

---

## Local Development

Two processes must run simultaneously.

### 1. Clone and install

```bash
git clone https://github.com/Soundaryam94-dev/WebsiteExtractor.git
cd WebsiteExtractor

# Backend
cd backend && npm install
# Playwright downloads Chromium automatically via postinstall

# Frontend
cd ../frontend && npm install
```

### 2. Environment files

**`backend/.env`**
```
PORT=4000
FRONTEND_URL=http://localhost:3000
```

**`frontend/.env.local`**
```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 3. Run both dev servers

```bash
# Terminal 1 — backend (auto-restarts on save)
cd backend && npm run dev

# Terminal 2 — frontend
cd frontend && npm run dev
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:4000 |
| Health check | http://localhost:4000/health |

### 4. Build for production

```bash
# Backend
cd backend && npm run build && npm start

# Frontend
cd frontend && npm run build && npm start
```

---

## Project Structure

```
WebsiteExtractor/
├── backend/
│   ├── src/
│   │   ├── server.ts              # Express entry — CORS, rate-limit, /health
│   │   ├── api/
│   │   │   └── extract.ts         # POST /api/extract — validation + IP block
│   │   ├── scraper/
│   │   │   └── index.ts           # Playwright orchestration + anti-bot
│   │   ├── extractor/
│   │   │   ├── colors.ts          # 4-layer color extraction + frequency scoring
│   │   │   ├── typography.ts      # 5-priority font detection
│   │   │   ├── content.ts         # 4-layer content extraction
│   │   │   ├── images.ts          # Image discovery + URL classification
│   │   │   └── techstack.ts       # 5-layer tech stack detection
│   │   └── zip/
│   │       └── builder.ts         # ZIP streaming + 7 HTML preview generators
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx             # Root layout (Inter + Poppins fonts)
│   │   ├── page.tsx               # Home page
│   │   ├── globals.css            # Tailwind v4 + dark theme
│   │   └── processing/
│   │       ├── page.tsx           # Suspense wrapper
│   │       └── ProcessingClient.tsx  # Progress UI + cold-start handling
│   ├── components/
│   │   ├── Navbar.tsx             # Top navigation bar
│   │   ├── HeroSection.tsx        # Two-column hero layout
│   │   ├── UrlInput.tsx           # URL input with client-side validation
│   │   ├── Prism.tsx              # WebGL prism animation (OGL + GLSL)
│   │   └── Prism.css
│   ├── package.json
│   └── tsconfig.json
│
├── render.yaml                    # Render.com backend deployment config
├── CLAUDE.md                      # Architecture guide for AI assistants
└── README.md                      # This file
```

---

## API Reference

### `GET /health`

Returns `{"status":"ok"}`. Used by the frontend to detect and wake a cold Render instance before making an extraction request.

---

### `POST /api/extract`

**Rate limit:** 10 requests per IP per 15 minutes.

**Request**

```json
{ "url": "https://example.com" }
```

The `https://` prefix is added automatically if missing.

**Success — 200**

```
Content-Type: application/zip
Content-Disposition: attachment; filename="example.zip"
```

Binary ZIP stream.

**Errors**

| Status | Body | Cause |
|---|---|---|
| `400` | `{"success":false,"error":"A valid URL is required"}` | Invalid or missing URL |
| `400` | `{"success":false,"error":"URL not allowed"}` | Private/localhost IP blocked |
| `500` | `{"success":false,"error":"…"}` | Scrape failure (see messages below) |

**Error messages from the scraper**

| Message | Cause |
|---|---|
| `"This site is protected by bot detection (…)"` | Page title matched Cloudflare / CAPTCHA patterns |
| `"Access denied (HTTP 403)"` | Site returned 401 or 403 |
| `"The site took too long to respond"` | 30-second `goto` timeout exceeded |
| `"Domain not found"` | DNS resolution failed (`ERR_NAME_NOT_RESOLVED`) |
| `"Connection refused"` | Site is down or blocking (`ERR_CONNECTION_REFUSED`) |
| `"Too many requests. Try again in 15 minutes."` | Rate limit reached |

---

## Extraction Modules

### `colors.ts`

Layers run in sequence, scores accumulated, results normalized to hex and ranked. Primary/Secondary/Accent come from chromatic (non-grey) colors; Background from the lightest neutral.

### `typography.ts`

5-priority chain: `@font-face` rules → computed styles → style-block `@font-face` → Google Fonts link → frequency rank. `<script>` content is never scanned (third-party scripts embed unrelated font declarations).

### `content.ts`

4-layer merge: OG meta → framework JSON (`__NEXT_DATA__`, Nuxt, JSON-LD) → live DOM → HTML regex. Browser DOM takes priority; layers are merged with case-insensitive deduplication.

### `images.ts`

Discovery: OG/meta tags + DOM `<img>`/`srcset`/CSS backgrounds/SVG `<image>`. Classification: 7 categories by URL path pattern. Up to 50 discovered; up to 30 included in ZIP.

### `techstack.ts`

5 layers: browser globals + React fiber inspection → JS bundle fetch (80 KB × 5 files) → inline script scan → CSS file fetch (60 KB × 4 files) → HTML regex + response headers.

---

## Tech Stack

### Backend

| Package | Version | Purpose |
|---|---|---|
| Express | ^4.21 | HTTP server and routing |
| Playwright | ^1.48 | Headless Chromium browser automation |
| Sharp | ^0.34 | Image conversion to PNG |
| Archiver | ^7.0 | ZIP archive streaming |
| Zod | ^3.23 | Request body validation |
| express-rate-limit | ^8.5 | Per-IP rate limiting |
| TypeScript + tsx | ^5.6 | Language + dev server |

### Frontend

| Package | Version | Purpose |
|---|---|---|
| Next.js | 16.2.6 | React framework (App Router) |
| React | 19.2.4 | UI library |
| Tailwind CSS | ^4 | Utility-first styling |
| OGL | ^1.0 | WebGL renderer for the Prism hero animation |

---

## Deployment

### Backend — Render.com

Defined in `render.yaml`. Pushes to `main` trigger automatic redeploy.

> The Render free tier spins down after 15 minutes of inactivity. Cold start takes 50–60 seconds. The frontend handles this by pinging `/health` and retrying before making the extraction request — users see an amber "Waking up" state instead of a confusing error.

**Environment variables (Render dashboard)**

| Variable | Value |
|---|---|
| `PORT` | `4000` (already in render.yaml) |
| `FRONTEND_URL` | Your Vercel deployment URL |

### Frontend — Vercel

Connect the GitHub repo to Vercel. Set root directory to `frontend`.

**Environment variables (Vercel dashboard)**

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | Your Render backend URL |

---

## Errors & Solutions

Every real error encountered during development, with root cause and exact fix.

---

### Error 1 — "Extraction Failed: Failed to fetch" on production

**Symptom**

The live site at `website-extractor-pi.vercel.app` showed the error card "Extraction Failed — Failed to fetch" immediately after submitting a URL (tested with github.com). It worked fine on localhost.

**Root cause**

The Render free tier shuts down the backend container after 15 minutes of inactivity. When the first request arrives after idle, the container hasn't started yet — the connection is refused at the TCP level before any HTTP response is possible. The browser reports this as `"Failed to fetch"`.

The frontend fetch had no timeout, no retry, and no awareness that the backend might be waking up, so the first connection failure immediately showed the error page.

**Fix**

Added a wake-up phase to `ProcessingClient.tsx` before the extraction request:

1. Ping `GET /health` with a 6-second per-attempt timeout
2. If it fails, retry every 3.5 seconds for up to 65 seconds total
3. Show an amber "Waking up" UI state during this time
4. Once `/health` responds OK, make the real `POST /api/extract` request
5. Added a dedicated "Server Unavailable" error state for any remaining network failures

Also added `isNetwork` pattern matching in the error handler so "Failed to fetch" shows "Server Unavailable" with a helpful tip instead of the raw error string.

**Files changed:** `frontend/app/processing/ProcessingClient.tsx`

---

### Error 2 — Next.js not detected on vercel.com

**Symptom**

Extracting `vercel.com` returned React, Tailwind, JavaScript, Node.js, and Vercel — but not Next.js. This was unexpected because Vercel's own site runs on Next.js.

**Root cause**

Next.js v13 introduced the App Router which removed two things the detector relied on:
- `window.__NEXT_DATA__` — the JSON blob embedded in SSR pages (App Router doesn't use it)
- `<div id="__next">` — the root DOM element (replaced with a plain `<div>`)

The detection only checked those two signals, so it missed all App Router sites.

**Fix**

Added three new signals that are present on every App Router page:

```typescript
next: !!(
  w.__NEXT_DATA__ ||                                           // Pages Router
  document.querySelector("#__next") ||                         // Pages Router root
  document.querySelector("next-route-announcer") ||            // App Router custom element
  document.querySelector("[data-next-router-state-tree]") ||   // App Router attribute
  hasScript("/_next/static/") ||                               // App Router asset path
  hasLink("/_next/static/")                                    // App Router asset path
)
```

The `/_next/static/` path appears in every `<script src>` and `<link href>` on an App Router page and is the most reliable signal.

**Files changed:** `backend/src/extractor/techstack.ts`

---

### Error 3 — TypeScript errors after removing library detections

**Symptom**

After removing Lodash, Underscore.js, Moment.js, and Ionicons from the tech stack detection, `npx tsc --noEmit` threw:

```
Property 'lodash' does not exist on type '{ react: boolean; vue: boolean; ... }'
Property 'underscore' does not exist on type '{ ... }'
Property 'momentJs' does not exist on type '{ ... }'
Property 'ionicons' does not exist on type '{ ... }'
```

**Root cause**

These properties were removed from the `page.evaluate()` return object (Layer 1), but the `add()` calls that referenced `d.lodash`, `d.underscore`, `d.momentJs`, and `d.ionicons` further down in the file were not removed. TypeScript correctly flagged them as accessing non-existent properties.

**Fix**

Removed the corresponding `add()` calls and their HTML scan references for each deleted detection:

```typescript
// Removed these add() calls:
add(d.lodash,     "Lodash",        "fe-framework", "high");
add(d.underscore, "Underscore.js", "fe-framework", "high");
add(d.momentJs,   "Moment.js",     "fe-framework", "high");
add(d.ionicons,   "Ionicons",      "fe-ui",        "high");
```

**Files changed:** `backend/src/extractor/techstack.ts`

---

### Error 4 — Duplicate key in WEBSITES record

**Symptom**

TypeScript reported a duplicate object key error. Identified as a runtime issue when the tech stack module loaded.

**Root cause**

When adding `"Animate.css": "animate.style"` to the `WEBSITES` record, the entry already existed at line 109. The duplicate was silently overriding the first definition in JavaScript but TypeScript's strict mode caught it.

**Fix**

Removed the second (duplicate) `"Animate.css"` entry. The first occurrence at line 109 was kept.

**Files changed:** `backend/src/extractor/techstack.ts`

---

### Error 5 — Git commit failing with "pathspec did not match any files"

**Symptom**

After running `cd backend && npx tsc --noEmit` to check types, the subsequent git command failed:

```bash
git add backend/src/extractor/techstack.ts
# error: pathspec 'backend/src/extractor/techstack.ts' did not match any files
```

**Root cause**

The shell was inside the `backend/` directory (the `cd backend` command had changed the working directory). Git interpreted `backend/src/extractor/techstack.ts` as a path relative to `backend/`, which resolved to `backend/backend/src/extractor/techstack.ts` — a path that doesn't exist.

**Fix**

Run git commands with an explicit root path using `-C`:

```bash
git -C "c:/WebsiteExtractor" add backend/src/extractor/techstack.ts
git -C "c:/WebsiteExtractor" commit -m "..."
```

Or return to the repo root before any git command: `cd "c:/WebsiteExtractor"`.

---

### Error 6 — Incomplete tech stack output (most sites showing 1–2 technologies)

**Symptom**

Most websites returned very few technologies — `example.com` only showed Cloudflare. `vercel.com` showed React and Tailwind but nothing else. Production builds of React apps showed no React at all.

**Root cause**

The original detector only checked `window` globals (`window.React`, `window.Vue`) and basic DOM attributes. This fails on production builds because:
- Production React (`react-dom/production.min.js`) removes the `window.React` global entirely
- Modern bundlers (Webpack, Vite) remove all development-mode globals
- CSS frameworks like Tailwind generate custom property names that are only visible in the fetched CSS files, not in DOM attributes

**Fix**

Added three new detection layers on top of the existing `page.evaluate()`:

1. **React fiber key inspection** — scans `Object.keys()` on 20 DOM elements looking for `__reactFiber$*` keys that React attaches to every rendered node in both dev and production
2. **JS bundle fetching** — downloads and text-scans up to 5 application JS files (sorted to prefer `main/app/bundle/index/vendor` names) for minified library fingerprints
3. **CSS file fetching** — downloads and scans up to 4 stylesheets for Tailwind `--tw-` custom properties, Bootstrap grid classes, and MUI class patterns

This expanded tech stack output from 1–2 detections on average to 5–10+ on most modern sites.

**Files changed:** `backend/src/extractor/techstack.ts`

---

## Known Limitations

| Limitation | Reason |
|---|---|
| **Bot-protected sites fail** | Cloudflare, reCAPTCHA, and similar systems block headless browsers even with spoofing. The error page identifies this specifically. |
| **Login-required pages fail** | Authenticated pages return 401/403 or redirect to a login form before any content loads. |
| **Backend languages rarely detected** | Go, Java, Python, Rust backends sit behind a CDN and are completely invisible from the browser. Only response headers like `x-powered-by` expose them. |
| **CDN-proxied images may not download** | Some CDNs (Cloudinary, Imgix) require signed URLs or specific cookies that a server-side download doesn't have. Browser-intercepted images avoid this. |
| **Rate limit: 10 req / 15 min per IP** | Enforced to prevent abuse of the Render free tier. |
| **Max 30 images per extraction** | Hard limit to keep ZIP size and extraction time reasonable. |
| **`172.x` block is overly broad** | The private IP check blocks all `172.x.x.x` addresses, but only `172.16.0.0/12` is actually private (RFC 1918). Sites hosted at `172.0–15.x` or `172.32+.x` are incorrectly blocked. |
