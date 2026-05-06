<?php
/**
 * Media Gallery API
 * Endpoints: GET, POST, DELETE
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/helpers/Response.php';

// Handle CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    exit(0);
}

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

$uploadDir = __DIR__ . '/../uploads';
$publicBase = '/php/uploads';

$allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
$maxBytes = 2 * 1024 * 1024;

try {
    $db = new Database();
    $conn = $db->getConnection();
    switch ($method) {
        case 'GET':
            getMedia($conn, $id);
            break;
        case 'POST':
            uploadMedia($conn, $uploadDir, $publicBase, $allowedTypes, $maxBytes);
            break;
        case 'PUT':
            if (!$id) {
                Response::error('ID requerido');
            }
            updateMedia($conn, $id);
            break;
        case 'DELETE':
            if (!$id) {
                Response::error('ID requerido');
            }
            deleteMedia($conn, $uploadDir, $id);
            break;
        default:
            Response::error('Método no permitido', 405);
    }
} catch (Exception $e) {
    Response::serverError($e->getMessage());
}

// ============== FUNCTIONS ==============

function getMedia($conn, $id = null) {
    if ($id) {
        $stmt = $conn->prepare("SELECT * FROM media_gallery WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) {
            Response::notFound('Imagen no encontrada');
            return;
        }
        Response::success(transformMediaRow($row));
        return;
    }

    $stmt = $conn->query("SELECT * FROM media_gallery ORDER BY created_at DESC");
    $rows = $stmt->fetchAll();
    $items = array_map('transformMediaRow', $rows);
    Response::success($items);
}

function uploadMedia($conn, $uploadDir, $publicBase, $allowedTypes, $maxBytes) {
    if (!isset($_FILES['file'])) {
        Response::error('Archivo requerido');
    }

    $file = $_FILES['file'];
    if ($file['error'] !== UPLOAD_ERR_OK) {
        Response::error('Error al subir el archivo');
    }

    if ($file['size'] > $maxBytes) {
        Response::error('La imagen supera 2MB');
    }

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    if (!in_array($mimeType, $allowedTypes, true)) {
        Response::error('Formato no soportado. Usa JPG, PNG o WebP.');
    }

    if (!is_dir($uploadDir)) {
        if (!mkdir($uploadDir, 0775, true) && !is_dir($uploadDir)) {
            Response::serverError('No se pudo crear la carpeta de uploads');
        }
    }

    $image = createImageFromFile($file['tmp_name'], $mimeType);
    if (!$image) {
        Response::error('No se pudo procesar la imagen');
    }

    if (!function_exists('imagewebp')) {
        Response::serverError('El servidor no soporta WebP');
    }

    $id = 'img-' . time() . '-' . bin2hex(random_bytes(4));

    $originalBase = pathinfo($file['name'], PATHINFO_FILENAME);
    $trans = @iconv('UTF-8', 'ASCII//TRANSLIT', $originalBase);
    $sanitized = $trans !== false ? $trans : $originalBase;
    $sanitized = preg_replace('/[^A-Za-z0-9\-]+/', '-', $sanitized);
    $sanitized = strtolower(trim($sanitized, '-'));
    $sanitized = preg_replace('/-+/', '-', $sanitized);
    $sanitized = substr($sanitized, 0, 200);
    if (empty($sanitized)) {
        $sanitized = $id;
    }

    $filenameBase = $sanitized;
    $filename = $filenameBase . '.webp';
    $candidateUrl = $publicBase . '/' . $filename;
    $i = 1;
    $checkStmt = $conn->prepare("SELECT COUNT(*) FROM media_gallery WHERE url = ?");
    while (file_exists($uploadDir . '/' . $filename)) {
        $filename = $filenameBase . '-' . $i . '.webp';
        $candidateUrl = $publicBase . '/' . $filename;
        $i++;
    }
    // Also ensure DB doesn't already have this URL
    $i = 1;
    while (true) {
        $checkStmt->execute([$candidateUrl]);
        $count = (int) $checkStmt->fetchColumn();
        if ($count === 0) break;
        $filename = $filenameBase . '-' . $i . '.webp';
        $candidateUrl = $publicBase . '/' . $filename;
        $i++;
    }

    $path = $uploadDir . '/' . $filename;

    imagewebp($image, $path, 85);
    imagedestroy($image);

    $sizeBytes = filesize($path) ?: 0;
    if ($sizeBytes > $maxBytes) {
        unlink($path);
        Response::error('La imagen convertida supera 2MB');
    }

    $item = [
        'id' => $id,
        'name' => pathinfo($file['name'], PATHINFO_FILENAME),
        'url' => $publicBase . '/' . $filename,
        'sizeBytes' => $sizeBytes,
        'createdAt' => date('c')
    ];

    $stmt = $conn->prepare("INSERT INTO media_gallery (id, name, url, size_bytes) VALUES (?, ?, ?, ?)");
    $stmt->execute([
        $item['id'],
        $item['name'],
        $item['url'],
        $item['sizeBytes']
    ]);

    Response::success($item, 'Imagen subida');
}

function updateMedia($conn, $id) {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) {
        Response::error('Datos inválidos');
    }

    $stmt = $conn->prepare("SELECT * FROM media_gallery WHERE id = ?");
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) {
        Response::notFound('Imagen no encontrada');
        return;
    }

    $name = $data['name'] ?? $row['name'];
    $altText = $data['altText'] ?? ($row['alt_text'] ?? null);
    $description = $data['description'] ?? ($row['description'] ?? null);

    $updateStmt = $conn->prepare("UPDATE media_gallery SET name = ?, alt_text = ?, description = ? WHERE id = ?");
    $updateStmt->execute([$name, $altText, $description, $id]);

    Response::success(transformMediaRow([
        'id' => $row['id'],
        'name' => $name,
        'alt_text' => $altText,
        'description' => $description,
        'url' => $row['url'],
        'size_bytes' => $row['size_bytes'],
        'created_at' => $row['created_at']
    ]), 'Imagen actualizada');
}

function deleteMedia($conn, $uploadDir, $id) {
    $stmt = $conn->prepare("SELECT * FROM media_gallery WHERE id = ?");
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) {
        Response::notFound('Imagen no encontrada');
    }

    $url = $row['url'] ?? '';
    $basename = basename($url);
    $filePath = $uploadDir . '/' . $basename;
    if (is_file($filePath)) {
        unlink($filePath);
    }

    $delStmt = $conn->prepare("DELETE FROM media_gallery WHERE id = ?");
    $delStmt->execute([$id]);
    Response::success(null, 'Imagen eliminada');
}

function transformMediaRow($row) {
    return [
        'id' => $row['id'],
        'name' => $row['name'],
        'altText' => $row['alt_text'] ?? null,
        'description' => $row['description'] ?? null,
        'url' => $row['url'],
        'sizeBytes' => (int) $row['size_bytes'],
        'createdAt' => $row['created_at']
    ];
}

function createImageFromFile($path, $mimeType) {
    switch ($mimeType) {
        case 'image/jpeg':
            return imagecreatefromjpeg($path);
        case 'image/png':
            return imagecreatefrompng($path);
        case 'image/webp':
            return imagecreatefromwebp($path);
        default:
            return null;
    }
}
