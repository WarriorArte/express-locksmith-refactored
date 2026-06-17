import { execFileSync } from "node:child_process";
import { access, cp, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const PROJECT_ROOT  = process.cwd();
const DIST_DIR      = path.resolve(PROJECT_ROOT, "dist");
const HTACCESS_MODE = (process.env.HTACCESS_MODE || "hosting").toLowerCase();
const BASE_PATH     = process.env.BUILD_BASE || "/";
const BACKEND_PATH  = (process.env.BACKEND_PATH || "").trim();
const BUILD_ID      = (process.env.APP_BUILD_ID || "").trim();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeBase(base) {
  let out = base.trim();
  if (!out.startsWith("/")) out = `/${out}`;
  if (!out.endsWith("/")) out = `${out}/`;
  return out;
}

async function pathExists(p) {
  try { await access(p); return true; } catch { return false; }
}

function createBuildMeta() {
  const buildTime = new Date().toISOString();
  let gitSha = "";

  try {
    gitSha = execFileSync("git", ["rev-parse", "--short=12", "HEAD"], {
      cwd: PROJECT_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    gitSha = "";
  }

  return {
    version: BUILD_ID || [gitSha, buildTime].filter(Boolean).join("-"),
    buildTime,
    gitSha,
  };
}

// Encuentra el backend automáticamente. BACKEND_PATH tiene prioridad si está definido.
async function resolveBackendPath() {
  const candidates = [];

  // BACKEND_PATH manual tiene prioridad
  if (BACKEND_PATH) candidates.push(BACKEND_PATH);

  // Subir desde PROJECT_ROOT buscando public_html/ y su hermano backend/
  let current = PROJECT_ROOT;
  for (let i = 0; i < 12; i++) {
    if (path.basename(current) === "public_html") {
      candidates.push(path.join(path.dirname(current), "backend"));
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  // ~/domains/*/backend/ y ~/backend/
  const domainsDir = path.join(os.homedir(), "domains");
  if (await pathExists(domainsDir)) {
    const domains = await readdir(domainsDir);
    for (const d of domains) candidates.push(path.join(domainsDir, d, "backend"));
  }
  candidates.push(path.join(os.homedir(), "backend"));

  for (const c of candidates) {
    if (await pathExists(path.join(c, "artisan"))) return c;
  }

  return null;
}

// ─── .htaccess ────────────────────────────────────────────────────────────────

async function writeDistHtaccess() {
  const modeToFile = {
    hosting: "deploy/.htaccess.hosting.example",
    wamp:    "deploy/.htaccess.wamp",
  };
  const sourceRel = modeToFile[HTACCESS_MODE] || "deploy/.htaccess.hosting.example";
  const src = path.resolve(PROJECT_ROOT, sourceRel);
  const dst = path.resolve(DIST_DIR, ".htaccess");

  if (!existsSync(src)) throw new Error(`No existe archivo .htaccess fuente: ${sourceRel}`);

  if (sourceRel.endsWith(".hosting.example")) {
    const tpl = await readFile(src, "utf8");
    await writeFile(dst, tpl.replace(/__BASE_PATH__/g, normalizeBase(BASE_PATH)), "utf8");
    return;
  }
  await cp(src, dst, { force: true });
}

// ─── Bridge API ───────────────────────────────────────────────────────────────

async function createBackendBridge(backendPath) {
  const dir = path.resolve(DIST_DIR, "backend/public");
  await mkdir(dir, { recursive: true });

  let content;
  if (backendPath) {
    content = `<?php
$backend = '${backendPath}';
chdir($backend . '/public');
$_SERVER['SCRIPT_FILENAME'] = $backend . '/public/index.php';
require $backend . '/public/index.php';
`;
    console.log(`[build] bridge API → ${backendPath}/public/index.php`);
  } else {
    content = `<?php
header('Content-Type: application/json');
http_response_code(503);
echo json_encode(['error' => 'Backend no encontrado. Define BACKEND_PATH en el entorno de build.']);
`;
    console.log("[build] bridge API → placeholder JSON (BACKEND_PATH no definido)");
  }

  await writeFile(path.resolve(dir, "index.php"), content, "utf8");
}

// ─── Serve-upload ─────────────────────────────────────────────────────────────

async function createUploadServer(backendPath) {
  const dir = path.resolve(DIST_DIR, "backend/public");
  await mkdir(dir, { recursive: true });

  let content;
  if (backendPath) {
    content = `<?php
$backend = '${backendPath}';
$file    = $_GET['f'] ?? '';

$file = str_replace(['..', '\\\\'], '', $file);
$file = ltrim($file, '/');

$full = $backend . '/public/uploads/' . $file;
if (!is_file($full)) { http_response_code(404); die(); }

$ext  = strtolower(pathinfo($full, PATHINFO_EXTENSION));
$mime = [
    'jpg'  => 'image/jpeg', 'jpeg' => 'image/jpeg',
    'png'  => 'image/png',  'gif'  => 'image/gif',
    'webp' => 'image/webp', 'svg'  => 'image/svg+xml',
    'pdf'  => 'application/pdf',
][$ext] ?? 'application/octet-stream';

header('Content-Type: ' . $mime);
header('Content-Length: ' . filesize($full));
header('Cache-Control: public, max-age=31536000');
readfile($full);
`;
    console.log(`[build] serve-upload → ${backendPath}/public/uploads/`);
  } else {
    content = `<?php
header('Content-Type: application/json');
http_response_code(503);
echo json_encode(['error' => 'Backend no encontrado. Define BACKEND_PATH en el entorno de build.']);
`;
    console.log("[build] serve-upload → placeholder JSON (BACKEND_PATH no definido)");
  }

  await writeFile(path.resolve(dir, "serve-upload.php"), content, "utf8");
}

async function writeVersionFile(buildMeta) {
  const content = `${JSON.stringify(buildMeta, null, 2)}\n`;

  await writeFile(path.resolve(DIST_DIR, "version.json"), content, "utf8");
  console.log(`[build] version.json → ${buildMeta.version}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("[build:env] BACKEND_PATH  =", BACKEND_PATH || "(auto-detect)");
  console.log("[build:env] BASE_PATH     =", BASE_PATH);
  console.log("[build:env] HTACCESS_MODE =", HTACCESS_MODE);

  const resolvedBackend = await resolveBackendPath();
  console.log("[build:env] backend usado =", resolvedBackend ?? "(no encontrado)");

  const buildMeta = createBuildMeta();
  process.env.APP_BUILD_VERSION = buildMeta.version;
  console.log("[build:env] APP_BUILD_VERSION =", buildMeta.version);

  const base = normalizeBase(BASE_PATH);
  console.log(`[build] vite --base=${base}`);
  execFileSync(
    process.execPath,
    [path.resolve(PROJECT_ROOT, "node_modules/vite/bin/vite.js"), "build", `--base=${base}`],
    { stdio: "inherit", cwd: PROJECT_ROOT },
  );

  await writeDistHtaccess();
  await createBackendBridge(resolvedBackend);
  await createUploadServer(resolvedBackend);
  await writeVersionFile(buildMeta);

  console.log("[build] listo. dist/ → public_html/");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
