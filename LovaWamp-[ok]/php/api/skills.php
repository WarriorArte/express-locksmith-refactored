<?php
require_once __DIR__ . '/helpers/bootstrap.php';

handle_preflight();
set_cors_headers();
start_session_if_needed();

$conn = get_db_connection();
$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

try {
    if ($method === 'GET') {
        if ($id) {
            $stmt = $conn->prepare('SELECT * FROM habilidades WHERE id = ? LIMIT 1');
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if (!$row) {
                Response::notFound('Habilidad no encontrada');
            }
            $row['es_software_skill'] = (bool) $row['es_software_skill'];
            Response::success($row);
        }

        $stmt = $conn->query('SELECT * FROM habilidades ORDER BY categoria_habilidad, created_at DESC');
        $rows = $stmt->fetchAll();
        $items = array_map(function ($row) {
            $row['es_software_skill'] = (bool) $row['es_software_skill'];
            return $row;
        }, $rows);

        Response::success($items);
    }

    if ($method === 'POST') {
        require_admin();
        $data = get_json_input();

        if (empty($data['nombre']) || empty($data['categoria_habilidad'])) {
            Response::error('nombre y categoria_habilidad son requeridos');
        }

        $newId = make_uuid();
        $stmt = $conn->prepare('INSERT INTO habilidades (id, nombre, categoria_habilidad, icono_url, descripcion_corta, es_software_skill, porcentaje, color_barra) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([
            $newId,
            $data['nombre'],
            $data['categoria_habilidad'],
            $data['icono_url'] ?? null,
            $data['descripcion_corta'] ?? null,
            !empty($data['es_software_skill']) ? 1 : 0,
            isset($data['porcentaje']) ? (int) $data['porcentaje'] : 80,
            $data['color_barra'] ?? '#9b87f5',
        ]);

        $refetch = $conn->prepare('SELECT * FROM habilidades WHERE id = ? LIMIT 1');
        $refetch->execute([$newId]);
        $row = $refetch->fetch();
        $row['es_software_skill'] = (bool) $row['es_software_skill'];
        Response::success($row, 'Habilidad creada');
    }

    if ($method === 'PUT') {
        require_admin();
        $data = get_json_input();
        $targetId = $id ?: ($data['id'] ?? null);
        if (!$targetId) {
            Response::error('ID requerido');
        }

        $allowed = ['nombre', 'categoria_habilidad', 'icono_url', 'descripcion_corta', 'porcentaje', 'color_barra'];
        $sets = [];
        $params = [];

        foreach ($allowed as $field) {
            if (array_key_exists($field, $data)) {
                $sets[] = $field . ' = ?';
                $params[] = $data[$field];
            }
        }

        if (array_key_exists('es_software_skill', $data)) {
            $sets[] = 'es_software_skill = ?';
            $params[] = $data['es_software_skill'] ? 1 : 0;
        }

        if (empty($sets)) {
            Response::error('No hay cambios para guardar');
        }

        $params[] = $targetId;
        $stmt = $conn->prepare('UPDATE habilidades SET ' . implode(', ', $sets) . ' WHERE id = ?');
        $stmt->execute($params);

        $refetch = $conn->prepare('SELECT * FROM habilidades WHERE id = ? LIMIT 1');
        $refetch->execute([$targetId]);
        $row = $refetch->fetch();
        if (!$row) {
            Response::notFound('Habilidad no encontrada');
        }
        $row['es_software_skill'] = (bool) $row['es_software_skill'];

        Response::success($row, 'Habilidad actualizada');
    }

    if ($method === 'DELETE') {
        require_admin();
        if (!$id) {
            Response::error('ID requerido');
        }

        $stmt = $conn->prepare('DELETE FROM habilidades WHERE id = ?');
        $stmt->execute([$id]);
        Response::success(null, 'Habilidad eliminada');
    }

    Response::error('Metodo no permitido', 405);
} catch (Exception $e) {
    Response::serverError($e->getMessage());
}
