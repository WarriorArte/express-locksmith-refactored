# Migration Progress — LovaWamp (MariaDB + PHP)

> **Fecha inicio:** 2026-05-05
> **Estrategia:** Migrar toda la app a API PHP y eliminar dependencias legacy del backend anterior.

---

## Decisiones arquitectónicas

| Decisión | Elección | Motivo |
|---|---|---|
| Ubicación PHP | `php/` en raíz del repo | Separado del build de Vite; WAMP sirve desde ahí |
| Autenticación | Bearer Token en header `Authorization` | Más flexible para SPA; no depende de cookies/sesión |
| `workshop_id` scope | Parámetro por request (GET param o body) | El usuario puede cambiar taller; no conviene fijarlo en el token |
| Soft delete productos | `is_active = 0` | Preserva historial en ventas/servicios anteriores |
| Items (quotes, sales, services) | Replace completo en PUT | Más simple que diff; seguro mientras no haya concurrencia alta |

---

## Fase 1: API PHP — COMPLETADA ✅

### Archivos base
| Archivo | Estado |
|---|---|
| `php/config/database.php` | ✅ Listo |
| `php/config/.htaccess` | ✅ Listo (protege credenciales) |
| `php/.htaccess` | ✅ Listo |
| `php/api/helpers/Response.php` | ✅ Listo |
| `php/api/helpers/bootstrap.php` | ✅ Listo (token auth, CORS, helpers) |
| `mariadb/auth_tokens.sql` | ✅ Listo (ejecutar después del schema principal) |
| `php/install.php` | ✅ Listo (instalador web — se auto-elimina tras instalar) |
| `php/schema/schema.sql` | ✅ Listo (schema combinado para el instalador) |
| `php/schema/.htaccess` | ✅ Listo (protege schema de acceso web) |

### Endpoints creados
| Endpoint | Tablas | GET | POST | PUT | DELETE | Notas |
|---|---|---|---|---|---|---|
| `auth.php` | app_users, auth_tokens | check | login / change-password | — | logout | Token 30 días |
| `workshops.php` | workshops, user_roles | ✅ | ✅ (superadmin) | ✅ | ✅ (superadmin) | PUT ?action=switch |
| `workshop-features.php` | workshop_features | ✅ | — | ✅ (upsert) | — | |
| `profiles.php` | profiles, user_roles, app_users | ✅ | invite / assign | ✅ | ✅ | |
| `categories.php` | categories | ✅ | ✅ | ✅ | ✅ | |
| `tags.php` | tags | ✅ | ✅ | ✅ | ✅ | |
| `products.php` | products, product_tags | ✅ | ✅ | ✅ | soft delete | Con tags sincronizados |
| `customers.php` | customers | ✅ | ✅ | ✅ | ✅ | |
| `quotes.php` | quotes, quote_items | ✅ | ✅ | ✅ | ✅ | Items en mismo endpoint |
| `sales.php` | sales, sale_items | ✅ | ✅ | ✅ | ✅ | Actualiza total_purchases cliente |
| `services.php` | services, service_products | ✅ | ✅ | ✅ | ✅ | Actualiza total_services cliente |
| `service-images.php` | service_images | ✅ | ✅ | — | ✅ | |
| `warranties.php` | warranties | ✅ | ✅ | ✅ (+ void) | ✅ | |
| `warranty-settings.php` | warranty_settings, warranty_category_settings | ✅ | POST ?action=category | ✅ | DELETE ?action=category | |
| `inventory-movements.php` | inventory_movements, products | ✅ | ✅ | — | — | Actualiza stock en mismo request |
| `business-settings.php` | business_settings | ✅ | ✅ | ✅ (upsert) | — | |
| `appadmin-settings.php` | appadmin_settings | ✅ | — | ✅ | — | Solo superadmin |
| `templates.php` | templates | ✅ | ✅ | ✅ | ✅ | No permite editar globales |
| `template-selections.php` | workshop_template_selections | ✅ | ✅ (upsert) | — | ✅ | |
| `dashboard-stats.php` | quotes, sales, services, products | ✅ | — | — | — | Agregados del mes + hoy |
| `uploads.php` | (filesystem) | — | ✅ | — | — | 10MB max, validación MIME |

---

## Fase 2: Migración de hooks de frontend — COMPLETADA ✅

> Orden recomendado (de menor a mayor impacto en la app):

| # | Hook / Módulo | Archivo | Depends on | Estado |
|---|---|---|---|---|
| 0 | **phpApi.ts** | `src/lib/phpApi.ts` | — | ✅ Completado |
| 1 | **Auth** | `src/hooks/useAuth.tsx` + `src/pages/Auth.tsx` | phpApi.ts, auth.php, workshops.php?action=switch | ✅ Completado |
| 2 | **Workshop** | `src/hooks/useWorkshop.tsx` | useAuth, workshops.php, auth.php?action=check | ✅ Completado |
| 3 | **Categories** | `src/hooks/useCategories.ts` | useWorkshop, categories.php | ✅ Completado |
| 4 | **Products** | `src/hooks/useProducts.ts` | useWorkshop, products.php | ✅ Completado |
| 5 | **Customers** | `src/hooks/useCustomers.ts`, `src/pages/Clientes.tsx` | useWorkshop, customers.php | ✅ Completado |
| 6 | **Quotes** | `src/hooks/useQuotes.ts`, `src/components/quotes/QuoteFormDialog.tsx` | useWorkshop, quotes.php | ✅ Completado |
| 7 | **Sales** | `src/hooks/useSales.ts`, `src/components/sales/SaleFormDialog.tsx`, `src/components/quotes/ConvertQuoteDialog.tsx` | useWorkshop, sales.php | ✅ Completado |
| 8 | **Services** | `src/hooks/useServices.ts`, `src/components/services/ServiceFormDialog.tsx`, `src/components/quotes/ConvertQuoteDialog.tsx` | useWorkshop, services.php | ✅ Completado |
| 9 | **Warranties** | `src/hooks/useWarranties.ts`, `src/components/warranties/WarrantySettingsDialog.tsx`, `src/pages/Garantias.tsx` | useWorkshop, warranties.php, warranty-settings.php | ✅ Completado |
| 10 | **Inventory** | `src/hooks/useInventoryMovements.ts`, `src/hooks/useInventoryMovementsList.ts`, `src/components/products/InventoryMovementDialog.tsx`, `src/components/products/InventoryHistoryDialog.tsx` | useWorkshop, inventory-movements.php | ✅ Completado |
| 11 | **Profiles** | `src/hooks/useProfiles.ts`, `src/components/settings/UserManagement.tsx` | useWorkshop, profiles.php | ✅ Completado |
| 12 | **Business Settings** | `src/hooks/useBusinessSettings.ts`, `src/pages/Configuracion.tsx` | useWorkshop, business-settings.php | ✅ Completado |
| 13 | **Templates** | `src/hooks/useTemplates.ts`, `src/components/settings/TemplateSelector.tsx`, `src/components/superadmin/TemplateManager.tsx`, `src/components/shared/TemplateEditorDialog.tsx`, `src/hooks/useTemplateReset.ts` | useWorkshop, templates.php, template-selections.php | ✅ Completado |
| 14 | **Dashboard** | `src/hooks/useDashboardStats.ts`, `src/pages/Dashboard.tsx` | useWorkshop, dashboard-stats.php | ✅ Completado |

---

## Pasos previos antes de empezar Fase 2

1. **Deploy a WAMP:**
   ```
   pnpm run build:wamp
   ```

2. **Crear la base de datos en phpMyAdmin:**
   ```sql
   CREATE DATABASE cerrajeria_express CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

3. **Ejecutar el instalador web:**
   - Abrir: `http://localhost/cerrajer-a-express/php/install.php`
   - Completar el formulario con credenciales de BD y datos del superadmin
   - El instalador crea todas las tablas, el usuario y el `db_config.php` automáticamente
   - Se auto-elimina tras instalación exitosa

4. **Variables de entorno del frontend:**
   - Crear/actualizar `.env.local`:
   ```
   VITE_PHP_API_BASE=http://localhost/cerrajer-a-express/php/api
   ```

5. **Prueba manual del API:**
   - `POST http://localhost/cerrajer-a-express/php/api/auth.php?action=login`
   - Body: `{"email":"tu@email.com","password":"tu_password"}`

> **Reinstalación:** Si necesitas reconfigurar, accede a `install.php?reinstall=1`
> (solo funciona si el archivo aún existe o si lo copias de vuelta)

---

## Notas de contexto para próxima sesión

- La app ya está desacoplada del backend anterior en runtime frontend.
- Toda la API PHP está en `php/` (raíz del repo), no en `public/`.
- El cliente TypeScript para la API PHP (`phpApi.ts`) ya está creado en `src/lib/`.
- `useAuth.tsx` y la pantalla `Auth.tsx` ya usan API PHP con Bearer Token.
- Autenticación usa Bearer Token; el token se guarda en `auth_tokens` tabla, expira en 30 días.
- Todos los endpoints requieren `workshop_id` como parámetro (GET query param o en body JSON).
- Soft delete solo en productos. El resto son hard delete.
