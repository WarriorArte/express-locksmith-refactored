import { execFileSync } from "node:child_process";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const PROJECT_ROOT = process.cwd();
const DIST_DIR     = path.resolve(PROJECT_ROOT, "dist");
const HTACCESS_MODE = (process.env.HTACCESS_MODE || "hosting").toLowerCase();
const BASE_PATH     = process.env.BUILD_BASE || "/";
const BACKEND_PATH  = (process.env.BACKEND_PATH || "").trim();

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

async function createBackendBridge() {
  const dir = path.resolve(DIST_DIR, "backend/public");
  await mkdir(dir, { recursive: true });

  let content;
  if (BACKEND_PATH) {
    content = `<?php
$backend = '${BACKEND_PATH}';
if (!is_dir($backend)) {
    http_response_code(503);
    header('Content-Type: application/json');
    die(json_encode(['error' => 'Backend no encontrado en: ' . $backend]));
}
chdir($backend . '/public');
$_SERVER['SCRIPT_FILENAME'] = $backend . '/public/index.php';
require $backend . '/public/index.php';
`;
    console.log(`[build] bridge API → ${BACKEND_PATH}/public/index.php`);
  } else {
    content = `<?php
header('Content-Type: application/json');
http_response_code(503);
echo json_encode(['error' => 'BACKEND_PATH no configurado en el entorno de build.']);
`;
    console.log("[build] bridge API → placeholder JSON (BACKEND_PATH no definido)");
  }

  await writeFile(path.resolve(dir, "index.php"), content, "utf8");
}

// ─── Serve-upload ─────────────────────────────────────────────────────────────
// Siempre se crea en dist/backend/public/serve-upload.php.
// Si BACKEND_PATH está definido → sirve archivos desde el backend externo.
// Si no → devuelve JSON de error.

async function createUploadServer() {
  const dir = path.resolve(DIST_DIR, "backend/public");
  await mkdir(dir, { recursive: true });

  let content;
  if (BACKEND_PATH) {
    content = `<?php
$backend = '${BACKEND_PATH}';
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
    console.log(`[build] serve-upload → ${BACKEND_PATH}/public/uploads/`);
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
  console.log("[build:env] BACKEND_PATH  =", BACKEND_PATH  || "(no definido)");
  console.log("[build:env] BASE_PATH     =", BASE_PATH);
  console.log("[build:env] HTACCESS_MODE =", HTACCESS_MODE);

  const base = normalizeBase(BASE_PATH);
  console.log(`[build] vite --base=${base}`);
  execFileSync(
    process.execPath,
    [path.resolve(PROJECT_ROOT, "node_modules/vite/bin/vite.js"), "build", `--base=${base}`],
    { stdio: "inherit", cwd: PROJECT_ROOT },
  );

  await writeDistHtaccess();
  await createBackendBridge();
  await createUploadServer();

  console.log("[build] listo. dist/ → public_html/");
  if (!BACKEND_PATH) {
    console.log("[build] AVISO: define BACKEND_PATH en Hostinger para conectar al backend real.");
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
