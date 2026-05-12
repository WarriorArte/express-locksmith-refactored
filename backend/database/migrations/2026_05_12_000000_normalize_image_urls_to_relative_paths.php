<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const COLUMNS = [
        ['table' => 'products',           'column' => 'image_url', 'pk' => 'id'],
        ['table' => 'service_images',     'column' => 'image_url', 'pk' => 'id'],
        ['table' => 'business_settings',  'column' => 'logo_url',  'pk' => 'workshop_id'],
        ['table' => 'profiles',           'column' => 'avatar_url','pk' => 'id'],
    ];

    public function up(): void
    {
        foreach (self::COLUMNS as ['table' => $table, 'column' => $column, 'pk' => $pk]) {
            DB::table($table)
                ->whereNotNull($column)
                ->where($column, 'like', 'http%/uploads/%')
                ->orderBy($pk)
                ->chunk(200, function ($rows) use ($table, $column, $pk) {
                    foreach ($rows as $row) {
                        $url = $row->$column;
                        if (preg_match('#(/uploads/.+)$#', $url, $matches)) {
                            DB::table($table)
                                ->where($pk, $row->$pk)
                                ->update([$column => $matches[1]]);
                        }
                    }
                });
        }
    }

    public function down(): void
    {
        // Reversión no posible sin conocer el host original
    }
};
