-- ============================================================
-- Cerrajería Express — Datos de ejemplo
-- Pobla los talleres CERRAHEREGT y ELECLOPEZ con datos demo
-- de TODOS los módulos. Idempotente (INSERT IGNORE).
-- Ejecutar DESPUÉS del schema y de crear los talleres/usuarios.
-- ============================================================

USE cerrajeria_express;

-- Resolver IDs de talleres y usuarios existentes
SET @w1 := (SELECT id FROM workshops WHERE code = 'CERRAHEREGT' LIMIT 1);
SET @w2 := (SELECT id FROM workshops WHERE code = 'ELECLOPEZ'   LIMIT 1);
SET @u1 := (SELECT id FROM app_users WHERE LOWER(email) = 'josuedsajquim@gmail.com' LIMIT 1);
SET @u2 := (SELECT id FROM app_users WHERE LOWER(email) = 'lopez@correo.com'        LIMIT 1);
SET @u3 := (SELECT id FROM app_users WHERE LOWER(email) = 'lolo@correo.com'         LIMIT 1);

-- ============================================================
-- BUSINESS SETTINGS
-- ============================================================
INSERT IGNORE INTO business_settings
  (id, workshop_id, name, phone, phone_country_code, address, email, website, currency_symbol, printer_size)
VALUES
  ('11111111-1111-1111-1111-000000000001', @w1, 'Cerrajería EGT',    '5512345678', '+52', 'Av. Reforma 123, CDMX', 'contacto@egt.mx',   'https://egt.mx',   '$', '80mm'),
  ('11111111-1111-1111-1111-000000000002', @w2, 'Cerrajería López',  '5587654321', '+52', 'Calle Juárez 45, GDL',  'hola@lopez.mx',     'https://lopez.mx', '$', '58mm');

-- ============================================================
-- WORKSHOP FEATURES (módulos habilitados)
-- ============================================================
INSERT IGNORE INTO workshop_features (id, workshop_id, feature_key, is_enabled) VALUES
  ('22222222-1111-0000-0000-000000000001', @w1, 'inventory',  1),
  ('22222222-1111-0000-0000-000000000002', @w1, 'quotes',     1),
  ('22222222-1111-0000-0000-000000000003', @w1, 'services',   1),
  ('22222222-1111-0000-0000-000000000004', @w1, 'sales',      1),
  ('22222222-1111-0000-0000-000000000005', @w1, 'warranties', 1),
  ('22222222-2222-0000-0000-000000000001', @w2, 'inventory',  1),
  ('22222222-2222-0000-0000-000000000002', @w2, 'quotes',     1),
  ('22222222-2222-0000-0000-000000000003', @w2, 'services',   1),
  ('22222222-2222-0000-0000-000000000004', @w2, 'sales',      1),
  ('22222222-2222-0000-0000-000000000005', @w2, 'warranties', 1);

-- ============================================================
-- CATEGORÍAS
-- ============================================================
INSERT IGNORE INTO categories (id, workshop_id, name, color) VALUES
  ('33333333-1111-0000-0000-000000000001', @w1, 'Cerraduras EGT',     '#2563eb'),
  ('33333333-1111-0000-0000-000000000002', @w1, 'Llaves EGT',         '#16a34a'),
  ('33333333-1111-0000-0000-000000000003', @w1, 'Candados EGT',       '#dc2626'),
  ('33333333-1111-0000-0000-000000000004', @w1, 'Accesorios EGT',     '#f59e0b'),
  ('33333333-2222-0000-0000-000000000001', @w2, 'Cerraduras López',   '#2563eb'),
  ('33333333-2222-0000-0000-000000000002', @w2, 'Llaves López',       '#16a34a'),
  ('33333333-2222-0000-0000-000000000003', @w2, 'Candados López',     '#dc2626'),
  ('33333333-2222-0000-0000-000000000004', @w2, 'Automotriz López',   '#7c3aed');

-- ============================================================
-- TAGS
-- ============================================================
INSERT IGNORE INTO tags (id, workshop_id, name, color) VALUES
  ('44444444-1111-0000-0000-000000000001', @w1, 'Premium EGT',  '#facc15'),
  ('44444444-1111-0000-0000-000000000002', @w1, 'Oferta EGT',   '#ef4444'),
  ('44444444-2222-0000-0000-000000000001', @w2, 'Premium López','#facc15'),
  ('44444444-2222-0000-0000-000000000002', @w2, 'Nuevo López',  '#06b6d4');

-- ============================================================
-- PRODUCTOS
-- ============================================================
INSERT IGNORE INTO products
  (id, workshop_id, category_id, name, description, stock_store, stock_warehouse, min_stock, purchase_price_local, sale_price_min, sale_price_max, is_active)
VALUES
  ('55555555-1111-0000-0000-000000000001', @w1, '33333333-1111-0000-0000-000000000001', 'Cerradura Phillips estándar',  'Cerradura de pomo para puerta interior', 12, 30, 5, 180.00, 280.00, 350.00, 1),
  ('55555555-1111-0000-0000-000000000002', @w1, '33333333-1111-0000-0000-000000000001', 'Cerradura de seguridad alta', 'Cerradura reforzada antibumping',         5, 15, 3, 650.00, 950.00, 1200.00, 1),
  ('55555555-1111-0000-0000-000000000003', @w1, '33333333-1111-0000-0000-000000000002', 'Llave bruta tipo Yale',        'Llave virgen para duplicado',           80, 200, 20, 8.00, 25.00, 35.00, 1),
  ('55555555-1111-0000-0000-000000000004', @w1, '33333333-1111-0000-0000-000000000003', 'Candado 50mm acero',          'Candado de acero endurecido',           18, 40, 5, 95.00, 180.00, 220.00, 1),
  ('55555555-1111-0000-0000-000000000005', @w1, '33333333-1111-0000-0000-000000000004', 'Bisagra hidráulica',          'Bisagra para puertas comerciales',        2, 10, 4, 320.00, 480.00, 600.00, 1),
  ('55555555-2222-0000-0000-000000000001', @w2, '33333333-2222-0000-0000-000000000001', 'Cerradura embutir bronce',    'Cerradura de embutir línea residencial',  8, 20, 3, 280.00, 450.00, 550.00, 1),
  ('55555555-2222-0000-0000-000000000002', @w2, '33333333-2222-0000-0000-000000000002', 'Llave automotriz transponder','Llave con chip programable',              4, 12, 2, 450.00, 850.00, 1100.00, 1),
  ('55555555-2222-0000-0000-000000000003', @w2, '33333333-2222-0000-0000-000000000003', 'Candado disco 70mm',          'Candado tipo disco antirrobo',           10, 25, 5, 220.00, 380.00, 450.00, 1),
  ('55555555-2222-0000-0000-000000000004', @w2, '33333333-2222-0000-0000-000000000004', 'Servicio apertura auto',      'Apertura sin daño de vehículo',           0,  0, 0,  0.00, 350.00, 600.00, 1);

-- ============================================================
-- CLIENTES
-- ============================================================
INSERT IGNORE INTO customers
  (id, workshop_id, name, customer_type, phone, email, address, is_vip, is_frequent, total_purchases, total_services)
VALUES
  ('66666666-1111-0000-0000-000000000001', @w1, 'María González',    'person',  '5511112222', 'maria@correo.com',   'Col. Roma Norte, CDMX',     1, 1, 2350.00, 3),
  ('66666666-1111-0000-0000-000000000002', @w1, 'Constructora ABC',  'company', '5544445555', 'contacto@abc.mx',    'Polanco, CDMX',             0, 1, 8900.00, 5),
  ('66666666-1111-0000-0000-000000000003', @w1, 'Pedro Hernández',   'person',  '5533334444', 'pedro@correo.com',   'Coyoacán, CDMX',            0, 0,  450.00, 1),
  ('66666666-2222-0000-0000-000000000001', @w2, 'Ana Martínez',      'person',  '3322114455', 'ana@correo.com',     'Providencia, GDL',          1, 1, 3120.00, 4),
  ('66666666-2222-0000-0000-000000000002', @w2, 'Negocios López SA', 'company', '3399887766', 'admin@neglopez.mx',  'Centro, GDL',               0, 1, 5400.00, 2),
  ('66666666-2222-0000-0000-000000000003', @w2, 'Luis Ramírez',      'person',  '3366554433', 'luis@correo.com',    'Tlaquepaque, JAL',          0, 0,  850.00, 1);

-- ============================================================
-- COTIZACIONES + ITEMS
-- ============================================================
INSERT IGNORE INTO quotes
  (id, workshop_id, quote_number, customer_id, customer_name, customer_phone, description, status, subtotal, discount, total, validity_days, valid_until, created_by)
VALUES
  ('77777777-1111-0000-0000-000000000001', @w1, 'COT-EGT-001', '66666666-1111-0000-0000-000000000002', 'Constructora ABC', '5544445555', 'Cambio de cerraduras 5 oficinas',          'pending',  5750.00,   0.00, 5750.00, 15, DATE_ADD(CURDATE(), INTERVAL 15 DAY), @u1),
  ('77777777-1111-0000-0000-000000000002', @w1, 'COT-EGT-002', '66666666-1111-0000-0000-000000000001', 'María González',   '5511112222', 'Instalación cerradura seguridad alta',     'accepted', 1200.00, 100.00, 1100.00, 15, DATE_ADD(CURDATE(), INTERVAL 15 DAY), @u1),
  ('77777777-2222-0000-0000-000000000001', @w2, 'COT-LOP-001', '66666666-2222-0000-0000-000000000002', 'Negocios López SA','3399887766', 'Cambio combinaciones 3 candados disco',    'pending',  1140.00,   0.00, 1140.00, 15, DATE_ADD(CURDATE(), INTERVAL 15 DAY), @u2);

INSERT IGNORE INTO quote_items (id, quote_id, product_id, description, quantity, unit_price, subtotal, sort_order) VALUES
  ('77777777-1111-0001-0000-000000000001', '77777777-1111-0000-0000-000000000001', '55555555-1111-0000-0000-000000000002', 'Cerradura seguridad alta',  5, 1150.00, 5750.00, 1),
  ('77777777-1111-0002-0000-000000000001', '77777777-1111-0000-0000-000000000002', '55555555-1111-0000-0000-000000000002', 'Cerradura seguridad alta',  1, 1200.00, 1200.00, 1),
  ('77777777-2222-0001-0000-000000000001', '77777777-2222-0000-0000-000000000001', '55555555-2222-0000-0000-000000000003', 'Candado disco 70mm',         3,  380.00, 1140.00, 1);

-- ============================================================
-- SERVICIOS + PRODUCTOS USADOS + IMAGEN
-- ============================================================
INSERT IGNORE INTO services
  (id, workshop_id, service_number, customer_id, service_type, status, description, problem, address, estimated_price, final_price, labor_cost, has_warranty, warranty_days, assigned_to, created_by)
VALUES
  ('88888888-1111-0000-0000-000000000001', @w1, 'SRV-EGT-001', '66666666-1111-0000-0000-000000000001', 'residential', 'completed',   'Cambio de cerradura puerta principal',     'Cerradura forzada',                 'Col. Roma Norte, CDMX', 1200.00, 1200.00, 250.00, 1, 90, @u1, @u1),
  ('88888888-1111-0000-0000-000000000002', @w1, 'SRV-EGT-002', '66666666-1111-0000-0000-000000000003', 'residential', 'in_progress', 'Apertura puerta sin llave',                'Cliente perdió llaves',             'Coyoacán, CDMX',         450.00,    NULL, 200.00, 0,  0, @u1, @u1),
  ('88888888-2222-0000-0000-000000000001', @w2, 'SRV-LOP-001', '66666666-2222-0000-0000-000000000001', 'automotive',  'delivered',   'Apertura vehículo y duplicado de llave',   'Llave dentro del auto',             'Providencia, GDL',       850.00,  850.00, 300.00, 1, 30, @u2, @u2),
  ('88888888-2222-0000-0000-000000000002', @w2, 'SRV-LOP-002', '66666666-2222-0000-0000-000000000003', 'commercial',  'pending',     'Instalación 2 candados disco bodega',      'Reforzar seguridad bodega',         'Tlaquepaque, JAL',       850.00,    NULL, 150.00, 0,  0, @u3, @u2);

INSERT IGNORE INTO service_products (id, service_id, product_id, product_name, quantity, unit_price, subtotal) VALUES
  ('88888888-1111-0001-0000-000000000001', '88888888-1111-0000-0000-000000000001', '55555555-1111-0000-0000-000000000002', 'Cerradura seguridad alta', 1, 950.00, 950.00),
  ('88888888-2222-0001-0000-000000000001', '88888888-2222-0000-0000-000000000001', '55555555-2222-0000-0000-000000000002', 'Llave automotriz transponder', 1, 550.00, 550.00),
  ('88888888-2222-0002-0000-000000000001', '88888888-2222-0000-0000-000000000002', '55555555-2222-0000-0000-000000000003', 'Candado disco 70mm', 2, 380.00, 760.00);

INSERT IGNORE INTO service_images (id, service_id, image_url, description) VALUES
  ('88888888-1111-IMG1-0000-000000000001', '88888888-1111-0000-0000-000000000001', '/uploads/sample/cerradura-antes.jpg', 'Antes del cambio'),
  ('88888888-1111-IMG2-0000-000000000001', '88888888-1111-0000-0000-000000000001', '/uploads/sample/cerradura-despues.jpg', 'Cerradura instalada');

-- ============================================================
-- VENTAS + ITEMS
-- ============================================================
INSERT IGNORE INTO sales
  (id, workshop_id, sale_number, customer_id, customer_name, subtotal, discount, total, payment_method, has_warranty, created_by)
VALUES
  ('99999999-1111-0000-0000-000000000001', @w1, 'VTA-EGT-001', '66666666-1111-0000-0000-000000000001', 'María González',   480.00, 0.00, 480.00, 'cash',     0, @u1),
  ('99999999-1111-0000-0000-000000000002', @w1, 'VTA-EGT-002', NULL,                                   'Cliente mostrador', 250.00, 0.00, 250.00, 'card',     0, @u1),
  ('99999999-2222-0000-0000-000000000001', @w2, 'VTA-LOP-001', '66666666-2222-0000-0000-000000000002', 'Negocios López SA',1140.00, 50.00, 1090.00, 'transfer', 1, @u2);

INSERT IGNORE INTO sale_items (id, sale_id, product_id, product_name, quantity, unit_price, subtotal) VALUES
  ('99999999-1111-0001-0000-000000000001', '99999999-1111-0000-0000-000000000001', '55555555-1111-0000-0000-000000000004', 'Candado 50mm acero',     2, 180.00, 360.00),
  ('99999999-1111-0001-0000-000000000002', '99999999-1111-0000-0000-000000000001', '55555555-1111-0000-0000-000000000003', 'Llave bruta tipo Yale',  4,  30.00, 120.00),
  ('99999999-1111-0002-0000-000000000001', '99999999-1111-0000-0000-000000000002', '55555555-1111-0000-0000-000000000001', 'Cerradura Phillips',     1, 250.00, 250.00),
  ('99999999-2222-0001-0000-000000000001', '99999999-2222-0000-0000-000000000001', '55555555-2222-0000-0000-000000000003', 'Candado disco 70mm',     3, 380.00, 1140.00);

-- ============================================================
-- INVENTARIO — MOVIMIENTOS
-- ============================================================
INSERT IGNORE INTO inventory_movements
  (id, workshop_id, product_id, movement_type, from_location, to_location, quantity, reference_type, reference_id, notes, created_by)
VALUES
  ('AAAAAAAA-1111-0000-0000-000000000001', @w1, '55555555-1111-0000-0000-000000000001', 'entry',    NULL,        'warehouse', 30, 'purchase', NULL, 'Compra inicial proveedor',      @u1),
  ('AAAAAAAA-1111-0000-0000-000000000002', @w1, '55555555-1111-0000-0000-000000000001', 'transfer', 'warehouse', 'store',    12, 'transfer', NULL, 'Reposición tienda',              @u1),
  ('AAAAAAAA-1111-0000-0000-000000000003', @w1, '55555555-1111-0000-0000-000000000004', 'exit',     'store',     NULL,        2, 'sale',     '99999999-1111-0000-0000-000000000001', 'Venta VTA-EGT-001', @u1),
  ('AAAAAAAA-2222-0000-0000-000000000001', @w2, '55555555-2222-0000-0000-000000000003', 'entry',    NULL,        'warehouse', 25, 'purchase', NULL, 'Compra inicial proveedor',      @u2),
  ('AAAAAAAA-2222-0000-0000-000000000002', @w2, '55555555-2222-0000-0000-000000000003', 'exit',     'store',     NULL,        3, 'sale',     '99999999-2222-0000-0000-000000000001', 'Venta VTA-LOP-001', @u2);

-- ============================================================
-- WARRANTY SETTINGS + GARANTÍAS EMITIDAS
-- ============================================================
INSERT IGNORE INTO warranty_settings (id, workshop_id, default_warranty_days, default_service_warranty_days, terms_conditions, coverage_policy_products, coverage_policy_services) VALUES
  ('BBBBBBBB-1111-0000-0000-000000000001', @w1, 30, 90, 'Garantía válida con presentación de ticket original.', 'Cubre defectos de fabricación.',     'Cubre la instalación realizada.'),
  ('BBBBBBBB-2222-0000-0000-000000000001', @w2, 30, 30, 'Garantía válida con presentación de ticket original.', 'No cubre mal uso ni desgaste normal.','Cubre mano de obra del servicio.');

INSERT IGNORE INTO warranties
  (id, warranty_code, sale_id, service_id, customer_id, customer_name, product_name, service_description, warranty_type, warranty_days, end_date, workshop_id, created_by)
VALUES
  ('CCCCCCCC-1111-0000-0000-000000000001', 'WAR-EGT-0001', NULL, '88888888-1111-0000-0000-000000000001', '66666666-1111-0000-0000-000000000001', 'María González',   NULL,                          'Cambio de cerradura puerta principal', 'service', 90, DATE_ADD(NOW(), INTERVAL 90 DAY), @w1, @u1),
  ('CCCCCCCC-2222-0000-0000-000000000001', 'WAR-LOP-0001', '99999999-2222-0000-0000-000000000001', NULL, '66666666-2222-0000-0000-000000000002', 'Negocios López SA','Candado disco 70mm', NULL,                                   'sale',    30, DATE_ADD(NOW(), INTERVAL 30 DAY), @w2, @u2),
  ('CCCCCCCC-2222-0000-0000-000000000002', 'WAR-LOP-0002', NULL, '88888888-2222-0000-0000-000000000001', '66666666-2222-0000-0000-000000000001', 'Ana Martínez',     NULL,                          'Apertura vehículo y duplicado',        'service', 30, DATE_ADD(NOW(), INTERVAL 30 DAY), @w2, @u2);

-- ============================================================
-- FIN
-- ============================================================
