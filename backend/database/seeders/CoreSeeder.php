<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CoreSeeder extends Seeder
{
    // IDs fijos para reproducibilidad
    public const SUPERADMIN_ID = '00000001-0000-0000-0000-000000000001';
    public const USER2_ID      = '00000002-0000-0000-0000-000000000001';
    public const USER3_ID      = '00000003-0000-0000-0000-000000000001';
    public const WS1_ID        = '00000100-0000-0000-0000-000000000001'; // CERRAHEREGT
    public const WS2_ID        = '00000200-0000-0000-0000-000000000001'; // ELECLOPEZ

    public function run(): void
    {
        $now = now();

        // ── Usuarios ──────────────────────────────────────────────────────────
        DB::table('app_users')->insertOrIgnore([
            [
                'id'            => self::SUPERADMIN_ID,
                'email'         => 'josuedsajquim@gmail.com',
                'password_hash' => password_hash('admin123', PASSWORD_BCRYPT),
                'is_active'     => 1,
                'created_at'    => $now,
                'updated_at'    => $now,
            ],
            [
                'id'            => self::USER2_ID,
                'email'         => 'lopez@correo.com',
                'password_hash' => password_hash('admin123', PASSWORD_BCRYPT),
                'is_active'     => 1,
                'created_at'    => $now,
                'updated_at'    => $now,
            ],
            [
                'id'            => self::USER3_ID,
                'email'         => 'lolo@correo.com',
                'password_hash' => password_hash('lolo1234', PASSWORD_BCRYPT),
                'is_active'     => 1,
                'created_at'    => $now,
                'updated_at'    => $now,
            ],
        ]);

        // ── Talleres ──────────────────────────────────────────────────────────
        DB::table('workshops')->insertOrIgnore([
            [
                'id'         => self::WS1_ID,
                'code'       => 'CERRAHEREGT',
                'name'       => 'Cerrajería EGT',
                'is_active'  => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'id'         => self::WS2_ID,
                'code'       => 'ELECLOPEZ',
                'name'       => 'Cerrajería López',
                'is_active'  => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);

        // ── Perfiles ──────────────────────────────────────────────────────────
        DB::table('profiles')->insertOrIgnore([
            [
                'id'                  => '00000001-0000-0000-0001-000000000001',
                'user_id'             => self::SUPERADMIN_ID,
                'full_name'           => 'Josué Admin',
                'email'               => 'josuedsajquim@gmail.com',
                'locksmith_id'        => 'CERRAHEREGT',
                'current_workshop_id' => self::WS1_ID,
                'created_at'          => $now,
                'updated_at'          => $now,
            ],
            [
                'id'                  => '00000002-0000-0000-0001-000000000001',
                'user_id'             => self::USER2_ID,
                'full_name'           => 'López Admin',
                'email'               => 'lopez@correo.com',
                'locksmith_id'        => 'ELECLOPEZ',
                'current_workshop_id' => self::WS2_ID,
                'created_at'          => $now,
                'updated_at'          => $now,
            ],
            [
                'id'                  => '00000003-0000-0000-0001-000000000001',
                'user_id'             => self::USER3_ID,
                'full_name'           => 'Lolo Empleado',
                'email'               => 'lolo@correo.com',
                'locksmith_id'        => null,
                'current_workshop_id' => self::WS2_ID,
                'created_at'          => $now,
                'updated_at'          => $now,
            ],
        ]);

        // ── Roles globales ────────────────────────────────────────────────────
        DB::table('global_user_roles')->insertOrIgnore([
            ['id' => '00000001-0000-0000-0002-000000000001', 'user_id' => self::SUPERADMIN_ID, 'role' => 'superadmin', 'created_at' => $now],
            ['id' => '00000002-0000-0000-0002-000000000001', 'user_id' => self::USER2_ID,      'role' => 'user',       'created_at' => $now],
            ['id' => '00000003-0000-0000-0002-000000000001', 'user_id' => self::USER3_ID,      'role' => 'user',       'created_at' => $now],
        ]);

        // ── Roles por taller ──────────────────────────────────────────────────
        DB::table('user_roles')->insertOrIgnore([
            ['id' => '00000001-0000-0000-0003-000000000001', 'user_id' => self::SUPERADMIN_ID, 'workshop_id' => self::WS1_ID, 'role' => 'admin',    'created_at' => $now],
            ['id' => '00000002-0000-0000-0003-000000000001', 'user_id' => self::USER2_ID,      'workshop_id' => self::WS2_ID, 'role' => 'admin',    'created_at' => $now],
            ['id' => '00000003-0000-0000-0003-000000000001', 'user_id' => self::USER3_ID,      'workshop_id' => self::WS2_ID, 'role' => 'employee', 'created_at' => $now],
        ]);

        // ── Superadmin access settings ────────────────────────────────────────
        DB::table('superadmin_access_settings')->insertOrIgnore([
            [
                'id'              => '00000001-0000-0000-0004-000000000001',
                'workshop_code'   => 'CERRAHEREGT',
                'email'           => 'josuedsajquim@gmail.com',
                'password_hash'   => password_hash('admin123', PASSWORD_BCRYPT),
                'login_path'      => '/auth_su',
                'singleton_guard' => 1,
                'created_at'      => $now,
                'updated_at'      => $now,
            ],
        ]);

        // ── App admin settings (singleton) ────────────────────────────────────
        DB::table('appadmin_settings')->insertOrIgnore([
            [
                'id'                        => '00000001-0000-0000-0005-000000000001',
                'storage_endpoint'          => null,
                'storage_api_key_encrypted' => null,
                'singleton_guard'           => 1,
                'created_at'                => $now,
                'updated_at'                => $now,
            ],
        ]);
    }
}
