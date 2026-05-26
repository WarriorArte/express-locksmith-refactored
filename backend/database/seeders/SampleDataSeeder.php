<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SampleDataSeeder extends Seeder
{
    private const W1 = CoreSeeder::WS1_ID; // CERRAHEREGT
    private const W2 = CoreSeeder::WS2_ID; // ELECLOPEZ
    private const U1 = CoreSeeder::SUPERADMIN_ID;
    private const U2 = CoreSeeder::USER2_ID;
    private const U3 = CoreSeeder::USER3_ID;

    // Categorías
    private const CAT_W1_CERRADURAS  = '33333333-1111-0000-0000-000000000001';
    private const CAT_W1_LLAVES      = '33333333-1111-0000-0000-000000000002';
    private const CAT_W1_CANDADOS    = '33333333-1111-0000-0000-000000000003';
    private const CAT_W1_ACCESORIOS  = '33333333-1111-0000-0000-000000000004';
    private const CAT_W2_CERRADURAS  = '33333333-2222-0000-0000-000000000001';
    private const CAT_W2_LLAVES      = '33333333-2222-0000-0000-000000000002';
    private const CAT_W2_CANDADOS    = '33333333-2222-0000-0000-000000000003';
    private const CAT_W2_AUTOMOTRIZ  = '33333333-2222-0000-0000-000000000004';

    // Productos
    private const P_W1_1 = '55555555-1111-0000-0000-000000000001'; // Cerradura Phillips estándar
    private const P_W1_2 = '55555555-1111-0000-0000-000000000002'; // Cerradura seguridad alta
    private const P_W1_3 = '55555555-1111-0000-0000-000000000003'; // Llave bruta Yale
    private const P_W1_4 = '55555555-1111-0000-0000-000000000004'; // Candado 50mm
    private const P_W1_5 = '55555555-1111-0000-0000-000000000005'; // Bisagra hidráulica
    private const P_W2_1 = '55555555-2222-0000-0000-000000000001'; // Cerradura embutir bronce
    private const P_W2_2 = '55555555-2222-0000-0000-000000000002'; // Llave transponder
    private const P_W2_3 = '55555555-2222-0000-0000-000000000003'; // Candado disco 70mm
    private const P_W2_4 = '55555555-2222-0000-0000-000000000004'; // Servicio apertura auto (template)

    // Clientes
    private const C_W1_1 = '66666666-1111-0000-0000-000000000001'; // María González
    private const C_W1_2 = '66666666-1111-0000-0000-000000000002'; // Constructora ABC
    private const C_W1_3 = '66666666-1111-0000-0000-000000000003'; // Pedro Hernández
    private const C_W2_1 = '66666666-2222-0000-0000-000000000001'; // Ana Martínez
    private const C_W2_2 = '66666666-2222-0000-0000-000000000002'; // Negocios López SA
    private const C_W2_3 = '66666666-2222-0000-0000-000000000003'; // Luis Ramírez

    // Cotizaciones
    private const Q_W1_1 = '77777777-1111-0000-0000-000000000001';
    private const Q_W1_2 = '77777777-1111-0000-0000-000000000002';
    private const Q_W2_1 = '77777777-2222-0000-0000-000000000001';

    // Servicios
    private const SRV_W1_1 = '88888888-1111-0000-0000-000000000001';
    private const SRV_W1_2 = '88888888-1111-0000-0000-000000000002';
    private const SRV_W2_1 = '88888888-2222-0000-0000-000000000001';
    private const SRV_W2_2 = '88888888-2222-0000-0000-000000000002';

    // Ventas
    private const S_W1_1 = '99999999-1111-0000-0000-000000000001';
    private const S_W1_2 = '99999999-1111-0000-0000-000000000002';
    private const S_W2_1 = '99999999-2222-0000-0000-000000000001';

    public function run(): void
    {
        $now = now();

        $this->seedBusinessSettings($now);
        $this->seedWorkshopFeatures($now);
        $this->seedQuoteDocSettings($now);
        $this->seedCategories($now);
        $this->seedTags($now);
        $this->seedProducts($now);
        $this->seedCustomers($now);
        $this->seedQuotes($now);
        $this->seedServices($now);
        $this->seedSales($now);
        $this->seedInventoryMovements($now);
        $this->seedWarranties($now);
    }

    private function seedBusinessSettings($now): void
    {
        DB::table('business_settings')->insertOrIgnore([
            [
                'id'                 => '11111111-1111-1111-1111-000000000001',
                'workshop_id'        => self::W1,
                'name'               => 'Cerrajería EGT',
                'phone'              => '5512345678',
                'phone_country_code' => '+52',
                'country_code'       => 'MX',
                'address'            => 'Av. Reforma 123, CDMX',
                'email'              => 'contacto@egt.mx',
                'currency_symbol'    => '$',
                'printer_size'       => '80mm',
                'created_at'         => $now,
                'updated_at'         => $now,
            ],
            [
                'id'                 => '11111111-1111-1111-1111-000000000002',
                'workshop_id'        => self::W2,
                'name'               => 'Cerrajería López',
                'phone'              => '5587654321',
                'phone_country_code' => '+52',
                'country_code'       => 'MX',
                'address'            => 'Calle Juárez 45, GDL',
                'email'              => 'hola@lopez.mx',
                'currency_symbol'    => '$',
                'printer_size'       => '58mm',
                'created_at'         => $now,
                'updated_at'         => $now,
            ],
        ]);
    }

    private function seedWorkshopFeatures($now): void
    {
        $features = ['inventory', 'quotes', 'services', 'sales', 'warranties'];
        $rows = [];
        foreach ($features as $i => $key) {
            $rows[] = ['id' => '22222222-1111-0000-0000-' . str_pad($i + 1, 12, '0', STR_PAD_LEFT), 'workshop_id' => self::W1, 'feature_key' => $key, 'is_enabled' => 1, 'created_at' => $now];
            $rows[] = ['id' => '22222222-2222-0000-0000-' . str_pad($i + 1, 12, '0', STR_PAD_LEFT), 'workshop_id' => self::W2, 'feature_key' => $key, 'is_enabled' => 1, 'created_at' => $now];
        }
        DB::table('workshop_features')->insertOrIgnore($rows);
    }

    private function seedQuoteDocSettings($now): void
    {
        DB::table('quote_doc_settings')->insertOrIgnore([
            [
                'id'              => 'dddddd01-0000-0000-0000-000000000001',
                'workshop_id'     => self::W1,
                'layout'          => 'bold',
                'preset_id'       => 'navy-yellow',
                'ink'             => '#1a1f2e',
                'accent'          => '#f4c430',
                'paper'           => '#ffffff',
                'bg_opacity'      => 0.08,
                'bg_blend'        => 'multiply',
                'created_at'      => $now,
                'updated_at'      => $now,
            ],
            [
                'id'              => 'dddddd02-0000-0000-0000-000000000001',
                'workshop_id'     => self::W2,
                'layout'          => 'classic',
                'preset_id'       => 'forest-gold',
                'ink'             => '#1a2e1a',
                'accent'          => '#c8a84b',
                'paper'           => '#ffffff',
                'bg_opacity'      => 0.06,
                'bg_blend'        => 'multiply',
                'created_at'      => $now,
                'updated_at'      => $now,
            ],
        ]);
    }

    private function seedCategories($now): void
    {
        DB::table('categories')->insertOrIgnore([
            ['id' => self::CAT_W1_CERRADURAS, 'workshop_id' => self::W1, 'name' => 'Cerraduras EGT',   'color' => '#2563eb', 'created_at' => $now],
            ['id' => self::CAT_W1_LLAVES,     'workshop_id' => self::W1, 'name' => 'Llaves EGT',       'color' => '#16a34a', 'created_at' => $now],
            ['id' => self::CAT_W1_CANDADOS,   'workshop_id' => self::W1, 'name' => 'Candados EGT',     'color' => '#dc2626', 'created_at' => $now],
            ['id' => self::CAT_W1_ACCESORIOS, 'workshop_id' => self::W1, 'name' => 'Accesorios EGT',   'color' => '#f59e0b', 'created_at' => $now],
            ['id' => self::CAT_W2_CERRADURAS, 'workshop_id' => self::W2, 'name' => 'Cerraduras López', 'color' => '#2563eb', 'created_at' => $now],
            ['id' => self::CAT_W2_LLAVES,     'workshop_id' => self::W2, 'name' => 'Llaves López',     'color' => '#16a34a', 'created_at' => $now],
            ['id' => self::CAT_W2_CANDADOS,   'workshop_id' => self::W2, 'name' => 'Candados López',   'color' => '#dc2626', 'created_at' => $now],
            ['id' => self::CAT_W2_AUTOMOTRIZ, 'workshop_id' => self::W2, 'name' => 'Automotriz López', 'color' => '#7c3aed', 'created_at' => $now],
        ]);
    }

    private function seedTags($now): void
    {
        DB::table('tags')->insertOrIgnore([
            ['id' => '44444444-1111-0000-0000-000000000001', 'workshop_id' => self::W1, 'name' => 'Premium EGT',   'color' => '#facc15', 'created_at' => $now],
            ['id' => '44444444-1111-0000-0000-000000000002', 'workshop_id' => self::W1, 'name' => 'Oferta EGT',    'color' => '#ef4444', 'created_at' => $now],
            ['id' => '44444444-2222-0000-0000-000000000001', 'workshop_id' => self::W2, 'name' => 'Premium López', 'color' => '#facc15', 'created_at' => $now],
            ['id' => '44444444-2222-0000-0000-000000000002', 'workshop_id' => self::W2, 'name' => 'Nuevo López',   'color' => '#06b6d4', 'created_at' => $now],
        ]);
    }

    private function seedProducts($now): void
    {
        DB::table('products')->insertOrIgnore([
            // ── Taller 1 ──────────────────────────────────────────────────────
            [
                'id' => self::P_W1_1, 'workshop_id' => self::W1, 'item_type' => 'product',
                'category_id' => self::CAT_W1_CERRADURAS, 'name' => 'Cerradura Phillips estándar',
                'description' => 'Cerradura de pomo para puerta interior',
                'stock_store' => 12, 'stock_warehouse' => 30, 'min_stock' => 5,
                'purchase_price_local' => 180.00, 'sale_price_min' => 280.00, 'sale_price_max' => 350.00,
                'is_active' => 1, 'created_at' => $now, 'updated_at' => $now,
            ],
            [
                'id' => self::P_W1_2, 'workshop_id' => self::W1, 'item_type' => 'product',
                'category_id' => self::CAT_W1_CERRADURAS, 'name' => 'Cerradura de seguridad alta',
                'description' => 'Cerradura reforzada antibumping',
                'stock_store' => 5, 'stock_warehouse' => 15, 'min_stock' => 3,
                'purchase_price_local' => 650.00, 'sale_price_min' => 950.00, 'sale_price_max' => 1200.00,
                'is_active' => 1, 'created_at' => $now, 'updated_at' => $now,
            ],
            [
                'id' => self::P_W1_3, 'workshop_id' => self::W1, 'item_type' => 'product',
                'category_id' => self::CAT_W1_LLAVES, 'name' => 'Llave bruta tipo Yale',
                'description' => 'Llave virgen para duplicado',
                'stock_store' => 80, 'stock_warehouse' => 200, 'min_stock' => 20,
                'purchase_price_local' => 8.00, 'sale_price_min' => 25.00, 'sale_price_max' => 35.00,
                'is_active' => 1, 'created_at' => $now, 'updated_at' => $now,
            ],
            [
                'id' => self::P_W1_4, 'workshop_id' => self::W1, 'item_type' => 'product',
                'category_id' => self::CAT_W1_CANDADOS, 'name' => 'Candado 50mm acero',
                'description' => 'Candado de acero endurecido',
                'stock_store' => 18, 'stock_warehouse' => 40, 'min_stock' => 5,
                'purchase_price_local' => 95.00, 'sale_price_min' => 180.00, 'sale_price_max' => 220.00,
                'is_active' => 1, 'created_at' => $now, 'updated_at' => $now,
            ],
            [
                'id' => self::P_W1_5, 'workshop_id' => self::W1, 'item_type' => 'product',
                'category_id' => self::CAT_W1_ACCESORIOS, 'name' => 'Bisagra hidráulica',
                'description' => 'Bisagra para puertas comerciales',
                'stock_store' => 2, 'stock_warehouse' => 10, 'min_stock' => 4,
                'purchase_price_local' => 320.00, 'sale_price_min' => 480.00, 'sale_price_max' => 600.00,
                'is_active' => 1, 'created_at' => $now, 'updated_at' => $now,
            ],
            // ── Taller 2 ──────────────────────────────────────────────────────
            [
                'id' => self::P_W2_1, 'workshop_id' => self::W2, 'item_type' => 'product',
                'category_id' => self::CAT_W2_CERRADURAS, 'name' => 'Cerradura embutir bronce',
                'description' => 'Cerradura de embutir línea residencial',
                'stock_store' => 8, 'stock_warehouse' => 20, 'min_stock' => 3,
                'purchase_price_local' => 280.00, 'sale_price_min' => 450.00, 'sale_price_max' => 550.00,
                'is_active' => 1, 'created_at' => $now, 'updated_at' => $now,
            ],
            [
                'id' => self::P_W2_2, 'workshop_id' => self::W2, 'item_type' => 'product',
                'category_id' => self::CAT_W2_LLAVES, 'name' => 'Llave automotriz transponder',
                'description' => 'Llave con chip programable',
                'stock_store' => 4, 'stock_warehouse' => 12, 'min_stock' => 2,
                'purchase_price_local' => 450.00, 'sale_price_min' => 850.00, 'sale_price_max' => 1100.00,
                'is_active' => 1, 'created_at' => $now, 'updated_at' => $now,
            ],
            [
                'id' => self::P_W2_3, 'workshop_id' => self::W2, 'item_type' => 'product',
                'category_id' => self::CAT_W2_CANDADOS, 'name' => 'Candado disco 70mm',
                'description' => 'Candado tipo disco antirrobo',
                'stock_store' => 10, 'stock_warehouse' => 25, 'min_stock' => 5,
                'purchase_price_local' => 220.00, 'sale_price_min' => 380.00, 'sale_price_max' => 450.00,
                'is_active' => 1, 'created_at' => $now, 'updated_at' => $now,
            ],
            [
                // Plantilla de servicio
                'id' => self::P_W2_4, 'workshop_id' => self::W2, 'item_type' => 'service',
                'service_type' => 'automotive',
                'category_id' => self::CAT_W2_AUTOMOTRIZ, 'name' => 'Servicio apertura auto',
                'description' => 'Apertura sin daño de vehículo',
                'stock_store' => 0, 'stock_warehouse' => 0, 'min_stock' => 0,
                'sale_price_min' => 350.00, 'sale_price_max' => 600.00,
                'is_active' => 1, 'created_at' => $now, 'updated_at' => $now,
            ],
        ]);
    }

    private function seedCustomers($now): void
    {
        DB::table('customers')->insertOrIgnore([
            ['id' => self::C_W1_1, 'workshop_id' => self::W1, 'name' => 'María González',    'customer_type' => 'person',  'phone' => '5511112222', 'email' => 'maria@correo.com',   'address' => 'Col. Roma Norte, CDMX', 'is_vip' => 1, 'is_frequent' => 1, 'total_purchases' => 2350.00, 'total_services' => 3, 'created_at' => $now, 'updated_at' => $now],
            ['id' => self::C_W1_2, 'workshop_id' => self::W1, 'name' => 'Constructora ABC',  'customer_type' => 'company', 'phone' => '5544445555', 'email' => 'contacto@abc.mx',    'address' => 'Polanco, CDMX',         'is_vip' => 0, 'is_frequent' => 1, 'total_purchases' => 8900.00, 'total_services' => 5, 'created_at' => $now, 'updated_at' => $now],
            ['id' => self::C_W1_3, 'workshop_id' => self::W1, 'name' => 'Pedro Hernández',   'customer_type' => 'person',  'phone' => '5533334444', 'email' => 'pedro@correo.com',   'address' => 'Coyoacán, CDMX',        'is_vip' => 0, 'is_frequent' => 0, 'total_purchases' =>  450.00, 'total_services' => 1, 'created_at' => $now, 'updated_at' => $now],
            ['id' => self::C_W2_1, 'workshop_id' => self::W2, 'name' => 'Ana Martínez',      'customer_type' => 'person',  'phone' => '3322114455', 'email' => 'ana@correo.com',     'address' => 'Providencia, GDL',      'is_vip' => 1, 'is_frequent' => 1, 'total_purchases' => 3120.00, 'total_services' => 4, 'created_at' => $now, 'updated_at' => $now],
            ['id' => self::C_W2_2, 'workshop_id' => self::W2, 'name' => 'Negocios López SA', 'customer_type' => 'company', 'phone' => '3399887766', 'email' => 'admin@neglopez.mx',  'address' => 'Centro, GDL',           'is_vip' => 0, 'is_frequent' => 1, 'total_purchases' => 5400.00, 'total_services' => 2, 'created_at' => $now, 'updated_at' => $now],
            ['id' => self::C_W2_3, 'workshop_id' => self::W2, 'name' => 'Luis Ramírez',      'customer_type' => 'person',  'phone' => '3366554433', 'email' => 'luis@correo.com',    'address' => 'Tlaquepaque, JAL',      'is_vip' => 0, 'is_frequent' => 0, 'total_purchases' =>  850.00, 'total_services' => 1, 'created_at' => $now, 'updated_at' => $now],
        ]);
    }

    private function seedQuotes($now): void
    {
        $validUntil = now()->addDays(15)->toDateString();

        DB::table('quotes')->insertOrIgnore([
            [
                'id' => self::Q_W1_1, 'workshop_id' => self::W1, 'quote_number' => 'COT-EGT-001',
                'customer_id' => self::C_W1_2, 'customer_name' => 'Constructora ABC', 'customer_phone' => '5544445555',
                'description' => 'Cambio de cerraduras 5 oficinas',
                'status' => 'pending', 'subtotal' => 5750.00, 'discount' => 0.00, 'total' => 5750.00,
                'validity_days' => 15, 'valid_until' => $validUntil, 'created_by' => self::U1,
                'created_at' => $now, 'updated_at' => $now,
            ],
            [
                'id' => self::Q_W1_2, 'workshop_id' => self::W1, 'quote_number' => 'COT-EGT-002',
                'customer_id' => self::C_W1_1, 'customer_name' => 'María González', 'customer_phone' => '5511112222',
                'description' => 'Instalación cerradura seguridad alta',
                'status' => 'accepted', 'subtotal' => 1200.00, 'discount' => 100.00, 'total' => 1100.00,
                'validity_days' => 15, 'valid_until' => $validUntil, 'created_by' => self::U1,
                'created_at' => $now, 'updated_at' => $now,
            ],
            [
                'id' => self::Q_W2_1, 'workshop_id' => self::W2, 'quote_number' => 'COT-LOP-001',
                'customer_id' => self::C_W2_2, 'customer_name' => 'Negocios López SA', 'customer_phone' => '3399887766',
                'description' => 'Cambio combinaciones 3 candados disco',
                'status' => 'pending', 'subtotal' => 1140.00, 'discount' => 0.00, 'total' => 1140.00,
                'validity_days' => 15, 'valid_until' => $validUntil, 'created_by' => self::U2,
                'created_at' => $now, 'updated_at' => $now,
            ],
        ]);

        DB::table('quote_items')->insertOrIgnore([
            ['id' => '77777777-1111-0001-0000-000000000001', 'quote_id' => self::Q_W1_1, 'product_id' => self::P_W1_2, 'description' => 'Cerradura seguridad alta',  'quantity' => 5, 'unit_price' => 1150.00, 'subtotal' => 5750.00, 'sort_order' => 1, 'created_at' => $now],
            ['id' => '77777777-1111-0002-0000-000000000001', 'quote_id' => self::Q_W1_2, 'product_id' => self::P_W1_2, 'description' => 'Cerradura seguridad alta',  'quantity' => 1, 'unit_price' => 1200.00, 'subtotal' => 1200.00, 'sort_order' => 1, 'created_at' => $now],
            ['id' => '77777777-2222-0001-0000-000000000001', 'quote_id' => self::Q_W2_1, 'product_id' => self::P_W2_3, 'description' => 'Candado disco 70mm',         'quantity' => 3, 'unit_price' =>  380.00, 'subtotal' => 1140.00, 'sort_order' => 1, 'created_at' => $now],
        ]);
    }

    private function seedServices($now): void
    {
        DB::table('services')->insertOrIgnore([
            [
                'id' => self::SRV_W1_1, 'workshop_id' => self::W1, 'service_number' => 'SRV-EGT-001',
                'customer_id' => self::C_W1_1, 'service_type' => 'residential', 'status' => 'completed',
                'description' => 'Cambio de cerradura puerta principal',
                'problem' => 'Cerradura forzada', 'address' => 'Col. Roma Norte, CDMX',
                'estimated_price' => 1200.00, 'final_price' => 1200.00, 'labor_cost' => 250.00,
                'has_warranty' => 1, 'warranty_days' => 90,
                'assigned_to' => self::U1, 'created_by' => self::U1,
                'created_at' => $now, 'updated_at' => $now,
            ],
            [
                'id' => self::SRV_W1_2, 'workshop_id' => self::W1, 'service_number' => 'SRV-EGT-002',
                'customer_id' => self::C_W1_3, 'service_type' => 'residential', 'status' => 'in_progress',
                'description' => 'Apertura puerta sin llave',
                'problem' => 'Cliente perdió llaves', 'address' => 'Coyoacán, CDMX',
                'estimated_price' => 450.00, 'final_price' => null, 'labor_cost' => 200.00,
                'has_warranty' => 0, 'warranty_days' => null,
                'assigned_to' => self::U1, 'created_by' => self::U1,
                'created_at' => $now, 'updated_at' => $now,
            ],
            [
                'id' => self::SRV_W2_1, 'workshop_id' => self::W2, 'service_number' => 'SRV-LOP-001',
                'customer_id' => self::C_W2_1, 'service_type' => 'automotive', 'status' => 'delivered',
                'description' => 'Apertura vehículo y duplicado de llave',
                'problem' => 'Llave dentro del auto', 'address' => 'Providencia, GDL',
                'estimated_price' => 850.00, 'final_price' => 850.00, 'labor_cost' => 300.00,
                'has_warranty' => 1, 'warranty_days' => 30,
                'assigned_to' => self::U2, 'created_by' => self::U2,
                'created_at' => $now, 'updated_at' => $now,
            ],
            [
                'id' => self::SRV_W2_2, 'workshop_id' => self::W2, 'service_number' => 'SRV-LOP-002',
                'customer_id' => self::C_W2_3, 'service_type' => 'commercial', 'status' => 'pending',
                'description' => 'Instalación 2 candados disco bodega',
                'problem' => 'Reforzar seguridad bodega', 'address' => 'Tlaquepaque, JAL',
                'estimated_price' => 850.00, 'final_price' => null, 'labor_cost' => 150.00,
                'has_warranty' => 0, 'warranty_days' => null,
                'assigned_to' => self::U3, 'created_by' => self::U2,
                'created_at' => $now, 'updated_at' => $now,
            ],
        ]);

        DB::table('service_products')->insertOrIgnore([
            ['id' => '88888888-1111-0001-0000-000000000001', 'service_id' => self::SRV_W1_1, 'product_id' => self::P_W1_2, 'product_name' => 'Cerradura seguridad alta',    'quantity' => 1, 'unit_price' => 950.00,  'subtotal' => 950.00,  'created_at' => $now],
            ['id' => '88888888-2222-0001-0000-000000000001', 'service_id' => self::SRV_W2_1, 'product_id' => self::P_W2_2, 'product_name' => 'Llave automotriz transponder', 'quantity' => 1, 'unit_price' => 550.00,  'subtotal' => 550.00,  'created_at' => $now],
            ['id' => '88888888-2222-0002-0000-000000000001', 'service_id' => self::SRV_W2_2, 'product_id' => self::P_W2_3, 'product_name' => 'Candado disco 70mm',           'quantity' => 2, 'unit_price' => 380.00,  'subtotal' => 760.00,  'created_at' => $now],
        ]);

        DB::table('service_images')->insertOrIgnore([
            ['id' => '88888888-1111-1mg1-0000-000000000001', 'service_id' => self::SRV_W1_1, 'image_url' => '/uploads/sample/cerradura-antes.jpg',   'description' => 'Antes del cambio',      'created_at' => $now],
            ['id' => '88888888-1111-1mg2-0000-000000000001', 'service_id' => self::SRV_W1_1, 'image_url' => '/uploads/sample/cerradura-despues.jpg', 'description' => 'Cerradura instalada',   'created_at' => $now],
        ]);
    }

    private function seedSales($now): void
    {
        DB::table('sales')->insertOrIgnore([
            ['id' => self::S_W1_1, 'workshop_id' => self::W1, 'sale_number' => 'VTA-EGT-001', 'customer_id' => self::C_W1_1, 'customer_name' => 'María González',    'subtotal' =>  480.00, 'discount' =>  0.00, 'total' =>  480.00, 'payment_method' => 'cash',     'has_warranty' => 0, 'created_by' => self::U1, 'created_at' => $now],
            ['id' => self::S_W1_2, 'workshop_id' => self::W1, 'sale_number' => 'VTA-EGT-002', 'customer_id' => null,          'customer_name' => 'Cliente mostrador', 'subtotal' =>  250.00, 'discount' =>  0.00, 'total' =>  250.00, 'payment_method' => 'card',     'has_warranty' => 0, 'created_by' => self::U1, 'created_at' => $now],
            ['id' => self::S_W2_1, 'workshop_id' => self::W2, 'sale_number' => 'VTA-LOP-001', 'customer_id' => self::C_W2_2, 'customer_name' => 'Negocios López SA', 'subtotal' => 1140.00, 'discount' => 50.00, 'total' => 1090.00, 'payment_method' => 'transfer', 'has_warranty' => 1, 'created_by' => self::U2, 'created_at' => $now],
        ]);

        DB::table('sale_items')->insertOrIgnore([
            ['id' => '99999999-1111-0001-0000-000000000001', 'sale_id' => self::S_W1_1, 'product_id' => self::P_W1_4, 'product_name' => 'Candado 50mm acero',     'quantity' => 2, 'unit_price' => 180.00, 'subtotal' =>  360.00, 'created_at' => $now],
            ['id' => '99999999-1111-0001-0000-000000000002', 'sale_id' => self::S_W1_1, 'product_id' => self::P_W1_3, 'product_name' => 'Llave bruta tipo Yale',  'quantity' => 4, 'unit_price' =>  30.00, 'subtotal' =>  120.00, 'created_at' => $now],
            ['id' => '99999999-1111-0002-0000-000000000001', 'sale_id' => self::S_W1_2, 'product_id' => self::P_W1_1, 'product_name' => 'Cerradura Phillips',     'quantity' => 1, 'unit_price' => 250.00, 'subtotal' =>  250.00, 'created_at' => $now],
            ['id' => '99999999-2222-0001-0000-000000000001', 'sale_id' => self::S_W2_1, 'product_id' => self::P_W2_3, 'product_name' => 'Candado disco 70mm',     'quantity' => 3, 'unit_price' => 380.00, 'subtotal' => 1140.00, 'created_at' => $now],
        ]);
    }

    private function seedInventoryMovements($now): void
    {
        DB::table('inventory_movements')->insertOrIgnore([
            ['id' => 'aaaaaaaa-1111-0000-0000-000000000001', 'workshop_id' => self::W1, 'product_id' => self::P_W1_1, 'movement_type' => 'entry',    'from_location' => null,        'to_location' => 'warehouse', 'quantity' => 30, 'reference_type' => 'purchase', 'reference_id' => null,         'notes' => 'Compra inicial proveedor', 'created_by' => self::U1, 'created_at' => $now],
            ['id' => 'aaaaaaaa-1111-0000-0000-000000000002', 'workshop_id' => self::W1, 'product_id' => self::P_W1_1, 'movement_type' => 'transfer', 'from_location' => 'warehouse', 'to_location' => 'store',     'quantity' => 12, 'reference_type' => 'transfer', 'reference_id' => null,         'notes' => 'Reposición tienda',       'created_by' => self::U1, 'created_at' => $now],
            ['id' => 'aaaaaaaa-1111-0000-0000-000000000003', 'workshop_id' => self::W1, 'product_id' => self::P_W1_4, 'movement_type' => 'exit',     'from_location' => 'store',     'to_location' => null,        'quantity' =>  2, 'reference_type' => 'sale',     'reference_id' => self::S_W1_1, 'notes' => 'Venta VTA-EGT-001',      'created_by' => self::U1, 'created_at' => $now],
            ['id' => 'aaaaaaaa-2222-0000-0000-000000000001', 'workshop_id' => self::W2, 'product_id' => self::P_W2_3, 'movement_type' => 'entry',    'from_location' => null,        'to_location' => 'warehouse', 'quantity' => 25, 'reference_type' => 'purchase', 'reference_id' => null,         'notes' => 'Compra inicial proveedor', 'created_by' => self::U2, 'created_at' => $now],
            ['id' => 'aaaaaaaa-2222-0000-0000-000000000002', 'workshop_id' => self::W2, 'product_id' => self::P_W2_3, 'movement_type' => 'exit',     'from_location' => 'store',     'to_location' => null,        'quantity' =>  3, 'reference_type' => 'sale',     'reference_id' => self::S_W2_1, 'notes' => 'Venta VTA-LOP-001',      'created_by' => self::U2, 'created_at' => $now],
        ]);
    }

    private function seedWarranties($now): void
    {
        DB::table('warranty_settings')->insertOrIgnore([
            ['id' => 'bbbbbbbb-1111-0000-0000-000000000001', 'workshop_id' => self::W1, 'default_warranty_days' => 30, 'default_service_warranty_days' => 90, 'terms_conditions' => 'Garantía válida con presentación de ticket original.', 'coverage_policy_products' => 'Cubre defectos de fabricación.',      'coverage_policy_services' => 'Cubre la instalación realizada.',    'created_at' => $now, 'updated_at' => $now],
            ['id' => 'bbbbbbbb-2222-0000-0000-000000000001', 'workshop_id' => self::W2, 'default_warranty_days' => 30, 'default_service_warranty_days' => 30, 'terms_conditions' => 'Garantía válida con presentación de ticket original.', 'coverage_policy_products' => 'No cubre mal uso ni desgaste normal.', 'coverage_policy_services' => 'Cubre mano de obra del servicio.', 'created_at' => $now, 'updated_at' => $now],
        ]);

        DB::table('warranties')->insertOrIgnore([
            [
                'id' => 'cccccccc-1111-0000-0000-000000000001', 'warranty_code' => 'WAR-EGT-0001',
                'sale_id' => null, 'service_id' => self::SRV_W1_1,
                'customer_id' => self::C_W1_1, 'customer_name' => 'María González',
                'product_name' => null, 'service_description' => 'Cambio de cerradura puerta principal',
                'warranty_type' => 'service', 'warranty_days' => 90,
                'start_date' => $now, 'end_date' => now()->addDays(90),
                'workshop_id' => self::W1, 'created_by' => self::U1,
                'created_at' => $now, 'updated_at' => $now,
            ],
            [
                'id' => 'cccccccc-2222-0000-0000-000000000001', 'warranty_code' => 'WAR-LOP-0001',
                'sale_id' => self::S_W2_1, 'service_id' => null,
                'customer_id' => self::C_W2_2, 'customer_name' => 'Negocios López SA',
                'product_name' => 'Candado disco 70mm', 'service_description' => null,
                'warranty_type' => 'sale', 'warranty_days' => 30,
                'start_date' => $now, 'end_date' => now()->addDays(30),
                'workshop_id' => self::W2, 'created_by' => self::U2,
                'created_at' => $now, 'updated_at' => $now,
            ],
            [
                'id' => 'cccccccc-2222-0000-0000-000000000002', 'warranty_code' => 'WAR-LOP-0002',
                'sale_id' => null, 'service_id' => self::SRV_W2_1,
                'customer_id' => self::C_W2_1, 'customer_name' => 'Ana Martínez',
                'product_name' => null, 'service_description' => 'Apertura vehículo y duplicado',
                'warranty_type' => 'service', 'warranty_days' => 30,
                'start_date' => $now, 'end_date' => now()->addDays(30),
                'workshop_id' => self::W2, 'created_by' => self::U2,
                'created_at' => $now, 'updated_at' => $now,
            ],
        ]);
    }
}
