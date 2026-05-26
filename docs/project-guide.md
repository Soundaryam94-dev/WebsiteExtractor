# Project Guide

This guide helps anyone on the team quickly understand the WebsiteExtractor project — what it does, how it runs, how to work on it, and what to do when something goes wrong.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Live Servers](#2-live-servers--where-everything-runs)
3. [Access & Credentials](#3-access--credentials)
4. [Daily Operations](#4-daily-operations--what-normally-happens)
5. [How to Deploy a Change](#5-how-to-deploy-a-change)
6. [How to Check Logs](#6-how-to-check-logs-when-something-goes-wrong)
7. [Common Issues and Fixes](#7-common-issues-and-what-to-do)
8. [Environment Variables](#8-environment-variables)
9. [Project File Structure](#9-project-file-structure)
10. [Architecture in Plain English](#10-architecture-in-plain-english)
11. [How to Run Locally](#11-how-to-run-locally-quick-reference)

---

## 1. Overview

**WebsiteExtractor** is a web tool where a user pastes any public website URL and receives a ZIP file containing:

| What | Description |
|---|---|
| Color palette | Primary, secondary, accent, background colors |
| Typography | Fonts used for headings, body text, buttons |
| Images | Logo, hero, product, icons — downloaded and categorized |
| Content | Headings, paragraphs, buttons, nav items, links |
| Design system | CSS variables, combined design token view |
| Tech stack | Frameworks, libraries, hosting, analytics detected |

**How it works in one sentence:** A real Chromium browser (Playwright) fully renders the target page on the server, five extractor modules run in parallel, and the results are packaged into a ZIP and downloaded automatically.

**Who uses it:** Designers and developers who want to analyze a website's design or extract design tokens without inspecting code manually.

**Live URL:** https://website-extractor-pi.vercel.app

**Tech stack used to build this:**
- Frontend: Next.js 16, Tailwind CSS, TypeScript
- Backend: Node.js, Express, Playwright, TypeScript
- Hosting: Vercel (frontend), Render.com (backend)

---

## 2. Live Servers — Where Everything Runs

| Service | Platform | URL | Cost |
|---|---|---|---|
| Frontend | Vercel (free) | https://website-extractor-pi.vercel.app | Free |
| Backend | Render.com (free) | https://website-extractor-backend.onrender.com | Free |
| Source code | GitHub | https://github.com/Soundaryam94-dev/WebsiteExtractor | Free |

### Important: Render Free Tier Behaviour

The backend **shuts down after 15 minutes of inactivity**. The first request after idle takes **50–60 seconds** to restart. This is expected behaviour — the frontend shows an amber "Waking up server" indicator during restart and retries automatically. No action needed from the team.

If this becomes a problem, upgrading to Render's paid plan ($7/month) keeps the server always on.

---

## 3. Access & Credentials

| Service | Account email | How to log in |
|---|---|---|
| GitHub | soundaryanadupuru@gmail.com | Personal Gmail |
| Vercel | soundaryanadupuru@gmail.com | Sign in with GitHub |
| Render.com | soundaryanadupuru@gmail.com | Personal Gmail |
| VS Code Marketplace | soundaryanadupuru@gmail.com | Personal Gmail |

> To give a team member access: add them as a collaborator on the GitHub repo. Vercel and Render can also have team members added from their dashboards.

---

## 4. Daily Operations — What Normally Happens

Under normal conditions, **this project requires zero daily maintenance.** There are no scheduled jobs, no databases, no cron tasks, no background workers.

**Normal user flow:**
1. User visits the Vercel frontend URL
2. Pastes a website URL and clicks Extract
3. Frontend calls the Render backend
4. Backend scrapes the site using Playwright and returns a ZIP
5. User downloads the ZIP automatically

**Team's only ongoing task:** If a user reports a bug, check the logs (see Section 6) and investigate.

---

## 5. How to Deploy a Change

Every change follows this process — no manual deploy steps needed:

```
Edit code locally
  → git add . && git commit -m "description of change"
  → git push origin main
       → Render auto-deploys backend  (takes 2–3 minutes)
       → Vercel auto-deploys frontend (takes 1–2 minutes)
```

**To verify the deployment succeeded:**
- Backend: Open `https://website-extractor-backend.onrender.com/health` — should return `{"status":"ok"}`
- Frontend: Open `https://website-extractor-pi.vercel.app` — page should load normally

---

## 6. How to Check Logs When Something Goes Wrong

### Backend logs (Render)
1. Go to https://render.com → sign in
2. Click **website-extractor-backend**
3. Click **Logs** in the left sidebar
4. Search for `ERROR` or the specific error message reported

### Frontend logs (Vercel)
1. Go to https://vercel.com → sign in
2. Click the **website-extractor** project
3. Click **Deployments** → click the latest deployment
4. Click the **Functions** tab to see server-side errors

---

## 7. Common Issues and What to Do

### "The site took too long to respond"
**Cause:** The target website took more than 30 seconds to load.
**Fix:** Not a bug — the target site is too slow. Ask the user to try a different URL.

### "This site is protected by bot detection"
**Cause:** Cloudflare or a similar service blocked the Playwright browser.
**Fix:** Not fixable — the target site actively blocks scrapers. Ask the user to try a different URL.

### "Access denied (HTTP 403)"
**Cause:** The target site returned a 403 Forbidden response.
**Fix:** The site blocks automated access. Nothing to fix on our side.

### Backend not responding at all
**Cause 1:** Render free tier cold start — wait 60 seconds and try again.
**Cause 2:** Render deployment failed.
**Fix:** Check Render logs. If the deployment failed, fix the code error and push again. You can also manually trigger a redeploy from Render dashboard → **Manual Deploy**.

### Frontend shows blank page or build error
**Cause:** Vercel deployment failed.
**Fix:** Go to Vercel → Deployments → find the failed deployment → read the build log → fix the error → push again.

### ZIP downloads but folders are empty or missing
**Cause:** One or more extractor modules failed silently during scraping.
**Fix:** Check Render logs for lines containing `Failed:` around the time of the request. The failed module name appears in the log.

### "Too many requests" error
**Cause:** More than 10 requests from the same IP within 15 minutes (rate limit).
**Fix:** Wait 15 minutes. If the limit needs adjusting, edit the `rateLimit` config in `backend/src/server.ts`.

---

## 8. Environment Variables

These must be set in the hosting dashboards — they are never committed to the repo.

### Backend — set in Render dashboard → Environment

| Variable | Value | Purpose |
|---|---|---|
| `PORT` | `4000` | Port Express listens on |
| `FRONTEND_URL` | `https://website-extractor-pi.vercel.app` | Allowed CORS origin |

### Frontend — set in Vercel dashboard → Settings → Environment Variables

| Variable | Value | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://website-extractor-backend.onrender.com` | Backend URL called from the browser |

> If either URL changes (e.g. moving to a new Render service), update both variables. `FRONTEND_URL` must match exactly or all requests will be blocked by CORS.

---

## 9. Project File Structure

```
WebsiteExtractor/
├── backend/src/
│   ├── server.ts              → Express entry: CORS, rate limiting, /health endpoint
│   ├── api/extract.ts         → POST /api/extract: URL validation, private IP blocking
│   ├── scraper/index.ts       → Launches Chromium, scrolls page, runs all 5 extractors
│   ├── extractor/
│   │   ├── colors.ts          → Extracts color palette from CSS, meta tags, DOM
│   │   ├── typography.ts      → Detects fonts from @font-face, computed styles, Google Fonts
│   │   ├── content.ts         → Extracts headings, paragraphs, buttons, links
│   │   ├── images.ts          → Finds and categorizes images from DOM and meta tags
│   │   └── techstack.ts       → Detects frameworks and tools using 5 detection layers
│   └── zip/builder.ts         → Assembles and streams the final ZIP to the browser
│
├── frontend/app/
│   ├── page.tsx               → Home page with URL input
│   ├── processing/
│   │   └── ProcessingClient.tsx → Progress UI, calls backend, triggers ZIP download
│   └── components/
│       ├── HeroSection.tsx    → Main hero layout
│       ├── UrlInput.tsx       → URL input with client-side validation
│       └── Prism.tsx          → Animated WebGL background (OGL + GLSL)
│
├── docs/
│   └── project-guide.md      → This file — team guide for understanding the project
│
├── render.yaml               → Render deployment config (build and start commands)
├── CLAUDE.md                 → Architecture notes for AI coding assistants
└── README.md                 → Project overview and full technical documentation
```

---

## 10. Architecture in Plain English

```
User (browser)
  │
  │  pastes URL → clicks Extract
  ▼
Next.js Frontend (Vercel)
  │
  │  POST /api/extract { url }
  ▼
Express Backend (Render)
  │
  ├─ Validates URL (Zod)
  ├─ Blocks private IPs
  │
  └─ Launches Chromium (Playwright)
       ├─ Visits the URL
       ├─ Scrolls to trigger lazy loading
       ├─ Intercepts image downloads
       │
       └─ Runs 5 extractors in parallel:
            ├─ colors.ts      → ColorPalette
            ├─ typography.ts  → Typography
            ├─ content.ts     → PageContent
            ├─ images.ts      → CategorizedImage[]
            └─ techstack.ts   → TechStack
                 │
                 ▼
            zip/builder.ts → streams ZIP back to browser
                 │
                 ▼
User receives ZIP download automatically
```

The system is fully stateless — no database, no file storage, no sessions. Every request is independent.

---

## 11. How to Run Locally (Quick Reference)

```bash
# 1. Clone the repo
git clone https://github.com/Soundaryam94-dev/WebsiteExtractor.git
cd WebsiteExtractor

# 2. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 3. Create environment files
# backend/.env
PORT=4000
FRONTEND_URL=http://localhost:3000

# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:4000

# 4. Start both servers (open two terminals)
cd backend && npm run dev       # Terminal 1 — runs on port 4000
cd frontend && npm run dev      # Terminal 2 — runs on port 3000

# 5. Open in browser
# http://localhost:3000
```
