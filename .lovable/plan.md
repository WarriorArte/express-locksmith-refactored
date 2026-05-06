
## Limitar backup de taller a datos propios

### Problema
El backup actual incluye tablas y columnas sensibles del sistema:
- `business_settings` contiene `storage_endpoint` y `storage_secret_key` (datos globales de la app)
- `profiles` y `user_roles` son datos de administracion del sistema
- Se exporta con `select('*')` sin filtrar columnas sensibles

### Solucion

**1. Remover tablas que no son datos del taller:**
- Eliminar `profiles` y `user_roles` de la lista de tablas a exportar/restaurar
- Estas tablas son gestion del sistema, no datos operativos del taller

**2. Filtrar columnas sensibles de `business_settings`:**
- Al exportar, excluir las columnas `storage_endpoint` y `storage_secret_key`
- Usar un select explicito en vez de `select('*')` para esta tabla:
  ```
  select('id, name, phone, address, email, website, logo_url, facebook, instagram, whatsapp, printer_size, printer_model, currency_symbol, phone_country_code, print_logo, auto_cut, workshop_id, created_at, updated_at')
  ```

**3. Al restaurar, proteger los campos sensibles:**
- Si el backup contiene `storage_endpoint` o `storage_secret_key`, eliminarlos antes de hacer upsert
- Esto previene que un backup viejo o manipulado sobreescriba configuraciones globales

### Archivos a modificar
- `src/components/settings/BackupManager.tsx` - Filtrar tablas y columnas en export y restore

### Tablas que SI se incluyen (datos operativos del taller):
- `business_settings` (sin columnas de storage)
- `categories`, `customers`, `products`
- `quotes`, `quote_items`
- `sales`, `sale_items`
- `services`, `service_products`, `service_images`
- `inventory_movements`
- `tags`, `product_tags`, `customer_tags`
- `templates`
- `warranties`, `warranty_category_settings`
