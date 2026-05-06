<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $schemaPath = dirname(__DIR__, 3).DIRECTORY_SEPARATOR.'php'.DIRECTORY_SEPARATOR.'schema'.DIRECTORY_SEPARATOR.'schema.sql';

        if (!is_file($schemaPath)) {
            throw new RuntimeException("Legacy schema not found at {$schemaPath}");
        }

        $sql = file_get_contents($schemaPath);

        if ($sql === false) {
            throw new RuntimeException("Could not read legacy schema at {$schemaPath}");
        }

        $sql = preg_replace('/^\xEF\xBB\xBF/', '', $sql);
        $sql = preg_replace('/CREATE\s+DATABASE\s+IF\s+NOT\s+EXISTS\s+.*?;/is', '', $sql);
        $sql = preg_replace('/USE\s+[`"]?[a-zA-Z0-9_]+[`"]?\s*;/i', '', $sql);
        $sql = preg_replace('/SET\s+NAMES\s+.*?;/i', '', $sql);
        $sql = preg_replace('/SET\s+time_zone\s+=\s+.*?;/i', '', $sql);

        DB::unprepared($sql);
    }

    public function down(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0');

        foreach ([
            'auth_tokens',
            'warranties',
            'warranty_settings',
            'warranty_category_settings',
            'workshop_template_selections',
            'templates',
            'inventory_movements',
            'sale_items',
            'sales',
            'service_images',
            'service_products',
            'services',
            'quote_items',
            'quotes',
            'customer_tags',
            'customers',
            'product_tags',
            'products',
            'tags',
            'categories',
            'appadmin_settings',
            'business_settings',
            'workshop_features',
            'user_roles',
            'global_user_roles',
            'profiles',
            'workshops',
            'app_users',
        ] as $table) {
            DB::statement("DROP TABLE IF EXISTS {$table}");
        }

        DB::statement('SET FOREIGN_KEY_CHECKS=1');
    }
};
