-- ============================================================
-- Cerrajeria Express - MariaDB Schema
-- Date: 2026-05-02
-- Target: MariaDB 10.11+
-- Charset: utf8mb4
-- ============================================================

CREATE DATABASE IF NOT EXISTS cerrajeria_express
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE cerrajeria_express;

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- ============================================================
-- Core identity replacement for auth.users
-- ============================================================
-- The previous backend used a managed auth users table. In MariaDB we keep an application user table
-- to preserve foreign key integrity for user_id/created_by/assigned_to fields.
CREATE TABLE IF NOT EXISTS app_users (
  id CHAR(36) NOT NULL,
  email VARCHAR(320) NULL,
  password_hash VARCHAR(255) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_app_users_email (email)
) ENGINE=InnoDB;

-- ============================================================
-- Workshop and tenancy
-- ============================================================
CREATE TABLE IF NOT EXISTS workshops (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  code VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  settings JSON DEFAULT NULL,
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_workshops_code (code)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS profiles (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(320) NULL,
  avatar_url TEXT NULL,
  locksmith_id VARCHAR(255) NULL,
  current_workshop_id CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_profiles_user_id (user_id),
  KEY idx_profiles_current_workshop (current_workshop_id),
  CONSTRAINT fk_profiles_user_id
    FOREIGN KEY (user_id) REFERENCES app_users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_profiles_current_workshop_id
    FOREIGN KEY (current_workshop_id) REFERENCES workshops(id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS global_user_roles (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  role ENUM('superadmin','user') NOT NULL DEFAULT 'user',
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_global_user_roles_user_id (user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_roles (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  role ENUM('admin','employee') NOT NULL DEFAULT 'employee',
  workshop_id CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_roles_user_workshop (user_id, workshop_id),
  KEY idx_user_roles_workshop (workshop_id),
  KEY idx_user_roles_user_workshop (user_id, workshop_id),
  CONSTRAINT fk_user_roles_user_id
    FOREIGN KEY (user_id) REFERENCES app_users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_user_roles_workshop_id
    FOREIGN KEY (workshop_id) REFERENCES workshops(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS workshop_features (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  workshop_id CHAR(36) NOT NULL,
  feature_key VARCHAR(120) NOT NULL,
  is_enabled TINYINT(1) DEFAULT 1,
  settings JSON DEFAULT NULL,
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_workshop_features (workshop_id, feature_key),
  CONSTRAINT fk_workshop_features_workshop_id
    FOREIGN KEY (workshop_id) REFERENCES workshops(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- Business configuration
-- ============================================================
CREATE TABLE IF NOT EXISTS business_settings (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  workshop_id CHAR(36) NULL,
  name VARCHAR(255) NOT NULL DEFAULT 'Mi Cerrajeria',
  phone VARCHAR(40) NULL,
  phone_country_code VARCHAR(10) DEFAULT '+52',
  country_code CHAR(2) NULL,
  address TEXT NULL,
  email VARCHAR(320) NULL,
  website VARCHAR(255) NULL,
  logo_url TEXT NULL,
  facebook VARCHAR(255) NULL,
  instagram VARCHAR(255) NULL,
  printer_size VARCHAR(30) DEFAULT '80mm',
  currency_symbol VARCHAR(10) DEFAULT '$',
  auto_cut TINYINT(1) DEFAULT 1,
  storage_endpoint TEXT NULL,
  storage_secret_key TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_business_settings_workshop (workshop_id),
  CONSTRAINT fk_business_settings_workshop_id
    FOREIGN KEY (workshop_id) REFERENCES workshops(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS appadmin_settings (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  storage_endpoint TEXT NULL,
  storage_api_key_encrypted TEXT NULL,
  singleton_guard TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_appadmin_settings_singleton (singleton_guard),
  CONSTRAINT chk_appadmin_settings_singleton CHECK (singleton_guard = 1)
) ENGINE=InnoDB;

-- ============================================================
-- Catalogs
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  workshop_id CHAR(36) NULL,
  name VARCHAR(150) NOT NULL,
  color VARCHAR(20) NOT NULL DEFAULT '#2563eb',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_workshop_name (workshop_id, name),
  KEY idx_categories_workshop (workshop_id),
  CONSTRAINT fk_categories_workshop_id
    FOREIGN KEY (workshop_id) REFERENCES workshops(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tags (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  workshop_id CHAR(36) NULL,
  name VARCHAR(150) NOT NULL,
  color VARCHAR(20) NOT NULL DEFAULT '#6366f1',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_tags_workshop_name (workshop_id, name),
  KEY idx_tags_workshop (workshop_id),
  CONSTRAINT fk_tags_workshop_id
    FOREIGN KEY (workshop_id) REFERENCES workshops(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS products (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  workshop_id CHAR(36) NULL,
  category_id CHAR(36) NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  instructions TEXT NULL,
  notes TEXT NULL,
  image_url TEXT NULL,
  stock_store INT NOT NULL DEFAULT 0,
  stock_warehouse INT NOT NULL DEFAULT 0,
  min_stock INT NOT NULL DEFAULT 5,
  purchase_price_imported DECIMAL(10,2) NULL,
  purchase_price_local DECIMAL(10,2) NOT NULL DEFAULT 0,
  sale_price_min DECIMAL(10,2) NOT NULL DEFAULT 0,
  sale_price_max DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_products_workshop (workshop_id),
  KEY idx_products_category (category_id),
  CONSTRAINT fk_products_workshop_id
    FOREIGN KEY (workshop_id) REFERENCES workshops(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_products_category_id
    FOREIGN KEY (category_id) REFERENCES categories(id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS product_tags (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  product_id CHAR(36) NOT NULL,
  tag_id CHAR(36) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_product_tags (product_id, tag_id),
  KEY idx_product_tags_tag (tag_id),
  CONSTRAINT fk_product_tags_product_id
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_product_tags_tag_id
    FOREIGN KEY (tag_id) REFERENCES tags(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- Customers
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  workshop_id CHAR(36) NULL,
  name VARCHAR(255) NOT NULL,
  customer_type VARCHAR(40) NOT NULL DEFAULT 'person',
  phone VARCHAR(40) NULL,
  phone_secondary VARCHAR(40) NULL,
  email VARCHAR(320) NULL,
  address TEXT NULL,
  notes TEXT NULL,
  is_vip TINYINT(1) DEFAULT 0,
  is_frequent TINYINT(1) DEFAULT 0,
  is_normal TINYINT(1) DEFAULT 0,
  has_debt TINYINT(1) DEFAULT 0,
  no_work_again TINYINT(1) DEFAULT 0,
  no_work_reason TEXT NULL,
  total_purchases DECIMAL(12,2) DEFAULT 0,
  total_services INT DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_customers_workshop (workshop_id),
  CONSTRAINT fk_customers_workshop_id
    FOREIGN KEY (workshop_id) REFERENCES workshops(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS customer_tags (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  customer_id CHAR(36) NOT NULL,
  tag_id CHAR(36) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_customer_tags (customer_id, tag_id),
  KEY idx_customer_tags_tag (tag_id),
  CONSTRAINT fk_customer_tags_customer_id
    FOREIGN KEY (customer_id) REFERENCES customers(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_customer_tags_tag_id
    FOREIGN KEY (tag_id) REFERENCES tags(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- Quotes
-- ============================================================
CREATE TABLE IF NOT EXISTS quotes (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  workshop_id CHAR(36) NULL,
  quote_number VARCHAR(80) NOT NULL,
  customer_id CHAR(36) NULL,
  customer_name VARCHAR(255) NULL,
  customer_phone VARCHAR(40) NULL,
  customer_email VARCHAR(320) NULL,
  customer_address TEXT NULL,
  description TEXT NULL,
  location TEXT NULL,
  status ENUM('pending','accepted','rejected','converted','expired') NOT NULL DEFAULT 'pending',
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  validity_days INT NOT NULL DEFAULT 15,
  valid_until DATE NULL,
  policies TEXT NULL,
  notes TEXT NULL,
  created_by CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_quotes_workshop_number (workshop_id, quote_number),
  KEY idx_quotes_workshop (workshop_id),
  KEY idx_quotes_customer (customer_id),
  KEY idx_quotes_created_by (created_by),
  CONSTRAINT fk_quotes_workshop_id
    FOREIGN KEY (workshop_id) REFERENCES workshops(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_quotes_customer_id
    FOREIGN KEY (customer_id) REFERENCES customers(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_quotes_created_by
    FOREIGN KEY (created_by) REFERENCES app_users(id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS quote_items (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  quote_id CHAR(36) NOT NULL,
  product_id CHAR(36) NULL,
  description TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  sort_order INT DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_quote_items_quote (quote_id),
  KEY idx_quote_items_product (product_id),
  CONSTRAINT fk_quote_items_quote_id
    FOREIGN KEY (quote_id) REFERENCES quotes(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_quote_items_product_id
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- Services
-- ============================================================
CREATE TABLE IF NOT EXISTS services (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  workshop_id CHAR(36) NULL,
  service_number VARCHAR(80) NOT NULL,
  customer_id CHAR(36) NULL,
  quote_id CHAR(36) NULL,
  service_type ENUM('automotive','residential','commercial','industrial') NOT NULL DEFAULT 'residential',
  status ENUM('pending','in_progress','completed','delivered','cancelled') NOT NULL DEFAULT 'pending',
  description TEXT NOT NULL,
  problem TEXT NULL,
  location TEXT NULL,
  address TEXT NULL,
  estimated_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  final_price DECIMAL(12,2) NULL,
  labor_cost DECIMAL(10,2) DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  internal_notes TEXT NULL,
  policies TEXT NULL,
  custom_fields JSON DEFAULT (JSON_ARRAY()),
  assigned_to CHAR(36) NULL,
  created_by CHAR(36) NULL,
  started_at DATETIME(3) NULL,
  completed_at DATETIME(3) NULL,
  delivered_at DATETIME(3) NULL,
  has_warranty TINYINT(1) DEFAULT 0,
  warranty_days INT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_services_workshop_number (workshop_id, service_number),
  KEY idx_services_workshop (workshop_id),
  KEY idx_services_customer (customer_id),
  KEY idx_services_quote (quote_id),
  KEY idx_services_assigned_to (assigned_to),
  KEY idx_services_created_by (created_by),
  CONSTRAINT fk_services_workshop_id
    FOREIGN KEY (workshop_id) REFERENCES workshops(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_services_customer_id
    FOREIGN KEY (customer_id) REFERENCES customers(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_services_quote_id
    FOREIGN KEY (quote_id) REFERENCES quotes(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_services_assigned_to
    FOREIGN KEY (assigned_to) REFERENCES app_users(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_services_created_by
    FOREIGN KEY (created_by) REFERENCES app_users(id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS service_products (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  service_id CHAR(36) NOT NULL,
  product_id CHAR(36) NULL,
  product_name VARCHAR(255) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_service_products_service (service_id),
  KEY idx_service_products_product (product_id),
  CONSTRAINT fk_service_products_service_id
    FOREIGN KEY (service_id) REFERENCES services(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_service_products_product_id
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS service_images (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  service_id CHAR(36) NOT NULL,
  image_url TEXT NOT NULL,
  description TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_service_images_service (service_id),
  CONSTRAINT fk_service_images_service_id
    FOREIGN KEY (service_id) REFERENCES services(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- Sales
-- ============================================================
CREATE TABLE IF NOT EXISTS sales (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  workshop_id CHAR(36) NULL,
  sale_number VARCHAR(80) NOT NULL,
  customer_id CHAR(36) NULL,
  customer_name VARCHAR(255) NULL,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_method ENUM('cash','card','transfer','credit') NOT NULL DEFAULT 'cash',
  notes TEXT NULL,
  has_warranty TINYINT(1) DEFAULT 0,
  created_by CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_sales_workshop_number (workshop_id, sale_number),
  KEY idx_sales_workshop (workshop_id),
  KEY idx_sales_customer (customer_id),
  KEY idx_sales_created_by (created_by),
  CONSTRAINT fk_sales_workshop_id
    FOREIGN KEY (workshop_id) REFERENCES workshops(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_sales_customer_id
    FOREIGN KEY (customer_id) REFERENCES customers(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_sales_created_by
    FOREIGN KEY (created_by) REFERENCES app_users(id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sale_items (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  sale_id CHAR(36) NOT NULL,
  product_id CHAR(36) NULL,
  product_name VARCHAR(255) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_sale_items_sale (sale_id),
  KEY idx_sale_items_product (product_id),
  CONSTRAINT fk_sale_items_sale_id
    FOREIGN KEY (sale_id) REFERENCES sales(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_sale_items_product_id
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- Inventory and templates
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_movements (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  workshop_id CHAR(36) NULL,
  product_id CHAR(36) NOT NULL,
  movement_type VARCHAR(80) NOT NULL,
  from_location VARCHAR(80) NULL,
  to_location VARCHAR(80) NULL,
  quantity INT NOT NULL,
  reference_type VARCHAR(80) NULL,
  reference_id CHAR(36) NULL,
  notes TEXT NULL,
  created_by CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_inventory_movements_workshop (workshop_id),
  KEY idx_inventory_movements_product (product_id),
  KEY idx_inventory_movements_created_by (created_by),
  CONSTRAINT fk_inventory_movements_workshop_id
    FOREIGN KEY (workshop_id) REFERENCES workshops(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_inventory_movements_product_id
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_inventory_movements_created_by
    FOREIGN KEY (created_by) REFERENCES app_users(id)
    ON DELETE SET NULL
) ENGINE=InnoDB;


-- ============================================================
-- Warranties
-- ============================================================
CREATE TABLE IF NOT EXISTS warranty_category_settings (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  category_id CHAR(36) NULL,
  workshop_id CHAR(36) NULL,
  warranty_days INT NOT NULL DEFAULT 30,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_warranty_category_settings (category_id, workshop_id),
  CONSTRAINT fk_warranty_category_settings_category
    FOREIGN KEY (category_id) REFERENCES categories(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_warranty_category_settings_workshop
    FOREIGN KEY (workshop_id) REFERENCES workshops(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS warranty_settings (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  workshop_id CHAR(36) NOT NULL,
  default_warranty_days INT NOT NULL DEFAULT 30,
  default_service_warranty_days INT NOT NULL DEFAULT 30,
  terms_conditions TEXT NULL,
  coverage_policy_products TEXT NULL,
  coverage_policy_services TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_warranty_settings_workshop_id (workshop_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS warranties (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  warranty_code VARCHAR(20) NOT NULL,
  sale_id CHAR(36) NULL,
  service_id CHAR(36) NULL,
  customer_id CHAR(36) NULL,
  customer_name VARCHAR(255) NULL,
  product_name VARCHAR(255) NULL,
  service_description TEXT NULL,
  warranty_type VARCHAR(20) NOT NULL,
  warranty_days INT NOT NULL,
  start_date DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  end_date DATETIME(3) NOT NULL,
  notes TEXT NULL,
  is_voided TINYINT(1) DEFAULT 0,
  voided_at DATETIME(3) NULL,
  voided_reason TEXT NULL,
  workshop_id CHAR(36) NULL,
  created_by CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_warranties_code (warranty_code),
  KEY idx_warranties_sale (sale_id),
  KEY idx_warranties_service (service_id),
  KEY idx_warranties_customer (customer_id),
  KEY idx_warranties_workshop (workshop_id),
  CONSTRAINT chk_warranties_type CHECK (warranty_type IN ('sale', 'service')),
  CONSTRAINT fk_warranties_sale_id
    FOREIGN KEY (sale_id) REFERENCES sales(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_warranties_service_id
    FOREIGN KEY (service_id) REFERENCES services(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_warranties_customer_id
    FOREIGN KEY (customer_id) REFERENCES customers(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_warranties_workshop_id
    FOREIGN KEY (workshop_id) REFERENCES workshops(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- Control de acceso implementado en capa PHP (bootstrap.php):
-- require_superadmin(), require_workshop_access(), require_workshop_admin()


-- ============================================================
-- auth_tokens â€” tabla para autenticaciÃ³n Bearer Token
-- Ejecutar DESPUÃ‰S del schema principal (schema_mariadb.sql)
-- ============================================================

USE cerrajeria_express;

CREATE TABLE IF NOT EXISTS auth_tokens (
  id         CHAR(36)     NOT NULL DEFAULT (UUID()),
  user_id    CHAR(36)     NOT NULL,
  token      CHAR(64)     NOT NULL,
  created_at DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  expires_at DATETIME(3)  NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_auth_tokens_token (token),
  KEY idx_auth_tokens_user (user_id),
  KEY idx_auth_tokens_expires (expires_at),
  CONSTRAINT fk_auth_tokens_user_id
    FOREIGN KEY (user_id) REFERENCES app_users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- Limpieza automÃ¡tica de tokens expirados (evento opcional)
-- CREATE EVENT IF NOT EXISTS ev_cleanup_auth_tokens
--   ON SCHEDULE EVERY 1 DAY
--   DO DELETE FROM auth_tokens WHERE expires_at < NOW();

