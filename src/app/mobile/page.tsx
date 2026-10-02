"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Smartphone, Footprints, Droplets, Moon, Flame, Trophy, Plus, Home,
  HeartPulse, User, Check, RefreshCw, Watch, Download, QrCode, Zap,
  Bell, ChevronRight, Star, Info,
} from "lucide-react";

const TABS = [
  { id: "home", label: "Home", icon: Home },
  { id: "log", label: "Log", icon: Plus },
  { id: "challenges", label: "Win", icon: Trophy },
  { id: "health", label: "Health", icon: HeartPulse },
  { id: "me", label: "Me", icon: User },
] as const;

function PhoneShell({ children, tab, setTab }: { children: React.ReactNode; tab: string; setTab: (t: string) => void }) {
  return (
    <div className="mx-auto w-full max-w-[400px] overflow-hidden rounded-[2.5rem] border-[10px] border-slate-900 bg-slate-100 shadow-2xl">
      <div className="bg-slate-900 px-6 pb-2 pt-3 text-center">
        <div className="mx-auto h-5 w-28 rounded-full bg-black" />
        <p className="mt-1 text-[10px] font-bold text-slate-400">VitalLoop • prototype • {new Date().toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}</p>
      </div>
      <div className="h-[560px] overflow-y-auto p-4">{children}</div>
      <div className="grid grid-cols-5 border-t border-slate-200 bg-white px-2 py-2">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex flex-col items-center gap-0.5 rounded-xl py-1.5 ${tab === t.id ? "text-emerald-600" : "text-slate-400"}`}>
            <t.icon size={20} />
            <span className="text-[10px] font-black">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function MobilePrototype() {
  const [tab, setTab] = useState<string>("home");
  const [installed, setInstalled] = useState(false);
  const [hcOn, setHcOn] = useState(true);
  const [steps, setSteps] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [logs, setLogs] = useState<{ t: string; pts: number; badge: string }[]>([
    { t: "Walk to market × 25 min", pts: 300, badge: "◆ CERTIFIED" },
    { t: "Water × 4 glasses", pts: 120, badge: "✓ PLAUSIBLE" },
  ]);

  useEffect(() => {
    // animate step counter like a live pedometer feed
    let v = 0;
    const target = 6842;
    const id = setInterval(() => {
      v += Math.ceil((target - v) / 8);
      if (v >= target) { v = target; clearInterval(id); }
      setSteps(v);
    }, 60);
    return () => clearInterval(id);
  }, []);

  function doSync() {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setLogs((l) => [{ t: "Evening walk × 18 min (sensor)", pts: 216, badge: "◆ CERTIFIED" }, ...l]);
    }, 1600);
  }

  return (
    <main className="min-h-screen bg-slate-100 pb-20">
      <div className="vital-gradient pb-12 pt-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-emerald-200">
            <Smartphone size={14} /> Mobile prototype • PWA + Android + Health Connect
          </p>
          <h1 className="mt-4 max-w-3xl text-3xl font-black leading-tight text-white sm:text-5xl">
            The VitalLoop mobile app, running in your browser.
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base">
            This is a pixel-faithful prototype of the subscriber app: bottom-tab navigation, live step feed,
            one-tap logging, Health Connect auto-sync and airtime subscription. Install it as a PWA today;
            wrap it with Expo/Capacitor + the Health Connect bridge for the store build — all code included.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button onClick={() => setInstalled(!installed)} className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-sm font-black text-white hover:bg-emerald-400">
              <Download size={16} /> {installed ? "✓ Installed (demo)" : "Install app (PWA)"}
            </button>
            <Link href="/developer" className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-black text-white hover:bg-white/10">
              Get all source code
            </Link>
          </div>
          {installed && (
            <p className="mt-3 max-w-xl rounded-2xl bg-emerald-500/15 p-3 text-xs leading-relaxed text-emerald-100">
              In production this triggers the real <strong>beforeinstallprompt</strong>. The manifest is already live at
              <strong> /manifest.webmanifest</strong> (start_url <strong>/mobile</strong>, standalone, portrait). On Android Chrome:
              menu → “Install app” → VitalLoop launches fullscreen with its own icon.
            </p>
          )}
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 pt-8 sm:px-6 lg:grid-cols-2">
        {/* Phone */}
        <div>
          <PhoneShell tab={tab} setTab={setTab}>
            {tab === "home" && (
              <div className="space-y-3">
                <div className="rounded-3xl bg-slate-900 p-4 text-white">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Today • MTN • Weekly Plus</p>
                  <p className="mt-1 text-lg font-black">Hello, +234803… 👋</p>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="relative grid h-20 w-20 place-items-center">
                      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="10" />
                        <circle cx="50" cy="50" r="42" fill="none" stroke="#10b981" strokeWidth="10" strokeLinecap="round" strokeDasharray={264} strokeDashoffset={264 * 0.35} />
                      </svg>
                      <div className="text-center"><p className="text-lg font-black">636</p><p className="text-[8px] text-slate-400">PTS</p></div>
                    </div>
                    <div className="text-[11px] leading-relaxed text-slate-300">
                      <p><strong className="text-white">🔥 6-day streak</strong></p>
                      <p>Trust 78 • Trusted tier</p>
                      <p className="text-emerald-300">◆ 516 verified pts</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-3xl bg-white p-4 shadow">
                  <div className="flex items-center justify-between">
                    <p className="flex items-center gap-1.5 text-xs font-extrabold text-slate-900"><Footprints size={14} className="text-emerald-600" /> Live steps (Health Connect)</p>
                    <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black text-emerald-700"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> LIVE</span>
                  </div>
                  <p className="mt-1 text-3xl font-black text-slate-900">{steps.toLocaleString()} <span className="text-xs font-bold text-slate-400">/ 6,000</span></p>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all" style={{ width: `${Math.min(100, (steps / 6000) * 100)}%` }} />
                  </div>
                  <button onClick={doSync} disabled={syncing} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-2.5 text-xs font-black text-white">
                    <RefreshCw size={13} className={syncing ? "animate-spin" : ""} /> {syncing ? "Syncing sensors…" : "Sync now"}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[[Droplets, "6/8", "water"], [Moon, "7.2h", "sleep"], [Flame, "410", "kcal"]].map(([Icon, v, l]) => {
                    const I = Icon as typeof Droplets;
                    return (
                      <div key={l as string} className="rounded-2xl bg-white p-3 text-center shadow">
                        <I size={16} className="mx-auto text-emerald-600" />
                        <p className="mt-1 text-sm font-black text-slate-900">{v as string}</p>
                        <p className="text-[9px] font-bold uppercase text-slate-400">{l as string}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="rounded-2xl bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-800">
                  <Bell size={12} className="mr-1 inline" /> <strong>Coach:</strong> 1,200 steps to go! A 12-min evening walk certifies ◆ your day.
                </div>
              </div>
            )}
            {tab === "log" && (
              <div className="space-y-2">
                <p className="text-sm font-black text-slate-900">Log activity</p>
                {[
                  ["🚶 Walk to work", "12 pts/min • timer+steps", true],
                  ["🪜 Stair climb", "22 pts/min • floors+HR", true],
                  ["💧 Water", "30 pts/glass • hydration", true],
                  ["🍲 Veg plate", "45 pts/meal • photo", false],
                  ["😴 Sleep window", "18 pts/hr • sleep session", true],
                  ["🧘 Breathing reset", "35 pts • guided", false],
                ].map(([t, s, sensor]) => (
                  <button key={t as string} onClick={() => { setLogs((l) => [{ t: `${t} (demo)`, pts: 120, badge: (sensor ? "◆ CERTIFIED" : "✓ PLAUSIBLE") as string }, ...l]); setTab("home"); }}
                    className="w-full rounded-2xl bg-white p-3 text-left shadow">
                    <p className="text-xs font-extrabold text-slate-900">{t as string}</p>
                    <p className="text-[10px] text-slate-500">{s as string} {sensor ? <span className="font-black text-violet-600">• sensor</span> : <span className="font-black text-slate-400">• manual</span>}</p>
                  </button>
                ))}
                <div className="space-y-2 pt-1">
                  {logs.map((l, i) => (
                    <div key={i} className="flex items-center justify-between rounded-2xl bg-emerald-50 p-2.5">
                      <p className="text-[11px] font-bold text-slate-800">{l.t}</p>
                      <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[9px] font-black text-white">{l.badge} +{l.pts}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {tab === "challenges" && (
              <div className="space-y-2">
                <p className="text-sm font-black text-slate-900">Challenges <span className="text-[10px] font-normal text-slate-500">(verified pts only)</span></p>
                {[["6K Steps Streak", "700 target • ₦200 airtime", 82], ["Hydration Hero", "600 target • ₦100 airtime", 55], ["Soda-Free 14", "700 target • ₦500 airtime", 30]].map(([t, s, p]) => (
                  <div key={t as string} className="rounded-2xl bg-white p-3 shadow">
                    <p className="text-xs font-extrabold text-slate-900">🏆 {t as string}</p>
                    <p className="text-[10px] text-slate-500">{s as string}</p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-amber-400" style={{ width: `${p}%` }} />
                    </div>
                    <p className="mt-1 text-[10px] font-black text-emerald-700">{p as number}% on verified pts</p>
                  </div>
                ))}
              </div>
            )}
            {tab === "health" && (
              <div className="space-y-2">
                <div className="rounded-3xl bg-slate-900 p-4 text-white">
                  <p className="flex items-center gap-1.5 text-xs font-extrabold"><Watch size={14} className="text-emerald-300" /> Health Connect</p>
                  <button onClick={() => setHcOn(!hcOn)} className={`mt-2 w-full rounded-2xl py-2.5 text-xs font-black ${hcOn ? "bg-emerald-500" : "bg-white/15"}`}>
                    {hcOn ? "✓ Linked — 10 scopes" : "Tap to link"}
                  </button>
                  <p className="mt-2 text-[10px] leading-relaxed text-slate-400">READ-only. Steps, sleep, HR, exercise auto-sync daily and certify ◆ your logs.</p>
                </div>
                {[["Steps today", `${steps.toLocaleString()}`, "Pixel Watch"], ["Sleep last night", "7.2 h", "Pixel Watch"], ["Avg HR (workout)", "128 bpm", "Google Fit"], ["Floors", "8", "Samsung Health"]].map(([t, v, s]) => (
                  <div key={t as string} className="flex items-center justify-between rounded-2xl bg-white p-3 shadow">
                    <div><p className="text-xs font-extrabold text-slate-900">{t as string}</p><p className="text-[10px] text-slate-500">{s as string}</p></div>
                    <p className="text-sm font-black text-emerald-600">{v as string}</p>
                  </div>
                ))}
                <Link href="/health" className="flex items-center justify-center gap-1 rounded-2xl bg-emerald-500 py-2.5 text-xs font-black text-white">
                  Open full sync dashboard <ChevronRight size={13} />
                </Link>
              </div>
            )}
            {tab === "me" && (
              <div className="space-y-2">
                <div className="rounded-3xl bg-white p-4 text-center shadow">
                  <p className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-slate-900 text-xl font-black text-emerald-300">V</p>
                  <p className="mt-2 text-sm font-black text-slate-900">+234 803 123 4567</p>
                  <p className="text-[10px] text-slate-500">MTN • Weekly Plus • renews Friday</p>
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-violet-100 px-3 py-1 text-[10px] font-black text-violet-700"><Star size={11} /> Trust 78 • Trusted</span>
                </div>
                {[["Manage airtime subscription", "/billing"], ["Verification & proof matrix", "/verification"], ["Deep insight report", "/insights"], ["Full source code", "/developer"]].map(([t, h]) => (
                  <Link key={t as string} href={h as string} className="flex items-center justify-between rounded-2xl bg-white p-3 text-xs font-extrabold text-slate-800 shadow">
                    {t as string} <ChevronRight size={14} className="text-slate-400" />
                  </Link>
                ))}
                <button className="w-full rounded-2xl bg-red-50 py-2.5 text-xs font-black text-red-600">STOP subscription (SMS STOP free)</button>
              </div>
            )}
          </PhoneShell>
          <p className="mt-3 text-center text-xs text-slate-500">Interactive prototype — tap the tabs, sync sensors, log activities.</p>
        </div>

        {/* Build guide */}
        <div className="space-y-4">
          <div className="rounded-3xl bg-white p-6 shadow">
            <h2 className="flex items-center gap-2 font-extrabold text-slate-900"><QrCode size={18} className="text-emerald-600" /> Ship it 3 ways (same backend)</h2>
            <div className="mt-4 space-y-3">
              {[
                ["① PWA — this week, zero store review", "This prototype IS the PWA. Manifest live, installable from Chrome → Add to Home Screen. Best for USSD/SMS-heavy users and operator-portal distribution. Limitation: browsers can't read Health Connect — pair with the sync helper or go native."],
                ["② Expo shell + Health Connect — recommended", "npx create-expo-app vitaloop-mobile → add react-native-health-connect → reuse every /api route as-is. ~2 weeks to Play Store internal track. Full bridge code on the Developer page."],
                ["③ Capacitor wrap — fastest native", "npx cap init + @capacitor/android → point webDir at this Next.js export → add Health Connect plugin. One codebase, native sensors, push + background sync."],
              ].map(([t, d]) => (
                <div key={t} className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm font-extrabold text-slate-900">{t}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">{d}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl bg-slate-900 p-6 text-white">
            <h3 className="flex items-center gap-2 font-extrabold"><Zap size={18} className="text-amber-300" /> Why this architecture wins on carrier billing</h3>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-300">
              <li>• <strong className="text-white">One backend, three shells:</strong> PWA, Expo and Capacitor all POST to the same /api/* routes — no forked logic.</li>
              <li>• <strong className="text-white">MSISDN is the identity:</strong> no passwords, no OAuth friction. SIM = account, airtime = wallet.</li>
              <li>• <strong className="text-white">Offline-first logging:</strong> queue logs in IndexedDB/AsyncStorage, replay on reconnect — critical for patchy networks.</li>
              <li>• <strong className="text-white">Sensor sync is opportunistic:</strong> nightly job + on-open sync; manual proofs keep feature-phone users included.</li>
            </ul>
            <div className="mt-4 flex gap-2">
              <Link href="/health" className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3 text-sm font-black text-white">Health sync <ChevronRight size={15} /></Link>
              <Link href="/developer" className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white py-3 text-sm font-black text-slate-900">Get the code <ChevronRight size={15} /></Link>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-xs leading-relaxed text-cyan-900">
            <Info size={16} className="mt-0.5 shrink-0" />
            <span><strong>Play Store note:</strong> Health Connect permissions require a Data Safety declaration + promo-video review for `READ_HEART_RATE`/`READ_SLEEP`. Request only what each feature uses, and keep the in-app rationale screen — both are pre-built into this prototype&apos;s consent copy.</span>
          </div>
        </div>
      </div>
    </main>
  );
}
