<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('keycode_codes', function (Blueprint $t): void {
            $t->bigIncrements('id');
            $t->uuid('profile_id')->index();
            $t->string('codigo', 20)->index();
            $t->string('bitting', 30);
        });

        // Extrae codesData del JSON de cada perfil existente → keycode_codes
        DB::table('keycode_profiles')->orderBy('id')->each(function ($profile): void {
            $data  = json_decode($profile->data, true) ?? [];
            $codes = $data['codesData'] ?? [];
            if (empty($codes)) return;

            $rows = [];
            foreach ($codes as $c) {
                $bitting = is_array($c['bitting']) ? implode('', $c['bitting']) : ($c['bitting'] ?? '');
                $rows[]  = ['profile_id' => $profile->id, 'codigo' => $c['codigo'] ?? '', 'bitting' => $bitting];
                if (count($rows) >= 500) {
                    DB::table('keycode_codes')->insert($rows);
                    $rows = [];
                }
            }
            if (!empty($rows)) DB::table('keycode_codes')->insert($rows);

            unset($data['codesData']);
            DB::table('keycode_profiles')
                ->where('id', $profile->id)
                ->update(['data' => json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);
        });
    }

    public function down(): void
    {
        // Restaura codesData desde keycode_codes → keycode_profiles.data antes de borrar la tabla
        DB::table('keycode_profiles')->orderBy('id')->each(function ($profile): void {
            $codes = DB::table('keycode_codes')
                ->where('profile_id', $profile->id)
                ->orderBy('codigo')
                ->get(['codigo', 'bitting'])
                ->map(fn($r) => ['codigo' => $r->codigo, 'bitting' => str_split($r->bitting)])
                ->all();

            if (empty($codes)) return;
            $data              = json_decode($profile->data, true) ?? [];
            $data['codesData'] = $codes;
            DB::table('keycode_profiles')
                ->where('id', $profile->id)
                ->update(['data' => json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);
        });

        Schema::dropIfExists('keycode_codes');
    }
};
