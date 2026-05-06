# Como migre mi app a Laravel sin romper el frontend React

> Escrito para mi mismo, para entender que hice y poder repetirlo en otro proyecto.
> Fecha: Mayo 2026

---

## Resumen rapido

Mi app tenia un frontend React que hablaba con una API PHP vieja usando URLs como:

```txt
/php/api/auth.php
/php/api/products.php
/php/api/workshops.php
```

La migracion a Laravel funciono sin reescribir toda la app de React porque mantuve el mismo contrato de API:

```txt
React sigue llamando a endpoints *.php
Laravel recibe esas rutas
Laravel responde con el mismo formato JSON
```

El cambio principal fue apuntar el frontend a Laravel usando `.env`:

```env
VITE_PHP_API_BASE=http://127.0.0.1:8000/api
```

React no sabe ni le importa si atras hay PHP viejo o Laravel. Solo necesita que las URLs y las respuestas sigan siendo compatibles.

---

## La idea clave

No migre la app cambiando todo al mismo tiempo. Hice una migracion por compatibilidad.

Antes:

```txt
React
  |
  | fetch()
  v
PHP procedural viejo
  |
  v
MariaDB
```

Ahora:

```txt
React
  |
  | fetch()
  v
Laravel
  |
  v
MariaDB
```

Pero desde el punto de vista de React, las llamadas siguen parecidas:

```txt
GET /api/products.php?workshop_id=...
POST /api/auth.php?action=login
PUT /api/workshops.php?action=switch&id=...
```

Laravel esta imitando las rutas antiguas mientras por dentro usa controladores, middleware, modelos y migraciones.

---

## Por que no tuve que cambiar Node.js

Node.js, Vite y React no son el backend. En este proyecto Node.js se usa principalmente para:

- correr el servidor de desarrollo con Vite
- compilar React con `npm run build`
- servir archivos JS/CSS durante desarrollo

La conexion al backend vive en el codigo del frontend, principalmente en:

```txt
src/lib/phpApi.ts
```

Ese archivo calcula la URL base asi:

```ts
const envApiBase = import.meta.env.VITE_PHP_API_BASE;
```

Entonces al cambiar `.env`:

```env
VITE_PHP_API_BASE=http://127.0.0.1:8000/api
```

todo lo que usa `phpApiRequest(...)` empezo a llamar a Laravel.

En resumen:

```txt
No cambie Node.js
Cambie la URL base de la API
Laravel mantuvo las rutas viejas
React siguio funcionando
```

---

## Como quedo la arquitectura local

```txt
[Navegador]
    |
    | http://localhost:8080
    v
[React + Vite]
    |
    | http://127.0.0.1:8000/api/*.php
    v
[Laravel en backend/]
    |
    | DB_CONNECTION=mysql
    v
[MariaDB local: cerrajeria_express]
```

El frontend corre en un puerto y Laravel en otro:

```txt
Frontend: http://localhost:8080
Backend:  http://127.0.0.1:8000
API:      http://127.0.0.1:8000/api
```

Por eso hubo que configurar CORS para permitir que `localhost:8080` pudiera hablar con `127.0.0.1:8000`.

---

## Archivos importantes

### Frontend

```txt
.env
src/lib/phpApi.ts
src/hooks/useAuth.tsx
src/hooks/useWorkshop.tsx
src/pages/Auth.tsx
src/pages/SuperAdmin.tsx
```

### Laravel

```txt
backend/.env
backend/routes/api.php
backend/config/cors.php
backend/app/Http/Middleware/CorsFromEnv.php
backend/app/Http/Middleware/AuthenticateLegacyToken.php
backend/app/Support/LegacyAuth.php
backend/app/Support/ApiResponse.php
backend/app/Support/Uuid.php
backend/app/Http/Controllers/
backend/database/migrations/2026_05_06_000000_create_legacy_schema.php
```

---

## La conexion del frontend con Laravel

En el `.env` de la raiz del proyecto:

```env
VITE_PHP_API_BASE=http://127.0.0.1:8000/api
```

En `src/lib/phpApi.ts`, la app usa esa variable para construir las URLs:

```ts
const API_BASE = (runtimeApiBase || envApiBase || `${import.meta.env.BASE_URL}php/api`).replace(/\/$/, "");
```

Cuando un hook hace esto:

```ts
phpApiRequest(`/products.php?workshop_id=${currentWorkshop.id}`)
```

en realidad termina llamando:

```txt
http://127.0.0.1:8000/api/products.php?workshop_id=...
```

Ese endpoint ya no es el archivo PHP viejo. Ahora es una ruta de Laravel.

---

## Como Laravel imita la API vieja

En `backend/routes/api.php` se registraron rutas con los mismos nombres:

```php
Route::match(['GET', 'POST'], '/auth.php', [AuthController::class, 'handle']);
Route::match(['GET', 'POST', 'PUT', 'DELETE'], '/products.php', [ProductController::class, 'handle']);
Route::match(['GET', 'POST', 'PUT', 'DELETE'], '/workshops.php', [WorkshopController::class, 'handle']);
```

Eso significa que Laravel acepta URLs tipo:

```txt
/api/auth.php
/api/products.php
/api/workshops.php
```

Aunque tengan extension `.php`, son rutas Laravel normales.

Esto fue intencional para no tener que cambiar todos los hooks del frontend de golpe.

---

## Formato de respuesta compatible

La API vieja respondia asi:

```json
{
  "success": true,
  "message": "Operacion exitosa",
  "data": []
}
```

Laravel conserva ese formato usando:

```txt
backend/app/Support/ApiResponse.php
```

Asi el frontend no tuvo que aprender un formato nuevo.

Errores tambien siguen la misma idea:

```json
{
  "success": false,
  "message": "Token de autorizacion requerido"
}
```

---

## Autenticacion

El sistema sigue usando Bearer Token.

Flujo:

```txt
1. React manda email/password a /api/auth.php?action=login
2. Laravel valida el usuario en app_users
3. Laravel genera un token
4. Laravel guarda el hash SHA-256 del token en auth_tokens
5. React guarda el token real en localStorage
6. React manda Authorization: Bearer TOKEN en cada request
7. Laravel valida el token con AuthenticateLegacyToken
```

El token se guarda en el navegador con la llave:

```txt
ce_php_auth_token
```

La validacion vive principalmente en:

```txt
backend/app/Http/Middleware/AuthenticateLegacyToken.php
backend/app/Support/LegacyAuth.php
```

---

## Roles y talleres

La regla correcta del sistema es:

```txt
Solo existe un superadmin global.
Los demas usuarios pertenecen a talleres.
Dentro de cada taller pueden ser admin o employee.
```

Roles:

```txt
superadmin -> rol global, ve todo el sistema
admin      -> administra un taller especifico
employee   -> trabaja dentro de un taller especifico
```

Tablas importantes:

```txt
global_user_roles -> rol global, aqui vive el superadmin
user_roles        -> roles por taller: admin / employee
profiles          -> perfil del usuario
workshops         -> talleres
```

Laravel bloquea que desde invitaciones normales se cree otro `superadmin`. Las invitaciones y asignaciones solo aceptan:

```txt
admin
employee
```

---

## Superadmin vs taller

Un detalle importante fue evitar que el superadmin entrara automaticamente a un taller.

Antes, si el perfil tenia `current_workshop_id`, el superadmin podia caer dentro de "Cerrajeria EGT".

Se corrigio asi:

- al iniciar sesion como superadmin, se navega a `/superadmin`
- no se ejecuta `workshops.php?action=switch`
- `useWorkshop` arranca el superadmin en contexto global, con `currentWorkshop = null`
- si el superadmin selecciona un taller manualmente, entra en modo taller

La idea:

```txt
Superadmin global: currentWorkshop = null
Modo taller:       currentWorkshop = taller seleccionado
```

---

## CORS

Como React corre en `localhost:8080` y Laravel en `127.0.0.1:8000`, el navegador los considera origenes distintos.

Por eso se configuro CORS.

En `backend/.env`:

```env
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174,http://localhost:8080,http://127.0.0.1:8080
```

Laravel usa:

```txt
backend/config/cors.php
backend/app/Http/Middleware/CorsFromEnv.php
```

Cuando CORS esta bien, las respuestas incluyen:

```txt
Access-Control-Allow-Origin: http://localhost:8080
```

---

## Base de datos

Laravel esta conectado a la base configurada en:

```txt
backend/.env
```

Ejemplo local:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=cerrajeria_express
DB_USERNAME=root
DB_PASSWORD=
```

Se uso una migracion inicial que reutiliza el schema viejo:

```txt
backend/database/migrations/2026_05_06_000000_create_legacy_schema.php
```

Esa migracion lee:

```txt
php/schema/schema.sql
```

Comando usado:

```powershell
cd backend
php artisan migrate
```

Laravel confirmo:

```txt
2026_05_06_000000_create_legacy_schema [1] Ran
```

---

## Problemas que salieron y como se resolvieron

### 1. Composer / antivirus

Al principio Composer fallo por interferencia del antivirus. Al desactivar Avast, se pudo instalar Laravel.

Comando:

```powershell
cd backend
composer install
```

### 2. CORS bloqueando llamadas

Error:

```txt
No 'Access-Control-Allow-Origin' header is present
```

Causa:

```txt
React corria en http://localhost:8080
Laravel no lo tenia permitido
```

Solucion:

```txt
Agregar http://localhost:8080 a CORS_ALLOWED_ORIGINS
Crear backend/config/cors.php
```

### 3. Error 500 por UUID

Laravel mostraba errores 500 porque el trait `Uuid` declaraba propiedades que chocaban con Eloquent:

```php
public $incrementing = false;
protected $keyType = 'string';
```

Solucion:

```php
public function getIncrementing(): bool
{
    return false;
}

public function getKeyType(): string
{
    return 'string';
}
```

### 4. 401 en productos

El backend estaba bien, pero el dashboard consultaba antes de que la sesion estuviera lista.

Solucion:

```txt
RecentActivity espera a que exista usuario, token y taller actual
```

### 5. Superadmin abria EGT

Causa:

```txt
El login seleccionaba un taller automaticamente para superadmin
useWorkshop restauraba current_workshop_id del perfil
```

Solucion:

```txt
Superadmin entra a /superadmin
No hace switch de taller
useWorkshop inicia superadmin con currentWorkshop = null
```

---

## Comandos utiles

Instalar dependencias Laravel:

```powershell
cd backend
composer install
```

Generar key:

```powershell
php artisan key:generate
```

Migrar base de datos:

```powershell
php artisan migrate
```

Ver estado de migraciones:

```powershell
php artisan migrate:status
```

Levantar Laravel:

```powershell
php artisan serve --host=127.0.0.1 --port=8000
```

Levantar React:

```powershell
npm run dev
```

Compilar React:

```powershell
npm run build
```

Limpiar cache de Laravel:

```powershell
php artisan config:clear
```

---

## Como probar que esta conectado a Laravel

En consola del navegador debe aparecer:

```txt
[phpApi] BASE = http://127.0.0.1:8000/api
```

Eso significa que React esta apuntando a Laravel.

Tambien se puede probar:

```txt
http://127.0.0.1:8000/up
```

Y una ruta API protegida:

```txt
http://127.0.0.1:8000/api/products.php
```

Si responde:

```json
{
  "success": false,
  "message": "Token de autorizacion requerido"
}
```

eso esta bien. Significa que Laravel esta vivo y la ruta esta protegida.

---

## Desarrollar desde VSCode y Lovable usando la base de Hostinger

La idea correcta es esta:

```txt
VSCode / Lovable
    |
    | VITE_PHP_API_BASE=https://mi-dominio.com/api
    v
Laravel en Hostinger
    |
    | backend/.env de Hostinger
    v
MariaDB de Hostinger
```

El navegador nunca se conecta directo a MariaDB. Quien se conecta a la base de datos es Laravel.

### En VSCode

En el `.env` de la raiz del proyecto se apunta React al Laravel publicado:

```env
VITE_PHP_API_BASE=https://mi-dominio.com/api
```

Luego se corre:

```powershell
npm run dev
```

La app React puede correr localmente, pero todos sus datos vienen de Hostinger.

### En Lovable

En Lovable hay que configurar la misma variable:

```env
VITE_PHP_API_BASE=https://mi-dominio.com/api
```

Con eso, el preview de Lovable consume el mismo Laravel publicado.

### En Hostinger / Laravel

El `backend/.env` del servidor debe tener la conexion real a la base de Hostinger:

```env
DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=nombre_db_hostinger
DB_USERNAME=usuario_db_hostinger
DB_PASSWORD=contrasena_db_hostinger
```

Tambien debe permitir los origenes de desarrollo:

```env
CORS_ALLOWED_ORIGINS=https://mi-dominio.com,http://localhost:5173,http://localhost:8080
CORS_ALLOWED_ORIGIN_PATTERNS=/^https:\/\/.*\.lovable\.app$/,/^https:\/\/.*\.lovableproject\.com$/
```

`CORS_ALLOWED_ORIGINS` sirve para URLs exactas.

`CORS_ALLOWED_ORIGIN_PATTERNS` sirve para previews dinamicos de Lovable.

Si se cambia CORS en produccion y Laravel tiene cache de config, correr:

```powershell
php artisan config:clear
```

### Que se logra

```txt
VSCode local -> Hostinger Laravel -> Hostinger MariaDB
Lovable      -> Hostinger Laravel -> Hostinger MariaDB
Produccion   -> Hostinger Laravel -> Hostinger MariaDB
```

Todos trabajan sobre la misma API y la misma base, sin duplicar datos localmente.

---

## Que se gano con Laravel

Antes:

```txt
Muchos archivos PHP sueltos
Logica duplicada
Mas dificil de mantener
Sin estructura fuerte
```

Ahora:

```txt
Rutas centralizadas
Controladores
Middleware
Modelos
Migraciones
CORS configurable
Autenticacion centralizada
Respuestas estandarizadas
```

Lo importante es que el frontend no se rompio porque Laravel se adapto primero al contrato viejo.

---

## Estrategia recomendada para seguir

La migracion ya funciona, pero se puede seguir mejorando por etapas:

1. Mantener endpoints `*.php` mientras la app este estable.
2. Probar todos los modulos: clientes, inventario, ventas, servicios, garantias, configuracion.
3. Cuando todo este probado, crear rutas REST nuevas mas limpias:

```txt
/api/products
/api/customers
/api/workshops
```

4. Migrar los hooks de React poco a poco.
5. Al final, eliminar compatibilidad `*.php` si ya no hace falta.

---

## Glosario rapido

| Termino | Significado |
|---|---|
| Frontend | La app React que ve el usuario |
| Backend | Laravel, el servidor que procesa datos |
| API | Las URLs que React llama para pedir datos |
| Contrato de API | La forma esperada de URLs, parametros y respuestas |
| CORS | Permisos del navegador para llamadas entre dominios/puertos |
| Bearer Token | Token enviado en `Authorization` para autenticar |
| Middleware | Capa de Laravel que corre antes del controlador |
| Controller | Clase Laravel que maneja una ruta |
| Migration | Archivo que crea o modifica tablas |
| Eloquent | ORM de Laravel para trabajar con modelos |
| UUID | ID unico tipo `7bda6184-c827-...` |
| Vite | Herramienta que corre y compila React |

---

## La frase que resume todo

No conecte Laravel cambiando Node.js. Conecte Laravel haciendo que React apuntara a una nueva URL base y haciendo que Laravel respetara las mismas rutas y respuestas que esperaba la app.
