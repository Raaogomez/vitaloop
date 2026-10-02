import { readdirSync, readFileSync, statSync, existsSync } from "fs";
import { join, relative } from "path";

export const dynamic = "force-dynamic";

const ROOT = process.cwd();
const ALLOW_DIRS = ["src", "public"];
// Root-level project files included in export (never secrets)
const ALLOW_ROOT_FILES = [
  "package.json",
  "tsconfig.json",
  "next.config.ts",
  "postcss.config.mjs",
  "eslint.config.mjs",
  "drizzle.config.json",
  "Dockerfile",
  "docker-compose.yml",
  ".env.example",
  ".gitignore",
  "README.md",
];
const DENY_PARTS = ["node_modules", ".next", ".git"];
const MAX_FILE_BYTES = 120_000;

function walk(dir: string, out: { path: string; bytes: number }[]) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = relative(ROOT, full).replace(/\\/g, "/");
    if (DENY_PARTS.some((d) => rel.includes(d))) continue;
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, out);
    } else if (/\.(ts|tsx|css|json|mjs|webmanifest)$/.test(name)) {
      out.push({ path: rel, bytes: st.size });
    }
  }
}

function collectFiles(): { path: string; bytes: number }[] {
  const files: { path: string; bytes: number }[] = [];
  for (const d of ALLOW_DIRS) {
    try {
      walk(join(ROOT, d), files);
    } catch {
      /* ignore */
    }
  }
  for (const f of ALLOW_ROOT_FILES) {
    try {
      const full = join(ROOT, f);
      if (existsSync(full)) {
        const st = statSync(full);
        if (st.isFile() && st.size <= MAX_FILE_BYTES) files.push({ path: f, bytes: st.size });
      }
    } catch {
      /* ignore */
    }
  }
  files.sort((a, b) => a.path.localeCompare(b.path));
  return files;
}

function isAllowed(p: string): boolean {
  if (!p || p.includes("..")) return false;
  if (ALLOW_ROOT_FILES.includes(p)) return true;
  return ALLOW_DIRS.some((a) => p === a || p.startsWith(a + "/"));
}

function readAllowed(path: string): string | null {
  try {
    return readFileSync(join(ROOT, path), "utf8");
  } catch {
    return null;
  }
}

// CORS open on purpose: this is a public code-export endpoint so laptops,
// scripts and other origins can pull the prototype.
const CORS = { "Access-Control-Allow-Origin": "*" };

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      ...CORS,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "tree";
  const p = searchParams.get("path") || "";

  if (action === "tree") {
    const files = collectFiles();
    const totalBytes = files.reduce((s, f) => s + f.bytes, 0);
    return Response.json({ ok: true, files, totalBytes, count: files.length }, { headers: CORS });
  }

  if (action === "read") {
    if (!isAllowed(p)) {
      return Response.json({ ok: false, error: "path not allowed" }, { status: 400, headers: CORS });
    }
    try {
      const full = join(ROOT, p);
      const st = statSync(full);
      if (st.size > MAX_FILE_BYTES)
        return Response.json({ ok: false, error: "file too large" }, { status: 400, headers: CORS });
      const content = readFileSync(full, "utf8");
      return Response.json({ ok: true, path: p, bytes: st.size, content }, { headers: CORS });
    } catch {
      return Response.json({ ok: false, error: "read failed" }, { status: 404, headers: CORS });
    }
  }

  // export-json: EVERYTHING in one JSON payload — the most robust transfer.
  // Single request, no base64, loaders write files verbatim.
  if (action === "export-json") {
    const files = collectFiles();
    const out: { path: string; bytes: number; content: string }[] = [];
    const skipped: string[] = [];
    let total = 0;
    for (const f of files) {
      const content = readAllowed(f.path);
      if (content === null) {
        skipped.push(f.path);
        continue;
      }
      total += content.length;
      if (total > 3_000_000) {
        skipped.push(f.path + " (payload cap)");
        continue;
      }
      out.push({ path: f.path, bytes: f.bytes, content });
    }
    return Response.json(
      {
        ok: true,
        generatedAt: new Date().toISOString(),
        count: out.length,
        totalBytes: total,
        skipped,
        files: out,
      },
      { headers: CORS }
    );
  }

  // bundle: all files concatenated for one-shot prototype export
  if (action === "bundle") {
    const files = collectFiles();
    let bundle = `# VitalLoop prototype export — ${new Date().toISOString()}\n# ${files.length} files\n# Rebuild: save each section between "===== FILE: <path> =====" markers\n\n`;
    for (const f of files.slice(0, 120)) {
      try {
        const content = readFileSync(join(ROOT, f.path), "utf8");
        if (content.length > 40000) continue;
        bundle += `\n\n===== FILE: ${f.path} =====\n${content}`;
        if (bundle.length > 900_000) break;
      } catch {
        /* skip */
      }
    }
    return new Response(bundle, {
      headers: {
        ...CORS,
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": "attachment; filename=vitaloop-prototype.txt",
        "Cache-Control": "no-store",
      },
    });
  }

  // rebuild script: bash script that recreates every file (base64).
  // Works via download AND via: curl -fsSL "<origin>/api/codebase?action=rebuild" | bash -s vitaloop
  if (action === "rebuild") {
    const files = collectFiles();
    const lines: string[] = [
      `#!/usr/bin/env bash`,
      `# VitalLoop one-shot rebuild — generated ${new Date().toISOString()}`,
      `# Usage (downloaded file):  bash vitaloop-rebuild.sh [target-dir]`,
      `# Usage (no download):      curl -fsSL "<this-app-url>/api/codebase?action=rebuild" | bash -s vitaloop`,
      `set -euo pipefail`,
      `TARGET="\${1:-vitaloop}"`,
      `echo "→ Creating $TARGET ..."`,
      `mkdir -p "$TARGET"`,
      `cd "$TARGET"`,
      ``,
    ];
    for (const f of files) {
      try {
        const content = readFileSync(join(ROOT, f.path), "utf8");
        if (content.length > 90000) {
          lines.push(`echo "⚠ skipped large file: ${f.path} (copy manually from /developer)"`);
          continue;
        }
        const b64 = Buffer.from(content, "utf8").toString("base64");
        const chunks = b64.match(/.{1,120}/g) || [];
        const dir = f.path.includes("/") ? f.path.split("/").slice(0, -1).join("/") : "";
        if (dir) lines.push(`mkdir -p "${dir}"`);
        lines.push(`cat > "${f.path}.b64" <<'VLEOF'`);
        for (const c of chunks) lines.push(c);
        lines.push(`VLEOF`);
        // portable decode: GNU (-d) and macOS (-D)
        lines.push(`base64 -d "${f.path}.b64" > "${f.path}" 2>/dev/null || base64 -D "${f.path}.b64" > "${f.path}"`);
        lines.push(`rm -f "${f.path}.b64"`);
        lines.push(``);
      } catch {
        /* skip */
      }
    }
    lines.push(`echo ""`);
    lines.push(`echo "✓ Files written. Next:"`);
    lines.push(`echo "  1) cp .env.example .env   (edit DATABASE_URL + secrets)"`);
    lines.push(`echo "  2) npm install"`);
    lines.push(`echo "  3) npx drizzle-kit push"`);
    lines.push(`echo "  4) npm run dev   → http://localhost:3000"`);
    return new Response(lines.join("\n"), {
      headers: {
        ...CORS,
        "Content-Type": "text/x-shellscript; charset=utf-8",
        "Content-Disposition": "attachment; filename=vitaloop-rebuild.sh",
        "Cache-Control": "no-store",
      },
    });
  }

  return Response.json({ ok: false, error: "unknown action" }, { status: 400, headers: CORS });
}
