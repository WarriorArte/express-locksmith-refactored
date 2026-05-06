/**
 * Deploy Script - Compila y copia a WAMP
 *
 * CONFIGURACIÓN:
 * Edita la sección CONFIG abajo o usa variables de entorno.
 *
 * USO:
 *   pnpm run build:wamp
 *   
 * CON VARIABLES DE ENTORNO:
 *   WAMP_APP_DIR=lovawamp pnpm run build:wamp
 *   HTACCESS_MODE=wamp|hosting pnpm run build:wamp
 */

import { execSync } from "node:child_process";
import { access, cp, mkdir, rm, readdir, readFile, stat, rmdir, unlink, writeFile } from "node:fs/promises";
import { constants, existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

// ═══════════════════════════════════════════════════════════════════════════
// CONFIG - Ajusta estos valores según tu proyecto
// ═══════════════════════════════════════════════════════════════════════════
const CONFIG = {
  // Nombre de la carpeta en www (se usa para --base y destino)
  appDir: process.env.WAMP_APP_DIR || "lovawamp",
  
  // Ruta a la carpeta www de WAMP
  wampWwwPath: process.env.WAMP_WWW_PATH || "C:/wamp64/www",
  
  // Archivos/carpetas adicionales a copiar dentro de dist
  // Rutas relativas a la raíz del proyecto
  extraFiles: [
    { src: "php", dest: "php" },              // Carpeta completa
    // Añade más aquí:
    // { src: "docs", dest: "docs" },
    // { src: "config.json", dest: "config.json" },
  ],
  
  // Patrones a excluir al copiar (globs)
  exclude: [
    "**/node_modules/**",
    "**/.git/**",
    "**/db_config.php",
    "**/installed.lock",
  ],

  // Archivos/carpetas que deben sobrevivir entre deploys
  // (configuracion del instalador, lock de instalacion, uploads de usuarios)
  persistentPaths: [
    "php/config/db_config.php",
    "php/installed.lock",
    "php/uploads",
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════
const PROJECT_ROOT = process.cwd();
const DIST_DIR = path.resolve(PROJECT_ROOT, "dist");
const TARGET_DIR = path.resolve(CONFIG.wampWwwPath, CONFIG.appDir);
const BASE_PATH = `/${CONFIG.appDir}/`;
const HTACCESS_MODE = (process.env.HTACCESS_MODE || "wamp").toLowerCase();

function normalizeBasePath(rawBasePath) {
  let normalized = String(rawBasePath || "/").trim();
  if (!normalized.startsWith("/")) {
    normalized = `/${normalized}`;
  }
  if (!normalized.endsWith("/")) {
    normalized = `${normalized}/`;
  }
  return normalized;
}

const NORMALIZED_BASE_PATH = normalizeBasePath(BASE_PATH);

function getIndexTarget(basePath) {
  return basePath === "/" ? "index.html" : `${basePath}index.html`;
}

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

async function preservePersistentPaths(fromDir, toDir) {
  for (const relPath of CONFIG.persistentPaths) {
    const fromPath = path.resolve(fromDir, relPath);
    const toPath = path.resolve(toDir, relPath);

    if (!existsSync(fromPath)) {
      continue;
    }

    await copyFiltered(fromPath, toPath);
    console.log(`   ✓ persistido: ${relPath}`);
  }
}

// Elimina una carpeta recursivamente con reintentos para Windows
// Windows puede bloquear archivos si Apache/PHP los tiene abiertos
async function removeDirectoryRecursive(targetPath, maxRetries = 5) {
  if (!existsSync(targetPath)) {
    return; // No existe, nada que hacer
  }

  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Intenta eliminar recursivamente
      const entries = await readdir(targetPath, { withFileTypes: true });
      
      // Primero elimina el contenido de forma más granular
      for (const entry of entries) {
        const fullPath = path.join(targetPath, entry.name);
        if (entry.isDirectory()) {
          await removeDirectoryRecursive(fullPath, 1); // Sin reintentos internos
        } else {
          try {
            await unlink(fullPath);
          } catch (err) {
            // Si no se puede eliminar, intenta cambiar permisos en Windows
            if (process.platform === "win32") {
              try {
                execSync(`attrib -r "${fullPath}"`, { stdio: "ignore" });
                await unlink(fullPath);
              } catch {
                // Continúa intentando otros archivos
              }
            }
          }
        }
      }
      
      // Intenta eliminar la carpeta vacía
      await rmdir(targetPath);
      return; // Éxito
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        // Espera un poco antes de reintentar
        const waitMs = 500 * attempt;
        console.log(`   ⚠ No se pudo eliminar (intento ${attempt}/${maxRetries}), reintentando en ${waitMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitMs));
      }
    }
  }

  // Si llegamos aquí, falló después de reintentos
  console.warn(`   ⚠ No se pudo eliminar completamente: ${targetPath}`);
  console.warn(`   Causa: ${lastError?.message || 'desconocida'}`);
  console.warn(`   Tipología: En Windows, asegúrate de que Apache/PHP no esté sirviendo la carpeta`);
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════
async function run() {
  console.log("╔════════════════════════════════════════╗");
  console.log("║     lovawamp deploy                    ║");
  console.log("╚════════════════════════════════════════╝");
  console.log(`App: ${CONFIG.appDir}`);
  console.log(`Destino: ${TARGET_DIR}`);
  console.log(`HTACCESS_MODE: ${HTACCESS_MODE}`);
  console.log("");

  // Verificar que WAMP www existe
  await ensureExists(CONFIG.wampWwwPath, "La carpeta www de WAMP");

  // 1. Build con base path dinámico
  console.log(`[1/4] Compilando con --base=${BASE_PATH}`);
  execSync(`npx vite build --base=${BASE_PATH}`, { 
    stdio: "inherit", 
    cwd: PROJECT_ROOT 
  });

  await ensureExists(DIST_DIR, "La carpeta dist");

  // 2. Copiar archivos extra a dist
  console.log("[2/4] Copiando archivos adicionales a dist...");
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

  if (htaccessSource.endsWith(".hosting.example")) {
    const template = await readFile(htaccessSrcPath, "utf8");
    const rendered = template
      .replace(/__BASE_PATH__/g, NORMALIZED_BASE_PATH)
      .replace(/__INDEX_TARGET__/g, getIndexTarget(NORMALIZED_BASE_PATH));
    await writeFile(htaccessDistPath, rendered, "utf8");
  } else {
    await cp(htaccessSrcPath, htaccessDistPath, { force: true });
  }

  console.log(`   ✓ ${htaccessSource} → dist/.htaccess`);

  // 2.1 Conservar archivos persistentes del deploy anterior
  if (existsSync(TARGET_DIR)) {
    console.log("[2.1/4] Preservando archivos persistentes del deploy anterior...");
    await preservePersistentPaths(TARGET_DIR, DIST_DIR);
  }

  // 3. Limpiar destino anterior
  console.log("[3/4] Limpiando destino anterior...");
  await removeDirectoryRecursive(TARGET_DIR);
  await mkdir(TARGET_DIR, { recursive: true });

  // 4. Copiar dist a WAMP
  console.log("[4/4] Copiando dist a WAMP...");
  await cp(DIST_DIR, TARGET_DIR, { recursive: true, force: true });

  console.log("");
  console.log("╔════════════════════════════════════════╗");
  console.log("║  ✓ Deploy completado                   ║");
  console.log("╚════════════════════════════════════════╝");
  console.log(`URL: http://localhost/${CONFIG.appDir}/`);
  console.log(`Instalador: http://localhost/${CONFIG.appDir}/php/install.php`);
}

run().catch((error) => {
  console.error("");
  console.error("╔════════════════════════════════════════╗");
  console.error("║  ✗ Error en deploy                     ║");
  console.error("╚════════════════════════════════════════╝");
  console.error(error.message);
  console.error("");
  console.error("Tips:");
  console.error("  - Verifica que WAMP esté corriendo");
  console.error("  - Configura WAMP_APP_DIR como variable de entorno");
  process.exit(1);
});
