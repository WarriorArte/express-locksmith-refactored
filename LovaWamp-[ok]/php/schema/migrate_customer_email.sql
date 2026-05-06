-- Add customer_email to orders for checkout persistence
-- Compatible with MySQL 5.7+ / MariaDB 10.3+

ALTER TABLE `orders`
    ADD COLUMN `customer_email` VARCHAR(255) AFTER `customer_phone`;
