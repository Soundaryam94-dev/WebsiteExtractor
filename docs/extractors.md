# Extraction Modules

Five modules run in parallel after the page loads. Each uses multiple detection layers with fallbacks so that partial results are returned even when a site blocks some methods.

---

## 1. Color Palette — `colors.ts`

Collects colors from four layers, merges by frequency score, normalizes to hex, and ranks by prominence.

### Detection Layers

| Layer | Score | Source |
|---|---|---|
| `theme-color` meta tag | +50 pts | Most reliable brand color on any site |
| `msapplication-TileColor` meta | +30 pts | Windows tile — usually the brand color |
| CSS custom properties (`--color-*`, `--primary`, `--brand`, etc.) | +40 pts each | Design system tokens resolved from `:root` |
| Semantic elements — nav, header, buttons, links, footer | +6–15 pts each | Computed `color` and `backgroundColor` |
| All stylesheet rule values | +6 pts each | `color`, `background-color`, `border-color` |
| Raw HTML hex (`#rrggbb`) and rgb() values | +5 pts each | Broad fallback scan |
| SVG `fill` / `stroke` attributes | +4 pts each | Logos and icon colors |
| Inline `style=` attributes | +5 pts each | Per-element overrides |

### Output

After merging and normalizing:
- Colors are split into **chromatic** (saturated) and **neutral** (grey/white/black)
- **Primary** = highest-scored chromatic color
- **Secondary** = second chromatic color
- **Accent** = third chromatic (falls back to primary if not found)
- **Background** = lightest neutral color
- **All** = up to 24 ranked unique hex colors

---

## 2. Typography — `typography.ts`

Resolves fonts through a 5-level priority chain. System fonts are filtered out at every level.

### Priority Chain (highest to lowest)

1. **Browser `@font-face` rules** — fonts the site explicitly loads; strongest signal for custom brand typefaces
2. **Computed `fontFamily`** on headings (`h1`–`h4`), body (`p`, `body`), buttons, captions — what the browser actually renders
3. **`@font-face` inside `<style>` blocks** — second-highest confidence; `<script>` blocks are deliberately excluded because third-party analytics scripts embed unrelated `font-family` declarations
4. **Google Fonts `<link>` tag** — parsed from the `family=` parameter in the href URL
5. **Frequency-ranked `font-family:` declarations** in `<style>` blocks — last resort

### Filtered System Fonts

The following are never returned as detected fonts:
`-apple-system`, `blinkmacsystemfont`, `system-ui`, `sans-serif`, `serif`, `monospace`, `segoe ui`, `helvetica neue`, `helvetica`, `arial`, `noto sans`, and others.

### Output

| Field | Description |
|---|---|
| `headingFont` | Font used on h1–h4 elements |
| `bodyFont` | Font used on p, body, main |
| `buttonFont` | Font used on buttons (falls back to bodyFont) |
| `captionFont` | Font used on small, label, figcaption |
| `sizes` | Map of element tag → computed font-size (e.g. `{ h1: "2.5rem", p: "1rem" }`) |

---

## 3. Content — `content.ts`

Gathers text content from four layers and merges with case-insensitive deduplication. Browser DOM results take priority.

### Detection Layers

**Layer 1 — OG / meta tags**
- `og:title`, `og:description`, `og:site_name`
- `name="description"` meta tag

**Layer 2 — Framework-embedded JSON**

Modern frameworks embed their initial data directly in the HTML, so content is available even when bot protection blocks JavaScript from running:
- `<script id="__NEXT_DATA__">` — Next.js Pages Router server-side data
- `window.__NUXT__` — Nuxt.js initial state
- `window.__STORE__` / `window.__INITIAL_STATE__` / `window.__REDUX_STATE__` — generic store patterns
- `<script type="application/ld+json">` — JSON-LD schema.org blocks (extracts `name`, `headline`, `description`, `articleBody`)

**Layer 3 — Live DOM**
- Headings: `h1`–`h6`, `[role="heading"]` — up to 30
- Paragraphs: `p`, `article p`, `main p`, `.description`, `.subtitle`, `li` — up to 20
- Buttons: `button`, `[role="button"]`, `.btn`, `.cta` — up to 10
- Nav items: `nav a`, `header a`, `[role="navigation"] a` — up to 15
- Links: `a[href]` — up to 40 (text + href)

**Layer 4 — HTML regex fallback**
- `<h1>`–`<h6>` tags parsed from raw HTML string
- `<p>` tags parsed from raw HTML string
- Used only when live DOM yields nothing

### Output

```typescript
{
  headings:   string[],              // up to 20
  paragraphs: string[],              // up to 20
  buttons:    string[],              // up to 10
  navItems:   string[],              // up to 15
  links:      { text, href }[]       // up to 40
}
```

---

## 4. Images — `images.ts`

Discovers images in two phases (meta + DOM), then classifies each by URL path pattern.

### Phase 1 — Discovery

**Meta / OG tags**
- `og:image`, `og:image:secure_url`
- `twitter:image`
- `apple-touch-icon`
- PNG favicon

**DOM scan**
- `<img>` attributes: `src`, `data-src`, `data-lazy`, `data-lazy-src`, `data-original`, `data-url`
- `srcset` and `data-srcset` — all URLs parsed from descriptor strings
- CSS `background-image: url(...)` on the first 500 elements
- SVG `<image href>` and `<image xlink:href>` elements

### Phase 2 — Classification

Each image URL is matched against path patterns to assign a category:

| Category | Path patterns matched |
|---|---|
| `logo` | `logo`, `brand`, `wordmark`, `logotype` |
| `hero` | `hero`, `banner`, `cover`, `masthead`, `jumbotron`, `splash` |
| `icon` | `icon`, `sprite`, `favicon`, any `.svg` extension |
| `thumbnail` | `thumb`, `thumbnail`, `preview` |
| `background` | `bg-`, `background`, `backdrop`, `pattern`, `texture` |
| `illustration` | `illustration`, `drawing`, `artwork` |
| `product` | `product`, `item`, `catalog` |
| `other` | Everything else |

Meta tags provide a hint (`meta-logo`, `meta-og`, `background`) that overrides URL pattern matching.

### In the ZIP

- Up to 50 images discovered total
- Up to 30 included in the ZIP
- Browser-intercepted images (captured during page load with correct auth cookies) are added first
- Server-side downloads cover remaining URL-discovered images
- All non-raster formats (WebP, AVIF, GIF, ICO) are converted to PNG via Sharp
- SVGs are kept as-is
- Images are organized into subfolders: `Images/Logo/`, `Images/Hero/`, etc.

---

## 5. Tech Stack — `techstack.ts`

The most complex module. Uses five detection layers because a single method gives incomplete results on most production sites.

### Why Multiple Layers Are Needed

- **Production React** removes `window.React` entirely — only fiber keys on DOM nodes reveal it
- **Modern bundlers** (Webpack, Vite) strip all development globals from production builds
- **Tailwind CSS** custom properties (`--tw-*`) only appear in fetched CSS files, not in DOM attributes
- **Backend frameworks** are invisible from the browser unless they leak via response headers

### Layer 1 — Browser Globals + DOM Inspection

Runs inside `page.evaluate()` in the browser context. Checks:

- `window` globals: `window.React`, `window.__NEXT_DATA__`, `window.dataLayer` (GTM), `window.__vue_app__`, `window.angular`, `window.Shopify`, `window.gtag`, `window.FB`, `window.Stripe`, `window.Intercom`, and more
- DOM attributes: `[ng-version]`, `[data-v-app]`, `[data-reactroot]`
- Computed CSS: `getComputedStyle(document.documentElement).getPropertyValue("--tw-ring-color")` — Tailwind detection
- Script/link `src` attributes for known CDN patterns

**React fiber key inspection (key innovation)**

Production React attaches internal fiber keys to every rendered DOM node. These keys start with `__reactFiber$`, `__reactInternalInstance$`, `__reactEvents$`, or `__reactProps$`. Checking `Object.keys()` on 20 sampled elements is the only reliable way to detect React in production:

```typescript
const isReactEl = (el) =>
  Object.keys(el).some(k =>
    k.startsWith("__reactFiber") ||
    k.startsWith("__reactInternalInstance") ||
    k.startsWith("__reactEvents") ||
    k.startsWith("__reactProps")
  );
```

### Layer 2 — JS Bundle Fetch and Scan

Downloads up to 5 application JS files and scans their minified text content.

**File selection:** Scripts are sorted to prefer `main`, `app`, `bundle`, `index`, `vendor` filenames before slicing to 5, so the most important files are always included. Third-party domains (GTM, GA, Facebook, Hotjar, Sentry, Intercom, etc.) are excluded.

**Size cap:** 80 KB per file — enough to cover the critical module declarations without downloading entire bundles.

**Detected patterns in minified bundles:**

| Pattern | Technology |
|---|---|
| `React.createElement` | React |
| `__webpack_require__` | Webpack |
| `createStore` | Redux |
| Angular `ɵfac`, `ɵmod`, `ɵcmp` | Angular |
| `createApp(` | Vue 3 |
| `createRouter(` | Vue Router |
| `gsap.to(` | GSAP |
| `new THREE.` | Three.js |

### Layer 3 — Inline Script Scan

Extracts all `<script>` tag bodies without `src=` and scans them with the same patterns as Layer 2. Catches apps that inline their critical bundle or embed store data directly in the HTML.

### Layer 4 — CSS File Fetch

Downloads up to 4 stylesheets (60 KB each) and scans for framework-specific class patterns:

| Detection | Pattern |
|---|---|
| Tailwind CSS | `--tw-ring-color`, any `--tw-` prefixed custom property |
| Bootstrap | `.container`, `.row`, `.col-md-`, `.col-lg-` |
| Material UI | `.MuiButton-root`, `.MuiTypography-root` |

Google Fonts CDN files are excluded from the fetch list.

### Layer 5 — HTML Regex + Response Headers

**HTML attribute scan:** All `src=` and `href=` values are checked for:
- `/_next/static/` → Next.js App Router
- `/wp-content/`, `/wp-includes/` → WordPress
- `.php` extensions → PHP backend
- Service worker registration patterns → PWA

**Response headers:**

| Header | Detected technology |
|---|---|
| `server: nginx` | Nginx |
| `server: apache` | Apache |
| `x-powered-by: Express` | Express.js |
| `x-powered-by: PHP` | PHP |
| `cf-ray` | Cloudflare |
| `x-vercel-id` | Vercel |
| `set-cookie: laravel_session` | Laravel |
| `set-cookie: _session_id` | Ruby on Rails |
| `set-cookie: csrftoken` | Django |

### Technology Groups

Results are grouped into five categories in the output HTML and JSON:

| Group | Categories included |
|---|---|
| Frontend Technologies | Frameworks, UI Libraries, Styling, State Management, Animation, Build Tools |
| Backend Technologies | Languages, Runtimes, Frameworks, Web Servers |
| Platform & CMS | CMS, E-commerce |
| Analytics & Marketing | Tag Managers, Analytics, Chat & Support |
| Infrastructure | Hosting & CDN |

Each detected technology has a `confidence` level: `high`, `medium`, or `low`.
