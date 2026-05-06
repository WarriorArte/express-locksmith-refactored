<?php
/**
 * Secure File Upload System with Multi-Tenant Support
 * Version: 3.0
 * 
 * Features:
 * - Rate limiting protection
 * - Automatic WebP conversion with resize optimization
 * - Multi-tenant folder isolation (workshopId__folderType)
 * - Structured naming conventions
 * - Gallery listing functionality
 * - Health check endpoint
 * - Enhanced error handling
 */

// ============================================
// CONFIGURATION
// ============================================

// Allowed origins for CORS
define('ALLOWED_ORIGINS', '*');

// File constraints
define('MAX_FILE_SIZE', 10 * 1024 * 1024); // 10MB
define('WEBP_QUALITY', 75); // Compresión WebP

// Rate limiting
define('RATE_LIMIT_UPLOADS', 20); // Max uploads per minute
define('RATE_LIMIT_REQUESTS', 60); // Max requests per minute
define('RATE_LIMIT_FILE', sys_get_temp_dir() . '/upload_rate_limit.json');

// Logging
define('ENABLE_LOGGING', true);
define('LOG_FILE', dirname(__FILE__) . '/upload.log');

// Allowed MIME types
define('ALLOWED_MIME_TYPES', [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf'
]);

// Uploads directory (PRIVATE - fuera de public)
define('UPLOAD_DIR', dirname(__DIR__, 2) . '/private_uploads/');

// ============================================
// CORS HEADERS
// ============================================

header('Access-Control-Allow-Origin: ' . ALLOWED_ORIGINS);
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Max-Age: 86400');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function logMessage($message, $level = 'INFO') {
    if (!ENABLE_LOGGING) return;
    
    $timestamp = date('Y-m-d H:i:s');
    $ip = getClientIP();
    $logEntry = "[{$timestamp}] [{$level}] [IP: {$ip}] {$message}\n";
    
    @file_put_contents(LOG_FILE, $logEntry, FILE_APPEND);
}

function getClientIP() {
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    if (isset($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $ip = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0];
    }
    return trim($ip);
}

function checkRateLimit($action = 'request') {
    $ip = getClientIP();
    $now = time();
    
    // Leer data de rate limit
    $data = [];
    if (file_exists(RATE_LIMIT_FILE)) {
        $content = @file_get_contents(RATE_LIMIT_FILE);
        if ($content) {
            $data = json_decode($content, true) ?: [];
        }
    }
    
    // Limpiar entradas antiguas (más de 1 minuto)
    $data = array_filter($data, function($entry) use ($now) {
        return isset($entry['reset']) && $entry['reset'] > $now;
    });
    
    // Inicializar o actualizar contador
    if (!isset($data[$ip])) {
        $data[$ip] = [
            'uploads' => 0,
            'requests' => 0,
            'reset' => $now + 60
        ];
    }
    
    // Incrementar contador
    if ($action === 'upload') {
        $data[$ip]['uploads']++;
    }
    $data[$ip]['requests']++;
    
    // Verificar límites
    $uploadLimit = $data[$ip]['uploads'] > RATE_LIMIT_UPLOADS;
    $requestLimit = $data[$ip]['requests'] > RATE_LIMIT_REQUESTS;
    
    // Guardar data
    @file_put_contents(RATE_LIMIT_FILE, json_encode($data));
    
    if ($uploadLimit || $requestLimit) {
        logMessage("Rate limit exceeded - Action: {$action}", 'WARNING');
        jsonResponse([
            'success' => false,
            'error' => 'Too many requests. Please try again in a minute.',
            'retry_after' => 60
        ], 429);
    }
    
    return true;
}

function generateAccessToken($filename, $folder, $expiry = TOKEN_EXPIRY) {
    // YA NO NECESARIO - URLs públicas directas
    return null;
}

function validateAccessToken($token, $filename, $folder) {
    // YA NO NECESARIO - servimos directamente sin tokens
    return true;
}

function getMimeType($filepath) {
    if (!file_exists($filepath)) {
        return false;
    }
    
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    if (!$finfo) {
        logMessage("Failed to open finfo", 'ERROR');
        return false;
    }
    
    $mime = finfo_file($finfo, $filepath);
    finfo_close($finfo);
    
    return $mime ?: false;
}

function validateMimeType($mime) {
    if (!$mime) return false;
    return in_array($mime, ALLOWED_MIME_TYPES);
}

function sanitizeFilename($filename) {
    // Remover cualquier carácter peligroso
    $filename = preg_replace('/[^a-zA-Z0-9._-]/', '', $filename);
    // Prevenir archivos ocultos
    $filename = ltrim($filename, '.');
    // Limitar longitud
    return substr($filename, 0, 200);
}

function sanitizeFolderName($folder) {
    // Solo permitir alfanumérico, guiones y underscores (para UUIDs)
    $folder = preg_replace('/[^a-zA-Z0-9_-]/', '', $folder);
    return substr($folder, 0, 100);
}

function ensureDirectoryExists($path) {
    // Validar que el path esté dentro de UPLOAD_DIR
    $realPath = realpath(dirname($path));
    $uploadDir = realpath(UPLOAD_DIR);
    
    if ($realPath && $uploadDir && strpos($realPath, $uploadDir) !== 0) {
        logMessage("Directory traversal attempt detected: {$path}", 'SECURITY');
        return false;
    }
    
    if (!is_dir($path)) {
        if (!mkdir($path, 0755, true)) {
            logMessage("Failed to create directory: {$path}", 'ERROR');
            return false;
        }
        logMessage("Created directory: {$path}", 'INFO');
    }
    return true;
}

function getScriptUrl() {
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'];
    $scriptPath = dirname($_SERVER['SCRIPT_NAME']);
    return $protocol . '://' . $host . $scriptPath;
}

function extractFolderType($folder) {
    $parts = explode('__', $folder);
    return count($parts) > 1 ? $parts[1] : $parts[0];
}

function buildHierarchicalPath($folder) {
    // Si el folder tiene formato workshopId__folderType
    $parts = explode('__', $folder);
    
    if (count($parts) === 2) {
        $workshopId = $parts[0];
        $folderType = $parts[1];
        return $workshopId . '/' . $folderType;
    }
    
    // Fallback: usar 'default' como workshop y el folder como tipo
    return 'default/' . $folder;
}

function parseHierarchicalFolder($folder) {
    $parts = explode('__', $folder);
    
    if (count($parts) === 2) {
        return [
            'workshopId' => $parts[0],
            'folderType' => $parts[1],
            'path' => $parts[0] . '/' . $parts[1]
        ];
    }
    
    return [
        'workshopId' => 'default',
        'folderType' => $folder,
        'path' => 'default/' . $folder
    ];
}

function getMaxDimensions($folder) {
    $folderType = extractFolderType($folder);
    
    switch ($folderType) {
        case 'avatars': return [400, 400];
        case 'logos': return [600, 600];
        case 'products': return [1200, 1200];
        case 'services':
        case 'general':
        case 'documents':
        default: return [1600, 1600];
    }
}

function resizeImage($image, $maxWidth, $maxHeight) {
    if (!$image) return $image;
    
    $width = imagesx($image);
    $height = imagesy($image);
    
    if ($width <= $maxWidth && $height <= $maxHeight) return $image;
    
    $ratio = min($maxWidth / $width, $maxHeight / $height);
    $newWidth = (int)($width * $ratio);
    $newHeight = (int)($height * $ratio);
    
    $resized = imagecreatetruecolor($newWidth, $newHeight);
    if (!$resized) return $image;
    
    imagealphablending($resized, false);
    imagesavealpha($resized, true);
    $transparent = imagecolorallocatealpha($resized, 0, 0, 0, 127);
    imagefilledrectangle($resized, 0, 0, $newWidth, $newHeight, $transparent);
    
    if (!imagecopyresampled($resized, $image, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height)) {
        imagedestroy($resized);
        return $image;
    }
    
    imagedestroy($image);
    return $resized;
}

function convertToWebP($sourcePath, $destPath, $folder = 'general') {
    $hasGD = extension_loaded('gd');
    $hasWebP = $hasGD && function_exists('imagewebp') && function_exists('imagecreatefromwebp');
    
    $mime = getMimeType($sourcePath);
    
    // SVG and PDF: copy without conversion
    if ($mime === 'image/svg+xml' || $mime === 'application/pdf') {
        $ext = ($mime === 'image/svg+xml') ? '.svg' : '.pdf';
        $finalPath = preg_replace('/\.[^.]+$/', $ext, $destPath);
        if (copy($sourcePath, $finalPath)) {
            return ['success' => true, 'path' => $finalPath, 'converted' => false];
        }
        return ['success' => false, 'error' => 'Failed to copy file'];
    }
    
    // No GD: save original
    if (!$hasGD) {
        $ext = ['image/jpeg' => '.jpg', 'image/png' => '.png', 'image/gif' => '.gif', 'image/webp' => '.webp'][$mime] ?? '.bin';
        $finalPath = preg_replace('/\.[^.]+$/', $ext, $destPath);
        if (copy($sourcePath, $finalPath)) {
            return ['success' => true, 'path' => $finalPath, 'converted' => false];
        }
        return ['success' => false, 'error' => 'Failed to copy file (no GD)'];
    }
    
    // Create image resource
    $image = null;
    switch ($mime) {
        case 'image/jpeg': $image = @imagecreatefromjpeg($sourcePath); break;
        case 'image/png': $image = @imagecreatefrompng($sourcePath); break;
        case 'image/gif': $image = @imagecreatefromgif($sourcePath); break;
        case 'image/webp': if (function_exists('imagecreatefromwebp')) $image = @imagecreatefromwebp($sourcePath); break;
    }
    
    if (!$image) {
        $ext = ['image/jpeg' => '.jpg', 'image/png' => '.png', 'image/gif' => '.gif', 'image/webp' => '.webp'][$mime] ?? '.bin';
        $finalPath = preg_replace('/\.[^.]+$/', $ext, $destPath);
        if (copy($sourcePath, $finalPath)) {
            return ['success' => true, 'path' => $finalPath, 'converted' => false];
        }
        return ['success' => false, 'error' => 'Failed to create image resource'];
    }
    
    // Resize based on folder type
    list($maxW, $maxH) = getMaxDimensions($folder);
    $image = resizeImage($image, $maxW, $maxH);
    
    imagealphablending($image, true);
    imagesavealpha($image, true);
    
    // Try WebP
    if ($hasWebP) {
        $webpPath = preg_replace('/\.[^.]+$/', '.webp', $destPath);
        if (@imagewebp($image, $webpPath, WEBP_QUALITY)) {
            imagedestroy($image);
            return ['success' => true, 'path' => $webpPath, 'converted' => true];
        }
    }
    
    // Fallback to original format
    $success = false;
    $finalPath = $destPath;
    
    switch ($mime) {
        case 'image/jpeg':
            $finalPath = preg_replace('/\.[^.]+$/', '.jpg', $destPath);
            $success = @imagejpeg($image, $finalPath, 90);
            break;
        case 'image/png':
            $finalPath = preg_replace('/\.[^.]+$/', '.png', $destPath);
            $success = @imagepng($image, $finalPath, 9);
            break;
        case 'image/gif':
            $finalPath = preg_replace('/\.[^.]+$/', '.gif', $destPath);
            $success = @imagegif($image, $finalPath);
            break;
        default:
            $finalPath = preg_replace('/\.[^.]+$/', '.jpg', $destPath);
            $success = @imagejpeg($image, $finalPath, 90);
    }
    
    imagedestroy($image);
    
    return $success 
        ? ['success' => true, 'path' => $finalPath, 'converted' => false]
        : ['success' => false, 'error' => 'Failed to save image'];
}

function generateStructuredFilename($folder, $extension = 'webp') {
    $folderType = extractFolderType($folder);
    $date = date('Ymd');
    $time = date('His');
    $randomId = bin2hex(random_bytes(4));
    return "{$folderType}_{$date}_{$time}_{$randomId}.{$extension}";
}

function listFiles($folder) {
    $hierarchical = buildHierarchicalPath($folder);
    $path = UPLOAD_DIR . $hierarchical;
    
    if (!is_dir($path)) return [];
    
    $files = [];
    $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'pdf'];
    
    foreach (scandir($path) as $item) {
        if ($item === '.' || $item === '..') continue;
        
        $filePath = $path . '/' . $item;
        if (!is_file($filePath)) continue;
        
        $ext = strtolower(pathinfo($item, PATHINFO_EXTENSION));
        if (!in_array($ext, $allowedExtensions)) continue;
        
        $files[] = [
            'filename' => $item,
            'folder' => $folder,
            'size' => filesize($filePath),
            'mimeType' => getMimeType($filePath),
            'created_at' => date('c', filemtime($filePath)),
            'secure_url' => getScriptUrl() . '/upload.php?file=' . urlencode($item) . '&folder=' . urlencode($folder),
            'access_token' => null
        ];
    }
    
    usort($files, fn($a, $b) => strtotime($b['created_at']) - strtotime($a['created_at']));
    return $files;
}

function listFilesPublic($folder) {
    return listFiles($folder);
}

// ============================================
// RATE LIMITING CHECK
// ============================================

checkRateLimit('request');

// ============================================
// GET REQUESTS - SOLO API (archivos se sirven estaticamente)
// ============================================

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Health check endpoint
    if (isset($_GET['health'])) {
        logMessage('Health check request');
        jsonResponse([
            'success' => true,
            'status' => 'healthy',
            'version' => '3.0',
            'timestamp' => time(),
            'php_version' => PHP_VERSION,
            'gd_support' => extension_loaded('gd'),
            'webp_support' => function_exists('imagewebp'),
            'upload_dir_writable' => is_writable(UPLOAD_DIR),
            'max_file_size' => MAX_FILE_SIZE,
            'rate_limits' => [
                'uploads_per_minute' => RATE_LIMIT_UPLOADS,
                'requests_per_minute' => RATE_LIMIT_REQUESTS
            ]
        ]);
    }
    
    // Serve file endpoint (para archivos en carpeta privada)
    if (isset($_GET['file']) && isset($_GET['folder'])) {
        $filename = sanitizeFilename(basename($_GET['file']));
        $folder = sanitizeFolderName($_GET['folder']);
        
        if (empty($filename) || empty($folder)) {
            logMessage("Invalid file request - empty params", 'WARNING');
            http_response_code(400);
            exit('Invalid request');
        }
        
        $hierarchical = buildHierarchicalPath($folder);
        $filepath = UPLOAD_DIR . $hierarchical . '/' . $filename;
        
        // Verificar que el archivo existe
        if (!file_exists($filepath) || !is_file($filepath)) {
            logMessage("File not found: {$folder}/{$filename}", 'WARNING');
            http_response_code(404);
            exit('File not found');
        }
        
        // Verificar que el path real está dentro de UPLOAD_DIR (seguridad)
        $realPath = realpath($filepath);
        $uploadDir = realpath(UPLOAD_DIR);
        
        if (!$realPath || !$uploadDir || strpos($realPath, $uploadDir) !== 0) {
            logMessage("Security: Path traversal attempt - {$folder}/{$filename}", 'SECURITY');
            http_response_code(403);
            exit('Access denied');
        }
        
        // Obtener MIME type
        $mime = getMimeType($filepath);
        if (!$mime) {
            $mime = 'application/octet-stream';
        }
        
        // Headers para servir el archivo
        header('Content-Type: ' . $mime);
        header('Content-Length: ' . filesize($filepath));
        header('Cache-Control: public, max-age=31536000'); // 1 año de cache
        header('Expires: ' . gmdate('D, d M Y H:i:s', time() + 31536000) . ' GMT');
        
        // Si es imagen, permitir inline viewing
        if (strpos($mime, 'image/') === 0) {
            header('Content-Disposition: inline; filename="' . $filename . '"');
        } else {
            header('Content-Disposition: attachment; filename="' . $filename . '"');
        }
        
        // Servir el archivo
        readfile($filepath);
        exit;
    }
    // Batch token generation - retorna URLs públicas directas
    if (isset($_GET['action']) && $_GET['action'] === 'batch_tokens') {
        $input = json_decode(file_get_contents('php://input'), true);
        $files = $input['files'] ?? [];
        
        if (empty($files)) {
            jsonResponse(['success' => false, 'error' => 'No files provided'], 400);
        }
        
        $tokens = [];
        $baseUrl = '/uploads'; // URLs públicas - sin dominio
        
        foreach ($files as $file) {
            $filename = basename($file['filename'] ?? '');
            $folder = preg_replace('/[^a-zA-Z0-9_-]/', '', $file['folder'] ?? 'general');
            
            if (empty($filename)) continue;
            
            $filepath = UPLOAD_DIR . $folder . '/' . $filename;
            if (!file_exists($filepath)) continue;
            
            $tokens[] = [
                'filename' => $filename,
                'folder' => $folder,
                'token' => null, // Sin token - URL pública directa
                'secure_url' => $baseUrl . '/' . $folder . '/' . urlencode($filename)
            ];
        }
        
        jsonResponse(['success' => true, 'tokens' => $tokens, 'count' => count($tokens)]);
    }
    
    // List files - retorna URLs públicas
    if (isset($_GET['action']) && $_GET['action'] === 'list') {
        $folder = preg_replace('/[^a-zA-Z0-9_-]/', '', $_GET['folder'] ?? 'general');
        $files = listFilesPublic($folder);
        jsonResponse(['success' => true, 'files' => $files, 'count' => count($files)]);
    }
    
    // Server info
    jsonResponse([
        'success' => true,
        'message' => 'Secure Upload Server',
        'version' => '3.0',
        'mode' => 'public-direct',
        'gd_support' => extension_loaded('gd'),
        'webp_support' => function_exists('imagewebp')
    ]);
}

// ============================================
// POST REQUESTS
// ============================================

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Delete file
    if (isset($_POST['action']) && $_POST['action'] === 'delete') {
        $filename = sanitizeFilename(basename($_POST['filename'] ?? ''));
        $folder = sanitizeFolderName($_POST['folder'] ?? 'general');
        
        if (empty($filename)) {
            logMessage("Delete attempt with empty filename", 'WARNING');
            jsonResponse(['success' => false, 'error' => 'Filename required'], 400);
        }
        
        $hierarchical = buildHierarchicalPath($folder);
        $filepath = UPLOAD_DIR . $hierarchical . '/' . $filename;
        
        // Verify file exists
        if (!file_exists($filepath)) {
            jsonResponse(['success' => false, 'error' => 'File not found'], 404);
        }
        
        // Verify it's a file, not a directory
        if (!is_file($filepath)) {
            jsonResponse(['success' => false, 'error' => 'Invalid file'], 400);
        }
        
        // Try to delete the file
        if (@unlink($filepath)) {
            logMessage("File deleted: {$folder}/{$filename}", 'INFO');
            jsonResponse([
                'success' => true,
                'message' => 'File deleted successfully',
                'filename' => $filename,
                'folder' => $folder
            ]);
        } else {
            logMessage("Failed to delete file: {$folder}/{$filename}", 'ERROR');
            jsonResponse(['success' => false, 'error' => 'Failed to delete file'], 500);
        }
    }
    
    // Generate token for existing file
    if (isset($_POST['action']) && $_POST['action'] === 'get_token') {
        $filename = sanitizeFilename(basename($_POST['filename'] ?? ''));
        $folder = sanitizeFolderName($_POST['folder'] ?? 'general');
        
        $hierarchical = buildHierarchicalPath($folder);
        $filepath = UPLOAD_DIR . $hierarchical . '/' . $filename;
        if (!file_exists($filepath)) {
            jsonResponse(['success' => false, 'error' => 'File not found'], 404);
        }
        
        jsonResponse([
            'success' => true,
            'access_token' => null,
            'secure_url' => getScriptUrl() . '/upload.php?file=' . urlencode($filename) . '&folder=' . urlencode($folder)
        ]);
    }
    
    // File upload
    if (!isset($_FILES['file'])) {
        logMessage("Upload attempt without file", 'WARNING');
        jsonResponse(['success' => false, 'error' => 'No file provided'], 400);
    }
    
    $file = $_FILES['file'];
    $folder = sanitizeFolderName($_POST['folder'] ?? 'general');
    
    if ($file['error'] !== UPLOAD_ERR_OK) {
        $errors = [
            UPLOAD_ERR_INI_SIZE => 'File exceeds server limit',
            UPLOAD_ERR_FORM_SIZE => 'File exceeds form limit',
            UPLOAD_ERR_PARTIAL => 'File partially uploaded',
            UPLOAD_ERR_NO_FILE => 'No file uploaded',
            UPLOAD_ERR_NO_TMP_DIR => 'Missing temp directory',
            UPLOAD_ERR_CANT_WRITE => 'Failed to write file',
            UPLOAD_ERR_EXTENSION => 'Upload blocked by extension'
        ];
        jsonResponse(['success' => false, 'error' => $errors[$file['error']] ?? 'Unknown error'], 400);
    }
    
    if ($file['size'] > MAX_FILE_SIZE) {
        jsonResponse(['success' => false, 'error' => 'File too large. Max: ' . (MAX_FILE_SIZE / 1024 / 1024) . 'MB'], 400);
    }
    
    $mime = getMimeType($file['tmp_name']);
    if (!$mime) {
        logMessage("Failed to detect MIME type for file: {$file['name']}", 'ERROR');
        jsonResponse(['success' => false, 'error' => 'Could not detect file type'], 400);
    }
    
    if (!validateMimeType($mime)) {
        logMessage("Invalid MIME type rejected: {$mime} for file: {$file['name']}", 'WARNING');
        jsonResponse(['success' => false, 'error' => 'Invalid file type: ' . $mime], 400);
    }
    
    // Check rate limit specifically for uploads
    checkRateLimit('upload');
    
    $hierarchical = buildHierarchicalPath($folder);
    $uploadPath = UPLOAD_DIR . $hierarchical;
    
    if (!ensureDirectoryExists($uploadPath)) {
        jsonResponse(['success' => false, 'error' => 'Failed to create directory'], 500);
    }
    
    $tempFilename = generateStructuredFilename($folder, 'tmp');
    $tempPath = $uploadPath . '/' . $tempFilename;
    
    if (!move_uploaded_file($file['tmp_name'], $tempPath)) {
        jsonResponse(['success' => false, 'error' => 'Failed to move file'], 500);
    }
    
    $result = convertToWebP($tempPath, $tempPath, $folder);
    if (file_exists($tempPath)) @unlink($tempPath);
    
    if (!$result['success']) {
        jsonResponse(['success' => false, 'error' => $result['error'] ?? 'Failed to process image'], 500);
    }
    
    $finalPath = $result['path'];
    $finalFilename = basename($finalPath);
    $finalSize = filesize($finalPath);
    
    logMessage("Upload successful - File: {$finalFilename}, Size: {$finalSize} bytes, Folder: {$folder}", 'SUCCESS');
    
    $secureUrl = getScriptUrl() . '/upload.php?file=' . urlencode($finalFilename) . '&folder=' . urlencode($folder);
    
    jsonResponse([
        'success' => true,
        'secure_url' => $secureUrl,
        'access_token' => null,
        'filename' => $finalFilename,
        'folder' => $folder,
        'size' => $finalSize,
        'mimeType' => getMimeType($finalPath),
        'converted' => $result['converted']
    ]);
}

jsonResponse(['success' => false, 'error' => 'Method not allowed'], 405);
