<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (config('database.default') === 'sqlite') {
            $this->createSqliteSchema();
        } else {
            $this->createMysqlSchemaFromSql();
            $this->addPerformanceIndexes();
        }

        $this->createPersonalAccessTokens();
    }

    public function down(): void
    {
        if (config('database.default') !== 'sqlite') {
            DB::statement('SET FOREIGN_KEY_CHECKS=0');
        }

        foreach ([
            'personal_access_tokens',
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
            Schema::dropIfExists($table);
        }

        if (config('database.default') !== 'sqlite') {
            DB::statement('SET FOREIGN_KEY_CHECKS=1');
        }
    }

    private function createMysqlSchemaFromSql(): void
    {
        $schemaPath = dirname(__DIR__).DIRECTORY_SEPARATOR.'legacy'.DIRECTORY_SEPARATOR.'schema.sql';

        if (!is_file($schemaPath)) {
            throw new RuntimeException("Application schema not found at {$schemaPath}");
        }

        $sql = file_get_contents($schemaPath);

        if ($sql === false) {
            throw new RuntimeException("Could not read application schema at {$schemaPath}");
        }

        $sql = preg_replace('/^\xEF\xBB\xBF/', '', $sql);
        $sql = preg_replace('/CREATE\s+DATABASE\s+IF\s+NOT\s+EXISTS\s+.*?;/is', '', $sql);
        $sql = preg_replace('/USE\s+[`"]?[a-zA-Z0-9_]+[`"]?\s*;/i', '', $sql);
        $sql = preg_replace('/SET\s+NAMES\s+.*?;/i', '', $sql);
        $sql = preg_replace('/SET\s+time_zone\s+=\s+.*?;/i', '', $sql);

        DB::unprepared($sql);
    }

    private function createPersonalAccessTokens(): void
    {
        if (Schema::hasTable('personal_access_tokens')) {
            return;
        }

        Schema::create('personal_access_tokens', function (Blueprint $table): void {
            $table->id();
            $table->string('tokenable_type', 100);
            $table->char('tokenable_id', 36);
            $table->index(['tokenable_type', 'tokenable_id']);
            $table->text('name');
            $table->string('token', 64)->unique();
            $table->text('abilities')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable()->index();
            $table->timestamps();
        });
    }

    private function addPerformanceIndexes(): void
    {
        $indexes = [
            'products' => [
                'products_workshop_active_created_idx' => ['workshop_id', 'is_active', 'created_at'],
                'products_low_stock_idx' => ['workshop_id', 'is_active', 'stock_store', 'stock_warehouse', 'min_stock'],
            ],
            'customers' => [
                'customers_workshop_created_idx' => ['workshop_id', 'created_at'],
                'customers_name_idx' => ['workshop_id', 'name'],
            ],
            'quotes' => [
                'quotes_workshop_created_idx' => ['workshop_id', 'created_at'],
                'quotes_workshop_status_idx' => ['workshop_id', 'status'],
                'quotes_valid_until_idx' => ['workshop_id', 'status', 'valid_until'],
            ],
            'quote_items' => [
                'quote_items_quote_idx' => ['quote_id', 'sort_order'],
            ],
            'sales' => [
                'sales_workshop_created_idx' => ['workshop_id', 'created_at'],
            ],
            'sale_items' => [
                'sale_items_sale_idx' => ['sale_id'],
            ],
            'services' => [
                'services_workshop_created_idx' => ['workshop_id', 'created_at'],
                'services_workshop_status_idx' => ['workshop_id', 'status'],
            ],
            'service_products' => [
                'sp_service_idx' => ['service_id'],
            ],
            'service_images' => [
                'si_service_idx' => ['service_id', 'created_at'],
            ],
            'warranties' => [
                'warranties_workshop_created_idx' => ['workshop_id', 'created_at'],
            ],
            'inventory_movements' => [
                'im_workshop_created_idx' => ['workshop_id', 'created_at'],
                'im_product_idx' => ['product_id', 'created_at'],
            ],
            'user_roles' => [
                'ur_user_workshop_role_idx' => ['user_id', 'workshop_id', 'role'],
            ],
        ];

        foreach ($indexes as $table => $tableIndexes) {
            foreach ($tableIndexes as $name => $columns) {
                $this->addIndexIfMissing($table, $name, $columns);
            }
        }
    }

    private function addIndexIfMissing(string $table, string $name, array $columns): void
    {
        if (!Schema::hasTable($table) || $this->indexExists($table, $name)) {
            return;
        }

        Schema::table($table, function (Blueprint $blueprint) use ($columns, $name): void {
            $blueprint->index($columns, $name);
        });
    }

    private function indexExists(string $table, string $name): bool
    {
        return DB::table('information_schema.statistics')
            ->where('table_schema', DB::raw('DATABASE()'))
            ->where('table_name', $table)
            ->where('index_name', $name)
            ->exists();
    }

    private function createSqliteSchema(): void
    {
        Schema::create('app_users', function (Blueprint $table): void {
            $table->char('id', 36)->primary();
            $table->string('email')->unique();
            $table->string('password_hash');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('workshops', function (Blueprint $table): void {
            $table->char('id', 36)->primary();
            $table->string('code')->unique();
            $table->string('name');
            $table->boolean('is_active')->default(true);
            $table->json('settings')->nullable();
            $table->timestamps();
        });

        Schema::create('profiles', function (Blueprint $table): void {
            $table->char('id', 36)->primary();
            $table->char('user_id', 36)->unique();
            $table->string('full_name')->nullable();
            $table->string('email')->nullable();
            $table->text('avatar_url')->nullable();
            $table->string('locksmith_id')->nullable();
            $table->char('current_workshop_id', 36)->nullable();
            $table->timestamps();
        });

        Schema::create('global_user_roles', function (Blueprint $table): void {
            $table->char('id', 36)->primary();
            $table->char('user_id', 36)->unique();
            $table->string('role')->default('user');
            $table->timestamps();
        });

        Schema::create('user_roles', function (Blueprint $table): void {
            $table->char('id', 36)->primary();
            $table->char('user_id', 36)->index();
            $table->char('workshop_id', 36)->index();
            $table->string('role')->default('employee');
            $table->unique(['user_id', 'workshop_id']);
            $table->timestamps();
        });

        Schema::create('categories', function (Blueprint $table): void {
            $table->char('id', 36)->primary();
            $table->char('workshop_id', 36)->nullable()->index();
            $table->string('name');
            $table->string('color')->nullable();
            $table->timestamps();
        });

        Schema::create('tags', function (Blueprint $table): void {
            $table->char('id', 36)->primary();
            $table->char('workshop_id', 36)->nullable()->index();
            $table->string('name');
            $table->string('color')->nullable();
            $table->timestamps();
        });

        Schema::create('products', function (Blueprint $table): void {
            $table->char('id', 36)->primary();
            $table->char('workshop_id', 36)->nullable()->index();
            $table->char('category_id', 36)->nullable()->index();
            $table->string('name');
            $table->text('description')->nullable();
            $table->text('instructions')->nullable();
            $table->text('notes')->nullable();
            $table->text('image_url')->nullable();
            $table->integer('stock_store')->default(0);
            $table->integer('stock_warehouse')->default(0);
            $table->integer('min_stock')->default(5);
            $table->decimal('purchase_price_imported', 12, 2)->nullable();
            $table->decimal('purchase_price_local', 12, 2)->default(0);
            $table->decimal('sale_price_min', 12, 2)->default(0);
            $table->decimal('sale_price_max', 12, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('product_tags', function (Blueprint $table): void {
            $table->char('id', 36)->primary();
            $table->char('product_id', 36)->index();
            $table->char('tag_id', 36)->index();
        });

        Schema::create('customers', function (Blueprint $table): void {
            $table->char('id', 36)->primary();
            $table->char('workshop_id', 36)->nullable()->index();
            $table->string('name');
            $table->string('customer_type')->default('person');
            $table->string('phone')->nullable();
            $table->string('phone_secondary')->nullable();
            $table->string('email')->nullable();
            $table->text('address')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('is_vip')->default(false);
            $table->boolean('is_frequent')->default(false);
            $table->boolean('is_normal')->default(false);
            $table->boolean('has_debt')->default(false);
            $table->boolean('no_work_again')->default(false);
            $table->text('no_work_reason')->nullable();
            $table->decimal('total_purchases', 12, 2)->default(0);
            $table->integer('total_services')->default(0);
            $table->timestamps();
        });

        Schema::create('customer_tags', function (Blueprint $table): void {
            $table->char('id', 36)->primary();
            $table->char('customer_id', 36)->index();
            $table->char('tag_id', 36)->index();
        });

        Schema::create('quotes', function (Blueprint $table): void {
            $table->char('id', 36)->primary();
            $table->char('workshop_id', 36)->nullable()->index();
            $table->string('quote_number');
            $table->char('customer_id', 36)->nullable()->index();
            $table->string('customer_name')->nullable();
            $table->string('customer_phone')->nullable();
            $table->string('customer_email')->nullable();
            $table->text('customer_address')->nullable();
            $table->text('description')->nullable();
            $table->text('location')->nullable();
            $table->string('status')->default('pending');
            $table->decimal('subtotal', 12, 2)->default(0);
            $table->decimal('discount', 12, 2)->default(0);
            $table->decimal('total', 12, 2)->default(0);
            $table->integer('validity_days')->default(15);
            $table->date('valid_until')->nullable();
            $table->text('policies')->nullable();
            $table->text('notes')->nullable();
            $table->char('created_by', 36)->nullable();
            $table->timestamps();
            $table->unique(['workshop_id', 'quote_number']);
        });

        Schema::create('quote_items', function (Blueprint $table): void {
            $table->char('id', 36)->primary();
            $table->char('quote_id', 36)->index();
            $table->char('product_id', 36)->nullable()->index();
            $table->text('description');
            $table->integer('quantity')->default(1);
            $table->decimal('unit_price', 10, 2)->default(0);
            $table->decimal('subtotal', 10, 2)->default(0);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('sales', function (Blueprint $table): void {
            $table->char('id', 36)->primary();
            $table->char('workshop_id', 36)->nullable()->index();
            $table->string('sale_number');
            $table->char('customer_id', 36)->nullable()->index();
            $table->string('customer_name')->nullable();
            $table->decimal('subtotal', 12, 2)->default(0);
            $table->decimal('discount', 10, 2)->default(0);
            $table->decimal('total', 12, 2)->default(0);
            $table->string('payment_method')->default('cash');
            $table->text('notes')->nullable();
            $table->boolean('has_warranty')->default(false);
            $table->char('created_by', 36)->nullable();
            $table->timestamps();
            $table->unique(['workshop_id', 'sale_number']);
        });

        Schema::create('sale_items', function (Blueprint $table): void {
            $table->char('id', 36)->primary();
            $table->char('sale_id', 36)->index();
            $table->char('product_id', 36)->nullable()->index();
            $table->string('product_name');
            $table->integer('quantity')->default(1);
            $table->decimal('unit_price', 10, 2)->default(0);
            $table->decimal('subtotal', 10, 2)->default(0);
            $table->timestamps();
        });
    }
};
