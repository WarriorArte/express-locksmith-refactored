# Build y Deploy - Guia completa

Este documento explica exactamente como se compila y despliega el proyecto en cada entorno.

> **Nota:** Los comandos usan `npm run`. Si usas `pnpm`, simplemente reemplaza `npm run` por `pnpm run`. Ambos funcionan igual.

---

## Resumen de scripts

| Comando | Script | Entorno destino | Base path |
|---|---|---|---|
| `npm run build` | `scripts/build-for-hosting.mjs` | Hosting compartido | `./` (relativo) |
| `npm run build:wamp` | `scripts/copy-dist-to-wamp.mjs` | WAMP local | `/<appDir>/` (ej: `/hamsa/`) |
| `npm run build:vite` | `vite build` (puro) | Manual/debug | Depende de config |

---

## 1. Build para Hosting (`npm run build`)

### Que hace paso a paso

1. Ejecuta `npx vite build --base=./` (base relativa por defecto).
2. Copia `php/` completo a `dist/php/` (excluyendo `db_config.php`, `installed.lock`, `node_modules`, `.git`).
3. Copia `.htaccess` a `dist/.htaccess` segun el modo seleccionado.

### Resultado en `dist/`

```
dist/
├── index.html
├── .htaccess              ← copiado de php/.htaccess.hosting.example
├── assets/
│   ├── index-XXXXX.js
│   └── index-XXXXX.css
└── php/
    ├── api/
    │   ├── helpers/
    │   ├── auth.php
    │   ├── experiences.php
    │   ├── profile.php
    │   ├── projects.php
    │   ├── project-categories.php
    │   ├── skill-categories.php
    │   ├── skills.php
    │   └── uploads.php
    ├── config/
    │   └── database.php
    ├── schema/
    ├── uploads/
    ├── install.php
    └── .htaccess
```

### .htaccess en modo hosting

Usa rutas relativas (sin `RewriteBase`), funciona en raiz o subcarpeta automaticamente:

```apache
RewriteEngine On
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_FILENAME} !-l
RewriteRule . index.html [L]
```

### Como ejecutar

```bash
# Modo default (hosting)
npm run build

# Equivalente explicito
HTACCESS_MODE=hosting npm run build
```

### Despliegue

Subir todo el contenido de `dist/` a la raiz del hosting (o a una subcarpeta). No se necesita configuracion adicional si el hosting tiene Apache con `mod_rewrite`.

---

## 2. Build para WAMP (`npm run build:wamp`)

### Que hace paso a paso

1. Ejecuta `npx vite build --base=/<appDir>/` (ej: `--base=/hamsa/`).
2. Copia `php/` completo a `dist/php/` (mismas exclusiones).
3. Copia `.htaccess` a `dist/.htaccess` segun modo (default: `wamp`).
4. Preserva archivos persistentes del deploy anterior:
   - `php/config/db_config.php` (credenciales BD).
   - `php/installed.lock` (marca de instalacion).
   - `php/uploads/` (archivos subidos por el usuario).
5. Elimina la carpeta destino anterior con reintentos (Windows puede bloquear archivos).
6. Copia `dist/` completo a `C:/wamp64/www/<appDir>/`.

### Resultado en WAMP

```
C:/wamp64/www/hamsa/
├── index.html
├── .htaccess              ← copiado de php/.htaccess (modo wamp)
├── assets/
├── php/
│   ├── api/
│   ├── config/
│   │   └── db_config.php  ← persistido del deploy anterior
│   ├── uploads/            ← persistido del deploy anterior
│   ├── installed.lock      ← persistido del deploy anterior
│   └── install.php
└── ...
```

### .htaccess en modo wamp

Usa `RewriteBase` con la subcarpeta fija:

```apache
RewriteEngine On
RewriteBase /hamsa/
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_FILENAME} !-l
RewriteRule . /hamsa/index.html [L]
```

### Como ejecutar

```bash
# Default (usa appDir = hamsa, wampPath = C:/wamp64/www)
npm run build:wamp

# Personalizado
WAMP_APP_DIR=mi-portafolio npm run build:wamp
```

### URL resultante

```
http://localhost/hamsa/
http://localhost/hamsa/php/install.php
http://localhost/hamsa/admin
```

---

## 3. Diferencias clave entre modos

| Aspecto | Hosting (`build`) | WAMP (`build:wamp`) |
|---|---|---|
| Base path | `./` (relativo) | `/<appDir>/` (absoluto) |
| .htaccess default | `php/.htaccess.hosting.example` | `php/.htaccess` |
| RewriteBase | No usa (relativo) | Si (`/hamsa/`) |
| Copia a WAMP | No | Si |
| Archivos persistentes | No aplica | Si (db_config, uploads, lock) |
| HTACCESS_MODE default | `hosting` | `wamp` |

---

## 4. Router base en frontend (App.tsx)

El frontend detecta la base automaticamente en tiempo de ejecucion con `detectRouterBase()`:

1. Si `import.meta.env.BASE_URL` es un path real (ej: `/hamsa/`), lo usa directamente.
2. Si es `./` (hosting), detecta la subcarpeta desde la URL del bundle (`/assets/index-*.js`).
3. Fallback: `/`.

Esto significa que no hay que cambiar codigo entre hosting y WAMP; el router se adapta solo.

---

## 5. Variables de entorno

| Variable | Default en `build` | Default en `build:wamp` | Descripcion |
|---|---|---|---|
| `WAMP_WWW_PATH` | N/A | `C:/wamp64/www` | Ruta base WAMP |
| `WAMP_APP_DIR` | `hamsa` | `hamsa` | Nombre carpeta en www |
| `HTACCESS_MODE` | `hosting` | `wamp` | Selecciona .htaccess |
| `BUILD_BASE` | `./` | `/<appDir>/` | Override avanzado de base |

---

## 6. Errores comunes al compilar

### La pantalla queda en blanco despues del deploy

- **Causa**: base path no coincide con la ruta real del servidor.
- **Solucion**: verificar que `HTACCESS_MODE` sea correcto para el entorno.

### MIME type text/html en modulo JS

- **Causa**: `.htaccess` redirige assets al `index.html`.
- **Solucion**: asegurar que `RewriteCond %{REQUEST_FILENAME} !-f` existe antes del RewriteRule.

### `db_config.php` desaparece despues de build:wamp

- **Causa**: la carpeta destino se limpio antes de copiar persistentes.
- **Solucion**: el script actual ya preserva automaticamente. Si falla, verificar permisos de la carpeta WAMP.

### Build dice "vite not found"

- **Causa**: dependencias no instaladas.
- **Solucion**: `npm install` (o `pnpm install`) antes de build.

### PowerShell no toma la variable de entorno

```powershell
# Correcto en PowerShell:
$env:HTACCESS_MODE="hosting"; npm run build

# Limpiar despues si es necesario:
Remove-Item Env:HTACCESS_MODE -ErrorAction SilentlyContinue
```

---

## 7. Checklist pre-deploy

### Para hosting

- [ ] `npm run build` termina sin errores.
- [ ] `dist/` contiene `index.html`, `assets/`, `php/`, `.htaccess`.
- [ ] Subir todo el contenido de `dist/` al hosting.
- [ ] Navegar al instalador: `https://mi-dominio.com/php/install.php`.

### Para WAMP

- [ ] WAMP esta corriendo con Apache activo.
- [ ] `npm run build:wamp` termina sin errores.
- [ ] Navegar a `http://localhost/<appDir>/`.
- [ ] Si es primera vez, usar el instalador: `http://localhost/<appDir>/php/install.php`.
