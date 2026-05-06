# PHP API base para lovawamp

Esta carpeta contiene una base funcional para migrar desde un backend gestionado a MariaDB usando PHP en hosting compartido.

## Estructura

- config/database.php
- api/helpers/Response.php
- api/helpers/bootstrap.php
- api/auth.php
- api/profile.php
- api/projects.php
- api/project-categories.php
- api/skills.php
- api/skill-categories.php
- api/experiences.php
- api/uploads.php
- schema/portfolio_schema.sql

## Instalacion rapida

1. Crea la base de datos MariaDB.
2. Importa schema/portfolio_schema.sql.
3. Configura variables de entorno (si aplica):
   - DB_HOST
   - DB_NAME
   - DB_USER
   - DB_PASSWORD
   - DB_PORT
   - UPLOAD_PUBLIC_BASE (ej: /php/uploads)
4. Publica esta carpeta en tu hosting.

## Credenciales iniciales de prueba

- Email: admin@lovawamp.local
- Password: password

Importante: cambia esa contrasena al desplegar en produccion.

## Endpoints principales

Auth:
- POST api/auth.php?action=login
- GET api/auth.php?action=check
- GET api/auth.php?action=logout
- POST api/auth.php?action=update-email
- POST api/auth.php?action=update-password

Public:
- GET api/profile.php
- GET api/projects.php?public=1
- GET api/skills.php
- GET api/experiences.php?public=1
- GET api/skill-categories.php
- GET api/project-categories.php

Admin CRUD:
- projects.php
- project-categories.php
- skills.php
- skill-categories.php
- experiences.php
- profile.php (PUT)
- uploads.php (POST multipart)

## Nota de compatibilidad frontend

Tu frontend actual consume nombres de campos en snake_case y arrays para:
- imagenes_galeria
- funciones_lista
- me_gusta
- categorias_cv
- enlaces_redes
- footer_redes

Esta API ya devuelve ese formato.
