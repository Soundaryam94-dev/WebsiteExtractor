# Local Development

Two processes must run simultaneously — the backend on port 4000 and the frontend on port 3000.

---

## 1. Clone and Install

```bash
git clone https://github.com/Soundaryam94-dev/WebsiteExtractor.git
cd WebsiteExtractor

# Backend
cd backend && npm install
# Playwright downloads Chromium automatically via postinstall

# Frontend
cd ../frontend && npm install
```

---

## 2. Environment Files

Create these two files before starting either server.

**`backend/.env`**
```
PORT=4000
FRONTEND_URL=http://localhost:3000
```

**`frontend/.env.local`**
```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

> These files are git-ignored. You must create them manually every time you clone the repo.

---

## 3. Run Both Dev Servers

Open two terminals and run one command in each.

```bash
# Terminal 1 — backend (auto-restarts on every file save)
cd backend && npm run dev

# Terminal 2 — frontend
cd frontend && npm run dev
```

| Service | URL | Notes |
|---|---|---|
| Frontend | http://localhost:3000 | Next.js dev server |
| Backend API | http://localhost:4000 | Express + tsx watch |
| Health check | http://localhost:4000/health | Returns `{"status":"ok"}` |

---

## 4. Build for Production

```bash
# Backend — compile TypeScript to dist/
cd backend && npm run build && npm start

# Frontend — Next.js production build
cd frontend && npm run build && npm start
```

---

## 5. Backend Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start with tsx watch — restarts on file save |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm start` | Run compiled `dist/server.js` |

## 6. Frontend Commands

| Command | What it does |
|---|---|
| `npm run dev` | Next.js dev server on port 3000 |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |

---

## 7. Project Structure

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
├── docs/                          # Documentation
├── render.yaml                    # Render.com deployment config
├── CLAUDE.md                      # Architecture guide for AI assistants
└── README.md                      # Project overview
```

---

## 8. Common Issues

**Playwright browser not found**

```bash
cd backend && npx playwright install chromium
```

**Port already in use**

```bash
# Kill whatever is using port 4000
npx kill-port 4000
```

**Environment variables not loading**

Make sure `.env` is in the `backend/` folder (not the root) and `.env.local` is in the `frontend/` folder. Restart both servers after creating the files.
