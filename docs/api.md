# API Reference

The backend exposes two endpoints. All requests go to the base URL configured in `NEXT_PUBLIC_API_URL`.

---

## GET /health

Check whether the backend is running.

**Response — 200**
```json
{ "status": "ok" }
```

**Purpose**

The frontend pings this endpoint before making an extraction request. On the Render free tier the backend spins down after 15 minutes of inactivity and takes 50–60 seconds to restart. The frontend retries `/health` every 3.5 seconds for up to 65 seconds, showing an amber "Waking up" indicator during this time. Once `/health` responds, the real extraction request is made.

---

## POST /api/extract

Extract design assets from any public website URL. Returns a ZIP file as a binary stream.

**Rate limit:** 10 requests per IP per 15 minutes.

---

### Request

**Headers**
```
Content-Type: application/json
```

**Body**
```json
{ "url": "https://example.com" }
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `url` | string | Yes | Must be a valid URL. The `https://` prefix is added automatically if missing. |

**Blocked URLs**

Private and local network addresses are rejected:

| Pattern | Example |
|---|---|
| `localhost` | `http://localhost:3000` |
| `127.0.0.1` | `http://127.0.0.1` |
| `0.0.0.0` | `http://0.0.0.0` |
| `10.x.x.x` | `http://10.0.0.1` |
| `192.168.x.x` | `http://192.168.1.1` |
| `169.254.x.x` | Link-local addresses |

---

### Success Response — 200

```
Content-Type: application/zip
Content-Disposition: attachment; filename="example.zip"
```

A binary ZIP stream is piped directly to the response. The frontend receives it as a Blob, creates an object URL, and triggers a browser file-save automatically.

**ZIP contents**

| Folder | Files |
|---|---|
| `Images/Logo/`, `Hero/`, `Product/`, `Icons/`, `Illustrations/`, `Background/`, `Thumbnails/` | Up to 30 downloaded images |
| `Colour Palette/` | `palette.json`, `palette.html` |
| `Typography/` | `typography.json`, `typography.html` |
| `Content/` | `content.json`, `content.html` |
| `Design System/` | `design-system.json`, `index.html`, `styles.css` |
| `Tech Stack/` | `techstack.json`, `techstack.html` |
| `README.md` | Design token summary |

---

### Error Responses

All errors return JSON.

```json
{ "success": false, "error": "error message here" }
```

| HTTP Status | Error message | Cause |
|---|---|---|
| `400` | `"A valid URL is required"` | URL field is missing or not a valid URL |
| `400` | `"URL not allowed"` | Private or localhost IP address |
| `500` | `"This site is protected by bot detection (…)"` | Page title matched Cloudflare / CAPTCHA / reCAPTCHA patterns |
| `500` | `"Access denied (HTTP 403)"` | Site returned HTTP 401 or 403 |
| `500` | `"The site took too long to respond"` | 30-second `page.goto()` timeout exceeded |
| `500` | `"Domain not found. Please check the URL and try again."` | DNS resolution failed (`ERR_NAME_NOT_RESOLVED`) |
| `500` | `"Connection refused."` | Site is down or blocking automated access (`ERR_CONNECTION_REFUSED`) |
| `500` | `"Too many requests. Try again in 15 minutes."` | Rate limit of 10 req/15 min exceeded |

---

### How the Backend Handles a Request

```
POST /api/extract { url }
  │
  ├─ Zod validates the URL shape
  ├─ Auto-prefix https:// if missing
  ├─ Block private/localhost IPs
  │
  └─ scrape(url)
       ├─ Launch Chromium (headless, anti-bot flags)
       ├─ Spoof navigator.webdriver, plugins, hardwareConcurrency
       ├─ Intercept image responses via page.route()
       ├─ page.goto(url, { waitUntil: "commit" })
       ├─ waitForLoadState("domcontentloaded")
       ├─ waitForLoadState("networkidle", max 12s)
       ├─ Scroll 50% → 100% → 0% to trigger lazy load
       ├─ Detect bot-protection page titles → throw error
       └─ Promise.all([
            extractImages(),      → CategorizedImage[]
            extractColors(),      → ColorPalette
            extractTypography(),  → Typography
            extractContent(),     → PageContent
            extractTechStack()    → TechStack
          ])

  └─ buildZip(data, res) — streams ZIP directly to response
```

---

### Example — cURL

```bash
curl -X POST http://localhost:4000/api/extract \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}' \
  --output example.zip
```

### Example — JavaScript (browser)

```javascript
const res = await fetch("http://localhost:4000/api/extract", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ url: "https://example.com" }),
});

if (!res.ok) {
  const { error } = await res.json();
  throw new Error(error);
}

const blob = await res.blob();
const href = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = href;
a.download = "example.zip";
a.click();
```
