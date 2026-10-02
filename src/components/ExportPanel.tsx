"use client";

import { useEffect, useState } from "react";
import {
  Download, Copy, Check, ExternalLink, Terminal, AlertTriangle,
  Loader2, FileJson, Shell,
} from "lucide-react";

// ── Robust export panel ──
// The Arena preview iframe can block download popups, so we offer:
//  A) JS blob download (works in most cases)
//  B) Open-in-new-tab (escapes the sandbox → download works)
//  C) Copy-paste one-liners (no download at all — most reliable)

export function useOrigin(): string {
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    try {
      setOrigin(window.location.origin);
    } catch {
      /* ignore */
    }
  }, []);
  return origin;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      return true;
    } catch {
      return false;
    }
  }
}

async function blobDownload(url: string, filename: string): Promise<{ ok: boolean; error?: string; bytes?: number }> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return { ok: false, error: `Server replied ${res.status}` };
    const blob = await res.blob();
    if (blob.size < 2000) return { ok: false, error: "Response too small — likely an error page, not the export" };
    const obj = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = obj;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(obj), 10000);
    return { ok: true, bytes: blob.size };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network fetch failed" };
  }
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [state, setState] = useState<"idle" | "ok" | "fail">("idle");
  return (
    <button
      onClick={async () => {
        const ok = await copyText(text);
        setState(ok ? "ok" : "fail");
        setTimeout(() => setState("idle"), 2000);
      }}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-900 px-3.5 py-2 text-[11px] font-black text-white hover:bg-slate-700"
    >
      {state === "ok" ? <Check size={12} className="text-emerald-300" /> : <Copy size={12} />}
      {state === "ok" ? "Copied!" : state === "fail" ? "Select manually" : label}
    </button>
  );
}

export function oneLiners(base: string) {
  const bash = `curl -fsSL "${base}/api/codebase?action=rebuild" | bash -s vitaloop`;
  const node = `node -e "fetch('${base}/api/codebase?action=export-json').then(r=>r.json()).then(d=>{const fs=require('fs'),path=require('path');const t='vitaloop';for(const f of d.files){const p=path.join(t,f.path);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,f.content);}console.log('done:',d.files.length,'files -> '+t)})"`;
  const ps = `$base="${base}"; $t="vitaloop"; $d=(Invoke-RestMethod "$base/api/codebase?action=export-json"); foreach($f in $d.files){$p=Join-Path $t $f.path; $dir=Split-Path $p; if($dir){New-Item -ItemType Directory -Force -Path $dir | Out-Null}; [IO.File]::WriteAllText($p,$f.content)}; Write-Host "done:" $d.files.Count "files -> $t"`;
  return { bash, node, ps };
}

export default function ExportPanel({ compact = false }: { compact?: boolean }) {
  const origin = useOrigin();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err" | "info"; text: string } | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const rebuildUrl = `${origin}/api/codebase?action=rebuild`;
  const bundleUrl = `${origin}/api/codebase?action=bundle`;
  const jsonUrl = `${origin}/api/codebase?action=export-json`;
  const cmds = oneLiners(origin || "https://YOUR-PREVIEW-URL");

  async function handleDownload(kind: "rebuild" | "bundle") {
    if (!origin) return;
    setBusy(kind);
    setMsg({ kind: "info", text: "Preparing export…" });
    const url = kind === "rebuild" ? rebuildUrl : bundleUrl;
    const name = kind === "rebuild" ? "vitaloop-rebuild.sh" : "vitaloop-prototype.txt";
    const res = await blobDownload(url, name);
    setBusy(null);
    if (res.ok) {
      setMsg({
        kind: "ok",
        text: `Download started (${((res.bytes || 0) / 1024).toFixed(0)} KB). Check your Downloads folder or browser download bar.`,
      });
    } else {
      setMsg({
        kind: "err",
        text: `Download blocked (${res.error}). This preview frame blocks popups — use “Open in new tab” or the copy-paste command below instead. No download needed there.`,
      });
      setShowHelp(true);
    }
  }

  return (
    <div className={`rounded-3xl border-2 border-amber-300 bg-amber-50 p-5 ${compact ? "" : "shadow"}`}>
      <p className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
        <Download size={16} /> Get ALL the code
        <span className="rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-black text-white">3 WAYS</span>
      </p>

      {/* Way 1: download buttons */}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => handleDownload("rebuild")}
          disabled={busy !== null || !origin}
          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-xs font-black text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {busy === "rebuild" ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          ① Download vitaloop-rebuild.sh
        </button>
        <button
          onClick={() => handleDownload("bundle")}
          disabled={busy !== null || !origin}
          className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-black text-slate-800 shadow hover:bg-slate-100 disabled:opacity-50"
        >
          {busy === "bundle" ? <Loader2 size={14} className="animate-spin" /> : <FileJson size={14} />}
          ② Download .txt bundle
        </button>
        <a
          href={origin ? rebuildUrl : "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full border-2 border-slate-900 bg-white px-5 py-2 text-xs font-black text-slate-900 hover:bg-slate-100"
        >
          <ExternalLink size={14} /> Open in new tab
        </a>
      </div>

      {msg && (
        <div
          className={`mt-3 flex items-start gap-2 rounded-2xl p-3 text-xs font-semibold leading-relaxed ${
            msg.kind === "ok"
              ? "bg-emerald-100 text-emerald-800"
              : msg.kind === "err"
                ? "bg-red-100 text-red-800"
                : "bg-sky-100 text-sky-800"
          }`}
        >
          {msg.kind === "err" ? <AlertTriangle size={15} className="mt-0.5 shrink-0" /> : <Check size={15} className="mt-0.5 shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Way 2: no-download one-liners */}
      <div className="mt-4 rounded-2xl bg-slate-900 p-4 text-white">
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-emerald-300">
          <Terminal size={14} /> ③ No-download method (recommended if the buttons do nothing)
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
          Copy <strong className="text-white">one</strong> command, paste it into your terminal, press Enter.
          It pulls every file straight from this app — no download window involved.
        </p>

        <div className="mt-3 space-y-2.5">
          <div>
            <p className="mb-1 flex items-center gap-1.5 text-[11px] font-black text-slate-200">
              <Shell size={12} /> Git Bash / macOS / Linux (needs curl)
            </p>
            <div className="flex items-start gap-2 rounded-xl bg-black/50 p-2.5">
              <code className="min-w-0 flex-1 break-all font-mono text-[11px] leading-relaxed text-emerald-200">
                {cmds.bash}
              </code>
              <CopyButton text={cmds.bash} label="Copy" />
            </div>
          </div>
          <div>
            <p className="mb-1 text-[11px] font-black text-slate-200">Windows PowerShell (no extra tools)</p>
            <div className="flex items-start gap-2 rounded-xl bg-black/50 p-2.5">
              <code className="min-w-0 flex-1 break-all font-mono text-[11px] leading-relaxed text-sky-200">
                {cmds.ps}
              </code>
              <CopyButton text={cmds.ps} label="Copy" />
            </div>
          </div>
          <div>
            <p className="mb-1 text-[11px] font-black text-slate-200">Any OS with Node.js (alternative)</p>
            <div className="flex items-start gap-2 rounded-xl bg-black/50 p-2.5">
              <code className="min-w-0 flex-1 break-all font-mono text-[11px] leading-relaxed text-amber-200">
                {cmds.node}
              </code>
              <CopyButton text={cmds.node} label="Copy" />
            </div>
          </div>
        </div>
        <p className="mt-2.5 text-[11px] text-slate-400">
          After it finishes: <span className="font-mono text-slate-200">cd vitaloop</span> → continue at Step 4
          (<span className="font-mono">cp .env.example .env</span> …). Direct JSON feed:{" "}
          <span className="break-all font-mono text-slate-300">{origin ? jsonUrl : "…"}</span>
        </p>
      </div>

      {/* Help toggle */}
      <button
        onClick={() => setShowHelp(!showHelp)}
        className="mt-3 flex w-full items-center justify-between rounded-2xl bg-white p-3 text-left shadow-sm"
      >
        <span className="flex items-center gap-2 text-xs font-extrabold text-slate-800">
          <AlertTriangle size={14} className="text-amber-500" />
          “I don&apos;t get the download window” — why, and 4 fixes
        </span>
        <span className="text-slate-400">{showHelp ? "−" : "+"}</span>
      </button>
      {showHelp && (
        <div className="mt-2 space-y-2 rounded-2xl bg-white p-4 text-[12px] leading-relaxed text-slate-600 shadow-sm">
          <p>
            <strong className="text-slate-900">Why:</strong> this app runs inside Arena&apos;s sandboxed preview
            frame, which blocks file-download popups by design. Your code is fine — the <em>frame</em> is
            stopping the save dialog.
          </p>
          <ol className="list-decimal space-y-1.5 pl-5">
            <li>
              <strong className="text-slate-900">Use the copy-paste command above</strong> (green box) — it needs
              no download at all and is now the recommended path.
            </li>
            <li>
              <strong className="text-slate-900">Open in new tab:</strong> click “Open in new tab” above (or copy
              this URL into a fresh browser tab&apos;s address bar and press Enter — the download will start there,
              outside the sandbox):{" "}
              <span className="break-all font-mono text-[11px] text-emerald-700">{origin ? rebuildUrl : "…"}</span>
            </li>
            <li>
              <strong className="text-slate-900">Allow downloads:</strong> in Chrome → site settings (🔒/ⓘ left of
              the address bar) → set <em>Automatic downloads / Downloads</em> to Allow, then retry.
            </li>
            <li>
              <strong className="text-slate-900">Manual fallback:</strong> open{" "}
              <span className="font-mono text-[11px]">/developer → Source tab</span>, copy files one by one
              (each has a Copy button), or copy the raw JSON feed and save it.
            </li>
          </ol>
          <p className="rounded-xl bg-slate-50 p-2.5 text-[11px]">
            Windows SmartScreen / antivirus occasionally flags <span className="font-mono">.sh</span> downloads —
            that&apos;s another reason the PowerShell one-liner above is the smoothest Windows path.
          </p>
        </div>
      )}
    </div>
  );
}
