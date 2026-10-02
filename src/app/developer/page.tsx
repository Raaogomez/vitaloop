"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Code2, Copy, Check, FolderTree, Server, Smartphone,
  HeartPulse, CreditCard, ShieldCheck, Search, ChevronRight, FileCode2,
  Terminal, Layers, Zap,
} from "lucide-react";
import { KOTLIN_SNIPPET, EXPO_SNIPPET, PWA_SNIPPET } from "@/lib/healthconnect";
import ExportPanel from "@/components/ExportPanel";

type FileEntry = { path: string; bytes: number };

const API_DOCS = [
  { m: "POST", p: "/api/seed", d: "Seed activities, plans, challenges, tips (idempotent-ish)" },
  { m: "GET", p: "/api/activities", d: "14-activity catalogue" },
  { m: "GET", p: "/api/plans", d: "DCB sachet plans" },
  { m: "GET/POST", p: "/api/subscribers", d: "MSISDN identity — create or fetch profile (auto operator detect)" },
  { m: "GET/POST/DELETE", p: "/api/logs", d: "Log activity → instant 8-check fraud screen + level assignment" },
  { m: "GET/POST", p: "/api/verify", d: "Attach evidence (photo/timer/peer/sensor) → upgrade to ★/◆ + trust" },
  { m: "GET", p: "/api/fraud", d: "Platform fraud dashboard aggregates" },
  { m: "GET/POST", p: "/api/challenges", d: "Challenge catalogue + join (verified-points progress)" },
  { m: "GET", p: "/api/tips", d: "Health education library" },
  { m: "GET/POST/PATCH", p: "/api/subscriptions", d: "DCB subscribe (HE+PIN+charge), renew, STOP/cancel" },
  { m: "GET", p: "/api/transactions", d: "Billing ledger per MSISDN" },
  { m: "GET", p: "/api/stats", d: "Platform KPIs" },
  { m: "GET/POST/DELETE", p: "/api/health-connect", d: "Health Connect: connect, sync/ingest, aggregate, auto-verify ◆, demo-seed, disconnect" },
  { m: "GET", p: "/api/codebase", d: "Export engine: ?action=tree|read|bundle|rebuild|export-json (CORS open for laptop scripts)" },
  { m: "GET", p: "/api/health", d: "DB liveness probe" },
];

function Snippet({ title, code, lang }: { title: string; code: string; lang: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="overflow-hidden rounded-2xl bg-slate-950">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
        <p className="text-xs font-black text-slate-200">{title} <span className="ml-1 rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">{lang}</span></p>
        <button onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-black text-white hover:bg-white/20">
          {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="max-h-80 overflow-auto p-4 font-mono text-[11px] leading-relaxed text-emerald-100">{code}</pre>
    </div>
  );
}

export default function DeveloperPage() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [section, setSection] = useState<"code" | "api" | "mobile">("code");

  useEffect(() => {
    fetch("/api/codebase?action=tree").then((r) => r.json()).then((d) => {
      if (d.ok) {
        setFiles(d.files);
        const first = (d.files as FileEntry[]).find((f) => f.path === "src/lib/healthconnect.ts")?.path || d.files[0]?.path;
        if (first) openFile(first);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openFile(path: string) {
    setActive(path); setLoading(true);
    try {
      const r = await fetch(`/api/codebase?action=read&path=${encodeURIComponent(path)}`);
      const d = await r.json();
      setContent(d.ok ? d.content : `// failed to load ${path}`);
    } finally { setLoading(false); }
  }

  const filtered = useMemo(() => {
    if (!query) return files;
    return files.filter((f) => f.path.toLowerCase().includes(query.toLowerCase()));
  }, [files, query]);

  const groups = useMemo(() => {
    const g: Record<string, FileEntry[]> = {};
    for (const f of filtered) {
      const top = f.path.split("/").slice(0, 3).join("/");
      (g[top] ||= []).push(f);
    }
    return g;
  }, [filtered]);

  return (
    <main className="min-h-screen bg-slate-100 pb-20">
      <div className="vital-gradient pb-12 pt-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-violet-300/30 bg-violet-400/10 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-violet-200">
            <Code2 size={14} /> Developer handoff • full-stack prototype source
          </p>
          <h1 className="mt-4 max-w-3xl text-3xl font-black leading-tight text-white sm:text-5xl">
            Every line of VitalLoop, browsable and copyable.
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base">
            This page <strong className="text-white">is the codebase delivery</strong>: {files.length} source files served live from the running app —
            frontend, backend, schema, Health Connect bridge and mobile shells. Browse below, copy per-file, or download the one-shot bundle.
            Stack: <strong className="text-white">Next.js 16 (App Router) + React 19 + Tailwind 4 + Drizzle ORM + PostgreSQL</strong>.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <a href="/launch" className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-6 py-3 text-sm font-black text-slate-950 hover:bg-amber-300">
              🚀 Launch guide: laptop → cloud
            </a>
            <div className="flex gap-1 rounded-full bg-white/10 p-1">
              {(["code", "api", "mobile"] as const).map((s) => (
                <button key={s} onClick={() => setSection(s)} className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-wide ${section === s ? "bg-white text-slate-900" : "text-slate-300"}`}>
                  {s === "code" ? "Source" : s === "api" ? "API ref" : "Mobile"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-4 px-4 pt-8 sm:px-6">
        <ExportPanel compact />
        {section === "code" && (
          <div className="grid gap-4 lg:grid-cols-5">
            <div className="rounded-3xl bg-white p-4 shadow lg:col-span-2">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${files.length} files…`}
                  className="w-full rounded-2xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm font-semibold" />
              </div>
              <div className="mt-3 max-h-[560px] space-y-4 overflow-y-auto pr-1">
                {Object.entries(groups).map(([g, fs]) => (
                  <div key={g}>
                    <p className="flex items-center gap-1.5 px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <FolderTree size={12} /> {g}
                    </p>
                    <div className="mt-1.5 space-y-1">
                      {fs.map((f) => (
                        <button key={f.path} onClick={() => openFile(f.path)}
                          className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold ${active === f.path ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-700 hover:bg-slate-100"}`}>
                          <FileCode2 size={13} className={active === f.path ? "text-emerald-300" : "text-slate-400"} />
                          <span className="min-w-0 flex-1 truncate">{f.path}</span>
                          <span className="text-[10px] opacity-60">{(f.bytes / 1024).toFixed(1)}k</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="overflow-hidden rounded-3xl bg-white shadow lg:col-span-3">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
                <p className="truncate font-mono text-xs font-bold text-slate-700">{active || "—"}</p>
                <button onClick={() => { navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                  className="flex shrink-0 items-center gap-1.5 rounded-full bg-slate-900 px-3.5 py-1.5 text-[11px] font-black text-white">
                  {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copied!" : "Copy file"}
                </button>
              </div>
              <pre className="max-h-[600px] overflow-auto bg-slate-950 p-5 font-mono text-[11.5px] leading-relaxed text-emerald-100">
                {loading ? "// loading…" : content || "// select a file"}
              </pre>
            </div>
          </div>
        )}

        {section === "api" && (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl bg-white p-6 shadow">
              <h2 className="flex items-center gap-2 font-extrabold text-slate-900"><Server size={18} className="text-emerald-600" /> Backend API reference (15 routes)</h2>
              <p className="mt-1 text-xs text-slate-500">Base URL: same origin. All JSON. MSISDN is the identity key; subscriberId joins everything.</p>
              <div className="mt-4 space-y-2">
                {API_DOCS.map((a) => (
                  <div key={a.p} className="rounded-2xl border border-slate-100 p-3">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-black ${a.m.startsWith("GET") ? "bg-sky-100 text-sky-700" : a.m.startsWith("POST") ? "bg-emerald-100 text-emerald-700" : "bg-violet-100 text-violet-700"}`}>{a.m}</span>
                      <span className="font-mono text-xs font-bold text-slate-900">{a.p}</span>
                    </p>
                    <p className="mt-1 text-xs text-slate-600">{a.d}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-3xl bg-slate-900 p-6 text-white">
                <h3 className="flex items-center gap-2 font-extrabold"><Layers size={18} className="text-emerald-300" /> Data model (12 tables)</h3>
                <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-[11px]">
                  {[
                    ["subscribers", "MSISDN identity + trust"],
                    ["wellness_activities", "14-activity catalogue"],
                    ["wellness_logs", "logs + levels + flags"],
                    ["verification_evidence", "proof attachments"],
                    ["fraud_events", "screening audit"],
                    ["health_connections", "HC device links"],
                    ["health_records", "sensor aggregates"],
                    ["health_syncs", "sync run history"],
                    ["dcb_plans", "sachet plans"],
                    ["dcb_subscriptions", "carrier subs"],
                    ["dcb_transactions", "billing ledger"],
                    ["challenges + enrollments", "verified progress"],
                  ].map(([t, d]) => (
                    <div key={t} className="rounded-xl bg-white/5 p-2.5">
                      <p className="font-black text-emerald-300">{t}</p>
                      <p className="font-sans text-[10px] text-slate-400">{d}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[11px] leading-relaxed text-slate-400">Schema: <span className="font-mono text-slate-200">src/db/schema.ts</span> → <span className="font-mono text-slate-200">npx drizzle-kit push</span>. Connection: <span className="font-mono text-slate-200">src/db/index.ts</span> via DATABASE_URL.</p>
              </div>
              <div className="rounded-3xl border-2 border-emerald-300 bg-emerald-50 p-6">
                <h3 className="flex items-center gap-2 font-extrabold text-slate-900"><Terminal size={18} /> Run it locally in 4 commands</h3>
                <pre className="mt-3 overflow-x-auto rounded-2xl bg-slate-950 p-4 font-mono text-[11px] leading-relaxed text-emerald-100">
{`git init vitaloop && cd vitaloop
# paste files from the Source tab (same paths)
npm install && cp .env.example .env  # DATABASE_URL=postgres://…
npx drizzle-kit push && npm run dev
# → http://localhost:3000  (seed runs automatically)`}</pre>
              </div>
            </div>
          </div>
        )}

        {section === "mobile" && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              {[
                ["PWA (live now)", "Manifest + install prompt + offline log queue. No store, works from operator portals.", Smartphone],
                ["Expo + Health Connect", "React Native shell, native HC read, background sync. Recommended store path.", HeartPulse],
                ["DCB + verification intact", "Same MSISDN identity, same /api/*, same ◆ engine — shells are thin.", ShieldCheck],
              ].map(([t, d, Icon]) => {
                const I = Icon as typeof Smartphone;
                return (
                  <div key={t as string} className="rounded-3xl bg-white p-5 shadow">
                    <I size={20} className="text-emerald-600" />
                    <p className="mt-2 text-sm font-extrabold text-slate-900">{t as string}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{d as string}</p>
                  </div>
                );
              })}
            </div>
            <Snippet title="Expo bridge — connect + daily sync" lang="TypeScript" code={EXPO_SNIPPET} />
            <Snippet title="Native Android client — Health Connect read" lang="Kotlin" code={KOTLIN_SNIPPET} />
            <Snippet title="PWA shell — install + offline queue + TWA note" lang="JavaScript" code={PWA_SNIPPET} />
            <div className="flex items-center gap-2 rounded-2xl bg-slate-900 p-4 text-xs text-slate-300">
              <CreditCard size={16} className="shrink-0 text-emerald-300" />
              Carrier-billing stays server-side in all shells: the app only ever sends MSISDN + planCode; the operator consent/charge flow runs in /billing and /api/subscriptions. No secrets ship in the client.
              <a href="/mobile" className="ml-auto flex shrink-0 items-center gap-1 rounded-full bg-emerald-500 px-4 py-2 text-xs font-black text-white">Open mobile prototype <ChevronRight size={14} /></a>
            </div>
          </div>
        )}

        {/* stack strip */}
        <div className="mt-6 flex flex-wrap items-center gap-2 rounded-3xl bg-white p-4 shadow">
          <Zap size={16} className="text-amber-500" />
          {["Next.js 16 App Router", "React 19", "Tailwind 4", "Drizzle ORM", "PostgreSQL", "Health Connect", "DCB simulator", "PWA-ready", "Recharts"].map((t) => (
            <span key={t} className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-black text-slate-700">{t}</span>
          ))}
        </div>
      </div>
    </main>
  );
}
