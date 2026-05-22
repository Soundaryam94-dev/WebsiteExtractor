# Deployment

The project uses two separate hosting platforms — one for the backend and one for the frontend.

| Service | Platform | Auto-deploy |
|---|---|---|
| Backend | Render.com | Yes — on push to `main` |
| Frontend | Vercel | Yes — on push to `main` |

---

## Backend — Render.com

### How it's configured

The deployment is defined in `render.yaml` at the repo root:

```yaml
services:
  - type: web
    name: website-extractor-backend
    runtime: node
    rootDir: backend
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: PORT
        value: 4000
      - key: FRONTEND_URL
        sync: false
```

Render reads this file automatically when the repo is connected. `sync: false` on `FRONTEND_URL` means it must be set manually in the Render dashboard (because its value isn't known until Vercel deploys the frontend).

### First-time setup on Render

1. Go to [render.com](https://render.com) and create a free account
2. Click **New → Web Service**
3. Connect your GitHub account and select the `WebsiteExtractor` repository
4. Render detects `render.yaml` automatically — click **Create Web Service**
5. After the first deploy finishes, go to **Environment** in the Render dashboard
6. Add the environment variable:

| Key | Value |
|---|---|
| `FRONTEND_URL` | Your Vercel frontend URL (e.g. `https://website-extractor-pi.vercel.app`) |

7. Click **Save Changes** — Render will redeploy automatically

### Subsequent deploys

Push to the `main` branch on GitHub. Render detects the push and runs:
```
npm install && npm run build → npm start
```

### Important: Free Tier Cold Start

The Render free tier **spins down the container after 15 minutes of inactivity**. The first request after idle takes **50–60 seconds** while the container restarts.

The frontend handles this automatically — it pings `GET /health` and retries every 3.5 seconds for up to 65 seconds before making the extraction request. Users see an amber "Waking up" status indicator during this time instead of a confusing error.

If you need instant responses with no cold start, upgrade to a paid Render plan ($7/month) which keeps the service always-on.

---

## Frontend — Vercel

### First-time setup on Vercel

1. Go to [vercel.com](https://vercel.com) and create a free account
2. Click **Add New → Project**
3. Import your GitHub repository
4. In **Configure Project**, set the **Root Directory** to `frontend`
5. Under **Environment Variables**, add:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | Your Render backend URL (e.g. `https://website-extractor-backend.onrender.com`) |

6. Click **Deploy**

### Subsequent deploys

Push to the `main` branch on GitHub. Vercel detects the push and automatically builds and deploys the frontend.

Build command (Vercel runs this automatically):
```bash
cd frontend && npm run build
```

### Getting the Render backend URL

After deploying the backend on Render, find the URL in the Render dashboard under your service → **Settings → Service URL**. It looks like:
```
https://website-extractor-backend.onrender.com
```

Copy this into the Vercel `NEXT_PUBLIC_API_URL` environment variable.

---

## Environment Variables Summary

### Backend (Render dashboard)

| Variable | Value | Required |
|---|---|---|
| `PORT` | `4000` | Set in render.yaml |
| `FRONTEND_URL` | Your Vercel URL | Must set manually |

### Frontend (Vercel dashboard)

| Variable | Value | Required |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Your Render backend URL | Must set manually |

---

## Deployment Flow Diagram

```
Push to main on GitHub
  ├─ Render detects push
  │    └─ npm install && npm run build (tsc → dist/)
  │         └─ npm start (node dist/server.js)
  │              └─ Backend live at https://your-service.onrender.com
  │
  └─ Vercel detects push
       └─ next build
            └─ Frontend live at https://your-project.vercel.app
```

---

## Checking Deployment Status

**Backend health check:**
```
GET https://your-service.onrender.com/health
→ { "status": "ok" }
```

**Frontend:** Open your Vercel URL in a browser — the hero page should load with the Prism animation and URL input.

---

## Redeploying Manually

**Render:** Go to your service dashboard → click **Manual Deploy → Deploy latest commit**

**Vercel:** Go to your project → **Deployments** → click the `...` menu on the latest → **Redeploy**
