# Website Extractor

Paste any public URL and receive a structured ZIP file containing the site's color palette, typography, images, text content, design system, and technology stack — all extracted by a real Chromium browser in 15–30 seconds.

**Live demo:** https://website-extractor-pi.vercel.app

---

## What You Get

Every extraction produces a ZIP with seven folders:

| Folder | Contents |
|---|---|
| `Images/` | Up to 30 images, sorted into `Logo/`, `Hero/`, `Product/`, `Icons/`, `Illustrations/`, `Background/`, `Thumbnails/` |
| `Colour Palette/` | `palette.json` + `palette.html` — primary, secondary, accent, background colors + up to 24 extracted swatches |
| `Typography/` | `typography.json` + `typography.html` — heading, body, button, and caption fonts with live previews and a full size table |
| `Content/` | `content.json` + `content.html` — headings, paragraphs, buttons, nav items, and links |
| `Design System/` | `design-system.json` + a self-contained `index.html` SPA + `styles.css` with CSS custom properties |
| `Tech Stack/` | `techstack.json` + `techstack.html` — detected libraries, frameworks, hosting, analytics, and more |
| `README.md` | Quick-start guide and design token summary |

---

## How It Works

```
User submits URL
  └─ Frontend navigates to /processing?url=...
       └─ Pings GET /health to wake Render backend (handles cold start)
            └─ POST /api/extract { url }
                 ├─ Validates URL (Zod), blocks private IPs
                 └─ scrape(url)
                      ├─ Launches headless Chromium (Playwright)
                      ├─ Applies anti-bot fingerprint spoofing
                      ├─ Intercepts image responses during page load
                      ├─ Waits for domcontentloaded → networkidle
                      ├─ Scrolls to trigger lazy-loaded content
                      └─ Runs 5 extractors in parallel:
                           ├─ images.ts    → CategorizedImage[]
                           ├─ colors.ts    → ColorPalette
                           ├─ typography.ts → Typography
                           ├─ content.ts   → PageContent
                           └─ techstack.ts → TechStack
                 └─ buildZip() streams ZIP → browser auto-downloads
```

---

## Features

- **Real browser** — uses Playwright/Chromium, so JavaScript-rendered content, lazy-loaded images, and computed CSS are all available
- **Anti-bot evasion** — spoofs `navigator.webdriver`, hardware concurrency, plugins, and the Permissions API to pass Cloudflare and similar checks
- **5 extraction modules** run in parallel — no sequential bottleneck
- **Multi-layer detection** — each module falls back through several strategies (browser DOM → HTML regex → response headers) to maximize coverage on any site
- **Automatic image categorization** — logo, hero, product, icon, illustration, background, thumbnail
- **Image format normalization** — non-standard formats (AVIF, WebP, GIF) converted to PNG via Sharp
- **Self-contained design system SPA** — open `Design System/index.html` in any browser to preview the extracted brand without running any server
- **Rate limited** — 10 requests per IP per 15 minutes

---

## Local Development

Two processes must run simultaneously.

### 1. Clone and install

```bash
git clone https://github.com/Soundaryam94-dev/WebsiteExtractor.git
cd WebsiteExtractor

# Backend
cd backend && npm install
# Playwright automatically downloads Chromium on postinstall

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
# Terminal 1 — backend (restarts on save)
cd backend && npm run dev

# Terminal 2 — frontend
cd frontend && npm run dev
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:4000 |
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
│   │   │   └── extract.ts         # POST /api/extract handler
│   │   ├── scraper/
│   │   │   └── index.ts           # Playwright orchestration
│   │   ├── extractor/
│   │   │   ├── colors.ts          # Color palette extraction
│   │   │   ├── typography.ts      # Font extraction
│   │   │   ├── content.ts         # Text content extraction
│   │   │   ├── images.ts          # Image discovery and classification
│   │   │   └── techstack.ts       # Technology stack detection
│   │   └── zip/
│   │       └── builder.ts         # ZIP assembly and HTML generation
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx             # Root layout (Inter + Poppins fonts)
│   │   ├── page.tsx               # Home page
│   │   ├── globals.css            # Tailwind v4 + custom theme
│   │   └── processing/
│   │       ├── page.tsx           # Suspense wrapper
│   │       └── ProcessingClient.tsx  # Progress UI + fetch logic
│   ├── components/
│   │   ├── Navbar.tsx             # Top navigation bar
│   │   ├── HeroSection.tsx        # Hero layout with URL input
│   │   ├── UrlInput.tsx           # URL input form with validation
│   │   ├── Prism.tsx              # WebGL animated background (OGL)
│   │   └── Prism.css
│   ├── package.json
│   └── tsconfig.json
│
├── render.yaml                    # Render.com deployment config
└── CLAUDE.md                      # Architecture guide for AI assistants
```

---

## API Reference

### `GET /health`

Health check endpoint. Returns `{"status":"ok"}` when the server is running.

Used by the frontend to wake the Render free-tier backend before making an extraction request.

---

### `POST /api/extract`

Extract assets from a public URL.

**Rate limit:** 10 requests per IP per 15 minutes.

**Request body**

```json
{ "url": "https://example.com" }
```

The `https://` prefix is optional — the server will add it automatically if missing.

**Success response**

`Content-Type: application/zip`
`Content-Disposition: attachment; filename="example.zip"`

Binary ZIP stream. The frontend downloads this as a blob and triggers a browser file-save.

**Error responses**

```json
{ "success": false, "error": "A valid URL is required" }
```

| Status | Cause |
|---|---|
| `400` | Invalid URL, missing URL, or private/localhost IP |
| `500` | Scrape failed (bot protection, timeout, unreachable site, etc.) |

**Known error messages**

| Message | Cause |
|---|---|
| `"This site is protected by bot detection (…)"` | Cloudflare / CAPTCHA page detected |
| `"Access denied (HTTP 403)"` | Site blocks automated access |
| `"The site took too long to respond"` | 30-second page-load timeout exceeded |
| `"Domain not found"` | DNS resolution failed |
| `"Too many requests"` | Rate limit reached |

---

## Extraction Modules

### `colors.ts` — Color Palette

Runs four layers of extraction and merges results by frequency score:

1. **Meta tags** (`theme-color`, `msapplication-TileColor`) — highest weight (50/30 points), most reliable brand color on any site
2. **Raw HTML scan** — all `#rrggbb` hex and `rgb()` values in the HTML string (5 points each)
3. **Browser-side CSS** — CSS custom properties matching `--color-*`, `--primary`, `--brand`, etc., resolved from `:root`; computed styles on semantic elements (nav, header, buttons, links, footer); SVG `fill` and `stroke` attributes; inline styles (6–40 points each)
4. **Stylesheet rules** — all `color`, `background-color`, `border-color` values from accessible stylesheets

After merging, colors are normalized to hex, filtered, and ranked. The final palette assigns:
- **Primary** — highest-frequency chromatic (non-neutral) color
- **Secondary** — second chromatic color
- **Accent** — third chromatic color (falls back to primary)
- **Background** — lightest neutral color
- **All** — up to 24 unique colors

---

### `typography.ts` — Fonts

Priority chain (highest to lowest):

1. **Browser `@font-face` rules** — fonts the site explicitly loads; the strongest signal for custom brand typefaces
2. **Computed `fontFamily`** on headings, body, buttons, captions
3. **`@font-face` inside `<style>` blocks** (not `<script>` — third-party scripts pollute results)
4. **Google Fonts `<link>` tag** — reliable for GF-hosted fonts
5. **Frequency-ranked `font-family:` declarations** in style blocks

Outputs: `headingFont`, `bodyFont`, `buttonFont`, `captionFont`, and a `sizes` map covering h1–h4, p, button, caption, small, nav, and any others found on the page.

System fonts (`-apple-system`, `system-ui`, `Arial`, etc.) are filtered out at every layer.

---

### `content.ts` — Text Content

Four-layer strategy, merged with deduplication:

1. **OG / meta tags** — `og:title`, `og:description`, `og:site_name`, `description`
2. **Framework-embedded JSON** — `__NEXT_DATA__` (Next.js), `window.__NUXT__`, `window.__STORE__`, and JSON-LD (`application/ld+json`) schema blocks; yields content even when a site blocks headless browsers entirely
3. **Live DOM** — `h1–h6`, `[role="heading"]`, paragraphs, buttons, nav links, CTA elements (up to 30 headings, 20 paragraphs, 10 buttons, 15 nav items)
4. **HTML regex fallback** — `<h1>–<h6>` and `<p>` tags parsed from raw HTML string

All layers are merged preferring browser DOM results. Duplicates removed case-insensitively.

---

### `images.ts` — Images

Two-phase discovery, then classification:

**Discovery**
1. OG/meta tags: `og:image`, `twitter:image`, `og:image:secure_url`, `apple-touch-icon`, PNG favicon
2. DOM: `<img>` `src`, `data-src`, `data-lazy`, `srcset`; CSS `background-image` on the first 500 elements; SVG `<image>` elements

**Classification** by URL path pattern:

| Category | Path patterns |
|---|---|
| `logo` | `logo`, `brand`, `wordmark`, `logotype` |
| `hero` | `hero`, `banner`, `cover`, `masthead`, `splash` |
| `icon` | `icon`, `sprite`, `favicon`, `.svg` extension |
| `thumbnail` | `thumb`, `thumbnail`, `preview` |
| `background` | `bg-`, `background`, `backdrop`, `pattern`, `texture` |
| `illustration` | `illustration`, `drawing`, `artwork` |
| `product` | `product`, `item`, `catalog` |

Up to 50 images discovered. Combined with browser-captured images (intercepted during page load), up to 30 total are included in the ZIP. Non-raster formats are converted to PNG by Sharp.

---

### `techstack.ts` — Technology Detection

Five detection layers, run in this order:

**Layer 1 — `page.evaluate()` (browser globals + DOM)**

Inspects: `window.React`, `window.__NEXT_DATA__`, `window.dataLayer`, `window.__vue_app__`, `window.angular`, `window.Shopify`, `window.gtag`, `window.FB`, and more. Also checks DOM for React fiber keys (`__reactFiber$*`) on 20 sampled elements — the only reliable way to detect React in production builds.

**Layer 2 — JS bundle fetch**

Downloads up to 5 application scripts (sorted to prefer `main`, `app`, `bundle`, `index`, `vendor` filenames; max 80 KB each). Scans minified content for: `React.createElement`, `__webpack_require__`, `createStore` (Redux), Angular `ɵfac`, Vue `createApp`, and more. Third-party analytics/tracking domains are skipped.

**Layer 3 — Inline `<script>` scan**

Extracts all `<script>` tag bodies without `src=` and scans them with the same patterns.

**Layer 4 — CSS file fetch**

Downloads up to 4 stylesheets (max 60 KB each). Detects: Tailwind (`--tw-ring-color`, `--tw-` custom properties), Bootstrap (`.container`, `.row`, `.col-md-`), Material UI (`.MuiButton-root`).

**Layer 5 — HTML regex + response headers**

Scans all `src=`/`href=` attribute values for `/_next/static/`, `/wp-content/`, `.php`, service worker registration. Response headers reveal: `server` (Nginx, Apache, Caddy), `x-powered-by` (Express, PHP), `cf-ray` (Cloudflare), `x-vercel-id` (Vercel), `set-cookie` names (Laravel, Rails, Django session keys).

**Technology groups**

| Group | Categories |
|---|---|
| Frontend Technologies | Frameworks & Libraries, UI Component Libraries, Styling Tools, State Management, Animation & 3D, Build Tools |
| Backend Technologies | Programming Languages, Runtime Environments, Frameworks, Web Servers |
| Platform & CMS | CMS / Platform, E-commerce |
| Analytics & Marketing | Tag Managers, Analytics & Tracking, Chat & Support |
| Infrastructure | Hosting & CDN |

Each detected technology carries a `confidence` level: `high`, `medium`, or `low`.

---

## Tech Stack

### Backend

| Package | Version | Role |
|---|---|---|
| Express | ^4.21 | HTTP server |
| Playwright | ^1.48 | Chromium browser automation |
| Sharp | ^0.34 | Image format conversion (PNG normalization) |
| Archiver | ^7.0 | ZIP stream builder |
| Zod | ^3.23 | Request validation |
| express-rate-limit | ^8.5 | Per-IP rate limiting |
| TypeScript / tsx | ^5.6 | Language and dev runner |

### Frontend

| Package | Version | Role |
|---|---|---|
| Next.js | 16.2.6 | React framework (App Router) |
| React | 19.2.4 | UI library |
| Tailwind CSS | ^4 | Utility-first styling |
| OGL | ^1.0 | WebGL renderer for Prism background animation |

---

## Deployment

### Backend — Render.com

Defined in `render.yaml`. Free tier auto-deploys on push to `main`.

> **Note:** The Render free tier spins down after 15 minutes of inactivity. The first request after idle takes 50–60 seconds. The frontend handles this automatically by pinging `/health` and retrying until the server responds before making the extraction request.

**Required environment variables on Render:**

| Variable | Value |
|---|---|
| `PORT` | `4000` (set in `render.yaml`) |
| `FRONTEND_URL` | Your Vercel frontend URL (set manually in dashboard) |

### Frontend — Vercel

Connect the GitHub repository to Vercel. Set the root directory to `frontend` and add:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | Your Render backend URL (e.g. `https://your-service.onrender.com`) |

Vercel re-deploys automatically on every push to `main`.

---

## Known Limitations

| Limitation | Reason |
|---|---|
| **Bot-protected sites fail** | Cloudflare, reCAPTCHA, and similar systems block headless browsers even with spoofing. The error page identifies this. |
| **Login-required pages fail** | Authenticated pages return 401/403 or redirect to a login form before any content is visible. |
| **Backend languages rarely detected** | Go, Java, Python, and Rust backends are invisible from the browser — they sit behind a CDN. Only server headers (e.g. `x-powered-by: Express`) expose them. |
| **CDN-proxied images may not download** | Some image CDNs (e.g. Cloudinary, Imgix) reject requests without the correct Referer or signed URL parameters. |
| **Rate limit: 10 req / 15 min** | Enforced per IP to prevent abuse of the Render free tier. |
| **Max 30 images per extraction** | Images above this limit are silently skipped to keep ZIP size and extraction time reasonable. |
