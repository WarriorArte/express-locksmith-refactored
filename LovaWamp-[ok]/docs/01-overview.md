# lovawamp - Overview

lovawamp es una base reusable para integrar frontend Vite+React con backend PHP + MariaDB en WAMP u hosting compartido.

## Variables clave

- `WAMP_APP_DIR`: carpeta destino en `www` (ej: `mi-app`, `portfolio-jose`)
- `WAMP_WWW_PATH`: ruta base de WAMP (default `C:/wamp64/www`)
- `HTACCESS_MODE`: selecciona enrutado SPA (`wamp` o `hosting`)
- `APP_NAME`: nombre visible del instalador
- `APP_SLUG`: slug de app
- `DEFAULT_DB_NAME`: base de datos sugerida por defecto

## Estructura del template

```text
php-api-template/
├── php/
│   ├── api/
│   │   ├── helpers/
│   │   │   ├── bootstrap.php
│   │   │   └── Response.php
│   │   ├── auth.php
│   │   ├── uploads.php
│   │   └── ...
│   ├── config/
│   │   ├── database.php
│   │   └── .htaccess
│   ├── schema/
│   │   ├── portfolio_schema.sql
│   │   ├── seed_data.sql
│   │   └── ...
│   ├── uploads/
│   │   └── .gitkeep
│   ├── .htaccess
│   └── install.php
├── scripts/
│   ├── deploy-to-wamp.mjs
│   └── build-for-hosting.mjs
├── src/
│   ├── lib/phpApi.ts
│   └── vite-env.d.ts
└── docs/
```

## Cuándo usar lovawamp

- Migraciones desde proyectos Lovable/Emergent con frontend React.
- Nuevos proyectos con backend PHP en hosting compartido.
- Proyectos con despliegue híbrido: local WAMP + producción hosting.

## Estrategia recomendada de endpoints

- En lovawamp (template): mantener una colección amplia de endpoints reutilizables.
- En cada proyecto final: dejar habilitados solo los endpoints necesarios.
- Cuando el proyecto crece: agregar nuevos endpoints desde una plantilla estándar, con validación, auth y respuestas consistentes.

Guía completa: [Estrategia de Endpoints y Plantilla Universal](06-endpoints-strategy-and-template.md)
