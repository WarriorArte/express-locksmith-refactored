-- ================================================================
-- Mi Tienda - Schema para MariaDB
-- Compatible con MySQL 5.7+ / MariaDB 10.3+
-- ================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ================================================================
-- TABLAS PRINCIPALES
-- ================================================================

-- Categorías de productos
CREATE TABLE IF NOT EXISTS `categories` (
    `id` VARCHAR(50) PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT,
    `image` VARCHAR(500) DEFAULT '/placeholder.svg',
    `product_count` INT DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Productos
CREATE TABLE IF NOT EXISTS `products` (
    `id` VARCHAR(50) PRIMARY KEY,
    `name` VARCHAR(200) NOT NULL,
    `description` TEXT,
    `price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `category_id` VARCHAR(50),
    `stock` INT DEFAULT 0,
    `status` ENUM('active', 'out_of_stock') DEFAULT 'active',
    `featured` BOOLEAN DEFAULT FALSE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_category` (`category_id`),
    INDEX `idx_status` (`status`),
    INDEX `idx_featured` (`featured`),
    FULLTEXT INDEX `idx_search` (`name`, `description`),
    FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Imágenes de productos (relación 1:N)
CREATE TABLE IF NOT EXISTS `product_images` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `product_id` VARCHAR(50) NOT NULL,
    `image_url` VARCHAR(500) NOT NULL,
    `sort_order` INT DEFAULT 0,
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Opciones de envío
CREATE TABLE IF NOT EXISTS `shipping_options` (
    `id` VARCHAR(50) PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT,
    `price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `estimated_days` VARCHAR(50),
    `active` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Códigos de descuento
CREATE TABLE IF NOT EXISTS `discount_codes` (
    `id` VARCHAR(50) PRIMARY KEY,
    `code` VARCHAR(50) NOT NULL UNIQUE,
    `type` ENUM('percentage', 'fixed') NOT NULL,
    `value` DECIMAL(10,2) NOT NULL,
    `active` BOOLEAN DEFAULT TRUE,
    `usage_count` INT DEFAULT 0,
    `max_usage` INT DEFAULT NULL,
    `expires_at` TIMESTAMP NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_code` (`code`),
    INDEX `idx_active` (`active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Clientes
CREATE TABLE IF NOT EXISTS `customers` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(200) NOT NULL,
    `phone` VARCHAR(50),
    `address` TEXT,
    `notes` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Pedidos
CREATE TABLE IF NOT EXISTS `orders` (
    `id` VARCHAR(50) PRIMARY KEY,
    `order_number` VARCHAR(20) NOT NULL UNIQUE,
    `customer_id` INT,
    `customer_name` VARCHAR(200) NOT NULL,
    `customer_phone` VARCHAR(50),
    `customer_email` VARCHAR(255),
    `customer_address` TEXT,
    `customer_notes` TEXT,
    `subtotal` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `discount` DECIMAL(10,2) DEFAULT 0.00,
    `discount_code` VARCHAR(50),
    `shipping` DECIMAL(10,2) DEFAULT 0.00,
    `shipping_option` VARCHAR(100),
    `total` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `status` ENUM('new', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'new',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_status` (`status`),
    INDEX `idx_order_number` (`order_number`),
    INDEX `idx_created` (`created_at`),
    FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Items de pedidos
CREATE TABLE IF NOT EXISTS `order_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `order_id` VARCHAR(50) NOT NULL,
    `product_id` VARCHAR(50),
    `product_name` VARCHAR(200) NOT NULL,
    `quantity` INT NOT NULL DEFAULT 1,
    `unit_price` DECIMAL(10,2) NOT NULL,
    `total` DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reseñas de productos
CREATE TABLE IF NOT EXISTS `reviews` (
    `id` VARCHAR(50) PRIMARY KEY,
    `product_id` VARCHAR(50) NOT NULL,
    `rating` TINYINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    `comment` TEXT,
    `customer_name` VARCHAR(200) NOT NULL,
    `visible` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_product` (`product_id`),
    INDEX `idx_visible` (`visible`),
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tokens de revisión post-compra
CREATE TABLE IF NOT EXISTS `review_tokens` (
    `id` VARCHAR(36) PRIMARY KEY,
    `order_id` VARCHAR(50) NOT NULL,
    `token` VARCHAR(64) NOT NULL UNIQUE,
    `expires_at` DATETIME NOT NULL,
    `used` TINYINT(1) DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_token` (`token`),
    INDEX `idx_order_id` (`order_id`),
    INDEX `idx_expires` (`expires_at`),
    FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Items individuales de tokens de revisión
CREATE TABLE IF NOT EXISTS `review_token_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `token_id` VARCHAR(36) NOT NULL,
    `product_id` VARCHAR(50) NOT NULL,
    `reviewed` TINYINT(1) DEFAULT 0,
    `reviewed_at` DATETIME NULL,
    INDEX `idx_token_id` (`token_id`),
    INDEX `idx_product_id` (`product_id`),
    FOREIGN KEY (`token_id`) REFERENCES `review_tokens`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- CONFIGURACIÓN Y SETTINGS (JSON Storage)
-- ================================================================

-- Configuración general de la tienda
CREATE TABLE IF NOT EXISTS `store_settings` (
    `id` INT PRIMARY KEY DEFAULT 1,
    `data` JSON NOT NULL,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Configuración de la página de inicio
CREATE TABLE IF NOT EXISTS `home_page_settings` (
    `id` INT PRIMARY KEY DEFAULT 1,
    `data` JSON NOT NULL,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Configuración de la página de nosotros
CREATE TABLE IF NOT EXISTS `about_page_settings` (
    `id` INT PRIMARY KEY DEFAULT 1,
    `data` JSON NOT NULL,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Configuración del footer
CREATE TABLE IF NOT EXISTS `footer_settings` (
    `id` INT PRIMARY KEY DEFAULT 1,
    `data` JSON NOT NULL,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Configuración del menú
CREATE TABLE IF NOT EXISTS `menu_settings` (
    `id` INT PRIMARY KEY DEFAULT 1,
    `data` JSON NOT NULL,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- GALERIA DE IMAGENES
-- ================================================================

CREATE TABLE IF NOT EXISTS `media_gallery` (
    `id` VARCHAR(80) PRIMARY KEY,
    `name` VARCHAR(200) NOT NULL,
    `alt_text` VARCHAR(255),
    `description` TEXT,
    `url` VARCHAR(500) NOT NULL,
    `size_bytes` INT NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- PÁGINAS PERSONALIZADAS
-- ================================================================

CREATE TABLE IF NOT EXISTS `custom_pages` (
    `id` VARCHAR(50) PRIMARY KEY,
    `title` VARCHAR(200) NOT NULL,
    `slug` VARCHAR(100) NOT NULL UNIQUE,
    `description` TEXT,
    `status` ENUM('published', 'draft') DEFAULT 'draft',
    `show_in_navigation` BOOLEAN DEFAULT FALSE,
    `navigation_order` INT DEFAULT 0,
    `sections` JSON NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_slug` (`slug`),
    INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- USUARIOS Y AUTENTICACIÓN
-- ================================================================

CREATE TABLE IF NOT EXISTS `users` (
    `id` VARCHAR(50) PRIMARY KEY,
    `name` VARCHAR(200) NOT NULL,
    `email` VARCHAR(255) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Roles de usuario (separado por seguridad)
CREATE TABLE IF NOT EXISTS `user_roles` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` VARCHAR(50) NOT NULL,
    `role` ENUM('admin', 'moderator', 'user') NOT NULL DEFAULT 'user',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `unique_user_role` (`user_id`, `role`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Registro de inicios de sesión
CREATE TABLE IF NOT EXISTS `login_logs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` VARCHAR(50) NULL,
    `email` VARCHAR(255) NOT NULL,
    `success` BOOLEAN NOT NULL DEFAULT 0,
    `ip_address` VARCHAR(64) NULL,
    `user_agent` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_login_user` (`user_id`),
    INDEX `idx_login_email` (`email`),
    INDEX `idx_login_created` (`created_at`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- CONTADOR DE PEDIDOS
-- ================================================================

CREATE TABLE IF NOT EXISTS `order_counter` (
    `id` INT PRIMARY KEY DEFAULT 1,
    `counter` INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inicializar contador
INSERT IGNORE INTO `order_counter` (`id`, `counter`) VALUES (1, 0);

-- ================================================================
-- VISTAS ÚTILES
-- ================================================================

-- Vista de productos con categoría
CREATE OR REPLACE VIEW `v_products_with_category` AS
SELECT 
    p.*,
    c.name AS category_name
FROM products p
LEFT JOIN categories c ON p.category_id = c.id;

-- Vista de pedidos con totales
CREATE OR REPLACE VIEW `v_orders_summary` AS
SELECT 
    o.*,
    COUNT(oi.id) AS item_count
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id;

-- ================================================================
-- PROCEDIMIENTOS ALMACENADOS
-- ================================================================

DELIMITER //

-- Generar número de pedido
CREATE PROCEDURE IF NOT EXISTS `generate_order_number`(OUT order_num VARCHAR(20))
BEGIN
    DECLARE new_counter INT;
    
    UPDATE order_counter SET counter = counter + 1 WHERE id = 1;
    SELECT counter INTO new_counter FROM order_counter WHERE id = 1;
    
    SET order_num = CONCAT('ORD-', LPAD(new_counter, 3, '0'));
END //

-- Actualizar conteo de productos por categoría
CREATE PROCEDURE IF NOT EXISTS `update_category_count`(IN cat_id VARCHAR(50))
BEGIN
    UPDATE categories 
    SET product_count = (
        SELECT COUNT(*) FROM products WHERE category_id = cat_id
    )
    WHERE id = cat_id;
END //

-- Decrementar stock al crear pedido
CREATE PROCEDURE IF NOT EXISTS `decrease_stock`(IN prod_id VARCHAR(50), IN qty INT)
BEGIN
    UPDATE products 
    SET 
        stock = GREATEST(0, stock - qty),
        status = CASE WHEN stock - qty <= 0 THEN 'out_of_stock' ELSE status END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = prod_id;
END //

DELIMITER ;

-- ================================================================
-- TRIGGERS
-- ================================================================

DELIMITER //

-- Actualizar conteo de categoría al insertar producto
CREATE TRIGGER IF NOT EXISTS `trg_product_insert`
AFTER INSERT ON products
FOR EACH ROW
BEGIN
    IF NEW.category_id IS NOT NULL THEN
        CALL update_category_count(NEW.category_id);
    END IF;
END //

-- Actualizar conteo de categoría al eliminar producto
CREATE TRIGGER IF NOT EXISTS `trg_product_delete`
AFTER DELETE ON products
FOR EACH ROW
BEGIN
    IF OLD.category_id IS NOT NULL THEN
        CALL update_category_count(OLD.category_id);
    END IF;
END //

-- Actualizar conteo de categoría al actualizar producto
CREATE TRIGGER IF NOT EXISTS `trg_product_update`
AFTER UPDATE ON products
FOR EACH ROW
BEGIN
    IF OLD.category_id != NEW.category_id OR 
       (OLD.category_id IS NULL AND NEW.category_id IS NOT NULL) OR
       (OLD.category_id IS NOT NULL AND NEW.category_id IS NULL) THEN
        IF OLD.category_id IS NOT NULL THEN
            CALL update_category_count(OLD.category_id);
        END IF;
        IF NEW.category_id IS NOT NULL THEN
            CALL update_category_count(NEW.category_id);
        END IF;
    END IF;
END //

DELIMITER ;

SET FOREIGN_KEY_CHECKS = 1;

-- ================================================================
-- DATOS INICIALES (Opcional)
-- ================================================================

-- Insertar usuario admin por defecto (password: password)
INSERT IGNORE INTO `users` (`id`, `name`, `email`, `password_hash`) 
VALUES ('user-1', 'Administrador', 'admin@mitienda.test', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

INSERT IGNORE INTO `user_roles` (`user_id`, `role`) 
VALUES ('user-1', 'admin');