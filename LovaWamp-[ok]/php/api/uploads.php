<?php
require_once __DIR__ . '/helpers/bootstrap.php';

handle_preflight();
set_cors_headers();
start_session_if_needed();
require_admin();

$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'POST') {
    Response::error('Metodo no permitido', 405);
}

try {
    if (!isset($_FILES['file'])) {
        Response::error('Archivo requerido');
    }

    $file = $_FILES['file'];
    if ((int) $file['error'] !== UPLOAD_ERR_OK) {
        Response::error('Error al subir el archivo');
    }

    $maxBytes = 5 * 1024 * 1024;
    if ((int) $file['size'] > $maxBytes) {
        Response::error('El archivo supera 5MB');
    }

    $allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    if (!in_array($mime, $allowed, true)) {
        Response::error('Formato no soportado');
    }

    $folder = trim((string) ($_POST['folder'] ?? 'general'));
    $folder = preg_replace('/[^A-Za-z0-9_\-\/]/', '', $folder);
    if ($folder === '') {
        $folder = 'general';
    }

    $uploadRoot = realpath(__DIR__ . '/../uploads');
    if ($uploadRoot === false) {
        $uploadRoot = __DIR__ . '/../uploads';
        if (!is_dir($uploadRoot)) {
            mkdir($uploadRoot, 0775, true);
        }
    }

    $targetDir = rtrim($uploadRoot, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $folder;
    if (!is_dir($targetDir) && !mkdir($targetDir, 0775, true) && !is_dir($targetDir)) {
        Response::serverError('No se pudo crear la carpeta de destino');
    }

    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if ($ext === '') {
        $map = [
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            'image/svg+xml' => 'svg',
        ];
        $ext = $map[$mime] ?? 'bin';
    }

    $name = date('YmdHis') . '-' . bin2hex(random_bytes(5)) . '.' . $ext;
    $targetPath = $targetDir . DIRECTORY_SEPARATOR . $name;

    if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
        Response::serverError('No se pudo guardar el archivo');
    }

    $publicBase = getenv('UPLOAD_PUBLIC_BASE');
    if (!$publicBase) {
        // Deriva base desde la ruta del script: /lovawamp/php/api/uploads.php -> /lovawamp/php/uploads
        $scriptDir = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? ''));
        $phpBase = preg_replace('#/api$#', '', rtrim($scriptDir, '/'));
        $publicBase = ($phpBase ?: '/php') . '/uploads';
    }
    $publicBase = rtrim($publicBase, '/');
    $url = $publicBase . '/' . trim($folder, '/') . '/' . $name;

    Response::success([
        'url' => $url,
        'name' => $name,
        'mime' => $mime,
        'size' => (int) $file['size'],
    ], 'Archivo subido');
} catch (Exception $e) {
    Response::serverError($e->getMessage());
}
