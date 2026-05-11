# Como deje funcionando React + Laravel en Hostinger

> Nota para mi: este archivo documenta lo que hice para que el frontend local/Lovable pudiera usar la API Laravel publicada en Hostinger, sin conectar el navegador directo a MySQL y sin subir `vendor` al repo.

## Resumen corto

El objetivo final fue este:

```txt
React local / Lovable
    |
    | VITE_PHP_API_BASE=https://magenta-jaguar-928938.hostingersite.com/api
    v
Laravel en Hostinger
    |
    | DB_* desde backend/.env
    v
MariaDB de Hostinger
```

La regla clave:

```txt
El navegador nunca se conecta a MySQL.
El navegador llama a Laravel.
Laravel es quien se conecta a la base de datos.
```

## Archivos importantes

Frontend:

```txt
.env
.env.local
.env.local.example
src/lib/phpApi.ts
```

Laravel:

```txt
backend/.env
backend/.env.example
backend/routes/api.php
backend/bootstrap/app.php
backend/config/cors.php
backend/config/cache.php
backend/app/Http/Middleware/CorsFromEnv.php
backend/app/Http/Controllers/EnvBugController.php
```

Build/deploy:

```txt
scripts/build-for-hosting.mjs
backend/.gitignore
.gitignore
LOCAL-LOVABLE-DB.md
```

## Frontend: apuntar React a la API publicada

En la raiz del proyecto, el frontend usa:

```env
VITE_PHP_API_BASE=https://magenta-jaguar-928938.hostingersite.com/api
```

El archivo que consume esa variable es:

```txt
src/lib/phpApi.ts
```

La parte importante:

```ts
const envApiBase = import.meta.env.VITE_PHP_API_BASE as string | undefined;
const API_BASE = (runtimeApiBase || envApiBase || `${import.meta.env.BASE_URL}api`).replace(/\/$/, "");
```

Eso significa que cuando el frontend llama:

```txt
/auth.php?action=login
```

en realidad llama:

```txt
https://magenta-jaguar-928938.hostingersite.com/api/auth.php?action=login
```

## Mantener endpoints viejos con Laravel

El frontend ya estaba construido para usar rutas tipo PHP viejo:

```txt
auth.php
products.php
workshops.php
```

Para no reescribir todos los hooks de React, Laravel conserva esas rutas en:

```txt
backend/routes/api.php
```

Ejemplo:

```php
Route::match(['GET', 'POST'], '/auth.php', [AuthController::class, 'handle']);
```

Asi Laravel recibe `/api/auth.php`, aunque ya no sea un archivo PHP procedural viejo.

## Preflight CORS

El navegador hace una peticion `OPTIONS` antes de algunos `POST`, `PUT` o `DELETE`.

El problema original fue:

```txt
No 'Access-Control-Allow-Origin' header is present
```

La causa fue que el navegador hacia preflight contra:

```txt
/api/auth.php?action=login
```

pero Laravel no tenia una ruta global para `OPTIONS`.

Se arreglo agregando en `backend/routes/api.php`:

```php
Route::options('/{path}', fn () => response('', 204))->where('path', '.*');
```

Eso hace que cualquier preflight bajo `/api/*` responda `204`.

## Middleware CORS global

Al principio el middleware CORS estaba ligado al grupo `api`, pero en Hostinger algunas respuestas `OPTIONS` no recibian todos los headers.

Se registro globalmente en:

```txt
backend/bootstrap/app.php
```

La idea:

```php
$middleware->prepend(\App\Http\Middleware\CorsFromEnv::class);
```

Asi CORS se aplica antes de que Laravel procese la ruta.

## Configuracion CORS desde .env

El middleware final no tiene origenes hardcodeados.

Archivo:

```txt
backend/app/Http/Middleware/CorsFromEnv.php
```

Lee desde:

```php
config('cors.allowed_origins')
config('cors.allowed_origins_patterns')
config('cors.allowed_methods')
config('cors.allowed_headers')
```

La configuracion vive en:

```txt
backend/config/cors.php
```

## El detalle importante de Hostinger

Aqui estuvo el detalle mas fino.

En Hostinger, `env('CORS_ALLOWED_ORIGINS')` estaba leyendo una variable del entorno del servidor, no necesariamente el valor generado en `backend/.env`.

Eso se vio con el endpoint temporal `/api/envbug.php`:

```txt
env_file tenia el valor correcto
env/getenv/_SERVER tenian otro valor viejo
```

Por eso `backend/config/cors.php` se cambio para priorizar el archivo real:

```php
$path = base_path('.env');
```

Orden actual:

```txt
1. Leer backend/.env directamente.
2. Si no existe la clave, usar env().
```

Esto hizo que Laravel usara el `.env` generado por el build, no una variable vieja del servidor.

## Valores CORS correctos en backend/.env

En el `.env` del backend en Hostinger debe quedar algo como:

```env
CORS_ALLOWED_ORIGINS='https://magenta-jaguar-928938.hostingersite.com,http://localhost:8080,http://127.0.0.1:8080,http://localhost:5173,http://127.0.0.1:5173'
CORS_ALLOWED_ORIGIN_PATTERNS='/^https:\/\/.*\.lovable\.app$/,/^https:\/\/.*\.lovableproject\.com$/'
CORS_ALLOWED_METHODS='GET,POST,PUT,PATCH,DELETE,OPTIONS'
CORS_ALLOWED_HEADERS='Content-Type,Authorization,X-Workshop-Id,X-Requested-With,Accept'
```

Importante:

```txt
Usar comillas simples en los regex.
```

Con comillas dobles, `phpdotenv` puede fallar con:

```txt
Encountered an unexpected escape sequence
```

## Como comprobe que CORS ya funcionaba

Se hizo una prueba real con `Origin: http://localhost:8080`.

El `OPTIONS` ya respondio:

```txt
Access-Control-Allow-Origin: http://localhost:8080
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Workshop-Id, X-Requested-With, Accept
```

El `POST` tambien devolvio `Access-Control-Allow-Origin`.

Eso confirmo que:

```txt
React local puede llamar a Laravel en Hostinger.
```

## Endpoint temporal de diagnostico

Se agrego temporalmente:

```txt
https://magenta-jaguar-928938.hostingersite.com/api/envbug.php
```

Archivos:

```txt
backend/app/Http/Controllers/EnvBugController.php
backend/routes/api.php
```

Sirve para ver:

```txt
env_file
env()
getenv()
$_ENV
$_SERVER
config('cors.*')
config cache
route cache
```

No muestra credenciales de DB.

Cuando todo este estable, este endpoint se debe eliminar:

```txt
backend/app/Http/Controllers/EnvBugController.php
Route::get('/envbug.php', [EnvBugController::class, 'handle']);
```

## Composer y vendor

El repo tenia `backend/vendor` rastreado por Git. Eso hacia los pushes lentos.

Se agrego en:

```txt
backend/.gitignore
```

Reglas importantes:

```gitignore
/vendor
/storage/framework.zip
/laravel-dev.*.log
```

Y se saco `vendor` del indice de Git sin borrar archivos locales:

```bash
git rm --cached -r backend/vendor backend/storage/framework.zip
```

En el servidor, las dependencias se instalan por SSH:

```bash
cd backend
composer install --no-dev --optimize-autoloader
```

## Composer debe ejecutarse dentro de backend

Error que salio:

```txt
Composer could not find a composer.json file
```

Causa:

```txt
Se estaba ejecutando composer install fuera de backend.
```

Correcto:

```bash
cd backend
composer install --no-dev --optimize-autoloader
```

Si no se sabe donde esta:

```bash
find . -name composer.json
```

## Cache de Laravel

Salio este error:

```txt
SQLSTATE[42S02]: Base table or view not found: 1146 Table '...cache' doesn't exist
```

Causa:

```txt
Laravel estaba intentando usar cache en base de datos.
La tabla cache no existia.
```

Se agrego:

```txt
backend/config/cache.php
```

Para usar cache por archivos por defecto:

```php
'default' => env('CACHE_STORE', env('CACHE_DRIVER', 'file')),
```

Y en `.env`:

```env
CACHE_STORE=file
CACHE_DRIVER=file
SESSION_DRIVER=array
```

Directorios necesarios:

```bash
mkdir -p storage/framework/cache/data storage/framework/sessions storage/framework/views bootstrap/cache
```

## Limpiar caches despues de deploy

Despues de cambiar `.env`, rutas o config:

```bash
cd backend
php artisan optimize:clear
php artisan config:clear
php artisan route:clear
```

Si `optimize:clear` falla por cache de DB, asegurar primero:

```env
CACHE_STORE=file
CACHE_DRIVER=file
```

## Script de build

Archivo:

```txt
scripts/build-for-hosting.mjs
```

Hace varias cosas:

```txt
1. Compila Vite.
2. Copia backend/ a dist/backend.
3. Excluye .env real.
4. Genera dist/backend/.env desde variables de entorno disponibles.
5. Crea directorios de storage/cache.
6. Genera .htaccess.
```

El generador de `.env` ahora incluye variables backend/Laravel como:

```txt
APP_*
DB_*
CORS_*
CACHE_*
SESSION_*
LOG_*
QUEUE_*
MAIL_*
FILESYSTEM_*
REDIS_*
AWS_*
S3_*
PHP_*
MYSQL_*
LARAVEL_*
DATABASE_URL
```

Tambien conserva aliases utiles:

```txt
PHP_DB_HOST -> DB_HOST
MYSQL_DATABASE -> DB_DATABASE
PHP_CORS_ALLOWED_ORIGINS -> CORS_ALLOWED_ORIGINS
```

Los valores se escriben con comillas simples:

```env
CORS_ALLOWED_ORIGIN_PATTERNS='/^https:\/\/.*\.lovable\.app$/,/^https:\/\/.*\.lovableproject\.com$/'
```

Eso evita el error de escapes de `phpdotenv`.

## Variables frontend vs backend

Frontend:

```env
VITE_PHP_API_BASE=https://magenta-jaguar-928938.hostingersite.com/api
```

Backend:

```env
DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=...
DB_USERNAME=...
DB_PASSWORD=...
CORS_ALLOWED_ORIGINS='...'
```

Regla:

```txt
VITE_* es para React.
DB_* y CORS_* son para Laravel.
```

## Lovable

Lovable no debe conectarse a MySQL.

Debe usar la misma API:

```env
VITE_PHP_API_BASE=https://magenta-jaguar-928938.hostingersite.com/api
```

Para previews dinamicos, se agrego:

```env
CORS_ALLOWED_ORIGIN_PATTERNS='/^https:\/\/.*\.lovable\.app$/,/^https:\/\/.*\.lovableproject\.com$/'
```

Tambien se pueden agregar URLs exactas en:

```env
CORS_ALLOWED_ORIGINS='https://id-preview--....lovable.app,...'
```

## .env y seguridad

Los `.env` reales no se suben al repo.

En `.gitignore`:

```gitignore
*.local
.env
.env.local
```

En `backend/.gitignore`:

```gitignore
/.env
/vendor
```

Se deja ejemplo seguro en:

```txt
.env.local.example
backend/.env.example
```

## Flujo recomendado de deploy

Local:

```bash
npm run build
git status --short
git add .
git commit -m "Deploy Laravel hosting fixes"
git push
```

Servidor:

```bash
cd backend
composer install --no-dev --optimize-autoloader
mkdir -p storage/framework/cache/data storage/framework/sessions storage/framework/views bootstrap/cache
php artisan optimize:clear
php artisan config:clear
php artisan route:clear
```

Probar:

```txt
https://magenta-jaguar-928938.hostingersite.com/api/envbug.php
```

Luego probar login desde:

```txt
http://localhost:8080
```

## Como saber si CORS esta bien

La respuesta debe tener:

```txt
Access-Control-Allow-Origin: http://localhost:8080
```

Si falta ese header, revisar:

```txt
1. backend/.env tiene el origin correcto.
2. backend/config/cors.php esta leyendo env_file.
3. php artisan config:clear se ejecuto.
4. /api/envbug.php muestra config.cors.allowed_origins correcto.
```

## Problemas y solucion final

### Problema 1: preflight sin ruta

Solucion:

```php
Route::options('/{path}', fn () => response('', 204))->where('path', '.*');
```

### Problema 2: middleware CORS no siempre corria

Solucion:

```php
$middleware->prepend(\App\Http\Middleware\CorsFromEnv::class);
```

### Problema 3: `env()` leia otra fuente en Hostinger

Solucion:

```txt
backend/config/cors.php lee primero backend/.env directamente.
```

### Problema 4: regex CORS rompia phpdotenv

Solucion:

```txt
Usar comillas simples en .env.
```

### Problema 5: Laravel cache usaba DB

Solucion:

```txt
backend/config/cache.php
CACHE_STORE=file
```

### Problema 6: repo subia Laravel vendor

Solucion:

```txt
Ignorar backend/vendor
Instalar composer en hosting por SSH
```

## Limpieza pendiente

Cuando ya no necesite diagnostico:

```txt
Eliminar backend/app/Http/Controllers/EnvBugController.php
Eliminar Route::get('/envbug.php', ...)
```

Tambien se puede quitar cualquier endpoint diagnostico viejo si ya no se usa.

## Frase resumen

La solucion final fue hacer que React siempre hable con Laravel en Hostinger, que Laravel lea CORS desde el `backend/.env` real generado por el deploy, y que Composer/cache funcionen en el servidor sin subir `vendor` al repo.
