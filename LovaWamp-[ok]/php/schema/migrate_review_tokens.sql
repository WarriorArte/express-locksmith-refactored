-- ============================================================
-- Migration: Review Tokens (Post-Purchase Review Flow)
-- Creates table for unique review access tokens
-- ============================================================

CREATE TABLE IF NOT EXISTS review_tokens (
    id VARCHAR(36) PRIMARY KEY,
    order_id VARCHAR(50) NOT NULL,
    token VARCHAR(64) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    used TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_order_id (order_id),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Track which individual products have been reviewed via token
CREATE TABLE IF NOT EXISTS review_token_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token_id VARCHAR(36) NOT NULL,
    product_id VARCHAR(50) NOT NULL,
    reviewed TINYINT(1) DEFAULT 0,
    reviewed_at DATETIME NULL,
    FOREIGN KEY (token_id) REFERENCES review_tokens(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_token_id (token_id),
    INDEX idx_product_id (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
