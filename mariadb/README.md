# MariaDB migration package

This folder contains the MariaDB schema and migration notes for the current PHP backend.

## Files

- schema_mariadb.sql: Full relational schema for MariaDB, including:
  - Tables and columns
  - PK/FK/UNIQUE/CHECK constraints
  - Indexes
  - Enum mappings
  - Helper SQL functions for role/workshop checks

## Source coverage used to build this schema

- Legacy SQL migration snapshots from the previous backend
- Runtime table usage from hooks/pages/components under src
- Runtime local types in src/types/database.ts

## PostgreSQL to MariaDB mapping used

- uuid -> CHAR(36)
- timestamptz -> DATETIME(3)
- jsonb -> JSON
- boolean -> TINYINT(1)
- Postgres enum types -> MariaDB ENUM per column
- now() -> CURRENT_TIMESTAMP(3)

## Security model translation (important)

Database row access rules are enforced in backend PHP middleware.
Recommended enforcement point: backend API middleware before every query/mutation.

Rules to preserve behavior:

1. Superadmin full access:
   - Table: global_user_roles
   - Condition: role = superadmin

2. Workshop-scoped access:
   - User must belong to workshop via user_roles(workshop_id)
   - Enforce workshop_id filter in all tenant tables

3. Workshop admin elevated rights:
   - Admin-only actions (delete/manage roles/settings/templates) require role admin in user_roles for same workshop

4. Child tables without workshop_id:
   - quote_items -> parent quotes
   - sale_items -> parent sales
   - service_products/service_images -> parent services
   - customer_tags -> parent customers + tags
   - product_tags -> parent products + tags
   - Apply authorization through parent rows

## Notable compatibility decisions

- Added app_users table as authentication source so foreign keys remain consistent in MariaDB.
- appadmin_settings singleton behavior is emulated with singleton_guard unique key.
- warranty_settings keeps workshop_id unique (as in migration) and intentionally no FK because original migration did not add one.
- categories.name and tags.name stay globally unique because original migration created them as global UNIQUE and later workshop_id introduction did not remove that.

## Suggested migration order

1. Create schema using schema_mariadb.sql
2. Import users into app_users (id must match previous auth user IDs if preserving references)
3. Import workshop and identity tables: workshops, profiles, global_user_roles, user_roles
4. Import business/catalog tables
5. Import transactional data: quotes/services/sales and child tables
6. Import warranty tables and template selections
7. Validate constraints and row counts
8. Move RLS logic to backend middleware and run integration tests

## Validation checklist

- Every row in tenant tables has valid workshop_id where required by your app logic
- No orphan child rows after import
- role checks match expected access for admin/employee/superadmin
- Number generators for quote_number/service_number/sale_number remain unique
- Encryption workflow for appadmin_settings is implemented in backend
