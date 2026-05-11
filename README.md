# Sistema de Gestion para Cerrajeria IMG

Aplicacion para administrar una cerrajeria: clientes, servicios, cotizaciones,
ventas, inventario, garantias, usuarios y configuracion del negocio.

## Estado actual

El proyecto tiene dos partes principales:

- `src/`: frontend en React + Vite + TypeScript + Tailwind.
- `backend/`: API Laravel que mantiene rutas compatibles con el frontend actual.

Tambien quedan carpetas de apoyo:

- `backend/database/legacy/`: SQL heredado usado por migraciones e instalador.
- `deploy/` y `scripts/`: helpers para build, hosting compartido y WAMP.

La guia para entender la estructura esta en:

- [docs/ORDEN-DEL-PROYECTO.md](docs/ORDEN-DEL-PROYECTO.md)

## Requisitos

- Node.js para el frontend.
- PHP 8.3 o superior para Laravel.
- Composer para instalar dependencias del backend.
- MariaDB/MySQL para la base de datos.

## Frontend local

Instalar dependencias:

```sh
pnpm install
```

Crear `.env` en la raiz con la URL de la API:

```env
VITE_PHP_API_BASE=http://127.0.0.1:8000/api
```

Levantar Vite:

```sh
pnpm run dev
```

## Backend Laravel local

```sh
cd backend
composer install
php artisan key:generate
php artisan migrate
php artisan serve --host=127.0.0.1 --port=8000
```

## Deploy en Hostinger

En la configuracion de build de Hostinger usa:

```txt
Comando de compilacion: npm run build
Gestor de paquetes: npm
Directorio de salida: dist
```

Aunque el proyecto usa `pnpm` localmente, en Hostinger conviene usar `npm`.
Con `pnpm`, Hostinger puede fallar ejecutando el binario nativo de `esbuild`
durante la instalacion de dependencias.

El build detecta si falta `backend/vendor/autoload.php`. Si falta, instala dependencias PHP antes de copiar el backend a `dist/`:

```sh
composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist
```

El backend real sigue viviendo en:

```txt
backend/composer.json
```

El instalador web existe en:

```txt
http://127.0.0.1:8000/install
```

## Comandos utiles

```sh
pnpm run dev
pnpm run build
pnpm run build:wamp
pnpm run lint
```

Backend:

```sh
cd backend
php artisan test
php artisan config:clear
php artisan migrate
```

## Documentacion importante

- [docs/COMO-LO-HICE.md](docs/COMO-LO-HICE.md): bitacora de lo que se hizo para Hostinger/Laravel/CORS.
- [docs/LOCAL-LOVABLE-DB.md](docs/LOCAL-LOVABLE-DB.md): como conectar Lovable/local con Laravel.
- [backend/README.md](backend/README.md): estado de la migracion Laravel.
- [docs/MIGRATION_PROGRESS.md](docs/MIGRATION_PROGRESS.md): avance de la migracion.
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md): notas de despliegue antiguas y actuales.
