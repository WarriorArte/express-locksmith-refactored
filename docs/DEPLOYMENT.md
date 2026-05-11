# Guía de Despliegue - Sistema de Gestión Cerrajería

Esta guía te ayudará a desplegar tu aplicación en diferentes plataformas de hosting manteniendo la conexión con Lovable Cloud.

## 📋 Pre-requisitos

- Node.js 18 o superior instalado
- Cuenta de GitHub (ya configurada)
- Hosting elegido (ver opciones abajo)

## 🌐 Opciones de Hosting

### 1. Hosting Compartido (cPanel, Hostinger, etc.)

**Ventajas**: Económico, fácil de configurar, dominio propio incluido
**Ideal para**: Producción estable, bajo tráfico a medio

**Pasos**:

1. **Build del proyecto**:
   ```bash
   npm run build
   ```

2. **Comprimir la carpeta dist**:
   - En Windows: Clic derecho en `dist/` → Enviar a → Carpeta comprimida
   - En Mac/Linux: `zip -r dist.zip dist/*`

3. **Subir al hosting**:
   - Accede a cPanel → Administrador de archivos
   - Navega a `public_html` (o la carpeta de tu dominio)
   - Sube y extrae `dist.zip`
   - **Importante**: Los archivos deben estar en la raíz (no dentro de una carpeta `dist`)

4. **Copiar el archivo .htaccess**:
   - El archivo `.htaccess` ya está incluido en el proyecto
   - Asegúrate de que esté en la misma carpeta que `index.html`

5. **Verificar**:
   - Visita tu dominio
   - Prueba la navegación entre páginas
   - Verifica que el login funcione

**Troubleshooting común**:
- **Error 404 en rutas**: Verifica que `.htaccess` esté presente y que `mod_rewrite` esté habilitado
- **Página en blanco**: Revisa la consola del navegador (F12) para errores
- **No carga estilos**: Verifica que la carpeta `assets/` se haya copiado correctamente

---

### 2. Netlify (Recomendado)

**Ventajas**: Deploy automático desde GitHub, HTTPS gratis, CDN global
**Ideal para**: Desarrollo ágil, auto-deploy en cada commit

**Pasos**:

1. **Crear cuenta en Netlify**: https://www.netlify.com

2. **Conectar repositorio**:
   - Click en "Add new site" → "Import an existing project"
   - Conecta tu cuenta de GitHub
   - Selecciona tu repositorio

3. **Configurar build**:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - El archivo `netlify.toml` ya está configurado ✅

4. **Variables de entorno** (opcional):
   - Ve a Site settings → Environment variables
   - Agrega las variables del archivo `.env` si no están incluidas en el build

5. **Deploy**:
   - Click en "Deploy site"
   - Espera 2-3 minutos
   - Tu sitio estará en una URL tipo `https://tu-app.netlify.app`

6. **Dominio personalizado** (opcional):
   - Ve a Domain settings → Add custom domain
   - Sigue las instrucciones para apuntar tu dominio

**Deploy automático**:
- Cada vez que hagas `git push`, Netlify redesplegará automáticamente
- Puedes ver el estado del deploy en el dashboard de Netlify

---

### 3. Vercel

**Ventajas**: Similar a Netlify, excelente performance, DX moderno
**Ideal para**: Proyectos con alta demanda de performance

**Pasos**:

1. **Crear cuenta en Vercel**: https://vercel.com

2. **Importar proyecto**:
   - Click en "Add New..." → "Project"
   - Importa desde GitHub
   - Selecciona tu repositorio

3. **Configurar**:
   - Framework Preset: "Vite"
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - El archivo `vercel.json` ya está configurado ✅

4. **Deploy**:
   - Click en "Deploy"
   - Tu sitio estará listo en ~1 minuto
   - URL: `https://tu-app.vercel.app`

**Features adicionales**:
- Analytics integrado
- Preview deployments para cada PR
- Edge functions si necesitas backend adicional

---

### 4. GitHub Pages (Solo para testing)

**Nota**: GitHub Pages no soporta bien SPAs con router, pero puedes usarlo para demos.

**Pasos rápidos**:
```bash
npm run build
cd dist
git init
git add -A
git commit -m "Deploy"
git push -f https://github.com/tu-usuario/tu-repo.git main:gh-pages
```

Luego habilita GitHub Pages en tu repositorio apuntando a la rama `gh-pages`.

---

## 🔧 Configuración adicional

### Dominio personalizado

**En hosting compartido**:
- El dominio ya está configurado en tu cPanel
- Solo sube los archivos a la carpeta correcta

**En Netlify/Vercel**:
1. Agrega tu dominio en la configuración del proyecto
2. Actualiza los DNS de tu dominio:
   ```
   Tipo: A
   Nombre: @
   Valor: [IP proporcionada por Netlify/Vercel]

   Tipo: CNAME
   Nombre: www
   Valor: [subdomain].netlify.app (o vercel.app)
   ```
3. Espera propagación de DNS (puede tomar hasta 48h)

### SSL/HTTPS

- **Netlify/Vercel**: Automático, no requiere configuración
- **Hosting compartido**: Activa "Let's Encrypt" en cPanel → SSL/TLS

---

## 🗄️ Backend (Lovable Cloud)

### ¿Qué pasa con mi base de datos?

Tu base de datos **permanece en Lovable Cloud** sin importar dónde despliegues el frontend:

✅ **Ventajas**:
- No tienes que configurar servidor de base de datos
- Backups automáticos
- Autenticación funcionando
- Edge functions disponibles

✅ **Sin costo adicional**:
- Lovable Cloud tiene tier gratuito generoso
- Solo pagas si excedes los límites

### Límites del tier gratuito

- 500 MB de base de datos
- 1 GB de storage para archivos
- 2 GB de transferencia mensual
- Autenticación ilimitada

Para monitorear tu uso:
1. Abre tu proyecto en Lovable
2. Ve a la pestaña "Cloud"
3. Revisa el uso actual

### ¿Cuándo necesito upgrade?

Cuando tu aplicación crezca y superes los límites gratuitos. El upgrade a plan pagado te da:
- 8 GB de base de datos
- 100 GB de storage
- 250 GB de transferencia
- Desde $25/mes

---

## 📊 Monitoreo y Mantenimiento

### Logs y errores

**En Lovable**:
- Pestaña Cloud → Logs
- Ve errores de backend, edge functions, base de datos

**En tu hosting**:
- **Netlify**: Functions → Deploy logs
- **Vercel**: Dashboard → Logs
- **Hosting compartido**: cPanel → Error logs

### Backups

**Base de datos**:
1. Inicia sesión en tu app
2. Ve a Configuración → Gestión de datos
3. Click en "Exportar backup"
4. Guarda el archivo JSON

**Código**:
- Tu código está en GitHub = backup automático
- Haz commits frecuentes
- Crea tags para versiones importantes

---

## 🚨 Problemas comunes

### "Failed to fetch" o errores de CORS

**Causa**: El dominio del frontend no está autorizado en Lovable Cloud

**Solución**:
1. Ve a tu proyecto en Lovable
2. Cloud → Settings → Allowed domains
3. Agrega tu dominio de producción

### Las rutas no funcionan (404)

**Causa**: El servidor no está redirigiendo al index.html

**Solución**:
- Hosting compartido: Verifica que `.htaccess` esté presente
- Netlify/Vercel: Verifica que `netlify.toml` o `vercel.json` esté en el repositorio

### Los usuarios no pueden registrarse

**Causa**: Email confirmation activado en Lovable Cloud

**Solución**:
1. Ve a Lovable → Cloud → Authentication
2. Habilita "Auto Confirm Email"

### Imágenes/assets no cargan

**Causa**: Rutas incorrectas después del build

**Solución**:
- Verifica que todas las rutas en el código sean relativas
- No uses rutas absolutas como `/assets/...`
- Usa imports: `import logo from '@/assets/logo.png'`

---

## ✅ Checklist final

Antes de lanzar a producción:

- [ ] Build exitoso sin errores (`npm run build`)
- [ ] Prueba local del build (`npm run preview`)
- [ ] Login/registro funcionando
- [ ] Todas las rutas accesibles
- [ ] Imágenes cargando correctamente
- [ ] Responsive en móvil
- [ ] SSL/HTTPS habilitado
- [ ] Dominio personalizado configurado
- [ ] Backup de base de datos realizado
- [ ] Límites de Lovable Cloud monitoreados

---

## 📞 Soporte

- **Lovable Discord**: https://discord.com/channels/1119885301872070706/1280461670979993613
- **Documentación Lovable**: https://docs.lovable.dev/
- **Guías de Lovable**: https://www.youtube.com/watch?v=9KHLTZaJcR8&list=PLbVHz4urQBZkJiAWdG8HWoJTdgEysigIO

---

¡Listo! Tu sistema de gestión está preparado para producción 🚀
