import { execFileSync } from "node:child_process";
import { access, cp, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const PROJECT_ROOT = process.cwd();
const DIST_DIR     = path.resolve(PROJECT_ROOT, "dist");
const HTACCESS_MODE = (process.env.HTACCESS_MODE || "hosting").toLowerCase();
const BASE_PATH     = process.env.BUILD_BASE || "/";
const BACKEND_PATH  = (process.env.BACKEND_PATH || "").trim();

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function pathExists(p) {
  try { await access(p); return true; } catch { return false; }
}

async function isLaravelBackend(p) {
  return pathExists(path.join(p, "artisan"));
}

async function findBackendPath() {
  // 1. BACKEND_PATH definido manualmente → verificar y usar
  if (BACKEND_PATH) {
    if (await isLaravelBackend(BACKEND_PATH)) return BACKEND_PATH;
    console.warn(`[build] BACKEND_PATH="${BACKEND_PATH}" no contiene artisan, buscando automáticamente...`);
  }

  // 2. Subir desde PROJECT_ROOT hasta encontrar public_html/, buscar backend/ al lado
  let current = PROJECT_ROOT;
  for (let i = 0; i < 12; i++) {
    if (path.basename(current) === "public_html") {
      const candidate = path.join(path.dirname(current), "backend");
      if (await isLaravelBackend(candidate)) {
        console.log(`[build] backend encontrado en: ${candidate}`);
        return candidate;
      }
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  // 3. Buscar en ~/domains/*/backend/
  const domainsDir = path.join(os.homedir(), "domains");
  if (await pathExists(domainsDir)) {
    const domains = await readdir(domainsDir);
    for (const domain of domains) {
      const candidate = path.join(domainsDir, domain, "backend");
      if (await isLaravelBackend(candidate)) {
        console.log(`[build] backend encontrado en: ${candidate}`);
        return candidate;
      }
    }
  }

  // 4. Buscar en ~/backend/
  const homeBackend = path.join(os.homedir(), "backend");
  if (await isLaravelBackend(homeBackend)) {
    console.log(`[build] backend encontrado en: ${homeBackend}`);
    return homeBackend;
  }

  return null;
}

function normalizeBase(base) {
  let out = base.trim();
  if (!out.startsWith("/")) out = `/${out}`;
  if (!out.endsWith("/")) out = `${out}/`;
  return out;
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
// Siempre se crea en dist/backend/public/index.php.
// Si BACKEND_PATH está definido → redirige al Laravel real fuera de public_html.
// Si no está definido → devuelve JSON de error (nunca HTML, para no romper el SW).

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
    console.log("[build] bridge API → placeholder JSON (backend no encontrado)");
  }

  await writeFile(path.resolve(dir, "index.php"), content, "utf8");
}

// ─── Serve-upload ─────────────────────────────────────────────────────────────
// Siempre se crea en dist/backend/public/serve-upload.php.
// Si BACKEND_PATH está definido → sirve archivos desde el backend externo.
// Si no → devuelve JSON de error.

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
echo json_encode(['error' => 'BACKEND_PATH no configurado en el entorno de build.']);
`;
    console.log("[build] serve-upload → placeholder JSON (BACKEND_PATH no definido)");
  }

  await writeFile(path.resolve(dir, "serve-upload.php"), content, "utf8");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("[build:env] BACKEND_PATH  =", BACKEND_PATH || "(no definido, se buscará automáticamente)");
  console.log("[build:env] BASE_PATH     =", BASE_PATH);
  console.log("[build:env] HTACCESS_MODE =", HTACCESS_MODE);

  const resolvedBackend = await findBackendPath();
  console.log("[build:env] backend resuelto =", resolvedBackend ?? "(no encontrado)");

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

  console.log("[build] listo. dist/ → public_html/");
  if (!resolvedBackend) {
    console.log("[build] AVISO: backend no encontrado. Los bridges PHP devolverán 503.");
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
