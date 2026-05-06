# Sistema de Gestión para Cerrajería IMG

Sistema completo de gestión con módulos de inventario, cotizaciones, clientes, servicios y ventas.

## 🏗️ Arquitectura del Proyecto

Este proyecto utiliza **backend propio PHP + MariaDB** y puede desplegarse en hosting compartido, WAMP/XAMPP o VPS.

### Tecnologías
- **Frontend**: Vite + React + TypeScript + Tailwind CSS + shadcn-ui
- **Backend**: PHP + MariaDB (API en `php/api`, autenticación Bearer token, uploads locales)
- **UI Components**: shadcn-ui con Material Design 3

## 🚀 Desplegar en tu propio hosting

### Paso 1: Clonar el repositorio

```sh
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
```

### Paso 2: Instalar dependencias

```sh
npm install
```

### Paso 3: Variables de entorno

Configura la base de URL de la API PHP en tu entorno. Variables recomendadas:

```env
VITE_PHP_API_BASE=http://localhost/cerrajer-a-express/php/api
```

Esta variable conecta tu frontend con tu backend PHP.

### Paso 4: Build para producción

```sh
npm run build
```

Esto genera la carpeta `dist/` con todos los archivos estáticos listos para subir.

### Paso 5: Subir a tu hosting

**Opción A: Hosting compartido (cPanel, etc.)**
1. Comprime la carpeta `dist/` en un archivo ZIP
2. Sube el ZIP a tu hosting
3. Extrae el contenido en la carpeta `public_html` o la raíz de tu dominio
4. Asegúrate de que todos los archivos estén en la raíz (index.html debe estar visible)

**Opción B: Netlify, Vercel, o similares**
1. Conecta tu repositorio de GitHub
2. Configura:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. Agrega `VITE_PHP_API_BASE` en la configuración del hosting
4. Despliega

### Paso 6: Configuración de SPA (importante)

Tu hosting debe redirigir todas las rutas al `index.html` para que el router de React funcione.

**Para cPanel/Hosting compartido**, crea un archivo `.htaccess` en la raíz con:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

**Para Netlify**, crea un archivo `netlify.toml`:

```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**Para Vercel**, crea un archivo `vercel.json`:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

## 💾 Base de datos y Backend

El proyecto ya no depende de servicios externos de base de datos.

- ✅ Base de datos en MariaDB
- ✅ API y autenticación en PHP
- ✅ Uploads en tu propio host
- ✅ Configuración centralizada en `php/` y `mariadb/`

## 🔄 Flujo de trabajo recomendado

1. Desarrollar localmente (Vite + PHP API)
2. Validar con `npm run build`
3. Publicar carpeta `dist/` junto con backend `php/`

## 🛠️ Desarrollo local

```sh
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Build para producción
npm run build

# Preview del build de producción
npm run preview
```

## 📝 Editar el código

**Opción 1: IDE local**
- Clona el repositorio
- Edita con tu IDE favorito (VS Code, etc.)
- Haz commit y push para desplegar

**Opción 2: GitHub Codespaces**
- Abre Codespaces desde tu repositorio
- Edita directamente en el navegador

## 🔐 Seguridad

- No publiques credenciales de base de datos en frontend
- Todas las validaciones de acceso se hacen en `php/api/helpers/bootstrap.php`
- Usa HTTPS en producción y tokens Bearer seguros

## 📚 Documentación adicional

- [DEPLOYMENT](DEPLOYMENT.md)
- [LovaWamp Integration](LovaWamp-[ok]/INTEGRATION.md)
- [MariaDB Schema](mariadb/schema_mariadb.sql)

## ❓ Preguntas frecuentes

**¿Qué backend usa actualmente el sistema?**
PHP + MariaDB, con autenticación por Bearer token.

**¿Cómo configuro la API en local?**
Define `VITE_PHP_API_BASE` apuntando a `php/api` en tu servidor local.

**¿Puedo usar este stack en producción?**
Sí. Se recomienda hardening de PHP, HTTPS y backups periódicos.

## 📞 Soporte

- Revisa [DEPLOYMENT](DEPLOYMENT.md) para incidencias comunes de despliegue.
