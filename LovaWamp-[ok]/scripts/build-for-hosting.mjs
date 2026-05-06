/**
 * lovawamp - Build para hosting
 *
 * Hace build + empaquetado de extras en dist, sin copiar a WAMP.
 *
 * USO:
 *   pnpm run build
 *
 * VARIABLES OPCIONALES:
 *   WAMP_APP_DIR=lovawamp
 *   BUILD_BASE=/
 *   HTACCESS_MODE=hosting|wamp  # Selecciona .htaccess para dist (default: hosting)
 */

import { execSync } from "node:child_process";
import { access, cp, mkdir, readdir, stat } from "node:fs/promises";
import { constants, existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const CONFIG = {
  appDir: process.env.WAMP_APP_DIR || "lovawamp",
  extraFiles: [
    { src: "php", dest: "php" },
  ],
  exclude: [
    "**/node_modules/**",
    "**/.git/**",
    "**/db_config.php",
    "**/installed.lock",
  ],
};

const PROJECT_ROOT = process.cwd();
const DIST_DIR = path.resolve(PROJECT_ROOT, "dist");
const HTACCESS_MODE = (process.env.HTACCESS_MODE || "hosting").toLowerCase();
const BASE_PATH = process.env.BUILD_BASE || (HTACCESS_MODE === "hosting" ? "./" : `/${CONFIG.appDir}/`);

function resolveHtaccessSource() {
  const byMode = {
    hosting: "php/.htaccess.hosting.example",
    wamp: "php/.htaccess",
  };

  const selected = byMode[HTACCESS_MODE];
  if (!selected) {
    console.warn(`   ⚠ HTACCESS_MODE invalido: ${HTACCESS_MODE}. Usando modo wamp.`);
    return "php/.htaccess";
  }

  const selectedPath = path.resolve(PROJECT_ROOT, selected);
  if (!existsSync(selectedPath)) {
    console.warn(`   ⚠ No existe ${selected}. Usando php/.htaccess como fallback.`);
    return "php/.htaccess";
  }

  return selected;
}

async function ensureExists(targetPath, label) {
  try {
    await access(targetPath, constants.F_OK);
  } catch {
    throw new Error(`${label} no existe: ${targetPath}`);
  }
}

function shouldExclude(filePath) {
  const relative = path.relative(PROJECT_ROOT, filePath).replace(/\\/g, "/");
  return CONFIG.exclude.some((pattern) => {
    const regex = new RegExp(
      "^" + pattern.replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*") + "$"
    );
    return regex.test(relative);
  });
}

async function copyFiltered(src, dest) {
  if (shouldExclude(src)) return;

  const srcStat = await stat(src);

  if (srcStat.isDirectory()) {
    await mkdir(dest, { recursive: true });
    const entries = await readdir(src);
    for (const entry of entries) {
      await copyFiltered(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    await cp(src, dest, { force: true });
  }
}

async function run() {
  console.log("╔════════════════════════════════════════╗");
  console.log("║   Build para hosting (lovawamp)       ║");
  console.log("╚════════════════════════════════════════╝");
  console.log(`Base: ${BASE_PATH}`);
  console.log(`Dist: ${DIST_DIR}`);
  console.log(`HTACCESS_MODE: ${HTACCESS_MODE}`);
  console.log("");

  console.log(`[1/2] Compilando con --base=${BASE_PATH}`);
  execSync(`npx vite build --base=${BASE_PATH}`, {
    stdio: "inherit",
    cwd: PROJECT_ROOT,
  });

  await ensureExists(DIST_DIR, "La carpeta dist");

  console.log("[2/2] Copiando archivos adicionales a dist...");
  for (const { src, dest } of CONFIG.extraFiles) {
    const srcPath = path.resolve(PROJECT_ROOT, src);
    const destPath = path.resolve(DIST_DIR, dest);

    if (!existsSync(srcPath)) {
      console.warn(`   ⚠ No existe: ${src} (omitido)`);
      continue;
    }

    await copyFiltered(srcPath, destPath);
    console.log(`   ✓ ${src} → dist/${dest}`);
  }

  const htaccessSource = resolveHtaccessSource();
  const htaccessSrcPath = path.resolve(PROJECT_ROOT, htaccessSource);
  const htaccessDistPath = path.resolve(DIST_DIR, ".htaccess");
  await cp(htaccessSrcPath, htaccessDistPath, { force: true });

  console.log(`   ✓ ${htaccessSource} → dist/.htaccess`);

  console.log("");
  console.log("╔════════════════════════════════════════╗");
  console.log("║  ✓ Build listo para hosting            ║");
  console.log("╚════════════════════════════════════════╝");
}

run().catch((error) => {
  console.error("");
  console.error("╔════════════════════════════════════════╗");
  console.error("║  ✗ Error en build                      ║");
  console.error("╚════════════════════════════════════════╝");
  console.error(error.message);
  process.exit(1);
});
