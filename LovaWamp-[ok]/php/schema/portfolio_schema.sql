SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS categorias_proyectos (
  id CHAR(36) NOT NULL PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS proyectos (
  id CHAR(36) NOT NULL PRIMARY KEY,
  titulo VARCHAR(220) NOT NULL,
  descripcion TEXT NULL,
  thumbnail_url VARCHAR(600) NULL,
  imagenes_galeria JSON NULL,
  categoria_id CHAR(36) NULL,
  estado ENUM('publicado', 'borrador') NOT NULL DEFAULT 'borrador',
  fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_proyectos_categoria (categoria_id),
  INDEX idx_proyectos_estado (estado),
  INDEX idx_proyectos_fecha (fecha_creacion),
  CONSTRAINT fk_proyectos_categoria
    FOREIGN KEY (categoria_id)
    REFERENCES categorias_proyectos(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS experiencias (
  id CHAR(36) NOT NULL PRIMARY KEY,
  titulo_cargo VARCHAR(180) NOT NULL,
  empresa VARCHAR(180) NOT NULL,
  fechas_rango VARCHAR(120) NOT NULL,
  funciones_lista JSON NULL,
  es_visible_publico TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_experiencias_publico (es_visible_publico),
  INDEX idx_experiencias_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS habilidades (
  id CHAR(36) NOT NULL PRIMARY KEY,
  nombre VARCHAR(180) NOT NULL,
  categoria_habilidad VARCHAR(120) NOT NULL,
  icono_url VARCHAR(600) NULL,
  descripcion_corta TEXT NULL,
  es_software_skill TINYINT(1) NOT NULL DEFAULT 0,
  porcentaje INT NOT NULL DEFAULT 80,
  color_barra VARCHAR(20) NOT NULL DEFAULT '#9b87f5',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_habilidades_categoria (categoria_habilidad),
  INDEX idx_habilidades_software (es_software_skill)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS categorias_habilidades (
  id CHAR(36) NOT NULL PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL UNIQUE,
  icono_lucide VARCHAR(120) NOT NULL DEFAULT 'sparkles',
  icono_svg_url VARCHAR(600) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS configuracion_perfil (
  id CHAR(36) NOT NULL PRIMARY KEY,
  nombre_sitio VARCHAR(160) DEFAULT 'lovawamp',
  logo_url VARCHAR(600) NULL,
  hero_titulo VARCHAR(255) DEFAULT 'Diseno, Estrategia & Paid Media',
  hero_subtitulo TEXT NULL,
  hero_bg_url VARCHAR(600) NULL,
  biografia TEXT NULL,
  email VARCHAR(255) NULL,
  foto_perfil_url VARCHAR(600) NULL,
  url_cv_pdf VARCHAR(600) NULL,
  saludo_texto VARCHAR(120) DEFAULT 'Hola',
  alias_marca VARCHAR(120) DEFAULT 'lovawamp',
  subtitulo_bienvenida VARCHAR(255) DEFAULT 'Bienvenid@ a mi CV interactivo',
  me_gusta JSON NULL,
  hero_boton1_texto VARCHAR(120) DEFAULT 'Ver mi trabajo',
  hero_boton1_enlace VARCHAR(255) DEFAULT '#proyectos',
  hero_boton1_visible TINYINT(1) NOT NULL DEFAULT 1,
  hero_boton2_texto VARCHAR(120) NULL,
  hero_boton2_enlace VARCHAR(255) NULL,
  hero_boton2_visible TINYINT(1) NOT NULL DEFAULT 0,
  footer_titulo VARCHAR(160) NULL,
  footer_subtitulo TEXT NULL,
  footer_copyright VARCHAR(255) DEFAULT 'Todos los derechos reservados.',
  footer_redes JSON NULL,
  enlaces_redes JSON NULL,
  categorias_cv JSON NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_admin_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS login_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id CHAR(36) NULL,
  email VARCHAR(255) NOT NULL,
  success TINYINT(1) NOT NULL DEFAULT 0,
  ip_address VARCHAR(64) NULL,
  user_agent VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_login_user (user_id),
  INDEX idx_login_email (email),
  INDEX idx_login_created (created_at),
  CONSTRAINT fk_login_user
    FOREIGN KEY (user_id)
    REFERENCES admin_users(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO configuracion_perfil (
  id,
  nombre_sitio,
  logo_url,
  hero_titulo,
  hero_subtitulo,
  hero_bg_url,
  biografia,
  email,
  foto_perfil_url,
  enlaces_redes,
  me_gusta,
  categorias_cv,
  footer_redes
) VALUES (
  '11111111-1111-4111-8111-111111111111',
  'lovawamp',
  'img_placeholder.jpg',
  'Diseno, Estrategia & Paid Media',
  'Creando experiencias digitales que conectan marcas con personas',
  'img_placeholder.jpg',
  'Soy una profesional enfocada en estrategia digital, branding y diseno de experiencias.',
  'hola@lovawamp.com',
  'img_placeholder.jpg',
  JSON_OBJECT('instagram', '', 'linkedin', '', 'tiktok', '', 'behance', ''),
  JSON_ARRAY(),
  JSON_ARRAY(),
  JSON_ARRAY()
);

INSERT IGNORE INTO admin_users (
  id,
  name,
  email,
  password_hash,
  is_active
) VALUES (
  '22222222-2222-4222-8222-222222222222',
  'Admin',
  'admin@lovawamp.local',
  '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  1
);

INSERT IGNORE INTO categorias_proyectos (id, nombre) VALUES
  ('a1111111-1111-4111-8111-111111111111', 'Branding'),
  ('a2222222-2222-4222-8222-222222222222', 'Social Media'),
  ('a3333333-3333-4333-8333-333333333333', 'Paid Media');

INSERT IGNORE INTO categorias_habilidades (id, nombre, icono_lucide, icono_svg_url) VALUES
  ('b1111111-1111-4111-8111-111111111111', 'Marketing Digital', 'sparkles', NULL),
  ('b2222222-2222-4222-8222-222222222222', 'Diseno', 'palette', NULL),
  ('b3333333-3333-4333-8333-333333333333', 'Herramientas', 'wrench', NULL);

INSERT IGNORE INTO proyectos (
  id, titulo, descripcion, thumbnail_url, imagenes_galeria, categoria_id, estado
) VALUES
  (
    'c1111111-1111-4111-8111-111111111111',
    'Lanzamiento de marca personal',
    'Identidad visual y activacion de contenidos para una marca personal.',
    'img_placeholder.jpg',
    JSON_ARRAY('img_placeholder.jpg'),
    'a1111111-1111-4111-8111-111111111111',
    'publicado'
  ),
  (
    'c2222222-2222-4222-8222-222222222222',
    'Campana social para ecommerce',
    'Planeacion de piezas y optimizacion de conversion para redes sociales.',
    'img_placeholder.jpg',
    JSON_ARRAY('img_placeholder.jpg'),
    'a2222222-2222-4222-8222-222222222222',
    'publicado'
  );

INSERT IGNORE INTO experiencias (
  id, titulo_cargo, empresa, fechas_rango, funciones_lista, es_visible_publico
) VALUES
  (
    'd1111111-1111-4111-8111-111111111111',
    'Especialista en Paid Media',
    'Agencia Demo',
    '2023 - Actualidad',
    JSON_ARRAY('Estrategia full-funnel', 'Optimizacion de campanas', 'Reporteria para direccion'),
    1
  ),
  (
    'd2222222-2222-4222-8222-222222222222',
    'Disenadora de marca',
    'Estudio Creativo',
    '2021 - 2023',
    JSON_ARRAY('Construccion de identidad visual', 'Diseno de piezas para social media'),
    1
  );

INSERT IGNORE INTO habilidades (
  id, nombre, categoria_habilidad, icono_url, descripcion_corta, es_software_skill, porcentaje, color_barra
) VALUES
  (
    'e1111111-1111-4111-8111-111111111111',
    'Meta Ads',
    'Marketing Digital',
    'img_placeholder.jpg',
    'Planificacion y optimizacion de campanas.',
    1,
    88,
    '#2563eb'
  ),
  (
    'e2222222-2222-4222-8222-222222222222',
    'Brand Strategy',
    'Diseno',
    'img_placeholder.jpg',
    'Definicion de posicionamiento y narrativa de marca.',
    0,
    90,
    '#16a34a'
  );

SET FOREIGN_KEY_CHECKS = 1;
