# Estrategia de Endpoints y Plantilla Universal

Esta guía define cómo trabajar endpoints en lovawamp sin perder reutilización ni seguridad.

## Principio clave

- lovawamp debe ser amplio: tener endpoints comunes acelera nuevos proyectos.
- Cada proyecto productivo debe ser mínimo: exponer solo lo que realmente usa.

En resumen:

1. Template grande y reusable.
2. Proyecto final recortado y seguro.

## Política práctica

1. Mantener endpoints extra dentro del template.
2. No publicar endpoints no usados en un proyecto en producción.
3. Si un módulo no se usa hoy, dejarlo fuera del deploy del proyecto.
4. Si mañana se necesita, copiar/adaptar desde template y versionar en un commit dedicado.

## Checklist para decidir si un endpoint va a producción

1. Existe una pantalla o flujo que lo consume.
2. Tiene validación de entrada.
3. Tiene control de sesión/permisos si aplica.
4. Retorna respuestas con formato estándar (`Response::success` / `Response::error`).
5. Está probado con método correcto (`GET/POST/PUT/DELETE`).

Si falla cualquiera de esos puntos, no debería publicarse todavía.

## Plantilla universal para crear un endpoint nuevo

Archivo sugerido: `php/api/nombre-recurso.php`

```php
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
            $stmt = $conn->prepare('SELECT * FROM tabla_recurso WHERE id = ? LIMIT 1');
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if (!$row) {
                Response::notFound('Recurso no encontrado');
            }
            Response::success($row);
        }

        $stmt = $conn->query('SELECT * FROM tabla_recurso ORDER BY fecha_creacion DESC');
        Response::success($stmt->fetchAll());
    }

    if ($method === 'POST') {
        require_admin();
        $data = get_json_input();

        if (empty($data['nombre'])) {
            Response::error('El campo nombre es requerido');
        }

        $newId = make_uuid();
        $stmt = $conn->prepare('INSERT INTO tabla_recurso (id, nombre) VALUES (?, ?)');
        $stmt->execute([$newId, $data['nombre']]);

        $select = $conn->prepare('SELECT * FROM tabla_recurso WHERE id = ? LIMIT 1');
        $select->execute([$newId]);
        Response::success($select->fetch(), 'Recurso creado');
    }

    if ($method === 'PUT') {
        require_admin();
        $data = get_json_input();
        $targetId = $id ?: ($data['id'] ?? null);

        if (!$targetId) {
            Response::error('ID requerido');
        }

        if (!array_key_exists('nombre', $data)) {
            Response::error('No hay cambios para guardar');
        }

        $stmt = $conn->prepare('UPDATE tabla_recurso SET nombre = ? WHERE id = ?');
        $stmt->execute([$data['nombre'], $targetId]);

        $select = $conn->prepare('SELECT * FROM tabla_recurso WHERE id = ? LIMIT 1');
        $select->execute([$targetId]);
        $row = $select->fetch();
        if (!$row) {
            Response::notFound('Recurso no encontrado');
        }

        Response::success($row, 'Recurso actualizado');
    }

    if ($method === 'DELETE') {
        require_admin();
        if (!$id) {
            Response::error('ID requerido');
        }

        $stmt = $conn->prepare('DELETE FROM tabla_recurso WHERE id = ?');
        $stmt->execute([$id]);
        Response::success(null, 'Recurso eliminado');
    }

    Response::error('Metodo no permitido', 405);
} catch (Exception $e) {
    Response::serverError($e->getMessage());
}
```

## Convenciones recomendadas

1. Nombre del archivo en kebab-case: `mi-recurso.php`.
2. Usar siempre los helpers de `php/api/helpers/bootstrap.php`.
3. Limitar acciones sensibles con `require_admin()`.
4. En updates parciales, validar campos permitidos antes de construir SQL.
5. Mantener mensajes claros para frontend/admin.

## Flujo sugerido al agregar endpoint

1. Crear endpoint con la plantilla universal.
2. Conectar desde frontend con `phpApiRequest('/mi-recurso.php')`.
3. Probar lectura pública y acciones autenticadas.
4. Si queda estable, incluir en deploy del proyecto.
5. Si no se usa todavía, mantenerlo solo en template y no exponerlo en producción.
