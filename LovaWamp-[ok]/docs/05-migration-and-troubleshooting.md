# Migración y Troubleshooting

## Migración desde backend anterior

Mapeo rápido:

- consultas cliente legacy -> endpoint PHP + `phpApiRequest`
- `insert/update/delete` -> endpoints `POST/PUT/DELETE`
- Auth legacy -> `php/api/auth.php` + sesión/tokens PHP
- Storage bucket -> `php/api/uploads.php` + `php/uploads/`
- Edge Functions -> endpoint/servicio PHP + cron

Estrategia sugerida:

1. Auth
2. CRUD crítico
3. Uploads
4. Jobs/cron

## Prompt maestro para Lovable

El prompt maestro fue movido a un archivo de texto externo para facilitar copia/pegado directo:

- `php-api-template/lovable-master-prompt.txt`

## Troubleshooting real

### 1) MIME type text/html en módulo JS

- Síntoma: `Failed to load module script ... text/html`
- Causa: base/rutas no alineadas.
- Solución: `HTACCESS_MODE=hosting npm run build`.

### 2) `500` al cargar `/assets/*.js` o `.css`

- Causa probable: servidor/htaccess/permisos.
- Revisar:
  - subir `dist` completo,
  - usar `dist/.htaccess` generado,
  - permisos correctos,
  - limpiar caché CDN/navegador.

### 3) Pantalla en blanco sin errores

- Causa: `basename` incorrecto en router.
- Solución: `detectRouterBase()` en `App.tsx`.

### 4) Instalador dice que la BD no existe pero sí existe

- Causa: nombre con guion `-` no aceptado en versiones viejas.
- Solución: usar instalador actualizado (ya acepta `[a-zA-Z0-9_-]`).

### 5) `build` no incluía backend

- Causa: `vite build` puro no empaqueta `php/`.
- Solución: usar `npm run build` de lovawamp (`build-for-hosting.mjs`).

### 6) Variables persistentes en PowerShell

Si notas comportamiento extraño del build:

```powershell
Remove-Item Env:BUILD_BASE -ErrorAction SilentlyContinue
Remove-Item Env:HTACCESS_MODE -ErrorAction SilentlyContinue
npm run build
```
