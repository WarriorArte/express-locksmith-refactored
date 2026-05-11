# Orden del proyecto

Esta guia sirve para entender que es cada cosa y que se puede limpiar con calma.

## Mapa rapido

| Ruta | Que es | Estado |
| --- | --- | --- |
| `src/` | Aplicacion React: pantallas, componentes, hooks y llamadas a API. | Principal |
| `backend/` | API Laravel nueva. Mantiene rutas tipo `*.php` para no romper el frontend. | Principal |
| `backend/app/` | Controladores, modelos, middleware y soporte Laravel. | Principal |
| `backend/routes/api.php` | Rutas que consume React. | Principal |
| `backend/database/migrations/` | Estructura de base de datos en Laravel. | Principal |
| `backend/database/migrations/2026_05_06_000000_create_application_schema.php` | Unica migracion base para instalar desde cero. | Principal |
| `backend/tests/` | Pruebas del backend. | Principal |
| `public/` | Archivos publicos del frontend. | Principal |
| `scripts/` | Scripts de build/deploy. | Util |
| `deploy/` | Plantillas `.htaccess` para hosting/WAMP. | Util |
| `backend/database/legacy/` | SQL heredado que Laravel usa para migracion e instalador demo. | Util |
| `dist/` | Resultado generado por `pnpm run build`. | No editar |
| `node_modules/` | Dependencias Node instaladas. | No editar |
| `backend/vendor/` | Dependencias Composer instaladas. | No editar |

## Archivos de la raiz

| Archivo | Para que sirve | Decision |
| --- | --- | --- |
| `.env` | Variables locales de Vite para el frontend. | Conservar local, no subir |
| `.gitignore` | Le dice a Git que ignore dependencias, builds, logs y `.env`. | Conservar |
| `components.json` | Configuracion de shadcn/ui. | Conservar |
| `eslint.config.js` | Configuracion de ESLint para `pnpm run lint`. | Conservar |
| `index.html` | Entrada HTML de Vite/React. | Conservar |
| `package.json` | Scripts y dependencias del frontend. | Conservar |
| `pnpm-lock.yaml` | Versiones exactas instaladas con pnpm. | Conservar |
| `postcss.config.js` | Conecta Tailwind y Autoprefixer. | Conservar |
| `README.md` | Guia principal del proyecto. | Conservar |
| `tailwind.config.ts` | Configuracion visual de Tailwind. | Conservar |
| `tsconfig.json` | Configuracion principal de TypeScript. | Conservar |
| `tsconfig.app.json` | Configuracion TypeScript de la app React. | Conservar |
| `tsconfig.node.json` | Configuracion TypeScript para `vite.config.ts`. | Conservar |
| `vite.config.ts` | Configuracion de Vite, React, alias `@`, PWA y servidor local. | Conservar |

Archivos de hosting externo eliminados porque no se usan:

- `netlify.toml`
- `vercel.json`

Lockfiles de Bun eliminados porque el proyecto usara pnpm:

- `bun.lock`
- `bun.lockb`

## Archivos que no se deben subir con secretos

- `.env`
- `backend/.env`
- cualquier archivo con passwords, tokens o claves privadas

## Variables de entorno

Para no duplicar configuracion, la raiz usa solo:

- `.env`: variables reales del frontend local.

El backend Laravel usa su propio archivo:

- `backend/.env`

No hace falta tener tambien `.env.local` en la raiz si contiene lo mismo que `.env`.

## Archivos `.htaccess`

| Ruta | Para que sirve | Se usa realmente |
| --- | --- | --- |
| `deploy/.htaccess.hosting.example` | Plantilla usada por `pnpm run build` para generar `dist/.htaccess` en hosting tipo Hostinger/Apache. | Si, para deploy hosting |
| `deploy/.htaccess.wamp` | Plantilla usada por `pnpm run build:wamp` para WAMP. | Si, solo WAMP |
| `backend/public/.htaccess` | Reglas propias de Laravel si Apache sirve directamente `backend/public`. | Util para Laravel |
| `public/uploads/.htaccess` | Cache para uploads/imagenes publicas. | Util si se sube `public/uploads` |
| `dist/.htaccess` | Archivo generado por build. | No editar |

En el flujo actual, `scripts/build-for-hosting.mjs` toma `deploy/.htaccess.hosting.example`, reemplaza `__BASE_PATH__` y `__INDEX_TARGET__`, y escribe el resultado en `dist/.htaccess`.

Archivos `.htaccess` viejos eliminados:

- `.htaccess`
- `php/.htaccess`
- `php/.htaccess.hosting.example`
- `php/schema/.htaccess`

## Que puedo borrar sin miedo despues de confirmar

Estas cosas normalmente se pueden borrar porque se regeneran:

- `dist/`
- `node_modules/`
- `backend/vendor/`
- logs `*.log`
- caches de pruebas como `.phpunit.result.cache`

No los borres si los necesitas justo en ese momento para correr el proyecto localmente; simplemente se pueden volver a crear con `pnpm install`, `composer install` o `pnpm run build`.

## Cosas que necesitan decision antes de limpiar

### Lockfiles del frontend

El manejador oficial local elegido es `pnpm`.

El lockfile correcto del frontend es:

- `pnpm-lock.yaml`

No hace falta conservar lockfiles de Bun o npm si no se usan.

En Hostinger, usar `npm` para el build si `pnpm` falla con permisos de `esbuild`.

### SQL heredado

El schema y seed que antes estaban en `php/schema/` ahora viven en `backend/database/legacy/`, porque los consume Laravel:

- `backend/database/legacy/schema.sql`
- `backend/database/legacy/seed_sample_data.sql`

El archivo manual `migrate_security_2026_05_06.sql` se elimino porque era para actualizar bases viejas. La instalacion nueva empieza desde cero con una sola migracion.

## Limpieza dentro de `backend/`

Archivos eliminados porque eran temporales o de emergencia:

- `backend/clear-cache.php`
- `backend/nuke-cache.php`
- `backend/laravel-dev.err.log`
- `backend/laravel-dev.out.log`
- `backend/api/cors-proxy.php`

Archivos que deben quedarse en la raiz de `backend/`:

- `.env`: configuracion real local del backend.
- `.gitignore`: evita subir vendor, logs, cache y `.env`.
- `artisan`: consola de Laravel.
- `composer.json` y `composer.lock`: dependencias PHP.
- `phpunit.xml`: configuracion de pruebas.
- `README.md`: notas del backend.

### Documentos de notas

- `docs/COMO-LO-HICE.md` es una bitacora util.
- `docs/MIGRATION_PROGRESS.md` ayuda a saber que falta migrar.
- `docs/DEPLOYMENT.md` puede estar mezclando informacion vieja; revisar antes de seguirlo al pie de la letra.
- `ModTree.md` esta vacio y parece candidato a borrar.

## Regla practica para seguir vibecodeando sin perderse

1. Cambios visuales o pantallas: empieza en `src/pages/` y `src/components/`.
2. Datos que vienen del servidor: mira primero `src/hooks/` y luego `src/lib/phpApi.ts`.
3. Errores de API: revisa `backend/routes/api.php` y el controlador en `backend/app/Http/Controllers/`.
4. Base de datos: revisa `backend/database/migrations/`.
5. Deploy o Hostinger: revisa `COMO-LO-HICE.md`, `scripts/` y `deploy/`.

## Proxima limpieza recomendada

1. Revisar `docs/DEPLOYMENT.md` y actualizarlo a Laravel.
2. Crear un checklist de funcionalidades que todavia fallan.
