<?php
/**
 * Custom Pages API
 * Endpoints: GET, POST, PUT, DELETE
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

$db = new Database();
$conn = $db->getConnection();

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;
$slug = $_GET['slug'] ?? null;

try {
    switch ($method) {
        case 'GET':
            if ($slug) {
                getPageBySlug($conn, $slug);
            } elseif ($id) {
                getPage($conn, $id);
            } else {
                getPages($conn);
            }
            break;
            
        case 'POST':
            createPage($conn);
            break;
            
        case 'PUT':
            if (!$id) {
                Response::error('ID de página requerido');
            }
            updatePage($conn, $id);
            break;
            
        case 'DELETE':
            if (!$id) {
                Response::error('ID de página requerido');
            }
            deletePage($conn, $id);
            break;
            
        default:
            Response::error('Método no permitido', 405);
    }
} catch (Exception $e) {
    Response::serverError($e->getMessage());
}

// ============== FUNCTIONS ==============

function getPages($conn) {
    $status = $_GET['status'] ?? null;
    $navigation = isset($_GET['navigation']) ? filter_var($_GET['navigation'], FILTER_VALIDATE_BOOLEAN) : null;
    
    $sql = "SELECT * FROM custom_pages WHERE 1=1";
    $params = [];
    
    if ($status) {
        $sql .= " AND status = ?";
        $params[] = $status;
    }
    
    if ($navigation !== null) {
        $sql .= " AND show_in_navigation = ?";
        $params[] = $navigation ? 1 : 0;
    }
    
    $sql .= " ORDER BY navigation_order ASC, title ASC";
    
    $stmt = $conn->prepare($sql);
    $stmt->execute($params);
    $pages = $stmt->fetchAll();
    
    // Transform to frontend format
    foreach ($pages as &$page) {
        $page = transformPage($page);
    }
    
    Response::success($pages);
}

function getPage($conn, $id) {
    $stmt = $conn->prepare("SELECT * FROM custom_pages WHERE id = ?");
    $stmt->execute([$id]);
    $page = $stmt->fetch();
    
    if (!$page) {
        Response::notFound('Página no encontrada');
    }
    
    Response::success(transformPage($page));
}

function getPageBySlug($conn, $slug) {
    $stmt = $conn->prepare("SELECT * FROM custom_pages WHERE slug = ?");
    $stmt->execute([$slug]);
    $page = $stmt->fetch();
    
    if (!$page) {
        Response::notFound('Página no encontrada');
    }
    
    Response::success(transformPage($page));
}

function createPage($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data || empty($data['title']) || empty($data['slug'])) {
        Response::error('Título y slug requeridos');
    }
    
    // Check slug uniqueness
    $checkStmt = $conn->prepare("SELECT id FROM custom_pages WHERE slug = ?");
    $checkStmt->execute([$data['slug']]);
    if ($checkStmt->fetch()) {
        Response::error('Ya existe una página con este slug');
    }
    
    $id = 'page-' . time();
    
    $stmt = $conn->prepare("
        INSERT INTO custom_pages (
            id, title, slug, description, status, 
            show_in_navigation, navigation_order, sections
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ");
    
    $stmt->execute([
        $id,
        $data['title'],
        $data['slug'],
        $data['description'] ?? '',
        $data['status'] ?? 'draft',
        ($data['showInNavigation'] ?? false) ? 1 : 0,
        $data['navigationOrder'] ?? 0,
        json_encode($data['sections'] ?? [], JSON_UNESCAPED_UNICODE)
    ]);
    
    Response::success(['id' => $id], 'Página creada exitosamente');
}

function updatePage($conn, $id) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Check if page exists
    $checkStmt = $conn->prepare("SELECT id FROM custom_pages WHERE id = ?");
    $checkStmt->execute([$id]);
    if (!$checkStmt->fetch()) {
        Response::notFound('Página no encontrada');
    }
    
    // Check slug uniqueness if changing
    if (!empty($data['slug'])) {
        $slugStmt = $conn->prepare("SELECT id FROM custom_pages WHERE slug = ? AND id != ?");
        $slugStmt->execute([$data['slug'], $id]);
        if ($slugStmt->fetch()) {
            Response::error('Ya existe una página con este slug');
        }
    }
    
    $fields = [];
    $params = [];
    
    $fieldMap = [
        'title' => 'title',
        'slug' => 'slug',
        'description' => 'description',
        'status' => 'status',
        'showInNavigation' => 'show_in_navigation',
        'navigationOrder' => 'navigation_order',
        'sections' => 'sections'
    ];
    
    foreach ($fieldMap as $jsField => $dbField) {
        if (isset($data[$jsField])) {
            $fields[] = "$dbField = ?";
            $value = $data[$jsField];
            
            if ($jsField === 'showInNavigation') {
                $value = $value ? 1 : 0;
            } elseif ($jsField === 'sections') {
                $value = json_encode($value, JSON_UNESCAPED_UNICODE);
            }
            
            $params[] = $value;
        }
    }
    
    if (!empty($fields)) {
        $params[] = $id;
        $sql = "UPDATE custom_pages SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
    }
    
    Response::success(['id' => $id], 'Página actualizada exitosamente');
}

function deletePage($conn, $id) {
    $stmt = $conn->prepare("DELETE FROM custom_pages WHERE id = ?");
    $stmt->execute([$id]);
    
    if ($stmt->rowCount() === 0) {
        Response::notFound('Página no encontrada');
    }
    
    Response::success(null, 'Página eliminada exitosamente');
}

function transformPage($page) {
    return [
        'id' => $page['id'],
        'title' => $page['title'],
        'slug' => $page['slug'],
        'description' => $page['description'],
        'status' => $page['status'],
        'showInNavigation' => (bool) $page['show_in_navigation'],
        'navigationOrder' => (int) $page['navigation_order'],
        'sections' => json_decode($page['sections'], true) ?: [],
        'createdAt' => $page['created_at'],
        'updatedAt' => $page['updated_at']
    ];
}