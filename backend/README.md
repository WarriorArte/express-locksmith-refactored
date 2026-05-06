# Cerrajeria Express Laravel Backend

Este directorio es el inicio de la migracion del backend PHP procedural a Laravel.

## Estado actual

- Estructura Laravel API en `backend/`.
- Migracion inicial que reutiliza `../php/schema/schema.sql`.
- Respuestas compatibles con el frontend actual: `{ success, message, data }`.
- Autenticacion Bearer compatible con la tabla existente `auth_tokens`.
- Primeros endpoints migrados con rutas legacy:
  - `GET|POST /api/auth.php?action=...`
  - `GET|POST|PUT|DELETE /api/customers.php`
  - `GET|POST|PUT|DELETE /api/workshops.php`
  - `GET|POST|PUT|DELETE /api/profiles.php`
  - `GET|POST|PUT /api/business-settings.php`
  - `GET|POST|PUT|DELETE /api/categories.php`
  - `GET|POST|PUT|DELETE /api/tags.php`
  - `GET|POST|PUT|DELETE /api/products.php`
  - `GET|POST /api/inventory-movements.php`
  - `GET|POST|PUT|DELETE /api/quotes.php`
  - `GET|POST|PUT|DELETE /api/services.php`
  - `GET|POST|DELETE /api/service-images.php`
  - `GET|POST|PUT|DELETE /api/sales.php`
  - `GET|POST|PUT|DELETE /api/warranties.php`
  - `GET|POST|PUT|DELETE /api/warranty-settings.php`
  - `GET|POST|PUT|DELETE /api/templates.php`
  - `GET|POST|DELETE /api/template-selections.php`
  - `GET|PUT /api/appadmin-settings.php`
  - `GET|PUT /api/workshop-features.php`
  - `GET /api/dashboard-stats.php`
  - `GET /api/env-diagnostic.php`
  - `GET|POST /api/uploads.php`
  - `POST /api/backup-restore.php`

Mantener rutas `*.php` por ahora permite migrar el frontend por modulos sin cambiar todos los hooks al mismo tiempo.

## Instalacion cuando Composer pueda descargar paquetes

Composer esta fallando localmente por certificado TLS/Avast. Cuando se corrija, ejecutar:

```sh
cd backend
composer install
copy .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve --host=127.0.0.1 --port=8000
```

Luego probar el frontend con:

```env
VITE_PHP_API_BASE=http://127.0.0.1:8000/api
```

## Siguiente orden recomendado

1. Probar login + flujo real del frontend apuntando a `http://127.0.0.1:8000/api`.
2. Ajustar diferencias de respuesta que aparezcan durante QA.
3. Endurecer despliegue: desactivar/proteger `env-diagnostic.php`, configurar storage/uploads y revisar CORS.

## Instalador Laravel

Existe un instalador web en:

```txt
http://127.0.0.1:8000/install
```

El instalador **consume** `backend/.env`; no crea ni modifica credenciales de entorno. Su trabajo es:

- probar la conexion configurada en `backend/.env`,
- ejecutar `php artisan migrate`,
- crear o actualizar el unico usuario `superadmin`,
- opcionalmente crear talleres/usuarios/demo data de ejemplo,
- crear el lock `storage/app/installed.lock`.

Para probar desde cero:

1. Configurar `backend/.env` con una base de datos vacia ya existente.
2. Eliminar `backend/storage/app/installed.lock` si existe.
3. Levantar Laravel:

```sh
php artisan serve --host=127.0.0.1 --port=8000
```

4. Abrir `/install` y completar el formulario.

## CORS para VSCode y Lovable

Para desarrollar desde VSCode o Lovable consumiendo el Laravel publicado, el frontend debe apuntar a la API del servidor:

```env
VITE_PHP_API_BASE=https://mi-dominio.com/api
```

Y el `backend/.env` del servidor debe permitir esos origenes:

```env
CORS_ALLOWED_ORIGINS=https://mi-dominio.com,http://localhost:5173,http://localhost:8080
CORS_ALLOWED_ORIGIN_PATTERNS=/^https:\/\/.*\.lovable\.app$/,/^https:\/\/.*\.lovableproject\.com$/
```

Despues de cambiar CORS en el servidor:

```sh
php artisan config:clear
```
