# VitalLoop — Everyday Wellness on Carrier Billing

Interactive e-health app that turns everyday activities (walking, stairs, chores, dance,
hydration, sleep…) into a measurable **Vitality Score**, verified by **Google Health Connect**
sensors + photo / timer / peer proofs, and monetized through **Direct Carrier Billing** —
no bank card needed.

> **Stack:** Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · Drizzle ORM · PostgreSQL 16
> **This repo runs identically on your laptop, in Docker, and in the cloud.**

---

## 1. Get the code onto your laptop

You have **4 ways** (pick one — A recommended):

### Option A — Copy-paste one-liner (no download needed) ⭐
In the running Arena app open **`/launch`** → copy the command for your system.
It pulls every file straight from the app. Examples (your URL is pre-filled in the UI):

```bash
# Git Bash / macOS / Linux:
curl -fsSL "https://YOUR-ARENA-URL/api/codebase?action=rebuild" | bash -s vitaloop
cd vitaloop
```

```powershell
# Windows PowerShell (no extra tools):
$base="https://YOUR-ARENA-URL"; $t="vitaloop"; $d=(Invoke-RestMethod "$base/api/codebase?action=export-json"); foreach($f in $d.files){$p=Join-Path $t $f.path; $dir=Split-Path $p; if($dir){New-Item -ItemType Directory -Force -Path $dir | Out-Null}; [IO.File]::WriteAllText($p,$f.content)}
cd vitaloop
```

> If a download button does nothing: the Arena preview frame blocks download
> popups by design. The commands above (or “Open in new tab” on `/launch`)
> bypass that entirely.

### Option B — Downloaded rebuild script
1. On **`/launch`** click **Download vitaloop-rebuild.sh**
   (or open `/api/codebase?action=rebuild` in a **new browser tab**).
2. On your laptop:
   ```bash
   bash vitaloop-rebuild.sh vitaloop
   cd vitaloop
   ```

### Option C — Full bundle file
1. Download `/api/codebase?action=bundle` → `vitaloop-prototype.txt`.
2. Each file is delimited by `===== FILE: <path> =====` — recreate them,
   or use Option A instead (recommended).

### Option D — Copy per file
1. Open `/developer` → Source tab → click any file → **Copy file**.
2. Recreate the same folder structure locally.

Then put it under git (recommended):
```bash
cd vitaloop
git init && git add -A && git commit -m "VitalLoop import"
```

---

## 2. Run locally (pick Docker or Manual)

### Prerequisites
- **Node.js 20+** (`node -v`) — download from https://nodejs.org
- **Git** (optional but recommended)
- Either **Docker Desktop** (easiest) or **PostgreSQL 16** installed locally

### Option 1 — Docker (one command, recommended)
```bash
cp .env.example .env        # edit secrets if you like
docker compose up --build
# → app: http://localhost:3000
# → health: http://localhost:3000/api/health
```
First boot: the app auto-seeds the catalogue on first page visit.
To seed explicitly:
```bash
curl -X POST http://localhost:3000/api/seed
```

### Option 2 — Manual (Node + local Postgres)
```bash
# 1. database
createdb vitaloop            # or: psql -c "CREATE DATABASE vitaloop;"

# 2. env
cp .env.example .env
# edit .env → DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/vitaloop
# also update drizzle.config.json dbCredentials.url to match

# 3. install + migrate + run
npm install
npx drizzle-kit push
curl -X POST http://localhost:3000/api/seed   # after dev starts (or visit / in browser)
npm run dev
# → http://localhost:3000
```

### Verify local install
| Check | URL / command |
|---|---|
| Liveness | `GET /api/health` → `{ ok: true }` |
| Backend status | `GET /api/v1/status` |
| Seed catalogue | `POST /api/seed` |
| Agent console | `/agent` → Smoke test |
| Mobile prototype | `/mobile` |
| API docs | `/api/v1/openapi` |

---

## 3. Deploy to the cloud (web app live on the internet)

**Recommended pairing:** **Vercel** (app) + **Neon** (Postgres). Free tiers work.
Alternatives: Railway, Render, Fly.io (all support the included `Dockerfile`).

### Step 1 — Create cloud Postgres (Neon example)
1. Sign up at https://neon.tech → New project → region closest to users.
2. Copy the **pooled connection string**, e.g.
   `postgresql://user:pass@host/neondb?sslmode=require`
3. Keep it — this becomes cloud `DATABASE_URL`.

### Step 2 — Push code to GitHub
```bash
git remote add origin https://github.com/YOU/vitaloop.git
git push -u origin main
```

### Step 3 — Deploy app (Vercel example)
1. https://vercel.com → Add New → Project → Import your GitHub repo.
2. Framework preset: **Next.js** (auto-detected).
3. **Environment variables** — add:
   - `DATABASE_URL` = Neon connection string
   - `SESSION_SECRET` = `openssl rand -base64 32`
   - `ADMIN_KEY` = long random
   - `CRON_SECRET` = long random
   - `TELCO_WEBHOOK_SECRET` = long random
   - `DCB_MODE` = `simulator`
   - `NODE_ENV` = `production`
4. Deploy → you get `https://vitaloop-xxx.vercel.app`.

### Step 4 — Migrate + seed cloud DB
From your laptop (pointed at cloud):
```bash
DATABASE_URL="<neon-string>" npx drizzle-kit push
curl -X POST https://vitaloop-xxx.vercel.app/api/seed
curl https://vitaloop-xxx.vercel.app/api/health
```

### Step 5 — Cron jobs (renewals + settlement)
Vercel → Project → Settings → Cron Jobs (or use https://cron-job.org free):
- `POST https://<host>/api/v1/jobs?id=renewals` — every 15 min — header `x-cron-secret: <CRON_SECRET>`
- `POST https://<host>/api/v1/jobs?id=challenge-settlement` — hourly

### Step 6 — Custom domain (optional)
Vercel → Settings → Domains → add `app.yourdomain.com` → add the DNS CNAME
record at your registrar → HTTPS is automatic.

### Docker hosts (Railway / Render / Fly / VPS) instead of Vercel
The repo ships a production `Dockerfile` + `docker-compose.yml`:
```bash
docker build -t vitaloop .
docker run -p 3000:3000 --env-file .env vitaloop
```
Set the same env vars in the host dashboard. Healthcheck path: `/api/health`.

---

## 4. Mobile app

| Path | What | Time |
|---|---|---|
| **PWA (now)** | `/mobile` + `/manifest.webmanifest` — Android Chrome → ⋮ → *Install app*. Works offline for shell; Health Connect needs the native shell below. | 0 days |
| **Expo (recommended)** | Copy the bridge in `/developer` → Mobile tab (`react-native-health-connect`), point API base at your cloud URL, `eas build`. | ~2 weeks |
| **Capacitor** | Wrap this Next.js export, add HC plugin. | ~1 week |

All shells use the same backend: `POST /api/v1/mobile/bootstrap` then
`POST /api/v1/mobile/sync` (offline queue, idempotent).

---

## 5. Environment variables

| Var | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection |
| `SESSION_SECRET` | yes (prod) | Signs `vl1.*` mobile sessions |
| `ADMIN_KEY` | yes (prod) | Guards `/api/v1/admin/*` |
| `CRON_SECRET` | yes (prod) | Guards `/api/v1/jobs` |
| `TELCO_WEBHOOK_SECRET` | when live billing | HMAC for `/api/v1/webhooks/dcb` |
| `DCB_MODE` | no | `simulator` \| `sandbox` \| `live` |
| `PORT` | no | default 3000 |

Generate secrets: `openssl rand -base64 32` (Git Bash on Windows includes it).

---

## 6. Project map

```
src/
  app/            pages: / /app /health /billing /verification /mobile /agent /architecture /developer /insights
  app/api/        15 backend routes + v1 + agent (see /api/v1/openapi)
  server/         layered backend: config, logger, errors, http, auth, validation, services/*
  lib/            dcb, vitality scoring, verification engine, healthconnect, data
  db/             schema.ts (18 tables) + index.ts (pool)
public/manifest.webmanifest   PWA install file
Dockerfile / docker-compose.yml / .env.example
```

---

## 7. Troubleshooting

| Symptom | Fix |
|---|---|
| `DATABASE_URL is required` | You forgot `cp .env.example .env` / didn't set env in cloud dashboard |
| `drizzle-kit push` fails | Postgres not running; wrong URL; also update `drizzle.config.json` URL for local |
| Pages show empty catalogue | `POST /api/seed` (first visit normally auto-seeds) |
| `x-admin-key` 403 | Set `ADMIN_KEY` and send header `x-admin-key` |
| Jobs 403 | Send `x-cron-secret` header matching `CRON_SECRET` |
| Windows `base64 -d` fails | Use Git Bash (compatible) or WSL2 |
| Port 3000 busy | `PORT=3100 npm run dev` |

---

## 8. Go-live checklist (outside Arena)

- [ ] Code on laptop + `npm run build` passes
- [ ] Pushed to GitHub
- [ ] Cloud Postgres created, `drizzle-kit push` + `/api/seed` done
- [ ] Cloud app deployed, `/api/health` → ok:true
- [ ] Secrets rotated (no `dev-*` values in cloud)
- [ ] Cron jobs scheduled
- [ ] Custom domain + HTTPS
- [ ] PWA install tested on Android
- [ ] DCB aggregator sandbox credentials stored (when ready)

**You are now fully outside Arena AI.** 🎉
