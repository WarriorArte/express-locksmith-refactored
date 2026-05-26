<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            CoreSeeder::class,       // usuarios, talleres, roles, superadmin_access_settings
            SampleDataSeeder::class, // categorías, productos, clientes, cotizaciones, servicios, ventas, garantías
        ]);
    }
}
