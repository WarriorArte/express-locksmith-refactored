-- Email settings table for SMTP configuration
-- Credentials are stored encrypted (AES-256-CBC)

CREATE TABLE IF NOT EXISTS `email_settings` (
    `id` INT NOT NULL DEFAULT 1,
    `smtp_host` VARCHAR(255) NOT NULL DEFAULT '',
    `smtp_port` INT NOT NULL DEFAULT 465,
    `smtp_user` VARCHAR(255) NOT NULL DEFAULT '',
    `smtp_password_encrypted` TEXT DEFAULT NULL,
    `smtp_encryption` ENUM('ssl', 'tls', 'none') NOT NULL DEFAULT 'ssl',
    `from_email` VARCHAR(255) NOT NULL DEFAULT '',
    `from_name` VARCHAR(255) NOT NULL DEFAULT '',
    `reply_to` VARCHAR(255) DEFAULT NULL,
    `enabled` TINYINT(1) NOT NULL DEFAULT 0,
    -- Notification toggles
    `notify_new_order_admin` TINYINT(1) NOT NULL DEFAULT 1,
    `notify_new_order_customer` TINYINT(1) NOT NULL DEFAULT 1,
    `notify_status_change` TINYINT(1) NOT NULL DEFAULT 1,
    `notify_review_link` TINYINT(1) NOT NULL DEFAULT 1,
    `admin_email` VARCHAR(255) DEFAULT NULL,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Email log for debugging
CREATE TABLE IF NOT EXISTS `email_log` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `to_email` VARCHAR(255) NOT NULL,
    `subject` VARCHAR(500) NOT NULL,
    `status` ENUM('sent', 'failed') NOT NULL,
    `error_message` TEXT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
