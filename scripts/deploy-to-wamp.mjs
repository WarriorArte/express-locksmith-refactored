import { execSync } from "node:child_process";
import { cp, mkdir, readFile, readdir, rmdir, stat, unlink, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const PROJECT_ROOT = process.cwd();
const DIST_DIR = path.resolve(PROJECT_ROOT, "dist");

const APP_DIR = process.env.WAMP_APP_DIR || "cerrajer-a-express";
const WAMP_WWW_PATH = process.env.WAMP_WWW_PATH || "C:/wamp64/www";
const TARGET_DIR = path.resolve(WAMP_WWW_PATH, APP_DIR);

const HTACCESS_MODE = (process.env.HTACCESS_MODE || "wamp").toLowerCase();
const BASE_PATH = process.env.BUILD_BASE || `/${APP_DIR}/`;

const EXCLUDE_PATTERNS = [
  /(^|\\|\/)node_modules(\\|\/)/,
  /(^|\\|\/)\.git(\\|\/)/,
  /db_config\.php$/,
  /installed\.lock$/,
  /(^|\\|\/)\.env$/,
];

const PERSISTENT_PATHS = [
  "backend/.env",
  "backend/storage/app/installed.lock",
  "backend/storage/logs",
  "backend/storage/framework/cache",
  "backend/storage/framework/sessions",
  "backend/storage/framework/views",
];

function shouldExclude(filePath) {
  const rel = path.relative(PROJECT_ROOT, filePath).replace(/\\/g, "/");
  return EXCLUDE_PATTERNS.some((r) => r.test(rel));
}

async function copyFiltered(src, dest) {
  if (shouldExclude(src)) return;
  const info = await stat(src);

  if (info.isDirectory()) {
    await mkdir(dest, { recursive: true });
    const entries = await readdir(src);
    for (const e of entries) {
      await copyFiltered(path.join(src, e), path.join(dest, e));
    }
    return;
  }

  await cp(src, dest, { force: true });
}

async function removeDirectoryRecursive(targetPath) {
  if (!existsSync(targetPath)) return;
  const entries = await readdir(targetPath, { withFileTypes: true });

  for (const entry of entries) {
    const full = path.join(targetPath, entry.name);
    if (entry.isDirectory()) {
      await removeDirectoryRecursive(full);
    } else {
      await unlink(full);
    }
  }

  await rmdir(targetPath);
}

function normalizeBase(base) {
  let out = base.trim();
  if (!out.startsWith("/")) out = `/${out}`;
  if (!out.endsWith("/")) out = `${out}/`;
  return out;
}

function indexTarget(base) {
  return `${normalizeBase(base)}index.html`;
}

async function writeDistHtaccess() {
  const modeToFile = {
    hosting: "deploy/.htaccess.hosting.example",
    wamp: "deploy/.htaccess.wamp",
  };

  const sourceRel = modeToFile[HTACCESS_MODE] || "deploy/.htaccess.wamp";
  const src = path.resolve(PROJECT_ROOT, sourceRel);
  const dst = path.resolve(DIST_DIR, ".htaccess");

  if (!existsSync(src)) {
    throw new Error(`No existe archivo .htaccess fuente: ${sourceRel}`);
  }

  if (sourceRel.endsWith(".hosting.example")) {
    const tpl = await readFile(src, "utf8");
    const rendered = tpl
      .replace(/__BASE_PATH__/g, normalizeBase(BASE_PATH))
      .replace(/__INDEX_TARGET__/g, indexTarget(BASE_PATH));
    await writeFile(dst, rendered, "utf8");
    return;
  }

  await cp(src, dst, { force: true });
}

async function preservePersistent() {
  if (!existsSync(TARGET_DIR)) return;
  for (const rel of PERSISTENT_PATHS) {
    const fromPath = path.resolve(TARGET_DIR, rel);
    const toPath = path.resolve(DIST_DIR, rel);
    if (!existsSync(fromPath)) continue;
    const info = await stat(fromPath);
    if (info.isDirectory()) {
      await cp(fromPath, toPath, { recursive: true, force: true });
    } else {
      await mkdir(path.dirname(toPath), { recursive: true });
      await cp(fromPath, toPath, { force: true });
    }
  }
}

async function main() {
  if (!existsSync(WAMP_WWW_PATH)) {
    throw new Error(`No existe carpeta WAMP: ${WAMP_WWW_PATH}`);
  }

  console.log(`[deploy] vite --base=${BASE_PATH}`);
  execSync(`npx vite build --base=${BASE_PATH}`, { stdio: "inherit", cwd: PROJECT_ROOT });

  const backendSrc = path.resolve(PROJECT_ROOT, "backend");
  if (existsSync(backendSrc)) {
    await copyFiltered(backendSrc, path.resolve(DIST_DIR, "backend"));
    console.log("[deploy] backend -> dist/backend");
  }

  await writeDistHtaccess();
  await preservePersistent();

  await removeDirectoryRecursive(TARGET_DIR);
  await mkdir(TARGET_DIR, { recursive: true });
  await cp(DIST_DIR, TARGET_DIR, { recursive: true, force: true });
  // En algunos entornos Windows, fs.cp recursivo puede omitir dotfiles.
  await cp(path.resolve(DIST_DIR, '.htaccess'), path.resolve(TARGET_DIR, '.htaccess'), { force: true });

  console.log(`[deploy] listo: http://localhost/${APP_DIR}/`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
