"use client";

import { useEffect, useState } from "react";
import {
  Smartphone, ShieldCheck, Check, X, Signal, RefreshCw, Receipt,
  ChevronRight, Lock, BadgeCheck, AlertTriangle, Wallet, Timer, Ban,
} from "lucide-react";
import { OPERATORS } from "@/lib/data";
import { detectOperator, isValidMsisdn, normalizeMsisdn, revenueSplit } from "@/lib/dcb";

type Plan = { id: number; code: string; name: string; priceMinor: number; priceDisplay: string; validityDays: number; tagline: string; features: string[]; popular: boolean; airtimeCashbackPct: number };
type Sub = { id: number; msisdn: string; operator: string; status: string; transactionId: string; renewals: number; nextBillingAt: string | null; startedAt: string; consentRef: string; heVerified: boolean; pinVerified: boolean; plan: Plan | null };
type Tx = { id: number; msisdn: string; operator: string; type: string; amountMinor: number; currency: string; status: string; providerRef: string; errorCode: string | null; note: string | null; createdAt: string };

type Step = "number" | "plan" | "consent" | "pin" | "processing" | "done";

export default function BillingPage() {
  const [step, setStep] = useState<Step>("number");
  const [msisdn, setMsisdn] = useState("");
  const [operator, setOperator] = useState("MTN");
  const [heDetected, setHeDetected] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selected, setSelected] = useState<Plan | null>(null);
  const [pin, setPin] = useState("");
  const [sentPin, setSentPin] = useState("");
  const [consentTick, setConsentTick] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; subscription?: Sub; errorCode?: string | null; note?: string } | null>(null);
  const [history, setHistory] = useState<Sub[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/seed", { method: "POST" })
      .then(() => fetch("/api/plans"))
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setPlans(d.plans);
          setSelected(d.plans.find((p: Plan) => p.popular) ?? d.plans[0] ?? null);
        }
      })
      .catch(() => {});
    const saved = localStorage.getItem("vl_msisdn");
    if (saved) {
      setMsisdn(saved.replace("+234", "0"));
      loadHistory(saved);
    }
    // Simulate HE detection on mobile data
    setTimeout(() => setHeDetected(true), 1800);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isValidMsisdn(msisdn)) setOperator(detectOperator(normalizeMsisdn(msisdn)));
  }, [msisdn]);

  async function loadHistory(full: string) {
    const r = await fetch(`/api/subscriptions?msisdn=${encodeURIComponent(full)}`);
    const d = await r.json();
    if (d.ok) setHistory(d.subscriptions);
    const t = await fetch(`/api/transactions?msisdn=${encodeURIComponent(full)}`);
    const td = await t.json();
    if (td.ok) setTxs(td.transactions);
  }

  function sendPin() {
    const p = String(Math.floor(1000 + Math.random() * 9000));
    setSentPin(p);
    setStep("pin");
    setToast(`Demo SMS: your VitalLoop PIN is ${p}`);
  }

  async function subscribe() {
    if (!selected || !isValidMsisdn(msisdn)) return;
    if (pin !== sentPin) { setToast("PIN doesn't match — check the demo SMS banner"); return; }
    setStep("processing");
    setBusy(true);
    try {
      const r = await fetch("/api/subscriptions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          msisdn, planCode: selected.code,
          consentRef: `CONSENT-${Date.now().toString(36).toUpperCase()}`,
          heVerified: heDetected, pinVerified: true,
        }),
      });
      const d = await r.json();
      setResult(d);
      setStep("done");
      const full = normalizeMsisdn(msisdn);
      localStorage.setItem("vl_msisdn", full);
      loadHistory(full);
    } finally { setBusy(false); }
  }

  async function act(id: number, action: "cancel" | "renew") {
    const r = await fetch("/api/subscriptions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscriptionId: id, action }) });
    const d = await r.json();
    setToast(action === "cancel" ? "Subscription cancelled — renewals stopped instantly" : d.ok ? "Renewal charged successfully" : `Renewal failed: ${d.errorCode}`);
    loadHistory(normalizeMsisdn(msisdn));
  }

  const opMeta = OPERATORS.find((o) => o.name === operator) ?? OPERATORS[0];
  const split = selected ? revenueSplit(selected.priceMinor, opMeta.revenueShare) : null;
  const steps: Step[] = ["number", "plan", "consent", "pin", "done"];
  const stepIdx = steps.indexOf(step === "processing" ? "pin" : step);

  return (
    <main className="min-h-screen bg-slate-100 pb-20">
      <div className="bg-[#071120] pb-16 pt-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">Direct Carrier Billing Center</p>
          <h1 className="mt-1 text-3xl font-black text-white sm:text-4xl">Subscribe with airtime in 10 seconds</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
            Fully simulated DCB checkout: Header Enrichment → PIN double opt-in → airtime charge → SMS receipt.
            Try numbers ending in <strong className="text-white">0</strong> (insufficient balance) or <strong className="text-white">9</strong> (barred) to see failure handling.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black ${heDetected ? "bg-emerald-500/20 text-emerald-200" : "bg-white/10 text-slate-300"}`}>
              <Signal size={14} /> {heDetected ? `HE detected: ${operator} • mobile data` : "Detecting network via Header Enrichment…"}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-slate-300">
              <Lock size={14} /> Sandbox — no real airtime charged
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto -mt-8 grid max-w-6xl gap-5 px-4 sm:px-6 lg:grid-cols-5">
        {/* Checkout wizard */}
        <div className="rounded-3xl bg-white p-6 shadow-xl lg:col-span-3">
          {/* progress */}
          <div className="flex items-center gap-1.5">
            {["Number", "Plan", "Consent", "PIN", "Receipt"].map((label, i) => (
              <div key={label} className="flex flex-1 items-center gap-1.5">
                <div className="flex flex-1 flex-col items-center gap-1">
                  <span className={`grid h-8 w-8 place-items-center rounded-full text-xs font-black ${i < stepIdx ? "bg-emerald-500 text-white" : i === stepIdx ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400"}`}>
                    {i < stepIdx ? <Check size={14} /> : i + 1}
                  </span>
                  <span className={`text-[10px] font-black uppercase tracking-wide ${i <= stepIdx ? "text-slate-800" : "text-slate-400"}`}>{label}</span>
                </div>
                {i < 4 && <span className={`mb-5 h-0.5 flex-1 rounded ${i < stepIdx ? "bg-emerald-500" : "bg-slate-100"}`} />}
              </div>
            ))}
          </div>

          {step === "number" && (
            <div className="mt-6">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">Step 1 — Your mobile number</label>
              <div className="relative mt-2">
                <Smartphone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={msisdn} onChange={(e) => setMsisdn(e.target.value)}
                  placeholder="0803 123 4567"
                  inputMode="tel"
                  className="w-full rounded-2xl border-2 border-slate-200 py-4 pl-11 pr-4 text-lg font-black tracking-wide focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {OPERATORS.map((op) => (
                  <button key={op.id} onClick={() => setOperator(op.name)}
                    className={`rounded-2xl border-2 p-2 text-center transition ${operator === op.name ? "border-slate-900 bg-slate-900 text-white" : "border-slate-100 bg-slate-50 hover:border-slate-300"}`}>
                    <span className="mx-auto block h-3 w-8 rounded-full" style={{ background: op.color }} />
                    <span className="mt-1 block text-[11px] font-black">{op.name}</span>
                  </button>
                ))}
              </div>
              {msisdn && !isValidMsisdn(msisdn) && (
                <p className="mt-2 flex items-center gap-2 text-xs font-bold text-red-600"><AlertTriangle size={14} /> Enter a valid 10–11 digit mobile number</p>
              )}
              {isValidMsisdn(msisdn) && (
                <p className="mt-2 flex items-center gap-2 text-xs font-bold text-emerald-700"><BadgeCheck size={14} /> {normalizeMsisdn(msisdn)} • auto-routed to {operator} DCB gateway</p>
              )}
              <button onClick={() => isValidMsisdn(msisdn) && setStep("plan")} disabled={!isValidMsisdn(msisdn)}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-4 text-sm font-black text-white hover:bg-slate-700 disabled:opacity-40">
                Continue to plans <ChevronRight size={16} />
              </button>
            </div>
          )}

          {step === "plan" && (
            <div className="mt-6">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">Step 2 — Pick a sachet plan</label>
              <div className="mt-3 space-y-3">
                {plans.map((p) => (
                  <button key={p.code} onClick={() => setSelected(p)}
                    className={`w-full rounded-2xl border-2 p-4 text-left transition ${selected?.code === p.code ? "border-emerald-500 bg-emerald-50" : "border-slate-100 bg-slate-50 hover:border-slate-300"}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-extrabold text-slate-900">{p.name} {p.popular && <span className="ml-1 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black">POPULAR</span>}</p>
                        <p className="text-xs text-slate-500">{p.tagline}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-black text-slate-900">{p.priceDisplay}</p>
                        <p className="text-[11px] font-bold text-slate-500">{p.validityDays}-day validity</p>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {p.features.slice(0, 3).map((f) => (
                        <span key={f} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">{f}</span>
                      ))}
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-black text-emerald-700">+{p.airtimeCashbackPct}% cashback</span>
                    </div>
                  </button>
                ))}
              </div>
              {selected && split && (
                <div className="mt-4 rounded-2xl bg-slate-900 p-4 text-xs">
                  <p className="font-black uppercase tracking-wide text-slate-400">Where your {selected.priceDisplay} goes (revenue share)</p>
                  <div className="mt-2 flex h-3 overflow-hidden rounded-full">
                    <div className="bg-cyan-400" style={{ width: `${opMeta.revenueShare}%` }} />
                    <div className="bg-amber-400" style={{ width: "6%" }} />
                    <div className="bg-emerald-400" style={{ width: `${100 - opMeta.revenueShare - 6}%` }} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 font-bold">
                    <span className="text-cyan-300">● {operator}: ₦{(split.telco / 100).toLocaleString()}</span>
                    <span className="text-amber-300">● Aggregator: ₦{(split.aggregator / 100).toLocaleString()}</span>
                    <span className="text-emerald-300">● VitalLoop: ₦{(split.service / 100).toLocaleString()} ({split.servicePct}%)</span>
                  </div>
                </div>
              )}
              <div className="mt-4 flex gap-2">
                <button onClick={() => setStep("number")} className="rounded-2xl bg-slate-100 px-5 py-3.5 text-sm font-black text-slate-600">Back</button>
                <button onClick={() => setStep("consent")} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3.5 text-sm font-black text-white">Review & consent <ChevronRight size={16} /></button>
              </div>
            </div>
          )}

          {step === "consent" && selected && (
            <div className="mt-6">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">Step 3 — Regulatory consent (double opt-in)</label>
              <div className="mt-3 rounded-2xl border-2 border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={20} className="text-emerald-600" />
                  <p className="font-extrabold text-slate-900">Confirm subscription</p>
                </div>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Service</span><strong>VitalLoop {selected.name}</strong></div>
                  <div className="flex justify-between"><span className="text-slate-500">Charge</span><strong>{selected.priceDisplay} to {normalizeMsisdn(msisdn)}</strong></div>
                  <div className="flex justify-between"><span className="text-slate-500">Billed by</span><strong>{operator} airtime (DCB)</strong></div>
                  <div className="flex justify-between"><span className="text-slate-500">Renews</span><strong>Every {selected.validityDays} day(s) until you STOP</strong></div>
                  <div className="flex justify-between"><span className="text-slate-500">Opt-out</span><strong>SMS STOP to 45677 • free</strong></div>
                </div>
                <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl bg-white p-4">
                  <input type="checkbox" checked={consentTick} onChange={(e) => setConsentTick(e.target.checked)} className="mt-1 h-5 w-5" />
                  <span className="text-xs leading-relaxed text-slate-600">
                    I agree to be charged <strong>{selected.priceDisplay}</strong> from my {operator} airtime for VitalLoop {selected.name}.
                    I understand billing renews automatically, I&apos;ll get an SMS receipt with STOP instructions, and I can cancel anytime free of charge.
                  </span>
                </label>
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => setStep("plan")} className="rounded-2xl bg-slate-100 px-5 py-3.5 text-sm font-black text-slate-600">Back</button>
                <button onClick={sendPin} disabled={!consentTick} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3.5 text-sm font-black text-white disabled:opacity-40">
                  Agree & send PIN <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {step === "pin" && (
            <div className="mt-6 text-center">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">Step 4 — PIN verification</p>
              <div className="mx-auto mt-3 max-w-sm rounded-2xl border-2 border-dashed border-emerald-400 bg-emerald-50 p-4 text-left">
                <p className="text-[11px] font-black uppercase tracking-wide text-emerald-700">📩 SMS from 45677 (demo)</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">Your VitalLoop PIN is <span className="rounded bg-slate-900 px-2 py-0.5 font-black tracking-[0.3em] text-white">{sentPin}</span></p>
                <p className="mt-1 text-xs text-slate-500">Enter it below to authorize the airtime charge. Never share this code.</p>
              </div>
              <input
                value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="••••" inputMode="numeric"
                className="mx-auto mt-4 w-48 rounded-2xl border-2 border-slate-200 py-4 text-center text-3xl font-black tracking-[0.4em] focus:border-emerald-500 focus:outline-none"
              />
              <div className="mx-auto mt-4 flex max-w-sm gap-2">
                <button onClick={() => setStep("consent")} className="rounded-2xl bg-slate-100 px-5 py-3.5 text-sm font-black text-slate-600">Back</button>
                <button onClick={subscribe} disabled={pin.length !== 4} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3.5 text-sm font-black text-white disabled:opacity-40">
                  <Wallet size={16} /> Authorize {selected?.priceDisplay}
                </button>
              </div>
            </div>
          )}

          {step === "processing" && (
            <div className="mt-6 py-10 text-center">
              <RefreshCw size={36} className="mx-auto animate-spin text-emerald-500" />
              <p className="mt-4 font-extrabold text-slate-900">Charging airtime via {operator} DCB gateway…</p>
              <p className="text-sm text-slate-500">Encrypting consent • reserving balance • awaiting operator callback</p>
            </div>
          )}

          {step === "done" && result && (
            <div className="mt-6">
              {result.ok ? (
                <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-center text-white">
                  <span className="tick mx-auto grid h-16 w-16 place-items-center rounded-full bg-white text-emerald-600"><Check size={32} /></span>
                  <h3 className="mt-3 text-2xl font-black">You&apos;re in! 🎉</h3>
                  <p className="mt-1 text-sm text-emerald-50">{selected?.name} active until {result.subscription?.nextBillingAt ? new Date(result.subscription.nextBillingAt).toLocaleDateString() : "—"}</p>
                  <div className="mx-auto mt-4 grid max-w-sm grid-cols-2 gap-2 text-left text-xs">
                    <div className="rounded-2xl bg-white/15 p-3"><p className="opacity-70">Receipt ref</p><p className="font-black">{result.subscription?.transactionId}</p></div>
                    <div className="rounded-2xl bg-white/15 p-3"><p className="opacity-70">Cashback</p><p className="font-black">+{selected?.airtimeCashbackPct}% airtime</p></div>
                  </div>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <a href="/app" className="rounded-full bg-white px-6 py-3 text-sm font-black text-emerald-700">Start earning points →</a>
                    <button onClick={() => { setStep("number"); setPin(""); setResult(null); }} className="rounded-full border border-white/40 px-6 py-3 text-sm font-black">New subscription</button>
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border-2 border-red-200 bg-red-50 p-6 text-center">
                  <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-red-500 text-white"><X size={32} /></span>
                  <h3 className="mt-3 text-xl font-black text-slate-900">Charge failed</h3>
                  <p className="mt-1 font-mono text-xs font-bold text-red-600">{result.errorCode}</p>
                  <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">{result.note}</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <button onClick={() => setStep("pin")} className="rounded-full bg-slate-900 px-6 py-3 text-sm font-black text-white">Top up & retry</button>
                    <button onClick={() => { setMsisdn("08031234567"); setStep("plan"); }} className="rounded-full bg-white px-6 py-3 text-sm font-black text-slate-700">Use demo number</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Manage + ledger */}
        <div className="space-y-5 lg:col-span-2">
          <div className="rounded-3xl bg-slate-900 p-6 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-extrabold"><Receipt size={18} /> My subscriptions</h3>
              <button onClick={() => isValidMsisdn(msisdn) && loadHistory(normalizeMsisdn(msisdn))} className="rounded-full bg-white/10 p-2 hover:bg-white/20"><RefreshCw size={14} /></button>
            </div>
            {history.length === 0 ? (
              <p className="mt-3 rounded-2xl bg-white/5 p-4 text-xs leading-relaxed text-slate-300">
                No subscriptions yet for this number. Complete the checkout to see live status, renewals and receipts here —
                exactly as subscribers manage opt-outs.
              </p>
            ) : (
              <div className="mt-3 space-y-2.5">
                {history.map((s) => (
                  <div key={s.id} className="rounded-2xl bg-white/5 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-extrabold">{s.plan?.name ?? "Plan"}</p>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${s.status === "active" ? "bg-emerald-500 text-white" : s.status === "cancelled" ? "bg-slate-500 text-white" : "bg-red-500 text-white"}`}>
                        {s.status}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-slate-400">{s.msisdn} • {s.operator} • {s.transactionId}</p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Started {new Date(s.startedAt).toLocaleDateString()} • Renewals: {s.renewals}
                      {s.nextBillingAt ? ` • Next: ${new Date(s.nextBillingAt).toLocaleDateString()}` : ""}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-[10px] font-bold text-slate-300">
                      <span className={s.heVerified ? "text-emerald-300" : "text-slate-500"}>{s.heVerified ? "✓" : "○"} HE</span>
                      <span className={s.pinVerified ? "text-emerald-300" : "text-slate-500"}>{s.pinVerified ? "✓" : "○"} PIN</span>
                      <span className="text-slate-500">{s.consentRef}</span>
                    </div>
                    {s.status === "active" && (
                      <div className="mt-2 flex gap-2">
                        <button onClick={() => act(s.id, "renew")} className="flex-1 rounded-xl bg-emerald-500 py-2 text-xs font-black hover:bg-emerald-400">Simulate renewal</button>
                        <button onClick={() => act(s.id, "cancel")} className="flex-1 rounded-xl bg-white/10 py-2 text-xs font-black text-red-300 hover:bg-white/20">STOP / Cancel</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl bg-white p-6 shadow">
            <h3 className="flex items-center gap-2 font-extrabold text-slate-900"><Timer size={18} /> Transaction ledger</h3>
            <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
              {txs.length === 0 && <p className="text-xs text-slate-500">Charges, refunds and cashback bonuses appear here with operator references.</p>}
              {txs.map((t) => (
                <div key={t.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${t.status === "success" ? (t.type === "bonus" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700") : "bg-red-100 text-red-600"}`}>
                    {t.type === "bonus" ? <BadgeCheck size={16} /> : t.status === "success" ? <Check size={16} /> : <Ban size={16} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-slate-900">{t.type.toUpperCase()} • ₦{(t.amountMinor / 100).toLocaleString()} • {t.providerRef}</p>
                    <p className="truncate text-[11px] text-slate-500">{t.errorCode ?? t.note ?? ""} • {new Date(t.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500">
              <strong className="text-slate-700">Operator compliance:</strong> every charge carries a consent reference, HE/PIN proof,
              daily caps and instant STOP handling — the standard NCC / WASPA-aligned DCB posture.
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[70] max-w-[92vw] -translate-x-1/2">
          <div className="tick flex items-center gap-3 rounded-2xl bg-slate-900 py-3 pl-4 pr-5 text-sm font-bold text-white shadow-2xl">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-cyan-400 text-slate-900"><Check size={16} /></span>
            <span className="break-words">{toast}</span>
            <button onClick={() => setToast("")} className="text-slate-400"><X size={14} /></button>
          </div>
        </div>
      )}
    </main>
  );
}
