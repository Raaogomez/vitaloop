"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Rocket, Laptop, Cloud, Check, Copy, ChevronRight, ChevronDown,
  Terminal, Database, KeyRound, Globe, Smartphone, ListChecks, AlertTriangle,
  ExternalLink, FileCode2, RefreshCw,
} from "lucide-react";
import ExportPanel from "@/components/ExportPanel";

type DoneMap = Record<string, boolean>;
const LS_KEY = "vl_launch_checklist";

function Cmd({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="group relative">
      <pre className="overflow-x-auto rounded-2xl bg-slate-950 p-4 pr-14 font-mono text-[12px] leading-relaxed text-emerald-100">
        {children}
      </pre>
      <button
        onClick={() => {
          navigator.clipboard.writeText(children);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1.5 text-[10px] font-black text-white hover:bg-white/20"
      >
        {copied ? <Check size={11} /> : <Copy size={11} />} {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

function Step({
  id, n, title, time, children, done, toggle,
}: {
  id: string; n: string; title: string; time: string;
  children: React.ReactNode; done: boolean; toggle: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className={`overflow-hidden rounded-3xl border-2 bg-white shadow ${done ? "border-emerald-400" : "border-slate-200"}`}>
      <div className="flex items-center gap-3 p-5">
        <button
          onClick={() => toggle(id)}
          title="Mark done"
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 font-black ${
            done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 text-transparent hover:border-emerald-400"
          }`}
        >
          <Check size={17} />
        </button>
        <button onClick={() => setOpen(!open)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-900 text-sm font-black text-white">{n}</span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-extrabold text-slate-900 sm:text-base">{title}</span>
            <span className="text-[11px] font-bold text-slate-500">{time}</span>
          </span>
        </button>
        <button onClick={() => setOpen(!open)} className="shrink-0 text-slate-400">
          <ChevronDown size={18} className={`transition ${open ? "rotate-180" : ""}`} />
        </button>
      </div>
      {open && <div className="space-y-3 border-t border-slate-100 p-5 pt-4">{children}</div>}
    </div>
  );
}

function P({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-[13px] leading-relaxed text-slate-600 ${className ?? ""}`}>{children}</p>;
}

export default function LaunchPage() {
  const [done, setDone] = useState<DoneMap>({});
  const [os, setOs] = useState<"windows" | "mac" | "linux">("windows");
  const [cloud, setCloud] = useState<"vercel" | "railway" | "vps">("vercel");
  const [fileCount, setFileCount] = useState<number | null>(null);

  useEffect(() => {
    try {
      setDone(JSON.parse(localStorage.getItem(LS_KEY) || "{}"));
    } catch {
      /* ignore */
    }
    fetch("/api/codebase?action=tree")
      .then((r) => r.json())
      .then((d) => d.ok && setFileCount(d.count))
      .catch(() => {});
  }, []);

  function toggle(id: string) {
    setDone((d) => {
      const n = { ...d, [id]: !d[id] };
      localStorage.setItem(LS_KEY, JSON.stringify(n));
      return n;
    });
  }

  const total = 9;
  const doneCount = Object.values(done).filter(Boolean).length;
  const pct = Math.round((doneCount / total) * 100);

  return (
    <main className="min-h-screen bg-slate-100 pb-20">
      <div className="vital-gradient pb-12 pt-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-emerald-200">
            <Rocket size={14} /> Launch guide • Arena → laptop → cloud
          </p>
          <h1 className="mt-4 text-3xl font-black leading-tight text-white sm:text-5xl">
            Take VitalLoop home in 9 steps.
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base">
            This page is your <strong className="text-white">exact exit path out of Arena AI</strong>: download every file,
            run it on your laptop, then deploy web + database to the cloud. Tick steps as you go —
            progress saves in this browser. {fileCount ? <strong className="text-white">{fileCount} source files</strong> : "All source files"} are exportable below.
          </p>
          <div className="mt-5">
            <ExportPanel />
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/developer" className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-xs font-black text-white hover:bg-white/10">
                <FileCode2 size={14} /> Browse files first
              </Link>
            </div>
          </div>
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex justify-between text-xs font-black text-slate-200">
              <span>YOUR EXIT PROGRESS</span>
              <span>{doneCount}/{total} • {pct}%</span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-black/40">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-4 px-4 pt-8 sm:px-6">
        {/* OS + cloud pickers */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-3xl bg-white p-4 shadow">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500"><Laptop size={14} /> My laptop runs…</p>
            <div className="mt-2 flex gap-1.5">
              {(["windows", "mac", "linux"] as const).map((o) => (
                <button key={o} onClick={() => setOs(o)} className={`flex-1 rounded-2xl py-2.5 text-xs font-black ${os === o ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}>
                  {o === "windows" ? "🪟 Windows" : o === "mac" ? "🍎 Mac" : "🐧 Linux"}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-3xl bg-white p-4 shadow">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500"><Cloud size={14} /> I&apos;ll deploy to…</p>
            <div className="mt-2 flex gap-1.5">
              {(["vercel", "railway", "vps"] as const).map((c) => (
                <button key={c} onClick={() => setCloud(c)} className={`flex-1 rounded-2xl py-2.5 text-xs font-black ${cloud === c ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}>
                  {c === "vercel" ? "▲ Vercel" : c === "railway" ? "🚂 Railway" : "🖥️ VPS/Docker"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Step id="s1" n="1" title="Install the tools on your laptop" time="~10 min • one time" done={!!done.s1} toggle={toggle}>
          <P>You need <strong>Node.js 20+</strong>, <strong>Git</strong>, and either <strong>Docker Desktop</strong> (easiest) or <strong>PostgreSQL 16</strong>.</P>
          {os === "windows" && (
            <>
              <P>① Install <strong>Node.js LTS</strong> from <a className="font-bold text-emerald-700 underline" href="https://nodejs.org" target="_blank">nodejs.org <ExternalLink size={11} className="inline" /></a> (accept all defaults — this also gives you npm).</P>
              <P>② Install <strong>Git for Windows</strong> from <a className="font-bold text-emerald-700 underline" href="https://git-scm.com" target="_blank">git-scm.com <ExternalLink size={11} className="inline" /></a> (this gives you <strong>Git Bash</strong> — use it for every command below).</P>
              <P>③ Install <strong>Docker Desktop</strong> from <a className="font-bold text-emerald-700 underline" href="https://docker.com/products/docker-desktop" target="_blank">docker.com <ExternalLink size={11} className="inline" /></a> and start it. <em>Skip Docker only if you prefer manual Postgres.</em></P>
              <Cmd>{`node -v   # want v20 or higher\nnpm -v\ngit --version\ndocker --version   # if using Docker`}</Cmd>
            </>
          )}
          {os === "mac" && (
            <>
              <P>① Install Homebrew (if missing): <strong>/bin/bash -c &quot;$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)&quot;</strong></P>
              <Cmd>{`brew install node git\n# then either Docker Desktop from docker.com, or:\nbrew install postgresql@16\nbrew services start postgresql@16\nnode -v && psql --version`}</Cmd>
            </>
          )}
          {os === "linux" && (
            <Cmd>{`# Ubuntu / Debian\nsudo apt update && sudo apt install -y nodejs npm git postgresql\n# …or install Docker from docs.docker.com\nnode -v && psql --version`}</Cmd>
          )}
        </Step>

        <Step id="s2" n="2" title="Get ALL the code onto your laptop" time="~2 min • download OR copy-paste" done={!!done.s2} toggle={toggle}>
          <P>Use the export panel below — it gives you <strong>everything</strong> (frontend, backend, database schema, Docker files, PWA manifest, mobile bridge code — {fileCount ?? "60+"} files, nothing left behind) in <strong>3 ways</strong>. If the download buttons do nothing in this preview frame, use the <strong>copy-paste command</strong> — it needs no download at all.</P>
          <ExportPanel compact />
          <div className="flex items-start gap-2 rounded-2xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            <span><strong>What you get:</strong> the <strong>.sh / curl method</strong> recreates the whole folder automatically (Step 3). The <strong>.txt bundle</strong> is a human-readable backup where each file sits between <span className="font-mono">===== FILE: path =====</span> markers.</span>
          </div>
        </Step>

        <Step id="s3" n="3" title="Rebuild the project folder on your laptop" time="~3 min" done={!!done.s3} toggle={toggle}>
          <P><strong>If you used the copy-paste command in Step 2:</strong> you&apos;re already done — the folder exists. Just verify:</P>
          <Cmd>{`cd vitaloop\nls          # you should see package.json, src/, public/, Dockerfile …\ncat README.md | head -n 30`}</Cmd>
          <P><strong>If you downloaded vitaloop-rebuild.sh instead:</strong> open your terminal ({os === "windows" ? <strong>Git Bash</strong> : <strong>Terminal</strong>}), go to your Downloads folder, and run:</P>
          <Cmd>{`bash vitaloop-rebuild.sh vitaloop\ncd vitaloop\nls`}</Cmd>
          <P>Put it under version control immediately (this is also how you&apos;ll deploy):</P>
          <Cmd>{`git init\ngit add -A\ngit commit -m "VitalLoop import from Arena"`}</Cmd>
        </Step>

        <Step id="s4" n="4" title="Create your LOCAL environment (.env + database)" time="~5 min" done={!!done.s4} toggle={toggle}>
          <P className="flex items-center gap-1.5"><KeyRound size={14} /> Every secret lives in <strong>.env</strong> (never committed — it&apos;s in .gitignore). Start from the template:</P>
          <Cmd>{`cp .env.example .env\n# Windows CMD: copy .env.example .env`}</Cmd>
          <P><strong>Path A — Docker (recommended):</strong> the defaults just work. Then:</P>
          <Cmd>{`docker compose up --build\n# app → http://localhost:3000`}</Cmd>
          <P><strong>Path B — Manual Postgres:</strong> create the DB, edit <span className="font-mono">.env</span> + <span className="font-mono">drizzle.config.json</span> so both point at it:</P>
          <Cmd>{`createdb vitaloop\n# edit .env: DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/vitaloop\nnpm install\nnpx drizzle-kit push\nnpm run dev   # → http://localhost:3000`}</Cmd>
          <P>Generate real secrets for later (paste into <span className="font-mono">.env</span> now, reuse in cloud at Step 6):</P>
          <Cmd>{`openssl rand -base64 32   # run 4× → SESSION_SECRET, ADMIN_KEY, CRON_SECRET, TELCO_WEBHOOK_SECRET`}</Cmd>
        </Step>

        <Step id="s5" n="5" title="Verify your laptop build works" time="~5 min" done={!!done.s5} toggle={toggle}>
          <P>With the app running, open these in order. Each must succeed before moving on:</P>
          <Cmd>{`curl http://localhost:3000/api/health\n# → {"ok":true,"service":"vitalloop-backend",...}\n\ncurl -X POST http://localhost:3000/api/seed\n# → seeds 14 activities, 3 plans, 6 challenges, 6 tips\n\ncurl http://localhost:3000/api/v1/status\n# → table counts + services list`}</Cmd>
          <P>Then in the browser: <strong>/</strong> (landing) → <strong>/agent</strong> → <strong>Smoke test</strong> → <strong>/app</strong> (log an activity) → <strong>/health</strong> → <strong>Demo week</strong> (sensor sync). If all render, your laptop environment is perfect. ✅</P>
        </Step>

        <Step id="s6" n="6" title="Create your CLOUD environment (database + hosting)" time="~20 min" done={!!done.s6} toggle={toggle}>
          <P className="flex items-center gap-1.5"><Database size={14} /> <strong>6a. Cloud Postgres</strong> — sign up at <a className="font-bold text-emerald-700 underline" href="https://neon.tech" target="_blank">Neon <ExternalLink size={11} className="inline" /></a> (free) → New Project → copy the <strong>pooled connection string</strong> (ends <span className="font-mono">?sslmode=require</span>). Supabase or Railway Postgres work identically.</P>
          <P><strong>6b. Push code to GitHub</strong> — create an empty repo, then:</P>
          <Cmd>{`git remote add origin https://github.com/YOU/vitaloop.git\ngit branch -M main\ngit push -u origin main`}</Cmd>
          {cloud === "vercel" && (
            <>
              <P><strong>6c. Deploy on Vercel</strong> — <a className="font-bold text-emerald-700 underline" href="https://vercel.com" target="_blank">vercel.com <ExternalLink size={11} className="inline" /></a> → Add New → Project → Import your repo → Framework: Next.js. Add these <strong>Environment Variables</strong>:</P>
              <Cmd>{`DATABASE_URL=<your-neon-pooled-string>\nSESSION_SECRET=<openssl-output-1>\nADMIN_KEY=<openssl-output-2>\nCRON_SECRET=<openssl-output-3>\nTELCO_WEBHOOK_SECRET=<openssl-output-4>\nDCB_MODE=simulator\nNODE_ENV=production`}</Cmd>
              <P>Hit <strong>Deploy</strong> → you get <span className="font-mono">https://vitaloop-xxx.vercel.app</span>.</P>
            </>
          )}
          {cloud === "railway" && (
            <>
              <P><strong>6c. Deploy on Railway</strong> — <a className="font-bold text-emerald-700 underline" href="https://railway.app" target="_blank">railway.app <ExternalLink size={11} className="inline" /></a> → New Project → Deploy from GitHub → select repo → add the same 7 env vars above (Railway can also <em>provision Postgres for you</em> — then copy its DATABASE_URL). Railway auto-builds the Dockerfile.</P>
            </>
          )}
          {cloud === "vps" && (
            <>
              <P><strong>6c. Deploy on any VPS / Docker host</strong> (DigitalOcean, Hetzner, AWS…) — copy the folder up, then:</P>
              <Cmd>{`# on the server:\ncp .env.example .env   # fill with CLOUD values\nnano .env              # paste Neon URL + fresh secrets\ndocker compose up -d --build\ndocker compose ps      # app:3000 healthy`}</Cmd>
            </>
          )}
          <P><strong>6d. Migrate + seed the CLOUD database</strong> (from your laptop, pointed at Neon):</P>
          <Cmd>{`DATABASE_URL="<neon-string>" npx drizzle-kit push\ncurl -X POST https://<your-cloud-host>/api/seed\ncurl https://<your-cloud-host>/api/health`}</Cmd>
        </Step>

        <Step id="s7" n="7" title="Wire cron jobs + your domain" time="~10 min" done={!!done.s7} toggle={toggle}>
          <P className="flex items-center gap-1.5"><RefreshCw size={14} /> Billing renewals and challenge settlement run as cron jobs. Schedule both (Vercel → Settings → Cron, or free <a className="font-bold text-emerald-700 underline" href="https://cron-job.org" target="_blank">cron-job.org <ExternalLink size={11} className="inline" /></a>):</P>
          <Cmd>{`POST https://<host>/api/v1/jobs?id=renewals\n  header: x-cron-secret: <CRON_SECRET>   every 15 min\n\nPOST https://<host>/api/v1/jobs?id=challenge-settlement\n  header: x-cron-secret: <CRON_SECRET>   hourly`}</Cmd>
          <P className="flex items-center gap-1.5"><Globe size={14} /> <strong>Custom domain:</strong> Vercel/Railway → Settings → Domains → add <span className="font-mono">app.yourdomain.com</span> → create the CNAME record at your registrar → HTTPS is automatic. Test PWA install from the real domain on Android Chrome.</P>
        </Step>

        <Step id="s8" n="8" title="Ship the mobile app" time="PWA: 0 days • Expo: ~2 wks" done={!!done.s8} toggle={toggle}>
          <P className="flex items-center gap-1.5"><Smartphone size={14} /> <strong>Today (PWA):</strong> open <span className="font-mono">https://&lt;host&gt;/mobile</span> on Android Chrome → ⋮ → <strong>Install app</strong>. Manifest + icons ship in this repo.</P>
          <P><strong>Store build (Expo):</strong> copy the bridge from <strong>/developer → Mobile tab</strong> (<span className="font-mono">react-native-health-connect</span>), set API base to your cloud URL, then:</P>
          <Cmd>{`npx create-expo-app vitaloop-mobile\nnpx expo install react-native-health-connect\n# paste bridge from /developer, set API_URL=https://<host>\nnpx eas build -p android --profile preview`}</Cmd>
          <P>Same backend for all shells: <span className="font-mono">POST /api/v1/mobile/bootstrap</span> → <span className="font-mono">POST /api/v1/mobile/sync</span>. Play Store review needs the Data Safety form for heart-rate/sleep scopes (copy already in /mobile).</P>
        </Step>

        <Step id="s9" n="9" title="Go-live checklist — confirm you're outside Arena" time="~10 min" done={!!done.s9} toggle={toggle}>
          <P className="flex items-center gap-1.5"><ListChecks size={14} /> Final gate. Every box must be true:</P>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              "Laptop: npm run build passes",
              "Code pushed to my own GitHub",
              "Cloud DB migrated + seeded",
              "Cloud /api/health → ok:true",
              "Secrets rotated (no dev-* in cloud)",
              "Cron jobs scheduled + 200 OK",
              "Custom domain + HTTPS live",
              "PWA installs on a real phone",
            ].map((c) => (
              <div key={c} className="flex items-center gap-2 rounded-2xl bg-slate-50 p-3 text-xs font-bold text-slate-700">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-500 text-white"><Check size={12} /></span>
                {c}
              </div>
            ))}
          </div>
          <div className="rounded-2xl bg-slate-900 p-4 text-center text-sm font-black text-white">
            🎉 All green? You are <span className="text-emerald-300">100% outside Arena AI</span> — product live on your own infra.
          </div>
        </Step>

        {/* Troubleshooting */}
        <div className="rounded-3xl bg-white p-6 shadow">
          <h3 className="flex items-center gap-2 font-extrabold text-slate-900"><Terminal size={18} /> Stuck? 60-second fixes</h3>
          <div className="mt-3 grid gap-2 text-xs leading-relaxed md:grid-cols-2">
            {[
              ["No download window appears", "The preview frame blocks downloads. Use the copy-paste command in Step 2 (no download needed) or “Open in new tab” and download there."],
              ["curl: command not found", "Windows: use Git Bash, or switch to the PowerShell one-liner. Mac/Linux: curl is preinstalled."],
              ["DATABASE_URL is required", "You forgot cp .env.example .env, or didn't set env vars in the cloud dashboard."],
              ["drizzle-kit push fails", "Postgres isn't running / URL wrong. Also mirror the URL in drizzle.config.json for local."],
              ["Empty catalogue pages", "POST /api/seed once (first visit usually auto-seeds)."],
              ["x-admin-key 403", "Set ADMIN_KEY and send header x-admin-key."],
              ["Jobs 403", "Send x-cron-secret header matching CRON_SECRET."],
              ["base64 -d fails (Windows)", "Use Git Bash, not CMD — or use the PowerShell one-liner which needs no base64."],
              ["Port 3000 busy", "PORT=3100 npm run dev, or stop the other container."],
              ["Bundle looks huge", "Normal (~60+ files). Prefer the .sh / curl method."],
            ].map(([t, d]) => (
              <div key={t} className="rounded-2xl bg-slate-50 p-3">
                <p className="font-extrabold text-slate-900">{t}</p>
                <p className="mt-0.5 text-slate-600">{d}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/developer" className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-xs font-black text-white">
              Open code browser <ChevronRight size={14} />
            </Link>
            <Link href="/architecture" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-black text-slate-800 shadow">
              Architecture blueprint
            </Link>
            <Link href="/agent" className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-xs font-black text-white">
              Agent console <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
