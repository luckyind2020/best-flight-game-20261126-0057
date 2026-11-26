#!/usr/bin/env node
/**
 * Skyhawk Ridge Run — make.fun flight-game entry (best-flight-game-20261126-0057).
 * Entrypoint (Node 22, standard library only). Default: hand the game in —
 * copy game/ and screenshots/ to /output (or $MAKEFUN_OUTPUT_DIR) and write
 * /output/dossier.json with buildDossier from vendor/makefun-game.ts.
 * Pass --serve [port] to serve game/ over HTTP for local play-testing.
 */
import { createServer } from "node:http";
import { cpSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-game.ts";

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
};

const SHOTS = ["1-takeoff.jpg", "2-cruise.jpg", "3-rings.jpg", "4-final.jpg"];

const CONTROLS: [string, string][] = [
  ["Arrow Up / Down", "pitch down / up"],
  ["Arrow Left / Right", "bank and turn"],
  ["W / S", "throttle up / down"],
  ["Space", "afterburner boost"],
  ["R", "reset flight"],
  ["M", "toggle mouse steering"],
];

function checkBundle(): { name: string; ok: boolean; bytes: number }[] {
  const wanted = ["game/index.html", "DOSSIER.md", ...SHOTS.map((s) => `screenshots/${s}`)];
  return wanted.map((rel) => {
    const abs = join(ROOT, rel);
    const ok = existsSync(abs);
    const bytes = ok ? statSync(abs).size : 0;
    return { name: rel, ok, bytes };
  });
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KiB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MiB`;
}

/** Sniff a screenshot's real format from its magic bytes. */
function sniffImage(rel: string): string {
  const buf = readFileSync(join(ROOT, rel));
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "JPEG";
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "PNG";
  return "unknown";
}

function handIn(): void {
  for (const f of checkBundle()) {
    if (!f.ok) throw new Error(`missing required file: ${f.name}`);
  }
  mkdirSync(OUTPUT_DIR, { recursive: true });
  cpSync(join(ROOT, "game"), join(OUTPUT_DIR, "game"), { recursive: true });
  cpSync(join(ROOT, "screenshots"), join(OUTPUT_DIR, "screenshots"), { recursive: true });
  const dossier = buildDossier(OUTPUT_DIR, DOSSIER_CAPS);
  writeFileSync(join(OUTPUT_DIR, "dossier.json"), dossier);
  console.log(`handed in to ${OUTPUT_DIR} (${dossier.length} bytes of dossier)`);
}

function printSummary(): void {
  console.log("SKYHAWK RIDGE RUN — a chase-view flight game");
  console.log("Fly the ridge, thread the golden rings, land the runway.");
  console.log("");
  console.log("Controls:");
  for (const [key, action] of CONTROLS) {
    console.log(`  ${key.padEnd(20)} ${action}`);
  }
  console.log("");
  console.log("Bundle check:");
  for (const f of checkBundle()) {
    const kind = f.name.startsWith("screenshots/") && f.ok ? ` ${sniffImage(f.name)}` : "";
    console.log(`  ${f.ok ? "OK  " : "MISS"} ${f.name} (${formatBytes(f.bytes)}${kind})`);
  }
}

const MIME: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".md": "text/plain",
};

function serve(port: number): void {
  const server = createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url ?? "/").split("?")[0];
    const rel = urlPath === "/" ? "game/index.html" : urlPath.replace(/^\//, "");
    const abs = join(ROOT, rel);
    if (!abs.startsWith(ROOT) || !existsSync(abs) || !statSync(abs).isFile()) {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("not found");
      return;
    }
    res.writeHead(200, { "content-type": MIME[extname(abs)] ?? "application/octet-stream" });
    res.end(readFileSync(abs));
  });
  server.listen(port, () => {
    console.log(`Skyhawk Ridge Run serving at http://localhost:${port}/ (Ctrl+C to stop)`);
  });
}

const args = process.argv.slice(2);
if (args[0] === "--serve") {
  serve(Number(args[1] ?? 8080));
} else {
  handIn();
  printSummary();
}
