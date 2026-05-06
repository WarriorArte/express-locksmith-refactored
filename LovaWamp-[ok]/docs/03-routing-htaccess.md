# Routing y .htaccess

## Variante WAMP

Archivo: `php/.htaccess`

- pensado para subcarpeta local (`/mi-app/`),
- requiere `RewriteBase` acorde al nombre de carpeta.

## Variante Hosting

Archivo: `php/.htaccess.hosting.example`

- enrutado SPA agnostico (raiz o subcarpeta),
- sin rutas hardcodeadas,
- build lo copia como `dist/.htaccess` cuando `HTACCESS_MODE=hosting`.

## Router de React

Para evitar pantalla en blanco por `basename`, usa detección dinámica en runtime (`detectRouterBase()`) en `App.tsx`.

## Regla práctica

- Local WAMP: `HTACCESS_MODE=wamp`
- Hosting: `HTACCESS_MODE=hosting`
