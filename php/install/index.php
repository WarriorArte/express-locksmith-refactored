<?php
/**
 * Instalador Web — Cerrajería Express
 * Accede a: http://localhost/cerrajer-a-express/php/install/
 * Se auto-elimina tras la instalación exitosa.
 */

define('LOCK_FILE',   __DIR__ . '/../installed.lock');
define('SCHEMA_FILE', __DIR__ . '/../schema/schema.sql');
define('APP_NAME',    'Cerrajería Express');
define('APP_SLUG',    getenv('WAMP_APP_DIR') ?: 'cerrajer-a-express');
define('DEFAULT_DB',  'cerrajeria_express');

require_once __DIR__ . '/../config/database.php';

$allowReinstall = isset($_GET['reinstall']) && $_GET['reinstall'] === '1';

// ─── Ya instalado ─────────────────────────────────────────────────────────────
if (file_exists(LOCK_FILE) && !$allowReinstall) {
    renderPage(APP_NAME . ' — Ya instalado', '
        <div class="card success">
            <h2>✓ Aplicación ya instalada</h2>
            <p>Instalada el <strong>' . h(file_get_contents(LOCK_FILE)) . '</strong>.</p>
            <p>Para reconfigurar datos iniciales/superadmin abre:</p>
            <p><a href="?reinstall=1"><code>install/?reinstall=1</code></a></p>
            <p class="warn">⚠ Por seguridad, elimina <code>php/install/</code> del servidor.</p>
        </div>
    ');
    exit;
}

$errors               = [];
$step                 = 'form';
$dbNameSafe           = '';
$installerDeleteStatus = '';
$sampleDataStatus     = '';

// ─── Procesamiento del formulario ─────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $f = [
        'admin_name'     => trim($_POST['admin_name']      ?? ''),
        'admin_email'    => strtolower(trim($_POST['admin_email'] ?? '')),
        'admin_code'     => trim($_POST['admin_code']      ?? ''),
        'admin_password' => $_POST['admin_password']       ?? '',
        'admin_confirm'  => $_POST['admin_confirm']        ?? '',
    ];

    // Validación
    if (empty($f['admin_name'])) $errors[] = 'El nombre del administrador es requerido.';
    if (!filter_var($f['admin_email'], FILTER_VALIDATE_EMAIL))
                                 $errors[] = 'El email del administrador no es válido.';
    if (strlen($f['admin_password']) < 8)
                                 $errors[] = 'La contraseña debe tener al menos 8 caracteres.';
    if ($f['admin_password'] !== $f['admin_confirm'])
                                 $errors[] = 'Las contraseñas no coinciden.';

    if (empty($errors)) {
        try {
            $databaseSettings = (new Database())->getSettings();
            $dbNameSafe = $databaseSettings['db_name'] ?? DEFAULT_DB;
            if (!preg_match('/^[a-zA-Z0-9_-]+$/', $dbNameSafe)) {
                throw new Exception('Nombre de BD inválido. Solo letras, números, _ y -.');
            }

            // 1. Conectar sin seleccionar BD
            $pdo = new PDO(
                "mysql:host={$databaseSettings['host']};port={$databaseSettings['port']};charset=utf8mb4",
                $databaseSettings['username'],
                $databaseSettings['password'],
                [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
            );

            // 2. Seguridad: NO crear la BD. Debe existir previamente.
            $chk = $pdo->prepare(
                'SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ? LIMIT 1'
            );
            $chk->execute([$dbNameSafe]);
            if (!$chk->fetchColumn()) {
                throw new Exception(
                    "La base de datos \"{$dbNameSafe}\" no existe. " .
                    'Créala en phpMyAdmin antes de instalar (Ej: CREATE DATABASE cerrajeria_express CHARACTER SET utf8mb4).'
                );
            }
            $pdo->exec("USE `{$dbNameSafe}`");

            // 3. Ejecutar el schema SQL (tablas + stored functions)
            executeSqlFile($pdo, SCHEMA_FILE);

            // 4. Crear usuario superadmin
            //    Si ya existe (reinstalación), actualiza la contraseña.
            $chkUser = $pdo->prepare('SELECT id FROM app_users WHERE LOWER(email) = ? LIMIT 1');
            $chkUser->execute([$f['admin_email']]);
            $existingUserId = $chkUser->fetchColumn();

            $adminId       = $existingUserId ?: make_uuid_v4();
            $hash          = password_hash($f['admin_password'], PASSWORD_BCRYPT);
            $locksmithCode = $f['admin_code'] !== '' ? $f['admin_code'] : null;

            if ($existingUserId) {
                $pdo->prepare('UPDATE app_users SET password_hash = ?, is_active = 1 WHERE id = ?')
                    ->execute([$hash, $adminId]);
            } else {
                $pdo->prepare(
                    'INSERT INTO app_users (id, email, password_hash, is_active) VALUES (?, ?, ?, 1)'
                )->execute([$adminId, $f['admin_email'], $hash]);
            }

            // Perfil (incluye locksmith_id / código)
            $chkProfile = $pdo->prepare('SELECT id FROM profiles WHERE user_id = ? LIMIT 1');
            $chkProfile->execute([$adminId]);
            if ($chkProfile->fetchColumn()) {
                $pdo->prepare(
                    'UPDATE profiles SET full_name = ?, email = ?, locksmith_id = ? WHERE user_id = ?'
                )->execute([$f['admin_name'], $f['admin_email'], $locksmithCode, $adminId]);
            } else {
                $pdo->prepare(
                    'INSERT INTO profiles (id, user_id, full_name, email, locksmith_id) VALUES (?, ?, ?, ?, ?)'
                )->execute([make_uuid_v4(), $adminId, $f['admin_name'], $f['admin_email'], $locksmithCode]);
            }

            // Rol global superadmin
            $chkRole = $pdo->prepare('SELECT id FROM global_user_roles WHERE user_id = ? LIMIT 1');
            $chkRole->execute([$adminId]);
            if ($chkRole->fetchColumn()) {
                $pdo->prepare('UPDATE global_user_roles SET role = "superadmin" WHERE user_id = ?')
                    ->execute([$adminId]);
            } else {
                $pdo->prepare(
                    'INSERT INTO global_user_roles (id, user_id, role) VALUES (?, ?, "superadmin")'
                )->execute([make_uuid_v4(), $adminId]);
            }

            // Verificación post-instalación
            $verify = $pdo->prepare('SELECT password_hash FROM app_users WHERE id = ? LIMIT 1');
            $verify->execute([$adminId]);
            $storedHash = (string)($verify->fetchColumn() ?: '');
            if ($storedHash === '' || !password_verify($f['admin_password'], $storedHash)) {
                throw new Exception('No se pudo verificar las credenciales del administrador. Intenta de nuevo.');
            }

            // 4b. Datos de ejemplo (solo en instalación nueva, no reinstalación)
            if (!$allowReinstall) {
                $sampleDataStatus = insertSampleData($pdo);

                // 4c. Seed de módulos (productos, clientes, cotizaciones, ventas, etc.)
                $seedFile = __DIR__ . '/../schema/seed_sample_data.sql';
                if (file_exists($seedFile)) {
                    try {
                        executeSqlFile($pdo, $seedFile);
                        $sampleDataStatus .= ' + seed de módulos cargado';
                    } catch (Exception $e) {
                        $sampleDataStatus .= ' (seed de módulos falló: ' . $e->getMessage() . ')';
                    }
                } else {
                    $sampleDataStatus .= ' (archivo seed_sample_data.sql no encontrado)';
                }
            } else {
                $sampleDataStatus = 'Omitidos (reinstalación)';
            }

            // 6. Archivo de bloqueo
            file_put_contents(LOCK_FILE, date('Y-m-d H:i:s'));

            // 7. Auto-eliminar el instalador
            $installerDeleteStatus = try_delete_installer();

            $step = 'success';

        } catch (PDOException $e) {
            $errors[] = 'Error de base de datos: ' . $e->getMessage();
        } catch (Exception $e) {
            $errors[] = 'Error: ' . $e->getMessage();
        }
    }
}

// ─── Defaults del formulario ──────────────────────────────────────────────────
$d = array_merge([
    'admin_name'  => 'Josué Ventura',
    'admin_email' => 'josuevntra@gmail.com',
    'admin_code'  => 'ADMINWARRIOR',
], isset($f) ? $f : []);

// ─── Vista: éxito ─────────────────────────────────────────────────────────────
if ($step === 'success') {
    $appUrl = '../../';
    $sampleHtml = $sampleDataStatus !== 'Omitidos (reinstalación)' ? '
        <div class="section-title" style="margin-top:1.5rem">Datos de ejemplo insertados</div>
        <table>
            <tr>
                <th colspan="2" class="sample-header">Taller 1 — Cerrajería EGT <code>CERRAHEREGT</code></th>
            </tr>
            <tr><th>Rol</th><td>Administrador del taller</td></tr>
            <tr><th>Email</th><td>josuedsajquim@gmail.com</td></tr>
            <tr><th>Contraseña</th><td><code>33123312</code></td></tr>
            <tr>
                <th colspan="2" class="sample-header" style="padding-top:.75rem">Taller 2 — Cerrajería López <code>ELECLOPEZ</code></th>
            </tr>
            <tr><th>Empleado 1</th><td>lopez@correo.com / <code>123456</code></td></tr>
            <tr><th>Empleado 2</th><td>lolo@correo.com / <code>123</code></td></tr>
        </table>' : '';

    renderPage(APP_NAME . ' — Instalación completa', '
        <div class="card success">
            <div class="check">✓</div>
            <h2>¡Instalación completada!</h2>
            <p>La base de datos y el usuario superadmin han sido configurados correctamente.</p>
            <table>
                <tr><th>URL de la app</th><td><a href="' . h($appUrl) . '">Abrir Cerrajería Express</a></td></tr>
                <tr><th>Base de datos</th><td>' . h($dbNameSafe) . '</td></tr>
                <tr><th>Conexión DB</th><td>Variables de entorno / panel de hosting</td></tr>
                <tr><th>install/index.php</th><td>' . h($installerDeleteStatus) . '</td></tr>
                <tr><th>Datos de ejemplo</th><td>' . h($sampleDataStatus) . '</td></tr>
            </table>

            <div class="section-title" style="margin-top:1.5rem">Cuenta superadmin</div>
            <table>
                <tr><th>Nombre</th><td>' . h($f['admin_name']) . '</td></tr>
                <tr><th>Email</th><td>' . h($f['admin_email']) . '</td></tr>
                <tr><th>Código</th><td>' . h($f['admin_code'] ?: '—') . '</td></tr>
                <tr><th>Rol</th><td>superadmin</td></tr>
            </table>
            ' . $sampleHtml . '
            <div class="warn-box">
                <strong>⚠ Importante:</strong> Elimina la carpeta <code>php/install/</code> del servidor
                para evitar que alguien pueda reinstalar la aplicación.
            </div>
        </div>
    ');
    exit;
}

// ─── Vista: formulario ────────────────────────────────────────────────────────
$errorsHtml = '';
if (!empty($errors)) {
    $errorsHtml = '<div class="error-box"><ul>'
        . implode('', array_map(fn($e) => '<li>' . h($e) . '</li>', $errors))
        . '</ul></div>';
}

$formHtml = $errorsHtml . '
<form method="POST">
    <div class="section-title">Cuenta superadmin</div>
    <div class="field">
        <label>Nombre completo</label>
        <input type="text" name="admin_name" value="' . h($d['admin_name']) . '" required>
    </div>
    <div class="row">
        <div class="field" style="flex:3">
            <label>Email</label>
            <input type="email" name="admin_email" value="' . h($d['admin_email']) . '" required autocomplete="email">
        </div>
        <div class="field" style="flex:2">
            <label>Código <small>(ID cerrajero, opcional)</small></label>
            <input type="text" name="admin_code" value="' . h($d['admin_code']) . '" autocomplete="off">
        </div>
    </div>
    <div class="row">
        <div class="field">
            <label>Contraseña <small>(mín. 8 caracteres)</small></label>
            <input type="password" name="admin_password" required autocomplete="new-password">
        </div>
        <div class="field">
            <label>Confirmar contraseña</label>
            <input type="password" name="admin_confirm" required autocomplete="new-password">
        </div>
    </div>

    <div class="hint-box">
        <strong>Conexión de base de datos:</strong>
        Este instalador usa las variables de entorno del servidor
        (<code>DB_HOST</code>, <code>DB_PORT</code>, <code>DB_NAME</code>, <code>DB_USER</code>, <code>DB_PASSWORD</code>).
        Verifica en tu panel de hosting que estén definidas.
        <br><br>
        <strong>Datos de ejemplo:</strong> Se insertarán automáticamente 2 talleres de prueba
        (CERRAHEREGT y ELECLOPEZ) con sus usuarios.
    </div>

    <button type="submit">Instalar Cerrajería Express</button>
</form>';

renderPage(APP_NAME . ' — Instalador', '
    <div class="card">
        <div class="logo">' . h(APP_NAME) . '</div>
        <h2>Instalación inicial</h2>
        <p class="subtitle">Crea el primer usuario superadmin usando la conexión DB del entorno.</p>
        ' . $formHtml . '
    </div>
');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function h(string $s): string {
    return htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
}

function make_uuid_v4(): string {
    $d    = random_bytes(16);
    $d[6] = chr((ord($d[6]) & 0x0f) | 0x40);
    $d[8] = chr((ord($d[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($d), 4));
}

/**
 * Ejecuta un archivo SQL sobre un PDO ya conectado.
 * Parser línea por línea con soporte de DELIMITER $$ para stored functions.
 * Ignora CREATE DATABASE y USE para no interferir con la BD seleccionada.
 */
function executeSqlFile(PDO $pdo, string $filePath): void {
    if (!file_exists($filePath)) {
        throw new Exception("Schema no encontrado: {$filePath}");
    }

    $content = file_get_contents($filePath);

    // Eliminar BOM UTF-8
    if (substr($content, 0, 3) === "\xEF\xBB\xBF") {
        $content = substr($content, 3);
    }

    // Eliminar comentarios antes de parsear (evita ; dentro de -- comments)
    $content = preg_replace('/\/\*.*?\*\//s', '', $content);  // /* ... */
    $content = preg_replace('/--[^\n]*/m',    '', $content);  // -- línea

    $delimiter = ';';
    $statement = '';

    foreach (explode("\n", $content) as $line) {
        $trimmed = trim($line);

        // Detectar cambio de delimitador: DELIMITER $$ o DELIMITER ;
        if (preg_match('/^DELIMITER\s+(\S+)/i', $trimmed, $m)) {
            $delimiter = $m[1];
            continue;
        }

        $statement .= $line . "\n";

        // Comprobar si el statement acumulado termina con el delimitador actual
        $stmtRtrim = rtrim($statement);
        $dLen = strlen($delimiter);
        if ($dLen > 0 && strlen($stmtRtrim) >= $dLen &&
            substr($stmtRtrim, -$dLen) === $delimiter) {

            $exec = trim(substr($stmtRtrim, 0, -$dLen));
            $statement = '';

            if ($exec === '')                                     continue;
            if (preg_match('/^\s*CREATE\s+DATABASE\b/i', $exec)) continue;
            if (preg_match('/^\s*USE\s+\w/i',            $exec)) continue;
            if (preg_match('/^\s*SET\s+NAMES\b/i',       $exec)) continue;
            if (preg_match('/^\s*SET\s+time_zone\b/i',   $exec)) continue;

            $pdo->exec($exec);
        }
    }

    // Ejecutar sentencia residual (si el archivo no termina con el delimitador)
    $exec = trim($statement);
    if ($exec !== '' &&
        !preg_match('/^\s*CREATE\s+DATABASE\b/i', $exec) &&
        !preg_match('/^\s*USE\s+\w/i', $exec)) {
        $pdo->exec($exec);
    }
}

/**
 * Inserta talleres y usuarios de ejemplo.
 * Se ejecuta solo en instalación nueva (no en reinstalación).
 */
function insertSampleData(PDO $pdo): string {
    try {
        $wQuery = $pdo->prepare('SELECT id FROM workshops WHERE code = ? LIMIT 1');
        $uQuery = $pdo->prepare('SELECT id FROM app_users WHERE LOWER(email) = ? LIMIT 1');

        // ── Taller 1: Cerrajería EGT (CERRAHEREGT) ──────────────────────────
        $w1Id = make_uuid_v4();
        $pdo->prepare('INSERT IGNORE INTO workshops (id, code, name, is_active) VALUES (?, ?, ?, 1)')
            ->execute([$w1Id, 'CERRAHEREGT', 'Cerrajería EGT']);
        $wQuery->execute(['CERRAHEREGT']);
        $w1Id = $wQuery->fetchColumn() ?: $w1Id;

        // Admin del taller 1
        $u1Id = make_uuid_v4();
        $h1   = password_hash('33123312', PASSWORD_BCRYPT);
        $pdo->prepare('INSERT IGNORE INTO app_users (id, email, password_hash, is_active) VALUES (?, ?, ?, 1)')
            ->execute([$u1Id, 'josuedsajquim@gmail.com', $h1]);
        $uQuery->execute(['josuedsajquim@gmail.com']);
        $u1Id = $uQuery->fetchColumn() ?: $u1Id;

        $pdo->prepare(
            'INSERT IGNORE INTO profiles (id, user_id, full_name, email, current_workshop_id) VALUES (?, ?, ?, ?, ?)'
        )->execute([make_uuid_v4(), $u1Id, 'Josué Saquim', 'josuedsajquim@gmail.com', $w1Id]);
        $pdo->prepare('INSERT IGNORE INTO global_user_roles (id, user_id, role) VALUES (?, ?, "user")')
            ->execute([make_uuid_v4(), $u1Id]);
        $pdo->prepare('INSERT IGNORE INTO user_roles (id, user_id, role, workshop_id) VALUES (?, ?, "admin", ?)')
            ->execute([make_uuid_v4(), $u1Id, $w1Id]);

        // ── Taller 2: Cerrajería López (ELECLOPEZ) ──────────────────────────
        $w2Id = make_uuid_v4();
        $pdo->prepare('INSERT IGNORE INTO workshops (id, code, name, is_active) VALUES (?, ?, ?, 1)')
            ->execute([$w2Id, 'ELECLOPEZ', 'Cerrajería López']);
        $wQuery->execute(['ELECLOPEZ']);
        $w2Id = $wQuery->fetchColumn() ?: $w2Id;

        // Empleado 1
        $u2Id = make_uuid_v4();
        $h2   = password_hash('123456', PASSWORD_BCRYPT);
        $pdo->prepare('INSERT IGNORE INTO app_users (id, email, password_hash, is_active) VALUES (?, ?, ?, 1)')
            ->execute([$u2Id, 'lopez@correo.com', $h2]);
        $uQuery->execute(['lopez@correo.com']);
        $u2Id = $uQuery->fetchColumn() ?: $u2Id;

        $pdo->prepare(
            'INSERT IGNORE INTO profiles (id, user_id, full_name, email, current_workshop_id) VALUES (?, ?, ?, ?, ?)'
        )->execute([make_uuid_v4(), $u2Id, 'Juan López', 'lopez@correo.com', $w2Id]);
        $pdo->prepare('INSERT IGNORE INTO global_user_roles (id, user_id, role) VALUES (?, ?, "user")')
            ->execute([make_uuid_v4(), $u2Id]);
        $pdo->prepare('INSERT IGNORE INTO user_roles (id, user_id, role, workshop_id) VALUES (?, ?, "employee", ?)')
            ->execute([make_uuid_v4(), $u2Id, $w2Id]);

        // Empleado 2
        $u3Id = make_uuid_v4();
        $h3   = password_hash('123', PASSWORD_BCRYPT);
        $pdo->prepare('INSERT IGNORE INTO app_users (id, email, password_hash, is_active) VALUES (?, ?, ?, 1)')
            ->execute([$u3Id, 'lolo@correo.com', $h3]);
        $uQuery->execute(['lolo@correo.com']);
        $u3Id = $uQuery->fetchColumn() ?: $u3Id;

        $pdo->prepare(
            'INSERT IGNORE INTO profiles (id, user_id, full_name, email, current_workshop_id) VALUES (?, ?, ?, ?, ?)'
        )->execute([make_uuid_v4(), $u3Id, 'Lolo', 'lolo@correo.com', $w2Id]);
        $pdo->prepare('INSERT IGNORE INTO global_user_roles (id, user_id, role) VALUES (?, ?, "user")')
            ->execute([make_uuid_v4(), $u3Id]);
        $pdo->prepare('INSERT IGNORE INTO user_roles (id, user_id, role, workshop_id) VALUES (?, ?, "employee", ?)')
            ->execute([make_uuid_v4(), $u3Id, $w2Id]);

        return '2 talleres + 3 usuarios de ejemplo creados';
    } catch (Exception $e) {
        return 'Error en datos de ejemplo: ' . $e->getMessage();
    }
}

function try_delete_installer(): string {
    $path = __FILE__;
    if (@unlink($path)) {
        return 'Eliminado automáticamente';
    }
    register_shutdown_function(static function () use ($path): void {
        @unlink($path);
    });
    return 'No se pudo eliminar en caliente; se intentará al terminar la respuesta. Si persiste, elimínalo manualmente.';
}

function renderPage(string $title, string $body): void {
    echo '<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>' . h($title) . '</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0f0f13;
      color: #e2e8f0;
      min-height: 100vh;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 2rem 1rem;
    }
    .card {
      background: #1a1a24;
      border: 1px solid #2d2d3d;
      border-radius: 12px;
      padding: 2.5rem;
      width: 100%;
      max-width: 600px;
      margin-top: 2rem;
    }
    .card.success { border-color: #4ade80; }
    .logo { font-size: 1.4rem; font-weight: 700; color: #9b87f5; margin-bottom: .5rem; }
    h2 { font-size: 1.2rem; margin-bottom: .35rem; }
    .subtitle { color: #94a3b8; font-size: .875rem; margin-bottom: 1.5rem; }
    .section-title {
      font-size: .72rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: .08em;
      color: #9b87f5;
      margin-bottom: .75rem;
      border-bottom: 1px solid #2d2d3d;
      padding-bottom: .4rem;
    }
    .row { display: flex; gap: 1rem; }
    .field { display: flex; flex-direction: column; gap: .3rem; margin-bottom: .9rem; flex: 1; }
    label { font-size: .82rem; color: #94a3b8; font-weight: 500; }
    small { font-size: .72rem; color: #64748b; }
    input {
      background: #0f0f13;
      border: 1px solid #2d2d3d;
      border-radius: 6px;
      padding: .5rem .7rem;
      color: #e2e8f0;
      font-size: .875rem;
      outline: none;
      transition: border-color .15s;
      width: 100%;
    }
    input:focus { border-color: #9b87f5; }
    button {
      width: 100%;
      background: #9b87f5;
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: .75rem;
      font-size: .95rem;
      font-weight: 600;
      cursor: pointer;
      margin-top: .75rem;
      transition: background .15s;
    }
    button:hover { background: #7c69d4; }
    .error-box {
      background: rgba(239,68,68,.1);
      border: 1px solid rgba(239,68,68,.35);
      border-radius: 8px;
      padding: .875rem 1rem;
      margin-bottom: 1.25rem;
      color: #fca5a5;
      font-size: .85rem;
    }
    .error-box ul { padding-left: 1.2rem; }
    .error-box li { margin-bottom: .2rem; }
    .hint-box {
      background: rgba(99,102,241,.08);
      border: 1px solid rgba(99,102,241,.25);
      border-radius: 8px;
      padding: .875rem 1rem;
      margin-top: .5rem;
      font-size: .82rem;
      color: #a5b4fc;
      line-height: 1.6;
    }
    .hint-box code {
      display: block;
      margin-top: .4rem;
      font-size: .78rem;
      color: #c7d2fe;
      word-break: break-all;
    }
    .warn-box {
      background: rgba(234,179,8,.08);
      border: 1px solid rgba(234,179,8,.3);
      border-radius: 8px;
      padding: .875rem 1rem;
      margin-top: 1rem;
      color: #fde047;
      font-size: .85rem;
    }
    .warn { color: #fde047; font-size: .85rem; margin-top: .75rem; }
    .check { font-size: 2.5rem; color: #4ade80; margin-bottom: .75rem; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: .875rem; }
    th, td { padding: .5rem .75rem; text-align: left; border-bottom: 1px solid #2d2d3d; }
    th { color: #94a3b8; width: 38%; font-weight: 500; }
    td { color: #e2e8f0; }
    .sample-header { color: #9b87f5 !important; font-weight: 600; width: auto !important; }
    a { color: #9b87f5; text-decoration: none; }
    a:hover { text-decoration: underline; }
    code {
      background: #0f0f13;
      border: 1px solid #2d2d3d;
      border-radius: 4px;
      padding: .1em .4em;
      font-size: .82em;
    }
  </style>
</head>
<body>
  ' . $body . '
</body>
</html>';
}
