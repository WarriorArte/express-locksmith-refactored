# Desarrollo local y Lovable con la base del hosting

El navegador no debe conectarse directo a MySQL. Local, Lovable y produccion deben hablar con una API Laravel; Laravel es quien usa las variables `DB_*`.

## Opcion recomendada: local/Lovable usan la API del hosting

En el frontend:

```env
VITE_PHP_API_BASE=https://tu-dominio.com/api
```

En el `backend/.env` del hosting:

```env
CORS_ALLOWED_ORIGINS='https://tu-dominio.com,http://localhost:8080,http://127.0.0.1:8080,http://localhost:5173,http://127.0.0.1:5173'
CORS_ALLOWED_ORIGIN_PATTERNS='/^https:\/\/.*\.lovable\.app$/,/^https:\/\/.*\.lovableproject\.com$/'
```

Despues de cambiar el `.env` del hosting:

```bash
cd backend
php artisan config:clear
```

Esta opcion evita abrir MySQL al exterior y funciona bien para Lovable, VS Code y cualquier preview del frontend.

## Opcion local aislada: Laravel local con base local

Usa MariaDB/MySQL local y cambia el frontend a:

```env
VITE_PHP_API_BASE=http://127.0.0.1:8000/api
```

En `backend/.env` local usa tu base local:

```env
APP_URL=http://127.0.0.1:8000
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=cerrajeria_express
DB_USERNAME=root
DB_PASSWORD=
```

Luego:

```bash
cd backend
composer install
php artisan key:generate
php artisan migrate
php artisan serve --host=127.0.0.1 --port=8000
```

## Opcion avanzada: tunel SSH a MySQL del hosting

Solo sirve si el hosting permite SSH y acceso interno a MySQL desde la cuenta:

```bash
ssh -L 3307:127.0.0.1:3306 usuario@tu-host
```

Mientras el tunel este abierto, `backend/.env` local puede apuntar a:

```env
DB_HOST=127.0.0.1
DB_PORT=3307
DB_DATABASE=nombre_db_hosting
DB_USERNAME=usuario_db_hosting
DB_PASSWORD=********
```

Si falla, normalmente el proveedor bloquea acceso remoto a MySQL. En ese caso usa la API del hosting.
