<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Datos de demo con credenciales conocidas: solo entornos locales/pruebas.
        if (app()->environment('production')) {
            $this->command?->warn('DatabaseSeeder omitido: no se ejecuta en producción.');

            return;
        }

        $this->call([
            CoreSeeder::class,       // usuarios, talleres, roles, superadmin_access_settings
            SampleDataSeeder::class, // categorías, productos, clientes, cotizaciones, servicios, ventas, garantías
        ]);
    }
}
