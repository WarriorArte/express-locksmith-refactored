-- ============================================================
-- auth_tokens — tabla para autenticación Bearer Token
-- Ejecutar DESPUÉS del schema principal (schema_mariadb.sql)
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

-- Limpieza automática de tokens expirados (evento opcional)
-- CREATE EVENT IF NOT EXISTS ev_cleanup_auth_tokens
--   ON SCHEDULE EVERY 1 DAY
--   DO DELETE FROM auth_tokens WHERE expires_at < NOW();
