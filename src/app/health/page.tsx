"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  HeartPulse, Smartphone, Check, X, RefreshCw, Footprints, Moon, Flame,
  Droplets, Activity, ShieldCheck, Star, ChevronRight, Unplug, Database,
  Watch, Lock, ArrowRight, Zap, Info,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area,
} from "recharts";
import { HC_RECORD_TYPES, ACTIVITY_SENSOR_MAP, HC_READ_SCOPES } from "@/lib/healthconnect";

type Conn = { id: number; provider: string; deviceName: string; status: string; scopes: string[]; lastSyncAt: string | null; totalRecords: number; autoVerify: boolean };
type Rec = { id: number; recordType: string; value: number; unit: string; startTime: string; endTime: string; sourceApp: string; matchedLogId: number | null };
type Outcome = { logId: number; activityKey: string; matched: boolean; newLevel: string; sensorSummary: string; bonusPoints: number };

export default function HealthConnectPage() {
  const [msisdn, setMsisdn] = useState("");
  const [subscriberId, setSubscriberId] = useState<number | null>(null);
  const [subscriber, setSubscriber] = useState<{ msisdn: string; operator: string } | null>(null);
  const [conns, setConns] = useState<Conn[]>([]);
  const [recordCount, setRecordCount] = useState(0);
  const [records, setRecords] = useState<Rec[]>([]);
  const [daily, setDaily] = useState<{ day: string; Steps: number; Distance: number; ActiveCaloriesBurned: number; FloorsClimbed: number; Hydration: number; SleepSession: number }[]>([]);
  const [byType, setByType] = useState<{ type: string; total: number; count: number }[]>([]);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [syncs, setSyncs] = useState<{ id: number; recordsStored: number; logsAutoVerified: number; createdAt: string }[]>([]);
  const [typeFilter, setTypeFilter] = useState("All");
  const [busy, setBusy] = useState("");
  const [toast, setToast] = useState("");
  const [step, setStep] = useState(1);

  useEffect(() => {
    const saved = localStorage.getItem("vl_msisdn");
    if (saved) { setMsisdn(saved.replace("+234", "0")); login(saved); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(m: string) {
    if (!m.trim()) return;
    setBusy("login");
    try {
      const r = await fetch("/api/subscribers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ msisdn: m }) });
      const d = await r.json();
      if (d.ok) {
        setSubscriberId(d.subscriber.id);
        setSubscriber({ msisdn: d.subscriber.msisdn, operator: d.subscriber.operator });
        localStorage.setItem("vl_msisdn", d.subscriber.msisdn);
        await refresh(d.subscriber.id);
      }
    } finally { setBusy(""); }
  }

  async function refresh(sid: number) {
    const s = await fetch(`/api/health-connect?action=status&subscriberId=${sid}`).then((r) => r.json());
    if (s.ok) { setConns(s.connections); setRecordCount(s.recordCount); if (s.connected) setStep(3); }
    const a = await fetch(`/api/health-connect?action=aggregate&subscriberId=${sid}&days=7`).then((r) => r.json());
    if (a.ok) { setDaily(a.daily); setByType(a.byType); }
    const rc = await fetch(`/api/health-connect?action=records&subscriberId=${sid}&days=7`).then((r) => r.json());
    if (rc.ok) setRecords(rc.records);
    const sy = await fetch(`/api/health-connect?action=syncs&subscriberId=${sid}`).then((r) => r.json());
    if (sy.ok) setSyncs(sy.syncs);
  }

  async function connect() {
    if (!subscriberId) { setToast("Enter your phone number first"); return; }
    setBusy("connect");
    try {
      const r = await fetch("/api/health-connect", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "connect", subscriberId, deviceName: "Android device (web demo)", scopes: HC_READ_SCOPES }),
      });
      const d = await r.json();
      if (d.ok) {
        setToast(`Health Connect linked — ${HC_READ_SCOPES.length} read scopes granted (READ-only)`);
        setStep(3);
        refresh(subscriberId);
      }
    } finally { setBusy(""); }
  }

  async function sync(demo: boolean) {
    if (!subscriberId) return;
    setBusy(demo ? "demo" : "sync");
    try {
      const r = await fetch("/api/health-connect", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(demo ? { action: "demo-seed", subscriberId } : { action: "sync", subscriberId, records: [] }),
      });
      const d = await r.json();
      if (d.ok) {
        setOutcomes(d.outcomes || []);
        setToast(demo
          ? `Demo week synced: ${d.stored} records stored, ${d.autoVerified} logs auto-certified ◆`
          : `Sync complete: ${d.stored} stored, ${d.autoVerified} auto-verified`);
        refresh(subscriberId);
      } else setToast(d.error || "Sync returned no records — use demo seed in the browser");
    } finally { setBusy(""); }
  }

  async function disconnect() {
    if (!subscriberId) return;
    await fetch(`/api/health-connect?subscriberId=${subscriberId}`, { method: "DELETE" });
    setToast("Health Connect disconnected. Sensor auto-verify paused; manual proofs still work.");
    refresh(subscriberId);
  }

  const totals = useMemo(() => {
    const get = (t: string) => byType.find((b) => b.type === t)?.total ?? 0;
    return { steps: get("Steps"), kcal: get("ActiveCaloriesBurned"), floors: get("FloorsClimbed"), sleep: get("SleepSession"), water: get("Hydration") };
  }, [byType]);

  const connected = conns.some((c) => c.status === "connected");
  const filtered = typeFilter === "All" ? records : records.filter((r) => r.recordType === typeFilter);

  return (
    <main className="min-h-screen bg-slate-100 pb-20">
      <div className="vital-gradient pb-14 pt-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-cyan-200">
            <HeartPulse size={14} /> Google Health Connect • aggregation + verification
          </p>
          <h1 className="mt-4 max-w-3xl text-3xl font-black leading-tight text-white sm:text-5xl">
            Your phone already tracks it. VitalLoop verifies it.
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base">
            Connect <strong className="text-white">Google Health Connect</strong> once. VitalLoop then aggregates steps, distance,
            calories, heart-rate, exercise, sleep, floors and hydration — and <strong className="text-emerald-300">auto-certifies ◆</strong> any
            self-log the sensors corroborate (±2h window, ±30% tolerance). No sensors for an activity? Manual proof still applies.
            <strong className="text-white"> READ-only — we never write health data.</strong>
          </p>
          {/* login strip */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {!subscriberId ? (
              <>
                <input value={msisdn} onChange={(e) => setMsisdn(e.target.value)} placeholder="0803 123 4567"
                  className="w-52 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-bold text-white placeholder:text-slate-500" />
                <button onClick={() => login(msisdn)} disabled={busy === "login"} className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-black text-white disabled:opacity-50">
                  {busy === "login" ? "…" : "Link number"}
                </button>
              </>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-slate-200">
                <Check size={14} className="text-emerald-300" /> {subscriber?.msisdn} • {subscriber?.operator}
              </span>
            )}
            <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black ${connected ? "bg-emerald-500/20 text-emerald-200" : "bg-white/10 text-slate-300"}`}>
              <Watch size={14} /> {connected ? `Connected • ${recordCount} records` : "Not connected"}
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-10 px-4 pt-8 sm:px-6">
        {/* 3-step connector */}
        <section className="grid gap-4 lg:grid-cols-3">
          {[
            { n: 1, t: "Link your number", d: "Sensor data binds to MSISDN, so verification survives phone changes.", done: !!subscriberId },
            { n: 2, t: "Grant Health Connect", d: "10 READ scopes. On-device consent screen; revoke anytime in system settings.", done: connected },
            { n: 3, t: "Sync & auto-verify", d: "Daily sync aggregates data and certifies matching logs automatically.", done: recordCount > 0 },
          ].map((s) => (
            <div key={s.n} className={`rounded-3xl border-2 p-5 ${s.done ? "border-emerald-400 bg-emerald-50" : step === s.n ? "border-slate-900 bg-white" : "border-slate-200 bg-white"}`}>
              <div className="flex items-center justify-between">
                <span className={`grid h-9 w-9 place-items-center rounded-full text-sm font-black ${s.done ? "bg-emerald-500 text-white" : "bg-slate-900 text-white"}`}>
                  {s.done ? <Check size={16} /> : s.n}
                </span>
                {s.n === 2 && !connected && subscriberId && (
                  <button onClick={connect} disabled={busy === "connect"} className="rounded-full bg-slate-900 px-4 py-2 text-xs font-black text-white disabled:opacity-50">
                    {busy === "connect" ? "Linking…" : "Grant access"}
                  </button>
                )}
                {s.n === 3 && connected && (
                  <div className="flex gap-1.5">
                    <button onClick={() => sync(true)} disabled={busy === "demo"} className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-black text-white disabled:opacity-50">
                      {busy === "demo" ? "…" : "Demo week"}
                    </button>
                    <button onClick={disconnect} className="rounded-full bg-slate-100 p-2 text-slate-500" title="Disconnect"><Unplug size={14} /></button>
                  </div>
                )}
              </div>
              <p className="mt-3 text-sm font-extrabold text-slate-900">{s.t}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{s.d}</p>
            </div>
          ))}
        </section>

        {/* Aggregates */}
        <section>
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xl font-black text-slate-900"><Database size={20} className="text-emerald-600" /> Aggregated sensor data (7 days)</h2>
            {subscriberId && <button onClick={() => refresh(subscriberId)} className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-black text-slate-600 shadow"><RefreshCw size={13} /> Refresh</button>}
          </div>
          {recordCount === 0 ? (
            <div className="mt-4 rounded-3xl border-2 border-dashed border-slate-300 bg-white p-8 text-center">
              <Smartphone size={36} className="mx-auto text-slate-300" />
              <p className="mt-2 text-sm font-extrabold text-slate-800">No sensor data yet</p>
              <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">
                Browsers can&apos;t read Health Connect directly — the Android app syncs on-device and pushes here.
                For this prototype, tap <strong>“Demo week”</strong> above to simulate a realistic 7-day sensor feed, then watch auto-verification run.
              </p>
            </div>
          ) : (
            <>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                {[
                  [Footprints, Math.round(totals.steps).toLocaleString(), "steps", "text-emerald-600"],
                  [Flame, Math.round(totals.kcal).toLocaleString(), "active kcal", "text-orange-500"],
                  [Activity, String(Math.round(totals.floors)), "floors climbed", "text-sky-600"],
                  [Moon, `${totals.sleep.toFixed(1)}h`, "sleep tracked", "text-indigo-500"],
                  [Droplets, `${totals.water.toFixed(1)}L`, "hydration", "text-cyan-500"],
                ].map(([Icon, v, l, cls]) => {
                  const I = Icon as typeof Footprints;
                  return (
                  <div key={l as string} className="rounded-2xl bg-white p-4 text-center shadow">
                    <I size={20} className={`mx-auto ${cls as string}`} />
                    <p className="mt-1 text-xl font-black text-slate-900">{v as string}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{l as string}</p>
                  </div>
                  );
                })}
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="rounded-3xl bg-white p-5 shadow">
                  <p className="text-sm font-extrabold text-slate-900">Daily steps (sensor)</p>
                  <div className="mt-2 h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={daily} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="Steps" fill="#10b981" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="rounded-3xl bg-white p-5 shadow">
                  <p className="text-sm font-extrabold text-slate-900">Active calories + sleep hours</p>
                  <div className="mt-2 h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={daily} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Area type="monotone" dataKey="ActiveCaloriesBurned" stroke="#f59e0b" fill="#f59e0b33" name="kcal" />
                        <Area type="monotone" dataKey="SleepSession" stroke="#6366f1" fill="#6366f133" name="sleep h" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>

        {/* Auto-verify outcomes */}
        {outcomes.length > 0 && (
          <section className="rounded-3xl bg-slate-900 p-6 text-white">
            <h2 className="flex items-center gap-2 font-extrabold"><ShieldCheck size={18} className="text-emerald-300" /> Last sync: auto-verification outcomes</h2>
            <div className="mt-3 space-y-2">
              {outcomes.map((o) => (
                <div key={o.logId} className={`flex items-start gap-3 rounded-2xl p-3.5 ${o.matched ? "bg-emerald-500/15" : "bg-white/5"}`}>
                  {o.matched ? <Star size={18} className="mt-0.5 shrink-0 text-violet-300" /> : <X size={18} className="mt-0.5 shrink-0 text-slate-500" />}
                  <div className="flex-1">
                    <p className="text-sm font-extrabold">
                      Log #{o.logId} • {o.activityKey.replace(/-/g, " ")} — {o.matched ? <span className="text-violet-300">CERTIFIED ◆ (+{o.bonusPoints} bonus)</span> : <span className="text-slate-400">no sensor match — manual proof still available</span>}
                    </p>
                    <p className="text-xs text-slate-300">{o.sensorSummary}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Record explorer */}
        {records.length > 0 && (
          <section className="rounded-3xl bg-white p-6 shadow">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-extrabold text-slate-900">Record explorer ({filtered.length})</h2>
              <div className="flex gap-1.5 overflow-x-auto">
                {["All", ...Array.from(new Set(records.map((r) => r.recordType)))].map((t) => (
                  <button key={t} onClick={() => setTypeFilter(t)} className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-black ${typeFilter === t ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}>{t}</button>
                ))}
              </div>
            </div>
            <div className="mt-3 max-h-72 space-y-1.5 overflow-y-auto">
              {filtered.slice(0, 80).map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-2.5">
                  <span className="rounded-lg bg-emerald-100 px-2 py-1 text-[10px] font-black text-emerald-700">{r.recordType}</span>
                  <span className="text-sm font-black text-slate-900">{r.value.toLocaleString()} <span className="text-[11px] font-normal text-slate-500">{r.unit}</span></span>
                  <span className="ml-auto text-right text-[10px] text-slate-500">
                    {new Date(r.startTime).toLocaleString()}<br />{r.sourceApp}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Mapping matrix */}
        <section>
          <h2 className="flex items-center gap-2 text-xl font-black text-slate-900"><Zap size={20} className="text-amber-500" /> Which sensors verify which activities</h2>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-600">
            This is the aggregation→verification contract. Sensor-backed activities auto-certify; the rest use manual proof (photo / timer / peer).
            9 of 14 activities have sensor coverage — the highest-value ones for challenges.
          </p>
          <div className="mt-4 grid gap-2.5 md:grid-cols-2">
            {Object.entries(ACTIVITY_SENSOR_MAP).map(([key, m]) => (
              <div key={key} className={`rounded-2xl border p-4 ${m.types.length ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200 bg-white"}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-extrabold text-slate-900">{key.replace(/-/g, " ")}</p>
                  {m.types.length ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-black text-white"><Star size={10} /> SENSOR</span>
                  ) : (
                    <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[10px] font-black text-slate-600">MANUAL PROOF</span>
                  )}
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{m.rule}</p>
                {m.types.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.types.map((t) => <span key={t} className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-700 shadow-sm">{t}</span>)}
                    <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-bold text-white">{m.tolerance}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Record types + privacy */}
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl bg-white p-6 shadow">
            <h3 className="font-extrabold text-slate-900">Health Connect record types consumed</h3>
            <div className="mt-3 space-y-2">
              {HC_RECORD_TYPES.map((r) => (
                <div key={r.type} className="rounded-2xl border border-slate-100 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-extrabold text-slate-900">{r.type}</p>
                    <span className="font-mono text-[10px] text-slate-400">{r.unit}</span>
                  </div>
                  <p className="text-xs text-slate-500">{r.desc}</p>
                  <p className="mt-1 font-mono text-[10px] text-slate-400">{r.scope}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="rounded-3xl bg-slate-900 p-6 text-white">
              <h3 className="flex items-center gap-2 font-extrabold"><Lock size={18} className="text-emerald-300" /> Privacy by design</h3>
              <ul className="mt-3 space-y-2.5 text-xs leading-relaxed text-slate-300">
                <li><strong className="text-white">READ-only scopes.</strong> VitalLoop never writes to Health Connect. Permission screen shows exactly what&apos;s read.</li>
                <li><strong className="text-white">Aggregates over raws.</strong> The server stores per-window totals (steps, kcal), not second-by-second traces.</li>
                <li><strong className="text-white">MSISDN-bound, revocable.</strong> Disconnect any time; optional one-tap purge deletes all sensor rows.</li>
                <li><strong className="text-white">Telco sees nothing.</strong> Operators only ever see billing events — sensor data never leaves VitalLoop.</li>
              </ul>
              <div className="mt-4 rounded-2xl bg-white/5 p-3 text-[11px] text-slate-400">
                <Info size={12} className="mr-1 inline" />
                Sync history: {syncs.length} runs {syncs[0] ? `• last: ${syncs[0].recordsStored} records, ${syncs[0].logsAutoVerified} auto-verified (${new Date(syncs[0].createdAt).toLocaleString()})` : ""}
              </div>
            </div>
            <div className="rounded-3xl border-2 border-emerald-300 bg-emerald-50 p-6">
              <h3 className="font-extrabold text-slate-900">Build the mobile app next →</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                Browsers can&apos;t read Health Connect — the Android shell does, then syncs here. Open the mobile prototype
                for the installable app frame plus Expo + Kotlin bridge code.
              </p>
              <div className="mt-3 flex gap-2">
                <Link href="/mobile" className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3 text-sm font-black text-white">
                  Mobile prototype <ArrowRight size={15} />
                </Link>
                <Link href="/developer" className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white py-3 text-sm font-black text-slate-800 shadow">
                  Full source code <ChevronRight size={15} />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[70] max-w-[94vw] -translate-x-1/2">
          <div className="tick flex items-center gap-3 rounded-2xl bg-slate-900 py-3 pl-4 pr-5 text-sm font-bold text-white shadow-2xl">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-500"><Check size={16} /></span>
            <span className="break-words">{toast}</span>
            <button onClick={() => setToast("")} className="text-slate-400"><X size={14} /></button>
          </div>
        </div>
      )}
    </main>
  );
}
