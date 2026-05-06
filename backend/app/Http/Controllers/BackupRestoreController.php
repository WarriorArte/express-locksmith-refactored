<?php

namespace App\Http\Controllers;

use App\Support\ApiResponse;
use App\Support\LegacyAuth;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class BackupRestoreController
{
    public function handle(Request $request): JsonResponse
    {
        $authUser = $request->attributes->get('legacy_user');
        $data = $request->json()->all();
        $workshopId = $request->query('workshop_id', $data['workshop_id'] ?? null);

        if (!LegacyAuth::canAdminWorkshop($authUser['user_id'], $workshopId)) {
            return ApiResponse::error($workshopId ? 'Se requiere rol de administrador en este taller' : 'workshop_id es requerido', $workshopId ? 401 : 400);
        }

        $backup = $data['backup'] ?? null;
        if (!is_array($backup)) {
            return ApiResponse::error('El campo backup es requerido y debe ser un objeto JSON');
        }

        $backupWorkshopId = $backup['workshop_id'] ?? null;
        if (!empty($backupWorkshopId) && $backupWorkshopId !== $workshopId) {
            return ApiResponse::error('El backup pertenece a otro taller');
        }

        $tables = $backup['tables'] ?? null;
        if (!is_array($tables)) {
            return ApiResponse::error('El backup no contiene tables');
        }

        $counts = $this->emptyCounts();

        DB::transaction(function () use ($workshopId, $tables, &$counts): void {
            $this->clearWorkshop($workshopId);
            $this->restoreBusinessSettings($workshopId, $tables, $counts);
            $this->restoreCategories($workshopId, $tables, $counts);
            $this->restoreTags($workshopId, $tables, $counts);
            $this->restoreCustomers($workshopId, $tables, $counts);
            $this->restoreProducts($workshopId, $tables, $counts);
            $this->restoreQuotes($workshopId, $tables, $counts);
            $this->restoreSales($workshopId, $tables, $counts);
            $this->restoreServices($workshopId, $tables, $counts);
            $this->restoreWarrantySettings($workshopId, $tables, $counts);
            $this->restoreWarranties($workshopId, $tables, $counts);
            $this->restoreInventoryMovements($workshopId, $tables, $counts);
            $this->restoreTemplates($workshopId, $tables, $counts);
        });

        return ApiResponse::success([
            'restored_at' => now()->toIso8601String(),
            'workshop_id' => $workshopId,
            'counts' => $counts,
        ], 'Backup restaurado correctamente');
    }

    private function emptyCounts(): array
    {
        return [
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
    }

    private function clearWorkshop(string $workshopId): void
    {
        DB::delete('DELETE si FROM service_images si JOIN services s ON s.id = si.service_id WHERE s.workshop_id = ?', [$workshopId]);
        DB::delete('DELETE sp FROM service_products sp JOIN services s ON s.id = sp.service_id WHERE s.workshop_id = ?', [$workshopId]);
        DB::delete('DELETE sai FROM sale_items sai JOIN sales sa ON sa.id = sai.sale_id WHERE sa.workshop_id = ?', [$workshopId]);
        DB::delete('DELETE qi FROM quote_items qi JOIN quotes q ON q.id = qi.quote_id WHERE q.workshop_id = ?', [$workshopId]);
        DB::delete('DELETE pt FROM product_tags pt JOIN products p ON p.id = pt.product_id WHERE p.workshop_id = ?', [$workshopId]);

        foreach ([
            'inventory_movements',
            'warranties',
            'services',
            'sales',
            'quotes',
            'products',
            'customers',
            'warranty_category_settings',
            'warranty_settings',
            'workshop_template_selections',
            'tags',
            'categories',
            'business_settings',
        ] as $table) {
            DB::table($table)->where('workshop_id', $workshopId)->delete();
        }

        DB::table('templates')->where('workshop_id', $workshopId)->where('is_global', 0)->delete();
    }

    private function restoreBusinessSettings(string $workshopId, array $tables, array &$counts): void
    {
        $row = $tables['business_settings'] ?? null;
        if (!is_array($row) || array_is_list($row)) return;

        DB::table('business_settings')->insert([
            'id' => $row['id'] ?? $this->uuid(),
            'workshop_id' => $workshopId,
            'name' => $row['name'] ?? 'Mi Cerrajeria',
            'phone' => $row['phone'] ?? null,
            'phone_country_code' => $row['phone_country_code'] ?? '+52',
            'address' => $row['address'] ?? null,
            'email' => $row['email'] ?? null,
            'website' => $row['website'] ?? null,
            'logo_url' => $row['logo_url'] ?? null,
            'facebook' => $row['facebook'] ?? null,
            'instagram' => $row['instagram'] ?? null,
            'whatsapp' => $row['whatsapp'] ?? null,
            'printer_size' => $row['printer_size'] ?? '80mm',
            'printer_model' => $row['printer_model'] ?? 'generic',
            'currency_symbol' => $row['currency_symbol'] ?? '$',
            'print_logo' => $this->boolInt($row['print_logo'] ?? 1, 1),
            'auto_cut' => $this->boolInt($row['auto_cut'] ?? 1, 1),
            'storage_endpoint' => $row['storage_endpoint'] ?? null,
            'storage_secret_key' => $row['storage_secret_key'] ?? null,
        ]);
        $counts['business_settings']++;
    }

    private function restoreCategories(string $workshopId, array $tables, array &$counts): void
    {
        foreach ($this->rows($tables['categories'] ?? []) as $row) {
            if (empty($row['name'])) continue;
            DB::table('categories')->insert([
                'id' => $row['id'] ?? $this->uuid(),
                'workshop_id' => $workshopId,
                'name' => $row['name'],
                'color' => $row['color'] ?? '#2563eb',
            ]);
            $counts['categories']++;
        }
    }

    private function restoreTags(string $workshopId, array $tables, array &$counts): void
    {
        foreach ($this->rows($tables['tags'] ?? []) as $row) {
            if (empty($row['name'])) continue;
            DB::table('tags')->insert([
                'id' => $row['id'] ?? $this->uuid(),
                'workshop_id' => $workshopId,
                'name' => $row['name'],
                'color' => $row['color'] ?? '#6366f1',
            ]);
            $counts['tags']++;
        }
    }

    private function restoreCustomers(string $workshopId, array $tables, array &$counts): void
    {
        foreach ($this->rows($tables['customers'] ?? []) as $row) {
            if (empty($row['name'])) continue;
            DB::table('customers')->insert([
                'id' => $row['id'] ?? $this->uuid(),
                'workshop_id' => $workshopId,
                'name' => $row['name'],
                'customer_type' => $row['customer_type'] ?? 'person',
                'phone' => $row['phone'] ?? null,
                'phone_secondary' => $row['phone_secondary'] ?? null,
                'email' => $row['email'] ?? null,
                'address' => $row['address'] ?? null,
                'notes' => $row['notes'] ?? null,
                'is_vip' => $this->boolInt($row['is_vip'] ?? 0),
                'is_frequent' => $this->boolInt($row['is_frequent'] ?? 0),
                'is_normal' => $this->boolInt($row['is_normal'] ?? 0),
                'has_debt' => $this->boolInt($row['has_debt'] ?? 0),
                'no_work_again' => $this->boolInt($row['no_work_again'] ?? 0),
                'no_work_reason' => $row['no_work_reason'] ?? null,
                'total_purchases' => $row['total_purchases'] ?? 0,
                'total_services' => $row['total_services'] ?? 0,
            ]);
            $counts['customers']++;
        }
    }

    private function restoreProducts(string $workshopId, array $tables, array &$counts): void
    {
        foreach ($this->rows($tables['products'] ?? []) as $row) {
            if (empty($row['name'])) continue;
            $productId = $row['id'] ?? $this->uuid();

            DB::table('products')->insert([
                'id' => $productId,
                'workshop_id' => $workshopId,
                'category_id' => $this->fk('categories', $row['category_id'] ?? null),
                'name' => $row['name'],
                'description' => $row['description'] ?? null,
                'instructions' => $row['instructions'] ?? null,
                'notes' => $row['notes'] ?? null,
                'image_url' => $row['image_url'] ?? null,
                'stock_store' => (int) ($row['stock_store'] ?? 0),
                'stock_warehouse' => (int) ($row['stock_warehouse'] ?? 0),
                'min_stock' => (int) ($row['min_stock'] ?? 5),
                'purchase_price_imported' => $row['purchase_price_imported'] ?? null,
                'purchase_price_local' => $row['purchase_price_local'] ?? 0,
                'sale_price_min' => $row['sale_price_min'] ?? 0,
                'sale_price_max' => $row['sale_price_max'] ?? 0,
                'is_active' => $this->boolInt($row['is_active'] ?? 1, 1),
            ]);
            $counts['products']++;

            foreach ($this->rows($row['product_tags'] ?? []) as $tagRow) {
                $tagId = $this->fk('tags', $tagRow['tag_id'] ?? ($tagRow['id'] ?? null));
                if (!$tagId) continue;
                DB::table('product_tags')->insertOrIgnore([
                    'id' => $this->uuid(),
                    'product_id' => $productId,
                    'tag_id' => $tagId,
                ]);
                $counts['product_tags']++;
            }
        }
    }

    private function restoreQuotes(string $workshopId, array $tables, array &$counts): void
    {
        foreach ($this->rows($tables['quotes'] ?? []) as $row) {
            if (empty($row['quote_number'])) continue;
            $quoteId = $row['id'] ?? $this->uuid();
            DB::table('quotes')->insert([
                'id' => $quoteId,
                'workshop_id' => $workshopId,
                'quote_number' => $row['quote_number'],
                'customer_id' => $this->fk('customers', $row['customer_id'] ?? null),
                'customer_name' => $row['customer_name'] ?? null,
                'customer_phone' => $row['customer_phone'] ?? null,
                'customer_email' => $row['customer_email'] ?? null,
                'customer_address' => $row['customer_address'] ?? null,
                'description' => $row['description'] ?? null,
                'location' => $row['location'] ?? null,
                'status' => $row['status'] ?? 'pending',
                'subtotal' => $row['subtotal'] ?? 0,
                'discount' => $row['discount'] ?? 0,
                'total' => $row['total'] ?? 0,
                'validity_days' => (int) ($row['validity_days'] ?? 15),
                'valid_until' => $row['valid_until'] ?? null,
                'policies' => $row['policies'] ?? null,
                'notes' => $row['notes'] ?? null,
                'created_by' => $this->fk('app_users', $row['created_by'] ?? null),
            ]);
            $counts['quotes']++;

            foreach ($this->rows($row['quote_items'] ?? []) as $index => $item) {
                DB::table('quote_items')->insert([
                    'id' => $item['id'] ?? $this->uuid(),
                    'quote_id' => $quoteId,
                    'product_id' => $this->fk('products', $item['product_id'] ?? null),
                    'description' => $item['description'] ?? '',
                    'quantity' => (int) ($item['quantity'] ?? 1),
                    'unit_price' => $item['unit_price'] ?? 0,
                    'subtotal' => $item['subtotal'] ?? 0,
                    'sort_order' => (int) ($item['sort_order'] ?? $index),
                ]);
                $counts['quote_items']++;
            }
        }
    }

    private function restoreSales(string $workshopId, array $tables, array &$counts): void
    {
        foreach ($this->rows($tables['sales'] ?? []) as $row) {
            if (empty($row['sale_number'])) continue;
            $saleId = $row['id'] ?? $this->uuid();
            DB::table('sales')->insert([
                'id' => $saleId,
                'workshop_id' => $workshopId,
                'sale_number' => $row['sale_number'],
                'customer_id' => $this->fk('customers', $row['customer_id'] ?? null),
                'customer_name' => $row['customer_name'] ?? null,
                'subtotal' => $row['subtotal'] ?? 0,
                'discount' => $row['discount'] ?? 0,
                'total' => $row['total'] ?? 0,
                'payment_method' => $row['payment_method'] ?? 'cash',
                'notes' => $row['notes'] ?? null,
                'has_warranty' => $this->boolInt($row['has_warranty'] ?? 0),
                'created_by' => $this->fk('app_users', $row['created_by'] ?? null),
            ]);
            $counts['sales']++;

            foreach ($this->rows($row['sale_items'] ?? []) as $item) {
                DB::table('sale_items')->insert([
                    'id' => $item['id'] ?? $this->uuid(),
                    'sale_id' => $saleId,
                    'product_id' => $this->fk('products', $item['product_id'] ?? null),
                    'product_name' => $item['product_name'] ?? ($item['name'] ?? ''),
                    'quantity' => (int) ($item['quantity'] ?? 1),
                    'unit_price' => $item['unit_price'] ?? 0,
                    'subtotal' => $item['subtotal'] ?? 0,
                ]);
                $counts['sale_items']++;
            }
        }
    }

    private function restoreServices(string $workshopId, array $tables, array &$counts): void
    {
        foreach ($this->rows($tables['services'] ?? []) as $row) {
            if (empty($row['service_number']) || empty($row['description'])) continue;
            $serviceId = $row['id'] ?? $this->uuid();
            DB::table('services')->insert([
                'id' => $serviceId,
                'workshop_id' => $workshopId,
                'service_number' => $row['service_number'],
                'customer_id' => $this->fk('customers', $row['customer_id'] ?? null),
                'quote_id' => $this->fk('quotes', $row['quote_id'] ?? null),
                'service_type' => $row['service_type'] ?? 'residential',
                'status' => $row['status'] ?? 'pending',
                'description' => $row['description'],
                'problem' => $row['problem'] ?? null,
                'location' => $row['location'] ?? null,
                'address' => $row['address'] ?? null,
                'estimated_price' => $row['estimated_price'] ?? 0,
                'final_price' => $row['final_price'] ?? null,
                'labor_cost' => $row['labor_cost'] ?? 0,
                'discount' => $row['discount'] ?? 0,
                'internal_notes' => $row['internal_notes'] ?? null,
                'policies' => $row['policies'] ?? null,
                'custom_fields' => json_encode(is_array($row['custom_fields'] ?? null) ? $row['custom_fields'] : []),
                'assigned_to' => $this->fk('app_users', $row['assigned_to'] ?? null),
                'created_by' => $this->fk('app_users', $row['created_by'] ?? null),
                'started_at' => $this->dateTime($row['started_at'] ?? null),
                'completed_at' => $this->dateTime($row['completed_at'] ?? null),
                'delivered_at' => $this->dateTime($row['delivered_at'] ?? null),
                'has_warranty' => $this->boolInt($row['has_warranty'] ?? 0),
                'warranty_days' => $row['warranty_days'] ?? null,
            ]);
            $counts['services']++;

            foreach ($this->rows($row['service_products'] ?? []) as $item) {
                DB::table('service_products')->insert([
                    'id' => $item['id'] ?? $this->uuid(),
                    'service_id' => $serviceId,
                    'product_id' => $this->fk('products', $item['product_id'] ?? null),
                    'product_name' => $item['product_name'] ?? ($item['name'] ?? ''),
                    'quantity' => (int) ($item['quantity'] ?? 1),
                    'unit_price' => $item['unit_price'] ?? 0,
                    'subtotal' => $item['subtotal'] ?? 0,
                ]);
                $counts['service_products']++;
            }

            foreach ($this->rows($row['service_images'] ?? []) as $image) {
                if (empty($image['image_url'])) continue;
                DB::table('service_images')->insert([
                    'id' => $image['id'] ?? $this->uuid(),
                    'service_id' => $serviceId,
                    'image_url' => $image['image_url'],
                    'description' => $image['description'] ?? null,
                ]);
                $counts['service_images']++;
            }
        }
    }

    private function restoreWarrantySettings(string $workshopId, array $tables, array &$counts): void
    {
        $bundle = $tables['warranty_settings_bundle'] ?? null;
        if (!is_array($bundle)) return;

        $settings = $bundle['warranty_settings'] ?? null;
        if (is_array($settings) && !array_is_list($settings)) {
            DB::table('warranty_settings')->insert([
                'id' => $settings['id'] ?? $this->uuid(),
                'workshop_id' => $workshopId,
                'default_warranty_days' => (int) ($settings['default_warranty_days'] ?? 30),
                'default_service_warranty_days' => (int) ($settings['default_service_warranty_days'] ?? 30),
                'terms_conditions' => $settings['terms_conditions'] ?? null,
                'coverage_policy_products' => $settings['coverage_policy_products'] ?? null,
                'coverage_policy_services' => $settings['coverage_policy_services'] ?? null,
            ]);
            $counts['warranty_settings']++;
        }

        foreach ($this->rows($bundle['warranty_category_settings'] ?? []) as $row) {
            $categoryId = $this->fk('categories', $row['category_id'] ?? null);
            if (!$categoryId) continue;
            DB::table('warranty_category_settings')->insert([
                'id' => $row['id'] ?? $this->uuid(),
                'category_id' => $categoryId,
                'workshop_id' => $workshopId,
                'warranty_days' => (int) ($row['warranty_days'] ?? 30),
            ]);
            $counts['warranty_category_settings']++;
        }
    }

    private function restoreWarranties(string $workshopId, array $tables, array &$counts): void
    {
        foreach ($this->rows($tables['warranties'] ?? []) as $row) {
            if (empty($row['warranty_code']) || empty($row['warranty_type'])) continue;
            DB::table('warranties')->insert([
                'id' => $row['id'] ?? $this->uuid(),
                'warranty_code' => $row['warranty_code'],
                'sale_id' => $this->fk('sales', $row['sale_id'] ?? null),
                'service_id' => $this->fk('services', $row['service_id'] ?? null),
                'customer_id' => $this->fk('customers', $row['customer_id'] ?? null),
                'customer_name' => $row['customer_name'] ?? null,
                'product_name' => $row['product_name'] ?? null,
                'service_description' => $row['service_description'] ?? null,
                'warranty_type' => $row['warranty_type'],
                'warranty_days' => (int) ($row['warranty_days'] ?? 30),
                'start_date' => $this->dateTime($row['start_date'] ?? null) ?? now()->format('Y-m-d H:i:s'),
                'end_date' => $this->dateTime($row['end_date'] ?? null) ?? now()->format('Y-m-d H:i:s'),
                'notes' => $row['notes'] ?? null,
                'is_voided' => $this->boolInt($row['is_voided'] ?? 0),
                'voided_at' => $this->dateTime($row['voided_at'] ?? null),
                'voided_reason' => $row['voided_reason'] ?? null,
                'workshop_id' => $workshopId,
                'created_by' => $this->fk('app_users', $row['created_by'] ?? null),
            ]);
            $counts['warranties']++;
        }
    }

    private function restoreInventoryMovements(string $workshopId, array $tables, array &$counts): void
    {
        foreach ($this->rows($tables['inventory_movements'] ?? []) as $row) {
            if (empty($row['movement_type'])) continue;
            $productId = $this->fk('products', $row['product_id'] ?? null);
            if (!$productId) continue;
            DB::table('inventory_movements')->insert([
                'id' => $row['id'] ?? $this->uuid(),
                'workshop_id' => $workshopId,
                'product_id' => $productId,
                'movement_type' => $row['movement_type'],
                'from_location' => $row['from_location'] ?? null,
                'to_location' => $row['to_location'] ?? null,
                'quantity' => (int) ($row['quantity'] ?? 0),
                'reference_type' => $row['reference_type'] ?? null,
                'reference_id' => $row['reference_id'] ?? null,
                'notes' => $row['notes'] ?? null,
                'created_by' => $this->fk('app_users', $row['created_by'] ?? null),
            ]);
            $counts['inventory_movements']++;
        }
    }

    private function restoreTemplates(string $workshopId, array $tables, array &$counts): void
    {
        foreach ($this->rows($tables['templates'] ?? []) as $row) {
            if (empty($row['name']) || empty($row['template_type'])) continue;
            if ($this->boolInt($row['is_global'] ?? 0) === 1) continue;
            DB::table('templates')->insert([
                'id' => $row['id'] ?? $this->uuid(),
                'workshop_id' => $workshopId,
                'name' => $row['name'],
                'template_type' => $row['template_type'],
                'html_content' => $row['html_content'] ?? null,
                'css_content' => $row['css_content'] ?? null,
                'thumbnail_url' => $row['thumbnail_url'] ?? null,
                'is_default' => $this->boolInt($row['is_default'] ?? 0),
                'is_global' => 0,
            ]);
            $counts['templates']++;
        }
    }

    private function rows(mixed $value): array
    {
        return is_array($value) && array_is_list($value) ? $value : [];
    }

    private function boolInt(mixed $value, int $fallback = 0): int
    {
        if ($value === null) return $fallback;
        if (is_bool($value)) return $value ? 1 : 0;
        if (is_numeric($value)) return (int) ((int) $value !== 0);
        if (is_string($value)) {
            $normalized = strtolower(trim($value));
            if (in_array($normalized, ['true', 'yes', 'on'], true)) return 1;
            if (in_array($normalized, ['false', 'no', 'off'], true)) return 0;
        }
        return $fallback;
    }

    private function fk(string $table, ?string $id): ?string
    {
        if (!$id) return null;
        return DB::table($table)->where('id', $id)->exists() ? $id : null;
    }

    private function dateTime(?string $value): ?string
    {
        if (!$value) return null;
        $value = trim($value);
        return $value === '' ? null : str_replace('T', ' ', $value);
    }

    private function uuid(): string
    {
        return (string) Str::uuid();
    }
}
