<?php
/**
 * uploads.php — Subida de archivos
 * GET  ?action=list&folder=...  → listar archivos por carpeta
 * POST multipart/form-data:
 *   - file:   archivo (requerido)
 *   - folder: subcarpeta destino (ej: "services", "products", "logos") — default "misc"
 * POST multipart/form-data?action=delete:
 *   - filename: nombre de archivo a eliminar
 *   - folder:   subcarpeta
 *
 * Retorna: { url, name, mime, size }
 *
 * Los archivos se guardan en php/uploads/{folder}/{nombre_unico}
 * La URL devuelta es relativa al servidor: /php/uploads/{folder}/{nombre}
 * Ajusta BASE_URL según el despliegue.
 */
require_once __DIR__ . '/helpers/bootstrap.php';

handle_preflight();
set_cors_headers();

$conn     = get_db_connection();
$method   = $_SERVER['REQUEST_METHOD'];
$authUser = require_auth();

// ── Configuración ─────────────────────────────────────────────────────────────
define('UPLOAD_BASE_DIR', __DIR__ . '/../../uploads');
define('MAX_FILE_SIZE', 10 * 1024 * 1024); // 10 MB

$ALLOWED_MIME = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'application/pdf',
];

function normalize_upload_folder(string $value): string {
    $folder = preg_replace('/[^a-z0-9_\-]/', '', strtolower($value));
    return $folder ?: 'misc';
}

function build_upload_public_url(string $folder, string $filename): string {
    $scheme   = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? 'https' : 'http';
    $host     = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $scriptDir = dirname(dirname($_SERVER['SCRIPT_NAME']));
    $baseUrl  = $scheme . '://' . $host . rtrim($scriptDir, '/');
    return $baseUrl . '/uploads/' . $folder . '/' . $filename;
}

if ($method === 'GET') {
    $action = $_GET['action'] ?? '';
    if ($action !== 'list') Response::error('Metodo no permitido', 405);

    $folder = normalize_upload_folder($_GET['folder'] ?? 'misc');
    $targetDir = UPLOAD_BASE_DIR . '/' . $folder;

    if (!is_dir($targetDir)) {
        Response::success([], 'Sin archivos');
    }

    $files = [];
    $items = @scandir($targetDir) ?: [];
    foreach ($items as $item) {
        if ($item === '.' || $item === '..') continue;
        $path = $targetDir . '/' . $item;
        if (!is_file($path)) continue;

        $files[] = [
            'filename' => $item,
            'folder' => $folder,
            'size' => filesize($path) ?: 0,
            'mimeType' => mime_content_type($path) ?: 'application/octet-stream',
            'created_at' => date('c', filemtime($path) ?: time()),
            'secure_url' => build_upload_public_url($folder, rawurlencode($item)),
        ];
    }

    usort($files, function ($a, $b) {
        return strtotime($b['created_at']) <=> strtotime($a['created_at']);
    });

    Response::success($files);
}

if ($method !== 'POST') Response::error('Metodo no permitido', 405);

$action = $_GET['action'] ?? ($_POST['action'] ?? '');
if ($action === 'delete') {
    $folder = normalize_upload_folder($_POST['folder'] ?? 'misc');
    $filename = basename((string)($_POST['filename'] ?? ''));
    if ($filename === '') {
        Response::error('filename es requerido');
    }

    $targetPath = UPLOAD_BASE_DIR . '/' . $folder . '/' . $filename;
    if (!is_file($targetPath)) {
        Response::notFound('Archivo no encontrado');
    }

    if (!unlink($targetPath)) {
        Response::serverError('No se pudo eliminar el archivo');
    }

    Response::success(null, 'Archivo eliminado correctamente');
}

// ── Validaciones ──────────────────────────────────────────────────────────────
if (empty($_FILES['file'])) {
    Response::error('No se recibio ningun archivo');
}

$file   = $_FILES['file'];
$folder = normalize_upload_folder($_POST['folder'] ?? 'misc');

if ($file['error'] !== UPLOAD_ERR_OK) {
    $errMsg = [
        UPLOAD_ERR_INI_SIZE   => 'Archivo demasiado grande (limite php.ini)',
        UPLOAD_ERR_FORM_SIZE  => 'Archivo demasiado grande (limite formulario)',
        UPLOAD_ERR_PARTIAL    => 'Subida incompleta',
        UPLOAD_ERR_NO_FILE    => 'No se selecciono archivo',
        UPLOAD_ERR_NO_TMP_DIR => 'Carpeta temporal no disponible',
        UPLOAD_ERR_CANT_WRITE => 'No se pudo escribir el archivo',
    ];
    Response::error($errMsg[$file['error']] ?? 'Error al subir archivo');
}

if ($file['size'] > MAX_FILE_SIZE) {
    Response::error('El archivo supera el limite de 10MB');
}

// Validar tipo MIME real (no solo la extension)
$finfo    = new finfo(FILEINFO_MIME_TYPE);
$realMime = $finfo->file($file['tmp_name']);
if (!in_array($realMime, $ALLOWED_MIME, true)) {
    Response::error('Tipo de archivo no permitido: ' . $realMime);
}

// ── Generar nombre único — extensión desde MIME, no desde el nombre del archivo ──
$MIME_TO_EXT = [
    'image/jpeg'       => 'jpg',
    'image/png'        => 'png',
    'image/gif'        => 'gif',
    'image/webp'       => 'webp',
    'image/svg+xml'    => 'svg',
    'application/pdf'  => 'pdf',
];
$ext      = $MIME_TO_EXT[$realMime] ?? 'bin';
$safeName = bin2hex(random_bytes(16)) . '.' . $ext;

$targetDir = UPLOAD_BASE_DIR . '/' . $folder;
if (!is_dir($targetDir)) {
    if (!mkdir($targetDir, 0755, true)) {
        Response::serverError('No se pudo crear la carpeta de destino');
    }
}

$targetPath = $targetDir . '/' . $safeName;

if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
    Response::serverError('Error al guardar el archivo');
}

$publicUrl = build_upload_public_url($folder, rawurlencode($safeName));

Response::success([
    'url'    => $publicUrl,
    'name'   => $safeName,
    'mime'   => $realMime,
    'size'   => $file['size'],
    'folder' => $folder,
], 'Archivo subido correctamente');
