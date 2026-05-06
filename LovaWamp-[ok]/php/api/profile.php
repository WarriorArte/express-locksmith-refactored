<?php
require_once __DIR__ . '/helpers/bootstrap.php';

handle_preflight();
set_cors_headers();
start_session_if_needed();

$conn = get_db_connection();
$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        $stmt = $conn->query('SELECT * FROM configuracion_perfil ORDER BY updated_at DESC LIMIT 1');
        $row = $stmt->fetch();
        if (!$row) {
            Response::notFound('No existe configuracion de perfil');
        }

        Response::success(format_profile($row));
    }

    if ($method === 'PUT') {
        require_admin();

        $data = get_json_input();
        $stmt = $conn->query('SELECT id FROM configuracion_perfil ORDER BY updated_at DESC LIMIT 1');
        $existing = $stmt->fetch();
        if (!$existing) {
            Response::notFound('No existe configuracion de perfil');
        }

        $id = $existing['id'];
        $allowed = [
            'nombre_sitio', 'logo_url', 'hero_titulo', 'hero_subtitulo', 'hero_bg_url', 'biografia',
            'email', 'foto_perfil_url', 'url_cv_pdf', 'saludo_texto', 'alias_marca',
            'subtitulo_bienvenida', 'hero_boton1_texto', 'hero_boton1_enlace', 'hero_boton1_visible',
            'hero_boton2_texto', 'hero_boton2_enlace', 'hero_boton2_visible', 'footer_titulo',
            'footer_subtitulo', 'footer_copyright',
        ];

        $jsonFields = ['me_gusta', 'enlaces_redes', 'footer_redes', 'categorias_cv'];

        $sets = [];
        $params = [];

        foreach ($allowed as $field) {
            if (array_key_exists($field, $data)) {
                $sets[] = $field . ' = ?';
                $params[] = $data[$field];
            }
        }

        foreach ($jsonFields as $field) {
            if (array_key_exists($field, $data)) {
                $sets[] = $field . ' = ?';
                $params[] = json_encode_or_null($data[$field]);
            }
        }

        if (empty($sets)) {
            Response::error('No hay cambios para guardar');
        }

        $sets[] = 'updated_at = NOW()';
        $params[] = $id;

        $sql = 'UPDATE configuracion_perfil SET ' . implode(', ', $sets) . ' WHERE id = ?';
        $update = $conn->prepare($sql);
        $update->execute($params);

        $refetch = $conn->prepare('SELECT * FROM configuracion_perfil WHERE id = ? LIMIT 1');
        $refetch->execute([$id]);
        $row = $refetch->fetch();

        Response::success(format_profile($row), 'Perfil actualizado');
    }

    Response::error('Metodo no permitido', 405);
} catch (Exception $e) {
    Response::serverError($e->getMessage());
}

function format_profile($row) {
    $row['me_gusta'] = json_decode_array($row['me_gusta']);
    $row['enlaces_redes'] = json_decode_array($row['enlaces_redes']);
    $row['footer_redes'] = json_decode_array($row['footer_redes']);
    $row['categorias_cv'] = json_decode_array($row['categorias_cv']);
    $row['hero_boton1_visible'] = (bool) $row['hero_boton1_visible'];
    $row['hero_boton2_visible'] = (bool) $row['hero_boton2_visible'];
    return $row;
}
