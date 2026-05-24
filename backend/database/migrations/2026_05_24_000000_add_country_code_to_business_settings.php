<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('business_settings', function (Blueprint $table): void {
            if (!Schema::hasColumn('business_settings', 'country_code')) {
                $table->string('country_code', 2)->nullable()->after('phone_country_code');
            }
        });

        // Mapa (prefijo => ISO) usado para inferir country_code de registros existentes.
        $dialToIso = [
            '+52' => 'MX', '+1' => 'US', '+502' => 'GT', '+503' => 'SV', '+504' => 'HN',
            '+505' => 'NI', '+506' => 'CR', '+507' => 'PA', '+53' => 'CU', '+57' => 'CO',
            '+58' => 'VE', '+593' => 'EC', '+51' => 'PE', '+591' => 'BO', '+56' => 'CL',
            '+54' => 'AR', '+595' => 'PY', '+598' => 'UY', '+55' => 'BR', '+592' => 'GY',
            '+34' => 'ES', '+351' => 'PT', '+33' => 'FR', '+49' => 'DE', '+39' => 'IT',
            '+44' => 'GB', '+81' => 'JP', '+86' => 'CN', '+91' => 'IN', '+61' => 'AU',
        ];

        $rows = DB::table('business_settings')
            ->whereNull('country_code')
            ->get(['id', 'phone_country_code']);

        foreach ($rows as $row) {
            $iso = $dialToIso[(string) $row->phone_country_code] ?? 'MX';
            DB::table('business_settings')->where('id', $row->id)->update(['country_code' => $iso]);
        }
    }

    public function down(): void
    {
        Schema::table('business_settings', function (Blueprint $table): void {
            if (Schema::hasColumn('business_settings', 'country_code')) {
                $table->dropColumn('country_code');
            }
        });
    }
};
