<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Throwable;

final class InstallController
{
    private const LOCK_FILE = 'installed.lock';

    public function handle(Request $request): Response
    {
        $lockPath = storage_path('app/'.self::LOCK_FILE);
        $allowReinstall = $request->query('reinstall') === '1';

        if (is_file($lockPath) && !$allowReinstall) {
            return $this->page('Instalador Laravel', $this->installedHtml((string) file_get_contents($lockPath)));
        }

        if ($request->isMethod('GET')) {
            return $this->page('Instalador Laravel', $this->formHtml($this->defaults(), [], $allowReinstall));
        }

        $data = [
            'admin_name' => trim((string) $request->input('admin_name', '')),
            'admin_email' => strtolower(trim((string) $request->input('admin_email', ''))),
            'admin_code' => trim((string) $request->input('admin_code', '')),
            'admin_password' => (string) $request->input('admin_password', ''),
            'admin_confirm' => (string) $request->input('admin_confirm', ''),
            'seed_demo' => $request->boolean('seed_demo'),
        ];

        $errors = $this->validateForm($data);

        if ($errors !== []) {
            return $this->page('Instalador Laravel', $this->formHtml($data, $errors, $allowReinstall), 422);
        }

        try {
            $this->assertDatabaseConnection();

            Artisan::call('migrate', [
                '--force' => true,
            ]);

            $admin = $this->createOrUpdateSuperadmin($data);
            $seedStatus = $data['seed_demo'] ? $this->seedDemoData() : 'Datos demo omitidos';

            if (!is_dir(dirname($lockPath))) {
                mkdir(dirname($lockPath), 0775, true);
            }

            file_put_contents($lockPath, now()->format('Y-m-d H:i:s'));

            return $this->page('Instalacion completa', $this->successHtml($data, $admin, $seedStatus, Artisan::output()));
        } catch (Throwable $e) {
            $errors[] = $e->getMessage();

            return $this->page('Instalador Laravel', $this->formHtml($data, $errors, $allowReinstall), 500);
        }
    }

    private function validateForm(array $data): array
    {
        $errors = [];

        if ($data['admin_name'] === '') {
            $errors[] = 'El nombre del superadmin es requerido.';
        }

        if (!filter_var($data['admin_email'], FILTER_VALIDATE_EMAIL)) {
            $errors[] = 'El email del superadmin no es valido.';
        }

        if (strlen($data['admin_password']) < 8) {
            $errors[] = 'La contrasena debe tener al menos 8 caracteres.';
        }

        if ($data['admin_password'] !== $data['admin_confirm']) {
            $errors[] = 'Las contrasenas no coinciden.';
        }

        return $errors;
    }

    private function assertDatabaseConnection(): void
    {
        DB::connection()->getPdo();
    }

    private function createOrUpdateSuperadmin(array $data): array
    {
        return DB::transaction(function () use ($data): array {
            $existingSuperadmin = DB::table('global_user_roles as gur')
                ->join('app_users as au', 'au.id', '=', 'gur.user_id')
                ->where('gur.role', 'superadmin')
                ->first(['gur.user_id', 'au.email']);

            if ($existingSuperadmin && strtolower((string) $existingSuperadmin->email) !== $data['admin_email']) {
                throw new \RuntimeException('Ya existe un superadmin global: '.$existingSuperadmin->email.'. Este sistema permite solo uno.');
            }

            $user = DB::table('app_users')
                ->whereRaw('LOWER(email) = ?', [$data['admin_email']])
                ->first(['id']);

            $userId = $user->id ?? (string) Str::uuid();
            $passwordHash = password_hash($data['admin_password'], PASSWORD_BCRYPT);

            if ($user) {
                DB::table('app_users')
                    ->where('id', $userId)
                    ->update([
                        'password_hash' => $passwordHash,
                        'is_active' => 1,
                    ]);
            } else {
                DB::table('app_users')->insert([
                    'id' => $userId,
                    'email' => $data['admin_email'],
                    'password_hash' => $passwordHash,
                    'is_active' => 1,
                ]);
            }

            $profile = DB::table('profiles')->where('user_id', $userId)->first(['id']);
            $profileData = [
                'full_name' => $data['admin_name'],
                'email' => $data['admin_email'],
                'locksmith_id' => $data['admin_code'] !== '' ? $data['admin_code'] : null,
                'current_workshop_id' => null,
            ];

            if ($profile) {
                DB::table('profiles')->where('id', $profile->id)->update($profileData);
            } else {
                DB::table('profiles')->insert($profileData + [
                    'id' => (string) Str::uuid(),
                    'user_id' => $userId,
                ]);
            }

            $globalRole = DB::table('global_user_roles')->where('user_id', $userId)->first(['id']);
            if ($globalRole) {
                DB::table('global_user_roles')->where('id', $globalRole->id)->update(['role' => 'superadmin']);
            } else {
                DB::table('global_user_roles')->insert([
                    'id' => (string) Str::uuid(),
                    'user_id' => $userId,
                    'role' => 'superadmin',
                ]);
            }

            DB::table('global_user_roles')
                ->where('role', 'superadmin')
                ->where('user_id', '!=', $userId)
                ->delete();

            return [
                'id' => $userId,
                'email' => $data['admin_email'],
            ];
        });
    }

    private function seedDemoData(): string
    {
        $this->insertDemoUsers();

        $seedPath = base_path('../php/schema/seed_sample_data.sql');
        if (!is_file($seedPath)) {
            return 'Usuarios/talleres demo creados. Seed de modulos no encontrado.';
        }

        $sql = (string) file_get_contents($seedPath);
        $sql = preg_replace('/^\xEF\xBB\xBF/', '', $sql);
        $sql = preg_replace('/USE\s+[`"]?[a-zA-Z0-9_]+[`"]?\s*;/i', '', $sql);

        DB::unprepared($sql);

        return 'Usuarios, talleres y modulos demo cargados';
    }

    private function insertDemoUsers(): void
    {
        DB::transaction(function (): void {
            $w1 = $this->workshop('CERRAHEREGT', 'Cerrajeria EGT');
            $w2 = $this->workshop('ELECLOPEZ', 'Cerrajeria Lopez');

            $this->workshopUser('josuedsajquim@gmail.com', '33123312', 'Josue Saquim', $w1, 'admin');
            $this->workshopUser('lopez@correo.com', '12345678', 'Juan Lopez', $w2, 'employee');
            $this->workshopUser('lolo@correo.com', '12345678', 'Lolo', $w2, 'employee');
        });
    }

    private function workshop(string $code, string $name): string
    {
        $existing = DB::table('workshops')->where('code', $code)->value('id');
        if ($existing) {
            return (string) $existing;
        }

        $id = (string) Str::uuid();
        DB::table('workshops')->insert([
            'id' => $id,
            'code' => $code,
            'name' => $name,
            'is_active' => 1,
        ]);

        return $id;
    }

    private function workshopUser(string $email, string $password, string $name, string $workshopId, string $role): void
    {
        $userId = DB::table('app_users')->whereRaw('LOWER(email) = ?', [$email])->value('id');

        if (!$userId) {
            $userId = (string) Str::uuid();
            DB::table('app_users')->insert([
                'id' => $userId,
                'email' => $email,
                'password_hash' => password_hash($password, PASSWORD_BCRYPT),
                'is_active' => 1,
            ]);
        }

        $profile = DB::table('profiles')->where('user_id', $userId)->first(['id']);
        if ($profile) {
            DB::table('profiles')->where('id', $profile->id)->update([
                'full_name' => $name,
                'email' => $email,
                'current_workshop_id' => $workshopId,
            ]);
        } else {
            DB::table('profiles')->insert([
                'id' => (string) Str::uuid(),
                'user_id' => $userId,
                'full_name' => $name,
                'email' => $email,
                'current_workshop_id' => $workshopId,
            ]);
        }

        $globalRole = DB::table('global_user_roles')->where('user_id', $userId)->first(['id']);
        if ($globalRole) {
            DB::table('global_user_roles')->where('id', $globalRole->id)->update(['role' => 'user']);
        } else {
            DB::table('global_user_roles')->insert([
                'id' => (string) Str::uuid(),
                'user_id' => $userId,
                'role' => 'user',
            ]);
        }

        $workshopRole = DB::table('user_roles')
            ->where('user_id', $userId)
            ->where('workshop_id', $workshopId)
            ->first(['id']);

        if ($workshopRole) {
            DB::table('user_roles')->where('id', $workshopRole->id)->update(['role' => $role]);
        } else {
            DB::table('user_roles')->insert([
                'id' => (string) Str::uuid(),
                'user_id' => $userId,
                'workshop_id' => $workshopId,
                'role' => $role,
            ]);
        }
    }

    private function defaults(): array
    {
        return [
            'admin_name' => 'Josue Ventura',
            'admin_email' => 'josuevntra@gmail.com',
            'admin_code' => 'ADMINWARRIOR',
            'seed_demo' => true,
        ];
    }

    private function installedHtml(string $installedAt): string
    {
        return '
            <div class="card success">
                <h1>Aplicacion ya instalada</h1>
                <p>Instalada el <strong>'.$this->h($installedAt).'</strong>.</p>
                <p>Para re-ejecutar el instalador sin borrar datos abre <a href="/install?reinstall=1">/install?reinstall=1</a>.</p>
                <p class="warn">Para probar desde cero, usa una base de datos vacia y elimina <code>storage/app/'.self::LOCK_FILE.'</code>.</p>
            </div>
        ';
    }

    private function formHtml(array $data, array $errors, bool $reinstall): string
    {
        $errorHtml = '';
        if ($errors !== []) {
            $items = array_map(fn (string $error): string => '<li>'.$this->h($error).'</li>', $errors);
            $errorHtml = '<div class="alert"><strong>Revisa esto:</strong><ul>'.implode('', $items).'</ul></div>';
        }

        $checked = ($data['seed_demo'] ?? true) ? 'checked' : '';

        return '
            <div class="card">
                <p class="eyebrow">Cerrajeria Express</p>
                <h1>Instalador Laravel</h1>
                <p class="muted">Este instalador consume <code>backend/.env</code>. No crea ni modifica credenciales de entorno.</p>
                '.$this->databaseSummary().'
                '.$errorHtml.'
                <form method="post" action="/install'.($reinstall ? '?reinstall=1' : '').'">
                    <label>Nombre del superadmin</label>
                    <input name="admin_name" value="'.$this->h((string) ($data['admin_name'] ?? '')).'" required>

                    <label>Email del superadmin</label>
                    <input type="email" name="admin_email" value="'.$this->h((string) ($data['admin_email'] ?? '')).'" required>

                    <label>Codigo global del superadmin</label>
                    <input name="admin_code" value="'.$this->h((string) ($data['admin_code'] ?? '')).'">

                    <label>Contrasena</label>
                    <input type="password" name="admin_password" required minlength="8">

                    <label>Confirmar contrasena</label>
                    <input type="password" name="admin_confirm" required minlength="8">

                    <label class="check">
                        <input type="checkbox" name="seed_demo" value="1" '.$checked.'>
                        Cargar talleres, usuarios y datos de ejemplo
                    </label>

                    <button type="submit">Instalar Laravel</button>
                </form>
            </div>
        ';
    }

    private function successHtml(array $data, array $admin, string $seedStatus, string $artisanOutput): string
    {
        return '
            <div class="card success">
                <h1>Instalacion completa</h1>
                <p>Laravel instalo el schema y configuro el superadmin usando <code>backend/.env</code>.</p>
                <table>
                    <tr><th>Base de datos</th><td>'.$this->h((string) config('database.connections.mysql.database')).'</td></tr>
                    <tr><th>Superadmin</th><td>'.$this->h($data['admin_name']).' &lt;'.$this->h($admin['email']).'&gt;</td></tr>
                    <tr><th>Seed</th><td>'.$this->h($seedStatus).'</td></tr>
                    <tr><th>Lock</th><td><code>storage/app/'.self::LOCK_FILE.'</code></td></tr>
                </table>
                <h2>Salida de migracion</h2>
                <pre>'.$this->h(trim($artisanOutput) ?: 'Sin salida').'</pre>
                <p><a href="/">Abrir app</a> · <a href="/api/auth.php?action=check">Probar API</a></p>
            </div>
        ';
    }

    private function databaseSummary(): string
    {
        return '
            <div class="summary">
                <div><span>DB_HOST</span><strong>'.$this->h((string) config('database.connections.mysql.host')).'</strong></div>
                <div><span>DB_PORT</span><strong>'.$this->h((string) config('database.connections.mysql.port')).'</strong></div>
                <div><span>DB_DATABASE</span><strong>'.$this->h((string) config('database.connections.mysql.database')).'</strong></div>
                <div><span>DB_USERNAME</span><strong>'.$this->h((string) config('database.connections.mysql.username')).'</strong></div>
            </div>
        ';
    }

    private function page(string $title, string $body, int $status = 200): Response
    {
        return response($this->layout($title, $body), $status)
            ->header('Content-Type', 'text/html; charset=UTF-8');
    }

    private function layout(string $title, string $body): string
    {
        return '<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>'.$this->h($title).'</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; background: #101216; color: #eef2f7; font-family: Arial, sans-serif; display: grid; place-items: start center; padding: 40px 16px; }
    .card { width: min(720px, 100%); background: #181b22; border: 1px solid #2b313d; border-radius: 8px; padding: 28px; box-shadow: 0 20px 60px rgba(0,0,0,.25); }
    .success { border-color: #1f8f5f; }
    .eyebrow { color: #8aa3ff; text-transform: uppercase; letter-spacing: .08em; font-size: 12px; margin: 0 0 8px; }
    h1 { margin: 0 0 12px; font-size: 30px; }
    h2 { margin: 24px 0 10px; font-size: 18px; }
    p { line-height: 1.55; }
    .muted { color: #aeb7c7; }
    .warn { color: #ffd166; }
    code, pre { background: #0d0f14; border: 1px solid #2b313d; border-radius: 6px; }
    code { padding: 2px 5px; }
    pre { padding: 14px; overflow: auto; color: #cbd5e1; }
    label { display: block; margin: 16px 0 7px; font-weight: 700; }
    input { width: 100%; height: 44px; border-radius: 6px; border: 1px solid #3a4352; background: #11141a; color: #fff; padding: 0 12px; font-size: 15px; }
    .check { display: flex; gap: 10px; align-items: center; font-weight: 400; }
    .check input { width: auto; height: auto; }
    button { margin-top: 18px; width: 100%; height: 46px; border: 0; border-radius: 6px; background: #4f7cff; color: white; font-weight: 800; cursor: pointer; }
    a { color: #8aa3ff; }
    .alert { margin: 18px 0; border: 1px solid #a43c3c; background: #2a1618; padding: 14px; border-radius: 6px; }
    .summary { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin: 18px 0; }
    .summary div { background: #11141a; border: 1px solid #2b313d; border-radius: 6px; padding: 10px; min-width: 0; }
    .summary span { display: block; color: #8b95a7; font-size: 12px; margin-bottom: 4px; }
    .summary strong { display: block; overflow-wrap: anywhere; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { text-align: left; border-bottom: 1px solid #2b313d; padding: 10px 0; vertical-align: top; }
    th { width: 170px; color: #aeb7c7; }
    @media (max-width: 620px) { .summary { grid-template-columns: 1fr; } .card { padding: 20px; } }
  </style>
</head>
<body>'.$body.'</body>
</html>';
    }

    private function h(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
    }
}
