"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bot, Play, Check, RefreshCw, CircleDashed, Loader, Ban, ChevronRight,
  Server, Zap, FlaskConical, Rocket, ListChecks, Terminal, X, ArrowRight,
} from "lucide-react";

type Task = { id: number; phase: string; title: string; detail: string | null; status: string; progress: number; owner: string; sort: number };
type Run = { id: number; taskId: number | null; action: string; status: string; output: Record<string, unknown>; createdAt: string };
type Status = { service: string; version: string; api: string; env: string; dcbMode: string; db: { latencyMs: number }; counts: Record<string, number> } | null;

const PHASES = [
  ["foundation", "Foundation"], ["wellness", "Wellness Engine"], ["health-sync", "Health Sync"],
  ["billing", "Carrier Billing"], ["mobile", "Mobile App"], ["ops", "Ops & Launch"],
];

const STATUS_ICON: Record<string, typeof Check> = { todo: CircleDashed, doing: Loader, done: Check, blocked: Ban };
const STATUS_STYLE: Record<string, string> = {
  todo: "bg-slate-100 text-slate-600",
  doing: "bg-sky-100 text-sky-700",
  done: "bg-emerald-100 text-emerald-700",
  blocked: "bg-red-100 text-red-700",
};

export default function AgentPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<Status>(null);
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState("");
  const [toast, setToast] = useState("");
  const [lastOut, setLastOut] = useState<Record<string, unknown> | null>(null);

  async function load() {
    const t = await fetch("/api/agent/tasks").then((r) => r.json()).catch(() => null);
    if (t?.ok) { setTasks(t.data.tasks); setProgress(t.data.progress); }
    const r = await fetch("/api/agent/run").then((x) => x.json()).catch(() => null);
    if (r?.ok) setRuns(r.data.runs);
    const s = await fetch("/api/v1/status").then((x) => x.json()).catch(() => null);
    if (s?.ok) setStatus(s.data);
  }

  useEffect(() => {
    fetch("/api/agent/tasks", { method: "POST" }).then(() => load());
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, []);

  async function run(action: string, taskId?: number) {
    setBusy(action + (taskId ?? ""));
    try {
      const r = await fetch("/api/agent/run", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, taskId }),
      });
      const d = await r.json();
      if (d.ok) {
        setLastOut(d.data.run.output);
        setToast(`${action}: ${d.data.run.status}`);
        load();
      } else setToast(d.error?.message || "run failed");
    } finally { setBusy(""); }
  }

  async function setTask(id: number, patch: Partial<Task>) {
    await fetch(`/api/agent/tasks?id=${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
    });
    load();
  }

  const visible = useMemo(
    () => filter === "all" ? tasks : tasks.filter((t) => t.status === filter || t.phase === filter),
    [tasks, filter]
  );
  const done = tasks.filter((t) => t.status === "done").length;

  return (
    <main className="min-h-screen bg-slate-100 pb-20">
      <div className="vital-gradient pb-12 pt-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-emerald-200">
            <Bot size={14} /> Agent mode • autonomous build console
          </p>
          <h1 className="mt-4 max-w-3xl text-3xl font-black leading-tight text-white sm:text-5xl">
            We&apos;re building it. Right now.
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base">
            This console <strong className="text-white">is the build</strong>: live backend status, the 16-task plan across 6 phases,
            one-click smoke tests, sprint automation and an execution log. Hit <strong className="text-white">Start build sprint</strong> and
            watch the plan advance — every action runs against the real backend.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button onClick={() => run("advance")} disabled={busy === "advance"}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-sm font-black text-white hover:bg-emerald-400 disabled:opacity-50">
              <Rocket size={16} /> {busy === "advance" ? "Advancing…" : "Start build sprint"}
            </button>
            <button onClick={() => run("smoke")} disabled={busy === "smoke"}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-5 py-3 text-sm font-black text-white hover:bg-white/10 disabled:opacity-50">
              <FlaskConical size={16} /> {busy === "smoke" ? "Testing…" : "Smoke test"}
            </button>
            <button onClick={() => run("seed-demo")} disabled={busy === "seed-demo"}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-5 py-3 text-sm font-black text-white hover:bg-white/10 disabled:opacity-50">
              <Play size={16} /> Seed demo user
            </button>
            <button onClick={load} className="inline-flex items-center gap-2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20">
              <RefreshCw size={16} />
            </button>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Plan progress", `${progress}%`],
              ["Tasks done", `${done}/${tasks.length}`],
              ["Backend", status ? `${status.version} • ${status.db.latencyMs}ms` : "…"],
              ["DCB mode", status?.dcbMode ?? "…"],
            ].map(([l, v]) => (
              <div key={l} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
                <p className="text-lg font-black text-white">{v}</p>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-8 px-4 pt-8 sm:px-6">
        {/* Backend status */}
        <section className="rounded-3xl bg-slate-900 p-6 text-white">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-extrabold"><Server size={18} className="text-emerald-300" /> Backend live status</h2>
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-black text-emerald-200">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> OPERATIONAL
            </span>
          </div>
          {status ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(status.counts || {}).slice(0, 12).map(([t, c]) => (
                <span key={t} className="rounded-full bg-white/5 px-3 py-1.5 font-mono text-[11px] text-slate-300">
                  {t}: <strong className="text-white">{c as number}</strong>
                </span>
              ))}
              <a href="/api/v1/status" target="_blank" className="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-black text-white">full JSON →</a>
            </div>
          ) : <p className="mt-3 text-sm text-slate-400">Probing backend…</p>}
          {lastOut && (
            <pre className="mt-3 max-h-44 overflow-auto rounded-2xl bg-black/40 p-4 font-mono text-[11px] leading-relaxed text-emerald-200">
              {JSON.stringify(lastOut, null, 2)}
            </pre>
          )}
        </section>

        {/* Task board */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-xl font-black text-slate-900"><ListChecks size={20} className="text-emerald-600" /> Build plan — {tasks.length} tasks</h2>
            <div className="flex gap-1.5 overflow-x-auto">
              {["all", "todo", "doing", "done"].map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`rounded-full px-4 py-2 text-xs font-black ${filter === f ? "bg-slate-900 text-white" : "bg-white text-slate-600"}`}>
                  {f === "all" ? "All" : f}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-white shadow">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {PHASES.map(([pid, pname]) => {
              const items = visible.filter((t) => t.phase === pid);
              if (!items.length) return null;
              const pdone = tasks.filter((t) => t.phase === pid && t.status === "done").length;
              return (
                <div key={pid} className="rounded-3xl bg-white p-5 shadow">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-black uppercase tracking-wide text-slate-900">{pname}</p>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-600">
                      {pdone}/{tasks.filter((t) => t.phase === pid).length}
                    </span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {items.map((t) => {
                      const Icon = STATUS_ICON[t.status] || CircleDashed;
                      return (
                        <div key={t.id} className="rounded-2xl border border-slate-100 p-3">
                          <div className="flex items-start gap-2.5">
                            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${STATUS_STYLE[t.status]}`}>
                              <Icon size={15} className={t.status === "doing" ? "animate-spin" : ""} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-extrabold text-slate-900">{t.title}</p>
                              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{t.detail}</p>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {(["todo", "doing", "done", "blocked"] as const).map((s) => (
                                  <button key={s} onClick={() => setTask(t.id, { status: s, progress: s === "done" ? 100 : s === "todo" ? 0 : 50 })}
                                    className={`rounded-full px-2.5 py-1 text-[10px] font-black ${t.status === s ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                                    {s}
                                  </button>
                                ))}
                                <button onClick={() => run("smoke", t.id)} className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black text-emerald-700">verify ✓</button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Runs + quick ops */}
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl bg-white p-6 shadow">
            <h3 className="flex items-center gap-2 font-extrabold text-slate-900"><Terminal size={18} /> Execution log ({runs.length})</h3>
            <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
              {runs.length === 0 && <p className="text-xs text-slate-500">No runs yet — hit “Start build sprint” or “Smoke test”.</p>}
              {runs.map((r) => (
                <div key={r.id} className="rounded-2xl border border-slate-100 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-xs font-black text-slate-900">#{r.id} {r.action}{r.taskId ? ` (task ${r.taskId})` : ""}</p>
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${r.status === "success" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>{r.status}</span>
                  </div>
                  <p className="mt-1 truncate font-mono text-[10px] text-slate-500">{JSON.stringify(r.output).slice(0, 180)}</p>
                  <p className="text-[10px] text-slate-400">{new Date(r.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="rounded-3xl bg-slate-900 p-6 text-white">
              <h3 className="flex items-center gap-2 font-extrabold"><Zap size={18} className="text-amber-300" /> Quick ops</h3>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  ["Run renewals", "renewals"],
                  ["Settle challenges", "settle"],
                  ["Advance sprint", "advance"],
                  ["Smoke test", "smoke"],
                ].map(([label, action]) => (
                  <button key={action} onClick={() => run(action)} disabled={busy === action}
                    className="rounded-2xl bg-white/10 py-3 text-xs font-black hover:bg-white/20 disabled:opacity-50">
                    {busy === action ? "…" : label}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
                Jobs mirror the cron endpoints: <span className="font-mono">POST /api/v1/jobs?id=renewals</span>. Sprint automation moves the oldest todo → doing → done so the board always reflects reality.
              </p>
            </div>
            <div className="rounded-3xl border-2 border-emerald-300 bg-emerald-50 p-5">
              <p className="text-sm font-extrabold text-slate-900">Next stops on the build →</p>
              <div className="mt-2 space-y-1.5">
                {[
                  ["/architecture", "Backend blueprint — layers, flows, security"],
                  ["/health", "Health Connect sync + auto-verify live"],
                  ["/mobile", "Mobile prototype + install"],
                  ["/developer", "Full source browser + API ref"],
                ].map(([h, t]) => (
                  <Link key={h} href={h} className="flex items-center justify-between rounded-2xl bg-white p-3 text-xs font-extrabold text-slate-800 shadow-sm hover:bg-slate-50">
                    {t} <ChevronRight size={14} className="text-slate-400" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[70] max-w-[94vw] -translate-x-1/2">
          <div className="flex items-center gap-3 rounded-2xl bg-slate-900 py-3 pl-4 pr-5 text-sm font-bold text-white shadow-2xl">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-500"><Check size={16} /></span>
            <span className="break-words">{toast}</span>
            <button onClick={() => setToast("")} className="text-slate-400"><X size={14} /></button>
          </div>
        </div>
      )}
    </main>
  );
}
