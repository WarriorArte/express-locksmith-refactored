import { execSync } from "node:child_process";
import { cp, mkdir, readdir, stat, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const PROJECT_ROOT = process.cwd();
const DIST_DIR = path.resolve(PROJECT_ROOT, "dist");

const HTACCESS_MODE = (process.env.HTACCESS_MODE || "hosting").toLowerCase();
const APP_DIR = process.env.WAMP_APP_DIR || "cerrajer-a-express";
const BASE_PATH = process.env.BUILD_BASE || (HTACCESS_MODE === "hosting" ? "./" : `/${APP_DIR}/`);

const EXCLUDE_PATTERNS = [
  /(^|\\|\/)node_modules(\\|\/)/,
  /(^|\\|\/)\.git(\\|\/)/,
  /db_config\.php$/,
  /installed\.lock$/,
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

function normalizeBase(base) {
  if (base === "./") return base;
  let out = base.trim();
  if (!out.startsWith("/")) out = `/${out}`;
  if (!out.endsWith("/")) out = `${out}/`;
  return out;
}

function indexTarget(base) {
  if (base === "./") return "index.html";
  return `${normalizeBase(base)}index.html`;
}

async function writeDistHtaccess() {
  const modeToFile = {
    hosting: "php/.htaccess.hosting.example",
    wamp: "php/.htaccess",
  };

  const sourceRel = modeToFile[HTACCESS_MODE] || "php/.htaccess.hosting.example";
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

async function main() {
  console.log(`[build] vite --base=${BASE_PATH}`);
  execSync(`npx vite build --base=${BASE_PATH}`, { stdio: "inherit", cwd: PROJECT_ROOT });

  const phpSrc = path.resolve(PROJECT_ROOT, "php");
  if (existsSync(phpSrc)) {
    await copyFiltered(phpSrc, path.resolve(DIST_DIR, "php"));
    console.log("[build] php -> dist/php");
  }

  await writeDistHtaccess();
  console.log("[build] .htaccess generado en dist/.htaccess");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
