-- ================================================================
-- Mi Tienda - Datos de Ejemplo para MariaDB
-- Ejecutar DESPUÉS del schema principal
-- ================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ================================================================
-- CATEGORÍAS
-- ================================================================

INSERT IGNORE INTO `categories` (`id`, `name`, `description`, `image`, `product_count`) VALUES
('cat-1', 'Categoría 1', 'Descripción de la categoría 1', '/placeholder.svg', 12),
('cat-2', 'Categoría 2', 'Descripción de la categoría 2', '/placeholder.svg', 8),
('cat-3', 'Categoría 3', 'Descripción de la categoría 3', '/placeholder.svg', 10),
('cat-4', 'Categoría 4', 'Descripción de la categoría 4', '/placeholder.svg', 6),
('cat-5', 'Categoría 5', 'Descripción de la categoría 5', '/placeholder.svg', 4);

-- ================================================================
-- PRODUCTOS
-- ================================================================

INSERT IGNORE INTO `products` (`id`, `name`, `description`, `price`, `category_id`, `stock`, `status`, `featured`) VALUES
('prod-1', 'Producto Ejemplo 1', 'Descripción del producto ejemplo 1. Un producto de alta calidad.', 85.00, 'cat-1', 15, 'active', 1),
('prod-2', 'Producto Ejemplo 2', 'Descripción del producto ejemplo 2. Diseño exclusivo.', 145.00, 'cat-2', 8, 'active', 1),
('prod-3', 'Producto Ejemplo 3', 'Descripción del producto ejemplo 3. Material premium.', 75.00, 'cat-3', 20, 'active', 1),
('prod-4', 'Producto Ejemplo 4', 'Descripción del producto ejemplo 4. Edición especial.', 95.00, 'cat-1', 12, 'active', 1),
('prod-5', 'Producto Ejemplo 5', 'Descripción del producto ejemplo 5. Temporalmente agotado.', 65.00, 'cat-4', 0, 'out_of_stock', 0),
('prod-6', 'Producto Ejemplo 6', 'Descripción del producto ejemplo 6. Set completo.', 225.00, 'cat-5', 5, 'active', 1),
('prod-7', 'Producto Ejemplo 7', 'Descripción del producto ejemplo 7. Diseño clásico.', 78.00, 'cat-1', 18, 'active', 0),
('prod-8', 'Producto Ejemplo 8', 'Descripción del producto ejemplo 8. Producto destacado.', 165.00, 'cat-2', 6, 'active', 0);

-- ================================================================
-- IMÁGENES DE PRODUCTOS
-- ================================================================

INSERT IGNORE INTO `product_images` (`product_id`, `image_url`, `sort_order`) VALUES
('prod-1', '/placeholder.svg', 0),
('prod-2', '/placeholder.svg', 0),
('prod-3', '/placeholder.svg', 0),
('prod-4', '/placeholder.svg', 0),
('prod-5', '/placeholder.svg', 0),
('prod-6', '/placeholder.svg', 0),
('prod-7', '/placeholder.svg', 0),
('prod-8', '/placeholder.svg', 0);

-- ================================================================
-- OPCIONES DE ENVÍO
-- ================================================================

INSERT IGNORE INTO `shipping_options` (`id`, `name`, `description`, `price`, `estimated_days`, `active`) VALUES
('ship-1', 'Envío Estándar', 'Entrega en todo el país', 25.00, '3-5 días', 1),
('ship-2', 'Envío Express', 'Entrega rápida', 45.00, '1-2 días', 1),
('ship-3', 'Recoger en Tienda', 'Recoge tu pedido sin costo', 0.00, 'Mismo día', 1);

-- ================================================================
-- CÓDIGOS DE DESCUENTO
-- ================================================================

INSERT IGNORE INTO `discount_codes` (`id`, `code`, `type`, `value`, `active`, `usage_count`, `max_usage`) VALUES
('disc-1', 'BIENVENIDO10', 'percentage', 10.00, 1, 25, 100),
('disc-2', 'ENVIOGRATIS', 'fixed', 25.00, 1, 15, NULL),
('disc-3', 'DESCUENTO20', 'percentage', 20.00, 0, 50, 50);

-- ================================================================
-- PEDIDOS DE EJEMPLO
-- ================================================================

INSERT IGNORE INTO `orders` (`id`, `order_number`, `customer_name`, `customer_phone`, `customer_address`, `customer_notes`, `subtotal`, `discount`, `discount_code`, `shipping`, `shipping_option`, `total`, `status`, `created_at`) VALUES
('order-1', 'ORD-001', 'Cliente Ejemplo 1', '+1 555-1234', 'Dirección de ejemplo 1', 'Notas del pedido', 245.00, 24.50, 'BIENVENIDO10', 25.00, 'Envío Estándar', 245.50, 'new', '2024-01-25 14:30:00'),
('order-2', 'ORD-002', 'Cliente Ejemplo 2', '+1 555-5678', 'Dirección de ejemplo 2', NULL, 225.00, 0.00, NULL, 45.00, 'Envío Express', 270.00, 'processing', '2024-01-24 10:15:00'),
('order-3', 'ORD-003', 'Cliente Ejemplo 3', '+1 555-9012', 'Dirección de ejemplo 3', NULL, 240.00, 0.00, NULL, 25.00, 'Envío Estándar', 265.00, 'shipped', '2024-01-22 16:45:00');

-- Items del pedido 1
INSERT IGNORE INTO `order_items` (`order_id`, `product_id`, `product_name`, `quantity`, `unit_price`, `total`) VALUES
('order-1', 'prod-1', 'Producto Ejemplo 1', 2, 85.00, 170.00),
('order-1', 'prod-3', 'Producto Ejemplo 3', 1, 75.00, 75.00);

-- Items del pedido 2
INSERT IGNORE INTO `order_items` (`order_id`, `product_id`, `product_name`, `quantity`, `unit_price`, `total`) VALUES
('order-2', 'prod-6', 'Producto Ejemplo 6', 1, 225.00, 225.00);

-- Items del pedido 3
INSERT IGNORE INTO `order_items` (`order_id`, `product_id`, `product_name`, `quantity`, `unit_price`, `total`) VALUES
('order-3', 'prod-2', 'Producto Ejemplo 2', 1, 145.00, 145.00),
('order-3', 'prod-4', 'Producto Ejemplo 4', 1, 95.00, 95.00);

-- Actualizar contador de pedidos
UPDATE `order_counter` SET `counter` = 3 WHERE `id` = 1;

-- ================================================================
-- RESEÑAS DE EJEMPLO
-- ================================================================

INSERT IGNORE INTO `reviews` (`id`, `product_id`, `rating`, `comment`, `customer_name`, `visible`) VALUES
('review-1', 'prod-1', 5, 'Excelente producto. La calidad es increíble.', 'Cliente 1', 1),
('review-2', 'prod-2', 5, 'Muy buen producto, superó mis expectativas.', 'Cliente 2', 1),
('review-3', 'prod-6', 5, 'Llegó perfectamente empacado. Muy recomendado.', 'Cliente 3', 1);

-- ================================================================
-- SETTINGS (JSON)
-- ================================================================

INSERT INTO `store_settings` (`id`, `data`) VALUES
(1, '{"storeName":"Mi Tienda","whatsappNumber":"+1 555-0000","checkoutNotes":"¡Gracias por tu compra! Tu pedido será procesado a la brevedad.","termsAndConditions":"**Términos y Condiciones**\\n\\n1. **Productos**: Los productos pueden variar ligeramente respecto a las imágenes.\\n\\n2. **Tiempo de Procesamiento**: Los pedidos se procesan en 2-3 días hábiles antes del envío.\\n\\n3. **Envíos**: Realizamos envíos a nivel nacional. Los tiempos de entrega varían según la ubicación.\\n\\n4. **Cambios y Devoluciones**: Aceptamos cambios dentro de los primeros 7 días si el producto está en perfectas condiciones.\\n\\n5. **Cuidado del Producto**: Seguir las instrucciones de cuidado incluidas con cada producto.","checkoutThankYouMessage":"Gracias por tu compra. En breve nos pondremos en contacto contigo para coordinar la entrega.","currency":"USD","currencySymbol":"$","showStockQuantity":false,"shareEnabled":true,"publicCommentsEnabled":false,"announcementBadges":[{"id":"badge-1","text":"Envío gratis","visible":true},{"id":"badge-2","text":"Compra segura","visible":true},{"id":"badge-3","text":"Calidad garantizada","visible":true}],"showAnnouncementBar":true,"productDetails":{"material":"Material de alta calidad","careInstructions":"Ver instrucciones incluidas","shippingInfo":"3-5 días hábiles"},"shopTitle":"Nuestra Colección","shopDescription":"Descubre todos nuestros productos. Calidad y diseño pensados para ti."}')
ON DUPLICATE KEY UPDATE `data` = VALUES(`data`);

INSERT INTO `home_page_settings` (`id`, `data`) VALUES
(1, '{"style":{"logoAltUrl":"/logo_white.svg","logoVariant":"primary"},"heroType":"static","heroSlides":[{"id":"slide-1","image":"/placeholder.svg","title":"Bienvenido a","highlight":"Nuestra Tienda","description":"Descubre nuestra selección de productos de alta calidad. Todo lo que necesitas en un solo lugar.","buttonText":"Ver Productos","buttonLink":"/tienda","badge":"Tienda Online","stats":"+100 productos","statsSubtext":"Calidad garantizada"},{"id":"slide-2","image":"/placeholder.svg","title":"Productos","highlight":"Destacados","description":"Descubre nuestras novedades y productos más populares.","buttonText":"Ver Novedades","buttonLink":"/tienda","badge":"✨ Nuevos Productos","stats":"+500 clientes","statsSubtext":"Confían en nosotros"},{"id":"slide-3","image":"/placeholder.svg","title":"Calidad","highlight":"Garantizada","description":"Productos seleccionados con los más altos estándares de calidad.","buttonText":"Conocer Más","buttonLink":"/nosotros","badge":"🏆 Calidad Premium","stats":"100% Satisfacción","statsSubtext":"Compromiso total"}],"heroVideoUrl":"","heroBadge":"Tienda Online","heroStats":"+100 productos","heroStatsSubtext":"Calidad garantizada","heroSettings":{"layout":"contained","overlayOpacity":30,"textPosition":"left","transitionInterval":5,"hideContentInCarousel":false,"videoAutoplay":true,"videoMuted":true,"videoLoop":true,"videoShowControls":false},"sections":[{"id":"hero","type":"hero","visible":true,"order":0,"settings":{"layout":"contained","style":"flat"}},{"id":"featured","type":"featured","visible":true,"order":1,"settings":{"layout":"contained","style":"flat"}},{"id":"categories","type":"categories","visible":true,"order":2,"settings":{"layout":"contained","style":"flat"}},{"id":"about","type":"about","visible":true,"order":3,"settings":{"layout":"contained","style":"flat","fullWidthImage":false}},{"id":"testimonials","type":"testimonials","visible":true,"order":4,"settings":{"layout":"contained","style":"flat"}},{"id":"cta","type":"cta","visible":true,"order":5,"settings":{"layout":"full","style":"flat"}}],"featuredTitle":"Productos Destacados","featuredSubtitle":"Los más populares","categoriesTitle":"Categorías","categoriesSubtitle":"Explora nuestras categorías","aboutLabel":"Sobre Nosotros","aboutTitle":"Nuestra Historia","aboutDescription":"Somos una tienda comprometida con ofrecer productos de la más alta calidad. Nos apasiona lo que hacemos y trabajamos cada día para ofrecer la mejor experiencia a nuestros clientes.","aboutImage":"/placeholder.svg","aboutFeatures":[{"id":"feat-1","icon":"Heart","title":"Compromiso","description":"Dedicados a ofrecer lo mejor."},{"id":"feat-2","icon":"Palette","title":"Calidad","description":"Productos cuidadosamente seleccionados."},{"id":"feat-3","icon":"Star","title":"Excelencia","description":"Estándares de calidad superiores."}],"aboutStats":[{"label":"Años","value":"5+"},{"label":"Productos","value":"100+"},{"label":"Satisfacción","value":"100%"}],"aboutButtonText":"Conoce Nuestra Historia","aboutButtonLink":"/nosotros","testimonialsTitle":"Lo que Dicen Nuestros Clientes","testimonialsSubtitle":"Testimonios","testimonials":[{"id":"test-1","name":"Cliente 1","location":"Ciudad","text":"Excelente producto y servicio. Totalmente recomendado.","rating":5,"visible":true,"order":0},{"id":"test-2","name":"Cliente 2","location":"Ciudad","text":"La calidad del producto superó mis expectativas. Muy satisfecho con la compra.","rating":5,"visible":true,"order":1},{"id":"test-3","name":"Cliente 3","location":"Ciudad","text":"Entrega rápida y producto en perfectas condiciones. Volveré a comprar.","rating":5,"visible":true,"order":2}],"ctaTitle":"¿Listo para Comprar?","ctaDescription":"Descubre todos nuestros productos y encuentra exactamente lo que necesitas.","ctaButtonText":"Ver Productos","ctaButtonLink":"/tienda","ctaWhatsappText":"Contactar por WhatsApp","ctaTrustBadges":[{"text":"Envío a todo el país","icon":"Truck"},{"text":"Compra segura","icon":"ShieldCheck"},{"text":"Garantía de calidad","icon":"Award"}]}')
ON DUPLICATE KEY UPDATE `data` = VALUES(`data`);

INSERT INTO `about_page_settings` (`id`, `data`) VALUES
(1, '{"showHero":true,"showStory":true,"showValues":true,"showProcess":true,"showContact":true,"heroLabel":"Sobre Nosotros","heroTitle":"Nuestra Historia","heroDescription":"Conoce más sobre quiénes somos y lo que nos motiva.","storyTitle":"Nuestra Trayectoria","storyParagraph1":"Comenzamos con una visión clara: ofrecer productos de calidad con un servicio excepcional.","storyParagraph2":"A lo largo de los años, hemos crecido manteniendo nuestros valores de calidad, compromiso y atención al detalle.","storyParagraph3":"Hoy seguimos innovando y buscando nuevas formas de ofrecer la mejor experiencia a nuestros clientes.","storyImage":"/placeholder.svg","valuesLabel":"Nuestros Valores","valuesTitle":"Lo que Nos Define","values":[{"id":"val-1","icon":"Heart","title":"Compromiso","description":"Nos dedicamos con pasión a ofrecer lo mejor."},{"id":"val-2","icon":"Palette","title":"Calidad","description":"Seleccionamos cuidadosamente cada producto."},{"id":"val-3","icon":"Star","title":"Excelencia","description":"Buscamos la excelencia en todo lo que hacemos."},{"id":"val-4","icon":"Sparkles","title":"Innovación","description":"Siempre buscando nuevas formas de mejorar."}],"processLabel":"Nuestro Proceso","processTitle":"Cómo Trabajamos","processSteps":[{"id":"step-1","step":"01","title":"Selección","description":"Elegimos los mejores productos"},{"id":"step-2","step":"02","title":"Preparación","description":"Preparamos tu pedido con cuidado"},{"id":"step-3","step":"03","title":"Empaque","description":"Empacamos de forma segura"},{"id":"step-4","step":"04","title":"Entrega","description":"Enviamos a tu puerta"}],"contactTitle":"¿Tienes Preguntas?","contactDescription":"Estamos aquí para ayudarte. Contáctanos por cualquier medio.","contactButtonText":"Ver Productos","contactButtonLink":"/tienda"}')
ON DUPLICATE KEY UPDATE `data` = VALUES(`data`);

INSERT INTO `footer_settings` (`id`, `data`) VALUES
(1, '{"brandDescription":"Tu tienda online de confianza. Productos de calidad con el mejor servicio.","copyright":"© {year} Mi Tienda. Todos los derechos reservados.","madeWithLove":"Hecho con ❤️","socialLinks":[{"id":"social-1","platform":"instagram","url":"https://instagram.com/","visible":true},{"id":"social-2","platform":"facebook","url":"https://facebook.com/","visible":true},{"id":"social-3","platform":"tiktok","url":"https://tiktok.com/","visible":false},{"id":"social-4","platform":"whatsapp","url":"https://wa.me/","visible":true}],"contactPhone":"+1 555-0000","contactEmail":"info@mitienda.com","contactAddress":"Tu ciudad","schedule":"Lun - Vie: 9am - 6pm | Sáb: 10am - 2pm","policies":[{"id":"policy-1","label":"Términos y Condiciones","url":"/terminos","visible":true},{"id":"policy-2","label":"Política de Privacidad","url":"/privacidad","visible":true},{"id":"policy-3","label":"Política de Devoluciones","url":"/devoluciones","visible":false}],"showNavigation":true,"showContact":true,"showSocial":true}')
ON DUPLICATE KEY UPDATE `data` = VALUES(`data`);

INSERT INTO `menu_settings` (`id`, `data`) VALUES
(1, '{"mainMenuItems":[{"id":"menu-1","label":"Tienda","type":"link","url":"/tienda","visible":true,"order":1,"children":[]},{"id":"menu-2","label":"Productos","type":"link","url":"/tienda","visible":true,"order":2,"children":[{"id":"menu-2-1","label":"Categoría 1","type":"category","categoryId":"cat-1","visible":true,"order":1,"parentId":"menu-2"},{"id":"menu-2-2","label":"Categoría 2","type":"category","categoryId":"cat-2","visible":true,"order":2,"parentId":"menu-2"}]},{"id":"menu-3","label":"Sobre Nosotros","type":"page","pageId":"page-about","visible":true,"order":3,"children":[]}],"footerMenuItems":[{"id":"footer-1","label":"Tienda","type":"link","url":"/tienda","visible":true,"order":1,"children":[]},{"id":"footer-2","label":"Sobre Nosotros","type":"page","pageId":"page-about","visible":true,"order":2,"children":[]}],"showAccountMenu":true,"showSearchBar":true}')
ON DUPLICATE KEY UPDATE `data` = VALUES(`data`);

-- ================================================================
-- PÁGINAS PERSONALIZADAS
-- ================================================================

INSERT INTO `custom_pages` (`id`, `title`, `slug`, `description`, `status`, `show_in_navigation`, `navigation_order`, `sections`) VALUES
('page-nosotros', 'Nosotros', 'nosotros', 'Conoce nuestra historia y valores', 'published', 1, 0,
'[{"id":"about-hero","type":"hero","visible":true,"order":0,"content":{"label":"Sobre Nosotros","title":"Nuestra Historia","description":"Conoce más sobre quiénes somos y lo que nos motiva."}},{"id":"about-story","type":"story","visible":true,"order":1,"content":{"title":"Nuestra Trayectoria","paragraph1":"Comenzamos con una visión clara: ofrecer productos de calidad con un servicio excepcional.","paragraph2":"A lo largo de los años, hemos crecido manteniendo nuestros valores de calidad, compromiso y atención al detalle.","paragraph3":"Hoy seguimos innovando y buscando nuevas formas de ofrecer la mejor experiencia a nuestros clientes.","image":"/placeholder.svg"}},{"id":"about-values","type":"values","visible":true,"order":2,"content":{"label":"Nuestros Valores","title":"Lo que Nos Define","values":[{"id":"val-1","icon":"Heart","title":"Compromiso","description":"Nos dedicamos con pasión a ofrecer lo mejor."},{"id":"val-2","icon":"Palette","title":"Calidad","description":"Seleccionamos cuidadosamente cada producto."},{"id":"val-3","icon":"Star","title":"Excelencia","description":"Buscamos la excelencia en todo lo que hacemos."},{"id":"val-4","icon":"Sparkles","title":"Innovación","description":"Siempre buscando nuevas formas de mejorar."}]}},{"id":"about-process","type":"process","visible":true,"order":3,"content":{"label":"Nuestro Proceso","title":"Cómo Trabajamos","steps":[{"id":"step-1","step":"01","title":"Selección","description":"Elegimos los mejores productos"},{"id":"step-2","step":"02","title":"Preparación","description":"Preparamos tu pedido con cuidado"},{"id":"step-3","step":"03","title":"Empaque","description":"Empacamos de forma segura"},{"id":"step-4","step":"04","title":"Entrega","description":"Enviamos a tu puerta"}]}},{"id":"about-contact","type":"contact","visible":true,"order":4,"content":{"title":"¿Tienes Preguntas?","description":"Estamos aquí para ayudarte. Contáctanos por cualquier medio.","buttonText":"Ver Productos","buttonLink":"/tienda"}}]'),
('page-faq', 'Preguntas Frecuentes', 'faq', 'Respuestas a las preguntas más comunes', 'published', 1, 1,
'[{"id":"faq-hero","type":"hero","visible":true,"order":0,"content":{"label":"FAQ","title":"Preguntas Frecuentes","description":"Encuentra respuestas a las dudas más comunes sobre nuestros productos y servicios."}},{"id":"faq-text","type":"text","visible":true,"order":1,"content":{"title":"¿Cómo puedo hacer un pedido?","paragraphs":["Puedes hacer tu pedido directamente desde nuestra tienda online. Simplemente agrega los productos al carrito y procede al checkout.","También puedes contactarnos por WhatsApp para hacer pedidos personalizados."]}}]')
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`);

SET FOREIGN_KEY_CHECKS = 1;
