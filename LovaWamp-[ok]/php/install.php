<?php
/**
 * Instalador Web reutilizable
 * Accede a: http://localhost/{APP_SLUG}/php/install.php
 * Elimina este archivo tras la instalación exitosa.
 */

define('LOCK_FILE',   __DIR__ . '/installed.lock');
define('SCHEMA_FILE', __DIR__ . '/schema/portfolio_schema.sql');
define('CONFIG_FILE', __DIR__ . '/config/db_config.php');
define('PROFILE_ID',  '11111111-1111-4111-8111-111111111111');
define('DEFAULT_ADMIN_ID', '22222222-2222-4222-8222-222222222222');
define('APP_NAME', getenv('APP_NAME') ?: 'lovawamp');
define('APP_SLUG', getenv('APP_SLUG') ?: 'lovawamp');
define('DEFAULT_DB_NAME', getenv('DEFAULT_DB_NAME') ?: 'lovawamp_db');

$allowReinstall = isset($_GET['reinstall']) && $_GET['reinstall'] === '1';

// ─── Ya instalado ─────────────────────────────────────────────────────────────
if (file_exists(LOCK_FILE) && !$allowReinstall) {
    renderPage(APP_NAME . ' — Ya instalado', '
        <div class="card success">
            <h2>✓ La aplicación ya está instalada</h2>
            <p>La instalación se realizó el <strong>' . htmlspecialchars(file_get_contents(LOCK_FILE)) . '</strong>.</p>
            <p>Si deseas cambiar de base de datos o rehacer la configuración, abre:</p>
            <p><a href="?reinstall=1"><code>install.php?reinstall=1</code></a></p>
            <p class="warn">Por seguridad, elimina <code>php/install.php</code> del servidor.</p>
        </div>
    ');
    exit;
}

$errors  = [];
$success = false;
$step    = 'form';
$configStatus = 'No verificado';
$installerDeleteStatus = 'No intentado';

// ─── Procesamiento del formulario ─────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $f = [
        'db_host'        => trim($_POST['db_host']        ?? 'localhost'),
        'db_port'        => (int) ($_POST['db_port']       ?? 3306),
        'db_name'        => trim($_POST['db_name']         ?? DEFAULT_DB_NAME),
        'db_user'        => trim($_POST['db_user']         ?? 'root'),
        'db_password'    => $_POST['db_password']          ?? '',
        'admin_name'     => trim($_POST['admin_name']      ?? ''),
        'admin_email'    => strtolower(trim($_POST['admin_email'] ?? '')),
        'admin_password' => $_POST['admin_password']       ?? '',
        'admin_confirm'  => $_POST['admin_confirm']        ?? '',
    ];

    // Validación
    if (empty($f['db_host']))    $errors[] = 'El host de la base de datos es requerido.';
    if (empty($f['db_name']))    $errors[] = 'El nombre de la base de datos es requerido.';
    if (empty($f['db_user']))    $errors[] = 'El usuario de la base de datos es requerido.';
    if ($f['db_port'] < 1 || $f['db_port'] > 65535)
                                 $errors[] = 'El puerto debe ser un número entre 1 y 65535.';
    if (empty($f['admin_name'])) $errors[] = 'El nombre del administrador es requerido.';
    if (!filter_var($f['admin_email'], FILTER_VALIDATE_EMAIL))
                                 $errors[] = 'El email del administrador no es válido.';
    if (strlen($f['admin_password']) < 8)
                                 $errors[] = 'La contraseña debe tener al menos 8 caracteres.';
    if ($f['admin_password'] !== $f['admin_confirm'])
                                 $errors[] = 'Las contraseñas no coinciden.';

    if (empty($errors)) {
        try {
            // 1. Conectar a MySQL sin seleccionar BD
            $dbNameSafe = trim($f['db_name']);
            if (!preg_match('/^[a-zA-Z0-9_-]+$/', $dbNameSafe)) {
                throw new Exception('Nombre de base de datos inválido. Solo letras, números, guion bajo (_) y guion medio (-).');
            }

            $pdo = new PDO(
                "mysql:host={$f['db_host']};port={$f['db_port']};charset=utf8mb4",
                $f['db_user'],
                $f['db_password'],
                [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
            );

            // 2. Seguridad: NO crear bases de datos desde el instalador.
            // Solo se permite instalar sobre una BD ya existente.
            $checkDb = $pdo->prepare('SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ? LIMIT 1');
            $checkDb->execute([$dbNameSafe]);
            if (!$checkDb->fetchColumn()) {
                throw new Exception('La base de datos "' . $dbNameSafe . '" no existe. Creala manualmente antes de instalar.');
            }
            $pdo->exec("USE `{$dbNameSafe}`");

            // 3. Ejecutar el esquema SQL, omitiendo el INSERT del admin por defecto
            $sql = file_get_contents(SCHEMA_FILE);
            $statements = array_filter(
                array_map('trim', explode(';', $sql)),
                fn($s) => !empty($s)
                       && stripos($s, 'INSERT IGNORE INTO admin_users') === false
            );
            foreach ($statements as $stmt) {
                $pdo->exec($stmt);
            }

            // 4. Reemplazar completamente usuarios admin para evitar credenciales antiguas
            // Esto hace la instalacion deterministica en entornos de prueba.
            $pdo->exec('DELETE FROM login_logs');
            $pdo->exec('DELETE FROM admin_users');

            $adminId = DEFAULT_ADMIN_ID;
            $hash = password_hash($f['admin_password'], PASSWORD_BCRYPT);
            $stmt = $pdo->prepare(
                'INSERT INTO admin_users (id, name, email, password_hash, is_active) VALUES (?, ?, ?, ?, 1)'
            );
            $stmt->execute([$adminId, $f['admin_name'], $f['admin_email'], $hash]);

            // Verificacion post-instalacion: confirma que el hash guardado permite login.
            $verifyStmt = $pdo->prepare('SELECT password_hash FROM admin_users WHERE id = ? LIMIT 1');
            $verifyStmt->execute([$adminId]);
            $storedHash = (string) ($verifyStmt->fetchColumn() ?: '');
            if ($storedHash === '' || !password_verify($f['admin_password'], $storedHash)) {
                throw new Exception('No se pudo validar la credencial del administrador tras la instalacion.');
            }

            // 5. Actualizar el email de contacto en el perfil
            $stmt = $pdo->prepare('UPDATE configuracion_perfil SET email = ? WHERE id = ?');
            $stmt->execute([$f['admin_email'], PROFILE_ID]);

            // 6. Escribir php/config/db_config.php
            $configPhp = "<?php\n// Generado por install.php el " . date('Y-m-d H:i:s') . "\nreturn [\n"
                . "    'host'     => " . var_export($f['db_host'],    true) . ",\n"
                . "    'db_name'  => " . var_export($dbNameSafe,      true) . ",\n"
                . "    'username' => " . var_export($f['db_user'],    true) . ",\n"
                . "    'password' => " . var_export($f['db_password'],true) . ",\n"
                . "    'port'     => " . (int)$f['db_port']                 . ",\n"
                . "];\n";
            $written = file_put_contents(CONFIG_FILE, $configPhp, LOCK_EX);
            if ($written === false) {
                throw new Exception('No se pudo escribir php/config/db_config.php');
            }

            $loadedConfig = include CONFIG_FILE;
            if (!is_array($loadedConfig)) {
                throw new Exception('db_config.php no contiene un array de configuración válido.');
            }

            $loadedDbName = (string) ($loadedConfig['db_name'] ?? '');
            if ($loadedDbName !== $dbNameSafe) {
                throw new Exception('db_config.php fue escrito pero db_name no coincide con la instalación.');
            }

            $configStatus = 'OK (db_name=' . $loadedDbName . ')';

            // 7. Escribir archivo de bloqueo
            file_put_contents(LOCK_FILE, date('Y-m-d H:i:s'));

            // 8. Intentar auto-eliminar el instalador por seguridad
            $installerDeleteStatus = try_delete_installer();

            $success = true;
            $step    = 'success';

        } catch (PDOException $e) {
            $errors[] = 'Error de base de datos: ' . htmlspecialchars($e->getMessage());
        } catch (Exception $e) {
            $errors[] = 'Error: ' . htmlspecialchars($e->getMessage());
        }
    }
}

// ─── Defaults del formulario ──────────────────────────────────────────────────
$d = array_merge([
    'db_host'     => 'localhost',
    'db_port'     => '3306',
    'db_name'     => DEFAULT_DB_NAME,
    'db_user'     => 'root',
    'db_password' => '',
    'admin_name'  => '',
    'admin_email' => '',
], isset($f) ? $f : []);

// ─── Vista éxito ──────────────────────────────────────────────────────────────
if ($step === 'success') {
    renderPage(APP_NAME . ' — Instalación completa', '
        <div class="card success">
            <div class="check">✓</div>
            <h2>¡Instalación completada!</h2>
            <p>La base de datos y el usuario administrador han sido configurados correctamente.</p>
            <table>
                <tr><th>URL del sitio</th><td><a href="../">Abrir el portfolio</a></td></tr>
                <tr><th>Panel de admin</th><td><a href="../admin">Ir al panel admin</a></td></tr>
                <tr><th>Base de datos</th><td>' . htmlspecialchars($dbNameSafe) . '</td></tr>
                <tr><th>db_config.php</th><td>' . htmlspecialchars($configStatus) . '</td></tr>
                <tr><th>install.php</th><td>' . htmlspecialchars($installerDeleteStatus) . '</td></tr>
                <tr><th>Usuario</th><td>' . htmlspecialchars($f['admin_name']) . '</td></tr>
                <tr><th>Email de acceso</th><td>' . htmlspecialchars($f['admin_email']) . '</td></tr>
            </table>
            <div class="warn-box">
                <strong>⚠ Importante:</strong> Elimina <code>php/install.php</code> del servidor para evitar que alguien pueda reinstalar la aplicación.
            </div>
        </div>
    ');
    exit;
}

// ─── Vista formulario ─────────────────────────────────────────────────────────
$errorsHtml = '';
if (!empty($errors)) {
    $errorsHtml = '<div class="error-box"><ul>'
        . implode('', array_map(fn($e) => '<li>' . htmlspecialchars($e) . '</li>', $errors))
        . '</ul></div>';
}

$formHtml = $errorsHtml . '
<form method="POST">
    <div class="section-title">Base de datos</div>
    <div class="row">
        <div class="field" style="flex:3">
            <label>Host</label>
            <input type="text" name="db_host" value="' . h($d['db_host']) . '" required>
        </div>
        <div class="field" style="flex:1">
            <label>Puerto</label>
            <input type="number" name="db_port" value="' . h($d['db_port']) . '" required>
        </div>
    </div>
    <div class="field">
        <label>Nombre de la base de datos</label>
        <input type="text" name="db_name" value="' . h($d['db_name']) . '" required>
        <small>Solo letras, números, guion bajo (_) y guion medio (-).</small>
    </div>
    <div class="row">
        <div class="field">
            <label>Usuario</label>
            <input type="text" name="db_user" value="' . h($d['db_user']) . '" required autocomplete="username">
        </div>
        <div class="field">
            <label>Contraseña</label>
            <input type="password" name="db_password" value="" autocomplete="current-password">
        </div>
    </div>

    <div class="section-title" style="margin-top:1.5rem">Cuenta de administrador</div>
    <div class="field">
        <label>Nombre</label>
        <input type="text" name="admin_name" value="' . h($d['admin_name']) . '" required>
    </div>
    <div class="field">
        <label>Email</label>
        <input type="email" name="admin_email" value="' . h($d['admin_email']) . '" required autocomplete="email">
    </div>
    <div class="row">
        <div class="field">
            <label>Contraseña <small>(mínimo 8 caracteres)</small></label>
            <input type="password" name="admin_password" required autocomplete="new-password">
        </div>
        <div class="field">
            <label>Confirmar contraseña</label>
            <input type="password" name="admin_confirm" required autocomplete="new-password">
        </div>
    </div>

    <button type="submit">Instalar</button>
</form>';

renderPage(APP_NAME . ' — Instalador', '
    <div class="card">
        <div class="logo">' . h(APP_NAME) . '</div>
        <h2>Instalación de ' . h(APP_NAME) . '</h2>
        <p class="subtitle">Configura la base de datos y crea tu cuenta de administrador.</p>
        ' . $formHtml . '
    </div>
');

// ─── Helpers ──────────────────────────────────────────────────────────────────
function h(string $s): string {
    return htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
}

function try_delete_installer(): string {
    $installerPath = __FILE__;

    // Primer intento directo
    if (@unlink($installerPath)) {
        return 'Eliminado automaticamente';
    }

    // Fallback: intentar al finalizar la respuesta
    register_shutdown_function(static function () use ($installerPath): void {
        @unlink($installerPath);
    });

    return 'No se pudo eliminar en caliente; se programo un intento al finalizar la respuesta. Si sigue existiendo, elimina manualmente.';
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
      align-items: center;
      justify-content: center;
      padding: 2rem 1rem;
    }
    .card {
      background: #1a1a24;
      border: 1px solid #2d2d3d;
      border-radius: 12px;
      padding: 2.5rem;
      width: 100%;
      max-width: 560px;
    }
    .card.success { border-color: #4ade80; }
    .logo {
      font-size: 1.6rem;
      font-weight: 700;
      color: #9b87f5;
      letter-spacing: .05em;
      margin-bottom: .5rem;
    }
    h2 { font-size: 1.25rem; margin-bottom: .4rem; }
    .subtitle { color: #94a3b8; font-size: .9rem; margin-bottom: 1.5rem; }
    .section-title {
      font-size: .75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: .08em;
      color: #9b87f5;
      margin-bottom: .75rem;
      border-bottom: 1px solid #2d2d3d;
      padding-bottom: .4rem;
    }
    .row { display: flex; gap: 1rem; }
    .field { display: flex; flex-direction: column; gap: .35rem; margin-bottom: 1rem; flex: 1; }
    label { font-size: .85rem; color: #94a3b8; font-weight: 500; }
    small { font-size: .75rem; color: #64748b; }
    input {
      background: #0f0f13;
      border: 1px solid #2d2d3d;
      border-radius: 6px;
      padding: .55rem .75rem;
      color: #e2e8f0;
      font-size: .9rem;
      outline: none;
      transition: border-color .15s;
    }
    input:focus { border-color: #9b87f5; }
    button {
      width: 100%;
      background: #9b87f5;
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: .75rem;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      margin-top: .5rem;
      transition: background .15s;
    }
    button:hover { background: #7c69d4; }
    .error-box {
      background: rgba(239,68,68,.1);
      border: 1px solid rgba(239,68,68,.4);
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1.25rem;
      color: #fca5a5;
      font-size: .875rem;
    }
    .error-box ul { padding-left: 1.2rem; }
    .error-box li { margin-bottom: .25rem; }
    .check {
      font-size: 3rem;
      color: #4ade80;
      margin-bottom: .75rem;
    }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: .9rem; }
    th, td { padding: .5rem .75rem; text-align: left; border-bottom: 1px solid #2d2d3d; }
    th { color: #94a3b8; width: 40%; }
    a { color: #9b87f5; text-decoration: none; }
    a:hover { text-decoration: underline; }
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
    code {
      background: #0f0f13;
      border: 1px solid #2d2d3d;
      border-radius: 4px;
      padding: .1em .4em;
      font-size: .85em;
    }
  </style>
</head>
<body>
  ' . $body . '
</body>
</html>';
}
