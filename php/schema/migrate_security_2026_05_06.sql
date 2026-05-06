-- ============================================================
-- Migración de seguridad — 2026-05-06
-- Aplica a instalaciones existentes:
--   1. UNIQUE por taller para folios y nombres (multi-tenant)
--   2. UNIQUE(user_id, workshop_id) en user_roles (un solo rol por taller)
--   3. Limpieza de tokens auth (texto plano) — el siguiente login los regenera como SHA-256
--
-- ⚠ ANTES DE EJECUTAR:
--    - Haz backup completo (mysqldump).
--    - Verifica que no existan duplicados (folios o nombres) entre talleres
--      con las queries de diagnóstico al final del archivo.
-- ============================================================

USE cerrajeria_express;

-- ── 1. Folios y nombres únicos por taller ────────────────────────────────────

ALTER TABLE categories
  DROP INDEX uq_categories_name,
  ADD UNIQUE KEY uq_categories_workshop_name (workshop_id, name);

ALTER TABLE tags
  DROP INDEX uq_tags_name,
  ADD UNIQUE KEY uq_tags_workshop_name (workshop_id, name);

ALTER TABLE quotes
  DROP INDEX uq_quotes_number,
  ADD UNIQUE KEY uq_quotes_workshop_number (workshop_id, quote_number);

ALTER TABLE services
  DROP INDEX uq_services_number,
  ADD UNIQUE KEY uq_services_workshop_number (workshop_id, service_number);

ALTER TABLE sales
  DROP INDEX uq_sales_number,
  ADD UNIQUE KEY uq_sales_workshop_number (workshop_id, sale_number);

-- ── 2. user_roles: un único rol por taller ───────────────────────────────────
-- Si ya existen filas duplicadas (mismo user+workshop con dos roles), conserva la 'admin'.

DELETE ur1 FROM user_roles ur1
INNER JOIN user_roles ur2
  ON ur1.user_id = ur2.user_id
 AND ur1.workshop_id = ur2.workshop_id
 AND ur1.id <> ur2.id
WHERE  ur1.role = 'employee' AND ur2.role = 'admin';

-- Si quedan duplicados puros (mismo rol), conserva el más antiguo
DELETE ur1 FROM user_roles ur1
INNER JOIN user_roles ur2
  ON ur1.user_id = ur2.user_id
 AND ur1.workshop_id = ur2.workshop_id
 AND ur1.role = ur2.role
 AND ur1.created_at > ur2.created_at;

ALTER TABLE user_roles
  DROP INDEX uq_user_roles_user_role_workshop,
  ADD UNIQUE KEY uq_user_roles_user_workshop (user_id, workshop_id);

-- ── 3. Tokens auth: invalidar los almacenados en texto plano ────────────────
-- A partir del siguiente login, el servidor guardará SHA-256 hex (64 chars).
DELETE FROM auth_tokens;

-- ============================================================
-- Diagnóstico previo (ejecutar manualmente si dudas):
-- ============================================================
-- SELECT workshop_id, name, COUNT(*) c FROM categories GROUP BY 1,2 HAVING c>1;
-- SELECT workshop_id, name, COUNT(*) c FROM tags       GROUP BY 1,2 HAVING c>1;
-- SELECT workshop_id, quote_number,   COUNT(*) c FROM quotes   GROUP BY 1,2 HAVING c>1;
-- SELECT workshop_id, service_number, COUNT(*) c FROM services GROUP BY 1,2 HAVING c>1;
-- SELECT workshop_id, sale_number,    COUNT(*) c FROM sales    GROUP BY 1,2 HAVING c>1;
