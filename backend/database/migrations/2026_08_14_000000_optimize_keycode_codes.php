<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Optimiza keycode_codes para soportar series muy grandes (100k+ filas):
 *  - Elimina la columna `id` (8 bytes/fila + índice propio innecesario).
 *  - Clave primaria compuesta (profile_id, codigo) → búsqueda por código = seek directo.
 *  - Índice (profile_id, bitting) para búsquedas por patrón de bitting.
 *  - Quita índices redundantes (profile_id, codigo sueltos).
 */
return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('keycode_codes')) return;

        $this->dropForeignIfExists();

        // Deduplicar (profile_id, codigo) antes de crear la PK compuesta.
        if (Schema::hasColumn('keycode_codes', 'id')) {
            DB::statement("
                DELETE c FROM keycode_codes c
                JOIN (
                    SELECT profile_id, codigo, MIN(id) AS keep_id
                    FROM keycode_codes GROUP BY profile_id, codigo HAVING COUNT(*) > 1
                ) d ON d.profile_id = c.profile_id AND d.codigo = c.codigo
                WHERE c.id > d.keep_id
            ");

            DB::statement("ALTER TABLE keycode_codes MODIFY id BIGINT UNSIGNED NOT NULL");
            DB::statement("ALTER TABLE keycode_codes DROP PRIMARY KEY, DROP COLUMN id");
        }

        $this->dropIndexIfExists('keycode_codes_codigo_index');
        $this->dropIndexIfExists('keycode_codes_profile_id_index');

        DB::statement("ALTER TABLE keycode_codes MODIFY codigo VARCHAR(20) NOT NULL, MODIFY bitting VARCHAR(30) NOT NULL");

        if (!$this->hasIndex('keycode_codes_pk')) {
            DB::statement("ALTER TABLE keycode_codes ADD PRIMARY KEY (profile_id, codigo)");
        }

        if (!$this->hasIndex('keycode_codes_profile_bitting_index')) {
            DB::statement("CREATE INDEX keycode_codes_profile_bitting_index ON keycode_codes (profile_id, bitting)");
        }

        DB::statement("
            ALTER TABLE keycode_codes
            ADD CONSTRAINT keycode_codes_profile_id_foreign
            FOREIGN KEY (profile_id) REFERENCES keycode_profiles(id) ON DELETE CASCADE
        ");
    }

    public function down(): void
    {
        if (!Schema::hasTable('keycode_codes')) return;

        $this->dropForeignIfExists();
        $this->dropIndexIfExists('keycode_codes_profile_bitting_index');

        DB::statement("ALTER TABLE keycode_codes DROP PRIMARY KEY");
        DB::statement("ALTER TABLE keycode_codes ADD id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST");
        DB::statement("CREATE INDEX keycode_codes_profile_id_index ON keycode_codes (profile_id)");
        DB::statement("CREATE INDEX keycode_codes_codigo_index ON keycode_codes (codigo)");
        DB::statement("
            ALTER TABLE keycode_codes
            ADD CONSTRAINT keycode_codes_profile_id_foreign
            FOREIGN KEY (profile_id) REFERENCES keycode_profiles(id) ON DELETE CASCADE
        ");
    }

    private function dropForeignIfExists(): void
    {
        $exists = DB::selectOne("
            SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'keycode_codes'
              AND CONSTRAINT_TYPE = 'FOREIGN KEY'
        ");
        if ($exists) {
            DB::statement("ALTER TABLE keycode_codes DROP FOREIGN KEY `{$exists->CONSTRAINT_NAME}`");
        }
    }

    private function hasIndex(string $name): bool
    {
        if ($name === 'keycode_codes_pk') {
            return (bool) DB::selectOne("SHOW INDEX FROM keycode_codes WHERE Key_name = 'PRIMARY'");
        }
        return (bool) DB::selectOne("SHOW INDEX FROM keycode_codes WHERE Key_name = ?", [$name]);
    }

    private function dropIndexIfExists(string $name): void
    {
        if ($this->hasIndex($name)) {
            DB::statement("DROP INDEX `{$name}` ON keycode_codes");
        }
    }
};
