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
  /(^|\\|\/)\.env$/,
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

function envValue(key, fallbackKeys = []) {
  const keys = [key, ...fallbackKeys];
  for (const k of keys) {
    const value = process.env[k];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}

function quoteEnvValue(value) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "")
    .replace(/"/g, '\\"');
}

async function writeRuntimeEnv(targetDir, label) {
  const config = {
    APP_NAME: envValue("APP_NAME"),
    APP_ENV: envValue("APP_ENV"),
    APP_KEY: envValue("APP_KEY", ["LARAVEL_APP_KEY"]),
    APP_DEBUG: envValue("APP_DEBUG"),
    APP_URL: envValue("APP_URL"),
    DB_HOST: envValue("DB_HOST", ["PHP_DB_HOST", "MYSQL_HOST"]),
    DB_PORT: envValue("DB_PORT", ["PHP_DB_PORT", "MYSQL_PORT"]),
    DB_NAME: envValue("DB_NAME", ["PHP_DB_NAME", "MYSQL_DATABASE"]),
    DB_USER: envValue("DB_USER", ["PHP_DB_USER", "DB_USERNAME", "MYSQL_USER"]),
    DB_PASSWORD: envValue("DB_PASSWORD", ["PHP_DB_PASSWORD", "DB_PASS", "MYSQL_PASSWORD"]),
    CORS_ALLOWED_ORIGINS: envValue("CORS_ALLOWED_ORIGINS", ["PHP_CORS_ALLOWED_ORIGINS"]),
    CORS_ALLOWED_ORIGIN_PATTERNS: envValue("CORS_ALLOWED_ORIGIN_PATTERNS", ["PHP_CORS_ALLOWED_ORIGIN_PATTERNS"]),
    LOG_CHANNEL: envValue("LOG_CHANNEL"),
    LOG_LEVEL: envValue("LOG_LEVEL"),
    SESSION_DRIVER: envValue("SESSION_DRIVER"),
  };

  const required = ["DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD"];
  const missing = required.filter((key) => !config[key]);

  if (missing.length > 0) {
    console.log(`[build] skip dist/${label}/.env (faltan variables: ${missing.join(", ")})`);
    return;
  }

  const envLines = [
    "# Auto-generated at build time",
    ...Object.entries(config)
      .filter(([, value]) => value)
      .map(([key, value]) => `${key}="${quoteEnvValue(value)}"`),
    "",
  ];

  const targetPath = path.resolve(DIST_DIR, targetDir, ".env");
  await writeFile(targetPath, envLines.join("\n"), "utf8");
  console.log(`[build] dist/${label}/.env generado desde variables de entorno`);
}

function indexTarget(base) {
  if (base === "./") return "index.html";
  return `${normalizeBase(base)}index.html`;
}

async function writeDistHtaccess() {
  const modeToFile = {
    hosting: "deploy/.htaccess.hosting.example",
    wamp: "deploy/.htaccess.wamp",
  };

  const sourceRel = modeToFile[HTACCESS_MODE] || "deploy/.htaccess.hosting.example";
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

  const backendSrc = path.resolve(PROJECT_ROOT, "backend");
  if (existsSync(backendSrc)) {
    await copyFiltered(backendSrc, path.resolve(DIST_DIR, "backend"));
    console.log("[build] backend -> dist/backend");
    await writeRuntimeEnv("backend", "backend");
  }

  await writeDistHtaccess();
  console.log("[build] .htaccess generado en dist/.htaccess");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
