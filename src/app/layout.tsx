import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "VitalLoop — Everyday Wellness on Carrier Billing",
  description:
    "Interactive e-health app that turns everyday activities into wellness. Verified by Health Connect, subscribed in seconds via direct carrier billing — no bank card needed.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "VitalLoop" },
};

export const viewport: Viewport = { themeColor: "#10b981" };

function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#071120]/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-xl font-black text-white shadow-lg shadow-emerald-500/30">
            V
          </span>
          <span className="leading-tight">
            <span className="block text-lg font-extrabold tracking-tight text-white">VitalLoop</span>
            <span className="block text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-300">
              Everyday wellness • DCB
            </span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 text-sm font-semibold lg:flex">
          <Link href="/" className="rounded-full px-3 py-2 text-slate-200 hover:bg-white/10 hover:text-white">Home</Link>
          <Link href="/agent" className="rounded-full bg-emerald-500 px-3 py-2 text-white hover:bg-emerald-400">🤖 Agent</Link>
          <Link href="/launch" className="rounded-full bg-amber-400 px-3 py-2 text-slate-950 hover:bg-amber-300">🚀 Launch</Link>
          <Link href="/app" className="rounded-full px-3 py-2 text-slate-200 hover:bg-white/10 hover:text-white">Wellness App</Link>
          <Link href="/health" className="rounded-full px-3 py-2 text-slate-200 hover:bg-white/10 hover:text-white">Health Connect</Link>
          <Link href="/billing" className="rounded-full px-3 py-2 text-slate-200 hover:bg-white/10 hover:text-white">Billing</Link>
          <Link href="/verification" className="rounded-full px-3 py-2 text-slate-200 hover:bg-white/10 hover:text-white">Verification</Link>
          <Link href="/mobile" className="rounded-full px-3 py-2 text-slate-200 hover:bg-white/10 hover:text-white">Mobile</Link>
          <Link href="/developer" className="rounded-full px-3 py-2 text-slate-200 hover:bg-white/10 hover:text-white">Code</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/billing"
            className="hidden rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 sm:inline-flex"
          >
            Subscribe with Airtime
          </Link>
          <Link
            href="/app"
            className="inline-flex rounded-full border border-white/20 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/10 md:hidden"
          >
            Open App
          </Link>
        </div>
      </div>
      <div className="flex gap-1 overflow-x-auto px-4 pb-2 lg:hidden">
        {[
          ["🤖 Agent", "/agent"],
          ["🚀 Launch", "/launch"],
          ["Home", "/"],
          ["Wellness App", "/app"],
          ["Health Connect", "/health"],
          ["Carrier Billing", "/billing"],
          ["Verification", "/verification"],
          ["Mobile", "/mobile"],
          ["Architecture", "/architecture"],
          ["Code", "/developer"],
          ["Deep Insight", "/insights"],
        ].map(([label, href]) => (
          <Link key={href} href={href} className="whitespace-nowrap rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold text-slate-100">
            {label}
          </Link>
        ))}
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#050b18] text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 font-black text-white">V</span>
            <span className="text-lg font-extrabold text-white">VitalLoop</span>
          </div>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-400">
            The e-health service that converts everyday activities — walking, chores, dancing, hydration, sleep —
            into a measurable Vitality Score. Distributed through telecom carrier billing so anyone with airtime can subscribe.
          </p>
          <p className="mt-3 text-xs text-slate-500">Demo environment: billing flows are simulated. No real airtime is charged.</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Product</p>
          <ul className="mt-3 space-y-2 text-sm font-semibold">
            <li><Link className="hover:text-white" href="/app">Wellness dashboard</Link></li>
            <li><Link className="hover:text-white" href="/billing">Subscribe with airtime</Link></li>
            <li><Link className="hover:text-white" href="/insights">Investor deep-dive</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Compliance note</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-400">
            <li>• Double opt-in + PIN consent</li>
            <li>• Header Enrichment only on telco data</li>
            <li>• Instant opt-out via SMS keyword STOP</li>
            <li>• NCC / GDPR-style data controls</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-slate-500">
        VitalLoop concept build — everyday wellness × direct carrier billing.
      </div>
    </footer>
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-100 text-slate-900 antialiased">
        <Nav />
        {children}
        <Footer />
      </body>
    </html>
  );
}
