<?php
/**
 * backup-restore.php — Restauracion batch de backup por taller
 * POST { workshop_id, backup: { timestamp, workshop_id, tables: {...} } }
 */
require_once __DIR__ . '/helpers/bootstrap.php';

handle_preflight();
set_cors_headers();

$conn     = get_db_connection();
$method   = $_SERVER['REQUEST_METHOD'];
$authUser = require_auth();

function rows_of($value): array {
    if (!is_array($value)) return [];
    if (array_is_list($value)) return $value;
    return [];
}

function to_int_bool($value, int $fallback = 0): int {
    if ($value === null) return $fallback;
    if (is_bool($value)) return $value ? 1 : 0;
    if (is_numeric($value)) return ((int)$value) ? 1 : 0;
    if (is_string($value)) {
        $v = strtolower(trim($value));
        if ($v === 'true' || $v === 'yes' || $v === 'on') return 1;
        if ($v === 'false' || $v === 'no' || $v === 'off') return 0;
    }
    return $fallback;
}

function fk_exists(PDO $conn, string $table, ?string $id): ?string {
    if (!$id) return null;
    $stmt = $conn->prepare("SELECT 1 FROM {$table} WHERE id = ? LIMIT 1");
    $stmt->execute([$id]);
    return $stmt->fetchColumn() ? $id : null;
}

function norm_datetime(?string $value): ?string {
    if (!$value) return null;
    $value = trim($value);
    if ($value === '') return null;
    return str_replace('T', ' ', $value);
}

try {
    if ($method !== 'POST') {
        Response::error('Metodo no permitido', 405);
    }

    $data = get_json_input();
    $workshopId = get_workshop_id_param($data);
    require_workshop_admin($conn, $authUser['user_id'], $workshopId);

    $backup = $data['backup'] ?? null;
    if (!is_array($backup)) {
        Response::error('El campo backup es requerido y debe ser un objeto JSON');
    }

    $backupWorkshopId = $backup['workshop_id'] ?? null;
    if (!empty($backupWorkshopId) && $backupWorkshopId !== $workshopId) {
        Response::error('El backup pertenece a otro taller');
    }

    $tables = $backup['tables'] ?? null;
    if (!is_array($tables)) {
        Response::error('El backup no contiene tables');
    }

    $counts = [
        'categories' => 0,
        'tags' => 0,
        'customers' => 0,
        'products' => 0,
        'product_tags' => 0,
        'quotes' => 0,
        'quote_items' => 0,
        'sales' => 0,
        'sale_items' => 0,
        'services' => 0,
        'service_products' => 0,
        'service_images' => 0,
        'warranty_settings' => 0,
        'warranty_category_settings' => 0,
        'warranties' => 0,
        'inventory_movements' => 0,
        'templates' => 0,
        'business_settings' => 0,
    ];

    $conn->beginTransaction();
    try {
        // Limpieza en orden seguro (hijos -> padres)
        $conn->prepare('DELETE si FROM service_images si JOIN services s ON s.id = si.service_id WHERE s.workshop_id = ?')->execute([$workshopId]);
        $conn->prepare('DELETE sp FROM service_products sp JOIN services s ON s.id = sp.service_id WHERE s.workshop_id = ?')->execute([$workshopId]);
        $conn->prepare('DELETE sai FROM sale_items sai JOIN sales sa ON sa.id = sai.sale_id WHERE sa.workshop_id = ?')->execute([$workshopId]);
        $conn->prepare('DELETE qi FROM quote_items qi JOIN quotes q ON q.id = qi.quote_id WHERE q.workshop_id = ?')->execute([$workshopId]);
        $conn->prepare('DELETE FROM inventory_movements WHERE workshop_id = ?')->execute([$workshopId]);
        $conn->prepare('DELETE FROM warranties WHERE workshop_id = ?')->execute([$workshopId]);
        $conn->prepare('DELETE FROM services WHERE workshop_id = ?')->execute([$workshopId]);
        $conn->prepare('DELETE FROM sales WHERE workshop_id = ?')->execute([$workshopId]);
        $conn->prepare('DELETE FROM quotes WHERE workshop_id = ?')->execute([$workshopId]);
        $conn->prepare('DELETE pt FROM product_tags pt JOIN products p ON p.id = pt.product_id WHERE p.workshop_id = ?')->execute([$workshopId]);
        $conn->prepare('DELETE FROM products WHERE workshop_id = ?')->execute([$workshopId]);
        $conn->prepare('DELETE FROM customers WHERE workshop_id = ?')->execute([$workshopId]);
        $conn->prepare('DELETE FROM warranty_category_settings WHERE workshop_id = ?')->execute([$workshopId]);
        $conn->prepare('DELETE FROM warranty_settings WHERE workshop_id = ?')->execute([$workshopId]);
        $conn->prepare('DELETE FROM workshop_template_selections WHERE workshop_id = ?')->execute([$workshopId]);
        $conn->prepare('DELETE FROM templates WHERE workshop_id = ? AND is_global = 0')->execute([$workshopId]);
        $conn->prepare('DELETE FROM tags WHERE workshop_id = ?')->execute([$workshopId]);
        $conn->prepare('DELETE FROM categories WHERE workshop_id = ?')->execute([$workshopId]);
        $conn->prepare('DELETE FROM business_settings WHERE workshop_id = ?')->execute([$workshopId]);

        // business_settings
        $bs = $tables['business_settings'] ?? null;
        if (is_array($bs) && !array_is_list($bs)) {
            $conn->prepare('INSERT INTO business_settings (id, workshop_id, name, phone, phone_country_code, address, email, website, logo_url, facebook, instagram, whatsapp, printer_size, printer_model, currency_symbol, print_logo, auto_cut, storage_endpoint, storage_secret_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
                ->execute([
                    $bs['id'] ?? make_uuid(),
                    $workshopId,
                    $bs['name'] ?? 'Mi Cerrajeria',
                    $bs['phone'] ?? null,
                    $bs['phone_country_code'] ?? '+52',
                    $bs['address'] ?? null,
                    $bs['email'] ?? null,
                    $bs['website'] ?? null,
                    $bs['logo_url'] ?? null,
                    $bs['facebook'] ?? null,
                    $bs['instagram'] ?? null,
                    $bs['whatsapp'] ?? null,
                    $bs['printer_size'] ?? '80mm',
                    $bs['printer_model'] ?? 'generic',
                    $bs['currency_symbol'] ?? '$',
                    to_int_bool($bs['print_logo'] ?? 1, 1),
                    to_int_bool($bs['auto_cut'] ?? 1, 1),
                    $bs['storage_endpoint'] ?? null,
                    $bs['storage_secret_key'] ?? null,
                ]);
            $counts['business_settings']++;
        }

        // categories
        foreach (rows_of($tables['categories'] ?? []) as $row) {
            if (!is_array($row) || empty($row['name'])) continue;
            $conn->prepare('INSERT INTO categories (id, workshop_id, name, color) VALUES (?, ?, ?, ?)')
                ->execute([
                    $row['id'] ?? make_uuid(),
                    $workshopId,
                    $row['name'],
                    $row['color'] ?? '#2563eb',
                ]);
            $counts['categories']++;
        }

        // tags
        foreach (rows_of($tables['tags'] ?? []) as $row) {
            if (!is_array($row) || empty($row['name'])) continue;
            $conn->prepare('INSERT INTO tags (id, workshop_id, name, color) VALUES (?, ?, ?, ?)')
                ->execute([
                    $row['id'] ?? make_uuid(),
                    $workshopId,
                    $row['name'],
                    $row['color'] ?? '#6366f1',
                ]);
            $counts['tags']++;
        }

        // customers
        foreach (rows_of($tables['customers'] ?? []) as $row) {
            if (!is_array($row) || empty($row['name'])) continue;
            $conn->prepare('INSERT INTO customers (id, workshop_id, name, customer_type, phone, phone_secondary, email, address, notes, is_vip, is_frequent, is_normal, has_debt, no_work_again, no_work_reason, total_purchases, total_services) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
                ->execute([
                    $row['id'] ?? make_uuid(),
                    $workshopId,
                    $row['name'],
                    $row['customer_type'] ?? 'person',
                    $row['phone'] ?? null,
                    $row['phone_secondary'] ?? null,
                    $row['email'] ?? null,
                    $row['address'] ?? null,
                    $row['notes'] ?? null,
                    to_int_bool($row['is_vip'] ?? 0),
                    to_int_bool($row['is_frequent'] ?? 0),
                    to_int_bool($row['is_normal'] ?? 0),
                    to_int_bool($row['has_debt'] ?? 0),
                    to_int_bool($row['no_work_again'] ?? 0),
                    $row['no_work_reason'] ?? null,
                    $row['total_purchases'] ?? 0,
                    $row['total_services'] ?? 0,
                ]);
            $counts['customers']++;
        }

        // products + product_tags
        foreach (rows_of($tables['products'] ?? []) as $row) {
            if (!is_array($row) || empty($row['name'])) continue;
            $productId = $row['id'] ?? make_uuid();
            $categoryId = fk_exists($conn, 'categories', $row['category_id'] ?? null);

            $conn->prepare('INSERT INTO products (id, workshop_id, category_id, name, description, instructions, notes, image_url, stock_store, stock_warehouse, min_stock, purchase_price_imported, purchase_price_local, sale_price_min, sale_price_max, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
                ->execute([
                    $productId,
                    $workshopId,
                    $categoryId,
                    $row['name'],
                    $row['description'] ?? null,
                    $row['instructions'] ?? null,
                    $row['notes'] ?? null,
                    $row['image_url'] ?? null,
                    (int)($row['stock_store'] ?? 0),
                    (int)($row['stock_warehouse'] ?? 0),
                    (int)($row['min_stock'] ?? 5),
                    $row['purchase_price_imported'] ?? null,
                    $row['purchase_price_local'] ?? 0,
                    $row['sale_price_min'] ?? 0,
                    $row['sale_price_max'] ?? 0,
                    to_int_bool($row['is_active'] ?? 1, 1),
                ]);
            $counts['products']++;

            $tagRows = rows_of($row['product_tags'] ?? []);
            foreach ($tagRows as $t) {
                $tagId = fk_exists($conn, 'tags', $t['tag_id'] ?? ($t['id'] ?? null));
                if (!$tagId) continue;
                $conn->prepare('INSERT IGNORE INTO product_tags (id, product_id, tag_id) VALUES (?, ?, ?)')
                    ->execute([make_uuid(), $productId, $tagId]);
                $counts['product_tags']++;
            }
        }

        // quotes + quote_items
        foreach (rows_of($tables['quotes'] ?? []) as $row) {
            if (!is_array($row) || empty($row['quote_number'])) continue;
            $quoteId = $row['id'] ?? make_uuid();
            $customerId = fk_exists($conn, 'customers', $row['customer_id'] ?? null);
            $createdBy = fk_exists($conn, 'app_users', $row['created_by'] ?? null);

            $conn->prepare('INSERT INTO quotes (id, workshop_id, quote_number, customer_id, customer_name, customer_phone, customer_email, customer_address, description, location, status, subtotal, discount, total, validity_days, valid_until, policies, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
                ->execute([
                    $quoteId,
                    $workshopId,
                    $row['quote_number'],
                    $customerId,
                    $row['customer_name'] ?? null,
                    $row['customer_phone'] ?? null,
                    $row['customer_email'] ?? null,
                    $row['customer_address'] ?? null,
                    $row['description'] ?? null,
                    $row['location'] ?? null,
                    $row['status'] ?? 'pending',
                    $row['subtotal'] ?? 0,
                    $row['discount'] ?? 0,
                    $row['total'] ?? 0,
                    (int)($row['validity_days'] ?? 15),
                    $row['valid_until'] ?? null,
                    $row['policies'] ?? null,
                    $row['notes'] ?? null,
                    $createdBy,
                ]);
            $counts['quotes']++;

            foreach (rows_of($row['quote_items'] ?? []) as $item) {
                $productId = fk_exists($conn, 'products', $item['product_id'] ?? null);
                $conn->prepare('INSERT INTO quote_items (id, quote_id, product_id, description, quantity, unit_price, subtotal, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
                    ->execute([
                        $item['id'] ?? make_uuid(),
                        $quoteId,
                        $productId,
                        $item['description'] ?? '',
                        (int)($item['quantity'] ?? 1),
                        $item['unit_price'] ?? 0,
                        $item['subtotal'] ?? 0,
                        (int)($item['sort_order'] ?? 0),
                    ]);
                $counts['quote_items']++;
            }
        }

        // sales + sale_items
        foreach (rows_of($tables['sales'] ?? []) as $row) {
            if (!is_array($row) || empty($row['sale_number'])) continue;
            $saleId = $row['id'] ?? make_uuid();
            $customerId = fk_exists($conn, 'customers', $row['customer_id'] ?? null);
            $createdBy = fk_exists($conn, 'app_users', $row['created_by'] ?? null);

            $conn->prepare('INSERT INTO sales (id, workshop_id, sale_number, customer_id, customer_name, subtotal, discount, total, payment_method, notes, has_warranty, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
                ->execute([
                    $saleId,
                    $workshopId,
                    $row['sale_number'],
                    $customerId,
                    $row['customer_name'] ?? null,
                    $row['subtotal'] ?? 0,
                    $row['discount'] ?? 0,
                    $row['total'] ?? 0,
                    $row['payment_method'] ?? 'cash',
                    $row['notes'] ?? null,
                    to_int_bool($row['has_warranty'] ?? 0),
                    $createdBy,
                ]);
            $counts['sales']++;

            foreach (rows_of($row['sale_items'] ?? []) as $item) {
                $productId = fk_exists($conn, 'products', $item['product_id'] ?? null);
                $conn->prepare('INSERT INTO sale_items (id, sale_id, product_id, product_name, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)')
                    ->execute([
                        $item['id'] ?? make_uuid(),
                        $saleId,
                        $productId,
                        $item['product_name'] ?? ($item['name'] ?? ''),
                        (int)($item['quantity'] ?? 1),
                        $item['unit_price'] ?? 0,
                        $item['subtotal'] ?? 0,
                    ]);
                $counts['sale_items']++;
            }
        }

        // services + service_products + service_images
        foreach (rows_of($tables['services'] ?? []) as $row) {
            if (!is_array($row) || empty($row['service_number']) || empty($row['description'])) continue;
            $serviceId = $row['id'] ?? make_uuid();
            $customerId = fk_exists($conn, 'customers', $row['customer_id'] ?? null);
            $quoteId = fk_exists($conn, 'quotes', $row['quote_id'] ?? null);
            $assignedTo = fk_exists($conn, 'app_users', $row['assigned_to'] ?? null);
            $createdBy = fk_exists($conn, 'app_users', $row['created_by'] ?? null);

            $customFields = $row['custom_fields'] ?? [];
            if (!is_array($customFields)) $customFields = [];

            $conn->prepare('INSERT INTO services (id, workshop_id, service_number, customer_id, quote_id, service_type, status, description, problem, location, address, estimated_price, final_price, labor_cost, discount, internal_notes, policies, custom_fields, assigned_to, created_by, started_at, completed_at, delivered_at, has_warranty, warranty_days) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
                ->execute([
                    $serviceId,
                    $workshopId,
                    $row['service_number'],
                    $customerId,
                    $quoteId,
                    $row['service_type'] ?? 'residential',
                    $row['status'] ?? 'pending',
                    $row['description'],
                    $row['problem'] ?? null,
                    $row['location'] ?? null,
                    $row['address'] ?? null,
                    $row['estimated_price'] ?? 0,
                    $row['final_price'] ?? null,
                    $row['labor_cost'] ?? 0,
                    $row['discount'] ?? 0,
                    $row['internal_notes'] ?? null,
                    $row['policies'] ?? null,
                    json_encode($customFields),
                    $assignedTo,
                    $createdBy,
                    norm_datetime($row['started_at'] ?? null),
                    norm_datetime($row['completed_at'] ?? null),
                    norm_datetime($row['delivered_at'] ?? null),
                    to_int_bool($row['has_warranty'] ?? 0),
                    $row['warranty_days'] ?? null,
                ]);
            $counts['services']++;

            foreach (rows_of($row['service_products'] ?? []) as $item) {
                $productId = fk_exists($conn, 'products', $item['product_id'] ?? null);
                $conn->prepare('INSERT INTO service_products (id, service_id, product_id, product_name, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)')
                    ->execute([
                        $item['id'] ?? make_uuid(),
                        $serviceId,
                        $productId,
                        $item['product_name'] ?? ($item['name'] ?? ''),
                        (int)($item['quantity'] ?? 1),
                        $item['unit_price'] ?? 0,
                        $item['subtotal'] ?? 0,
                    ]);
                $counts['service_products']++;
            }

            foreach (rows_of($row['service_images'] ?? []) as $img) {
                if (empty($img['image_url'])) continue;
                $conn->prepare('INSERT INTO service_images (id, service_id, image_url, description) VALUES (?, ?, ?, ?)')
                    ->execute([
                        $img['id'] ?? make_uuid(),
                        $serviceId,
                        $img['image_url'],
                        $img['description'] ?? null,
                    ]);
                $counts['service_images']++;
            }
        }

        // warranty settings bundle
        $warrantyBundle = $tables['warranty_settings_bundle'] ?? null;
        if (is_array($warrantyBundle)) {
            $wSettings = $warrantyBundle['warranty_settings'] ?? null;
            if (is_array($wSettings) && !array_is_list($wSettings)) {
                $conn->prepare('INSERT INTO warranty_settings (id, workshop_id, default_warranty_days, default_service_warranty_days, terms_conditions, coverage_policy_products, coverage_policy_services) VALUES (?, ?, ?, ?, ?, ?, ?)')
                    ->execute([
                        $wSettings['id'] ?? make_uuid(),
                        $workshopId,
                        (int)($wSettings['default_warranty_days'] ?? 30),
                        (int)($wSettings['default_service_warranty_days'] ?? 30),
                        $wSettings['terms_conditions'] ?? null,
                        $wSettings['coverage_policy_products'] ?? null,
                        $wSettings['coverage_policy_services'] ?? null,
                    ]);
                $counts['warranty_settings']++;
            }

            foreach (rows_of($warrantyBundle['warranty_category_settings'] ?? []) as $wcs) {
                $categoryId = fk_exists($conn, 'categories', $wcs['category_id'] ?? null);
                if (!$categoryId) continue;
                $conn->prepare('INSERT INTO warranty_category_settings (id, category_id, workshop_id, warranty_days) VALUES (?, ?, ?, ?)')
                    ->execute([
                        $wcs['id'] ?? make_uuid(),
                        $categoryId,
                        $workshopId,
                        (int)($wcs['warranty_days'] ?? 30),
                    ]);
                $counts['warranty_category_settings']++;
            }
        }

        // warranties
        foreach (rows_of($tables['warranties'] ?? []) as $row) {
            if (!is_array($row) || empty($row['warranty_code']) || empty($row['warranty_type'])) continue;
            $saleId = fk_exists($conn, 'sales', $row['sale_id'] ?? null);
            $serviceId = fk_exists($conn, 'services', $row['service_id'] ?? null);
            $customerId = fk_exists($conn, 'customers', $row['customer_id'] ?? null);
            $createdBy = fk_exists($conn, 'app_users', $row['created_by'] ?? null);

            $conn->prepare('INSERT INTO warranties (id, warranty_code, sale_id, service_id, customer_id, customer_name, product_name, service_description, warranty_type, warranty_days, start_date, end_date, notes, is_voided, voided_at, voided_reason, workshop_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
                ->execute([
                    $row['id'] ?? make_uuid(),
                    $row['warranty_code'],
                    $saleId,
                    $serviceId,
                    $customerId,
                    $row['customer_name'] ?? null,
                    $row['product_name'] ?? null,
                    $row['service_description'] ?? null,
                    $row['warranty_type'],
                    (int)($row['warranty_days'] ?? 30),
                    norm_datetime($row['start_date'] ?? null) ?? date('Y-m-d H:i:s'),
                    norm_datetime($row['end_date'] ?? null) ?? date('Y-m-d H:i:s'),
                    $row['notes'] ?? null,
                    to_int_bool($row['is_voided'] ?? 0),
                    norm_datetime($row['voided_at'] ?? null),
                    $row['voided_reason'] ?? null,
                    $workshopId,
                    $createdBy,
                ]);
            $counts['warranties']++;
        }

        // inventory movements
        foreach (rows_of($tables['inventory_movements'] ?? []) as $row) {
            if (!is_array($row) || empty($row['movement_type'])) continue;
            $productId = fk_exists($conn, 'products', $row['product_id'] ?? null);
            if (!$productId) continue;
            $createdBy = fk_exists($conn, 'app_users', $row['created_by'] ?? null);

            $conn->prepare('INSERT INTO inventory_movements (id, workshop_id, product_id, movement_type, from_location, to_location, quantity, reference_type, reference_id, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
                ->execute([
                    $row['id'] ?? make_uuid(),
                    $workshopId,
                    $productId,
                    $row['movement_type'],
                    $row['from_location'] ?? null,
                    $row['to_location'] ?? null,
                    (int)($row['quantity'] ?? 0),
                    $row['reference_type'] ?? null,
                    $row['reference_id'] ?? null,
                    $row['notes'] ?? null,
                    $createdBy,
                ]);
            $counts['inventory_movements']++;
        }

        // templates (solo no globales)
        foreach (rows_of($tables['templates'] ?? []) as $row) {
            if (!is_array($row) || empty($row['name']) || empty($row['template_type'])) continue;
            $isGlobal = to_int_bool($row['is_global'] ?? 0);
            if ($isGlobal === 1) continue;

            $conn->prepare('INSERT INTO templates (id, workshop_id, name, template_type, html_content, css_content, thumbnail_url, is_default, is_global) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)')
                ->execute([
                    $row['id'] ?? make_uuid(),
                    $workshopId,
                    $row['name'],
                    $row['template_type'],
                    $row['html_content'] ?? null,
                    $row['css_content'] ?? null,
                    $row['thumbnail_url'] ?? null,
                    to_int_bool($row['is_default'] ?? 0),
                ]);
            $counts['templates']++;
        }

        $conn->commit();
    } catch (Exception $e) {
        $conn->rollBack();
        throw $e;
    }

    Response::success([
        'restored_at' => date('c'),
        'workshop_id' => $workshopId,
        'counts' => $counts,
    ], 'Backup restaurado correctamente');
} catch (Exception $e) {
    Response::serverError($e->getMessage());
}
