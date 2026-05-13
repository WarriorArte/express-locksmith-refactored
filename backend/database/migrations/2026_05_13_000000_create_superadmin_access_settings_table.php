<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('superadmin_access_settings', function (Blueprint $table): void {
            $table->char('id', 36)->primary();
            $table->string('workshop_code', 100);
            $table->string('email', 191);
            $table->string('password_hash', 255);
            $table->string('login_path', 120)->default('/auth_su');
            $table->unsignedTinyInteger('singleton_guard')->default(1);
            $table->timestamps();

            $table->unique('email', 'uq_superadmin_access_email');
            $table->unique('login_path', 'uq_superadmin_access_login_path');
            $table->unique('singleton_guard', 'uq_superadmin_access_singleton');
        });

        $superadmin = DB::table('global_user_roles as gur')
            ->join('app_users as au', 'au.id', '=', 'gur.user_id')
            ->leftJoin('profiles as p', 'p.user_id', '=', 'au.id')
            ->where('gur.role', 'superadmin')
            ->first([
                'au.email',
                'au.password_hash',
                'p.locksmith_id',
            ]);

        DB::table('superadmin_access_settings')->insert([
            'id' => (string) Str::uuid(),
            'workshop_code' => strtoupper((string) ($superadmin->locksmith_id ?? 'ADMINWARRIOR')),
            'email' => strtolower((string) ($superadmin->email ?? 'superadmin@example.com')),
            'password_hash' => (string) ($superadmin->password_hash ?? password_hash(Str::random(32), PASSWORD_BCRYPT)),
            'login_path' => '/auth_su',
            'singleton_guard' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('superadmin_access_settings');
    }
};
