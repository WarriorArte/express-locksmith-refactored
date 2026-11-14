<?php

namespace App\Http\Controllers;

use App\Support\ApiResponse;
use App\Support\Uploads\WorkshopFolder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

final class UploadController
{
    private const MAX_FILE_SIZE = 10 * 1024 * 1024;

    private const ALLOWED_MIME = [
        'image/jpeg' => 'jpg',
        'image/pjpeg' => 'jpg',
        'image/png' => 'png',
        'image/x-png' => 'png',
        'image/gif' => 'gif',
        'image/webp' => 'webp',
        'application/pdf' => 'pdf',
    ];

    private const EXT_TO_MIME = [
        'jpg'  => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'png'  => 'image/png',
        'gif'  => 'image/gif',
        'webp' => 'image/webp',
        'pdf'  => 'application/pdf',
    ];

    private const FOLDER_DB_MAP = [
        'products' => ['table' => 'products',         'column' => 'image_url'],
        'services' => ['table' => 'service_images',    'column' => 'image_url'],
        'logos'    => ['table' => 'business_settings', 'column' => 'logo_url'],
        'avatars'  => ['table' => 'profiles',          'column' => 'avatar_url'],
    ];

    public function handle(Request $request): JsonResponse|Response
    {
        if ($request->isMethod('GET') && $request->query('action') === 'file') {
            return $this->file($request);
        }

        if ($request->isMethod('GET') && $request->query('action') === 'list') {
            return $this->index($request);
        }

        if ($request->isMethod('POST') && ($request->query('action') === 'delete' || $request->input('action') === 'delete')) {
            return $this->destroy($request);
        }

        if ($request->isMethod('POST') && ($request->query('action') === 'cleanup' || $request->input('action') === 'cleanup')) {
            return $this->cleanupResponse($request);
        }

        if ($request->isMethod('POST') && ($request->query('action') === 'meta' || $request->input('action') === 'meta')) {
            return $this->updateMeta($request);
        }

        if ($request->isMethod('POST') && ($request->query('action') === 'migrate-misc' || $request->input('action') === 'migrate-misc')) {
            return $this->migrateMiscToSuperadmin($request);
        }

        if ($request->isMethod('POST')) {
            return $this->store($request);
        }

        return ApiResponse::error('Metodo no permitido', 405);
    }

    private function file(Request $request): Response
    {
        $file = str_replace(['..', '\\'], '', (string) $request->query('f', ''));
        $file = ltrim(rawurldecode($file), '/');
        $path = public_path("uploads/{$file}");

        if ($file === '' || !is_file($path)) {
            return response('', 404);
        }

        // Los archivos viven en uploads/{workshop_code}/{folder}/{name}
        $segments = explode('/', $file);
        $workshopCode = $segments[0] ?? '';
        if (count($segments) < 2) {
            return response('', 404);
        }
        $readsSuperadminBucket = WorkshopFolder::slug($workshopCode, '') === WorkshopFolder::SUPERADMIN;
        if ($readsSuperadminBucket) {
            // Solo lectura de un archivo concreto: los tecnicos ven estas imagenes
            // dentro de Immo/Keycode. Listar, subir, renombrar o borrar sigue siendo
            // exclusivo del SuperAdmin.
            if (!$request->user()) return response('', 401);
        } elseif ($resp = $this->authorizeWorkshop($request, $workshopCode, false)) {
            return response('', $resp->getStatusCode());
        }

        $mime = mime_content_type($path) ?: 'application/octet-stream';
        $isSvg = str_contains($mime, 'svg') || strtolower(pathinfo($path, PATHINFO_EXTENSION)) === 'svg';

        return response()->file($path, [
            'Content-Type' => $isSvg ? 'application/octet-stream' : $mime,
            'X-Content-Type-Options' => 'nosniff',
            'Content-Security-Policy' => "default-src 'none'; sandbox",
            'Content-Disposition' => $isSvg
                ? 'attachment; filename="'.basename($path).'"'
                : 'inline; filename="'.basename($path).'"',
            'Cache-Control' => 'private, max-age=3600',
        ]);
    }

    private function index(Request $request): JsonResponse
    {
        $workshopCode = $this->bucket($request, (string) $request->query('workshop_code', ''));
        if ($resp = $this->authorizeWorkshop($request, $workshopCode, false)) return $resp;
        $folder = $this->folder((string) $request->query('folder', 'misc'));
        $dir = public_path("uploads/{$workshopCode}/{$folder}");

        if (!is_dir($dir)) {
            return ApiResponse::success([], 'Sin archivos');
        }

        // Silently clean unused files before listing
        $this->cleanup($workshopCode, $folder);

        // Un solo query para el título/descripción de todos los archivos de esta
        // carpeta (en vez de uno por archivo).
        $meta = DB::table('upload_file_meta')
            ->where('workshop_code', $workshopCode)
            ->where('folder', $folder)
            ->get(['filename', 'title', 'description'])
            ->keyBy('filename');

        $files = [];
        foreach (File::files($dir) as $file) {
            $mtime = $file->getMTime();
            $ext   = strtolower($file->getExtension());
            $fileMeta = $meta->get($file->getFilename());
            $files[] = [
                'filename' => $file->getFilename(),
                'folder' => $folder,
                'workshop_code' => $workshopCode,
                'size' => $file->getSize(),
                // Se infiere por extensión (ya la validamos al subir el archivo): evita
                // abrir y leer cada archivo del disco solo para adivinar su tipo, que
                // es lo que hacía lenta la galería con muchos archivos.
                'mimeType' => self::EXT_TO_MIME[$ext] ?? 'application/octet-stream',
                'created_at' => date('c', $mtime),
                '_mtime' => $mtime,
                'secure_url' => "/uploads/{$workshopCode}/{$folder}/".rawurlencode($file->getFilename()),
                'title' => $fileMeta->title ?? null,
                'description' => $fileMeta->description ?? null,
            ];
        }

        usort($files, fn ($a, $b) => $b['_mtime'] <=> $a['_mtime']);
        foreach ($files as &$f) unset($f['_mtime']);

        return ApiResponse::success($files);
    }

    private function store(Request $request): JsonResponse
    {
        if (!$request->hasFile('file')) {
            $postMax = ini_get('post_max_size') ?: 'desconocido';
            $uploadMax = ini_get('upload_max_filesize') ?: 'desconocido';
            return ApiResponse::error("No se recibio ningun archivo. Revisa que la imagen no supere los limites del hosting (post_max_size={$postMax}, upload_max_filesize={$uploadMax}).");
        }

        $file = $request->file('file');
        if (!$file || !$file->isValid()) {
            return ApiResponse::error('Error al subir archivo: '.$this->uploadErrorMessage((int) ($file?->getError() ?? UPLOAD_ERR_NO_FILE)));
        }

        if ($file->getSize() > self::MAX_FILE_SIZE) {
            return ApiResponse::error('El archivo supera el limite de 10MB');
        }

        $mime = $file->getMimeType() ?: 'application/octet-stream';
        if (!array_key_exists($mime, self::ALLOWED_MIME)) {
            return ApiResponse::error('Tipo de archivo no permitido: '.$mime);
        }

        $workshopCode = $this->bucket($request, (string) $request->input('workshop_code', ''));
        if ($resp = $this->authorizeWorkshop($request, $workshopCode, false)) return $resp;
        $folder = $this->folder((string) $request->input('folder', 'misc'));
        $name = Str::random(32).'.'.self::ALLOWED_MIME[$mime];
        $dir = public_path("uploads/{$workshopCode}/{$folder}");
        $size = $file->getSize();
        File::ensureDirectoryExists($dir, 0755, true);
        $file->move($dir, $name);

        return ApiResponse::success([
            'url' => "/uploads/{$workshopCode}/{$folder}/".rawurlencode($name),
            'name' => $name,
            'mime' => $mime,
            'size' => $size,
            'folder' => $folder,
        ], 'Archivo subido correctamente');
    }

    private function destroy(Request $request): JsonResponse
    {
        $workshopCode = $this->bucket($request, (string) $request->input('workshop_code', ''));
        if ($resp = $this->authorizeWorkshop($request, $workshopCode, false)) return $resp;
        $folder = $this->folder((string) $request->input('folder', 'misc'));
        $filename = basename((string) $request->input('filename', ''));

        if ($filename === '') {
            return ApiResponse::error('filename es requerido');
        }

        $path = public_path("uploads/{$workshopCode}/{$folder}/{$filename}");
        if (!is_file($path)) {
            return ApiResponse::error('Archivo no encontrado', 404);
        }

        if (!@unlink($path)) {
            return ApiResponse::error('No se pudo eliminar el archivo', 500);
        }

        DB::table('upload_file_meta')
            ->where('workshop_code', $workshopCode)
            ->where('folder', $folder)
            ->where('filename', $filename)
            ->delete();

        return ApiResponse::success(null, 'Archivo eliminado correctamente');
    }

    private function updateMeta(Request $request): JsonResponse
    {
        $workshopCode = $this->bucket($request, (string) $request->input('workshop_code', ''));
        if ($resp = $this->authorizeWorkshop($request, $workshopCode, false)) return $resp;
        $folder = $this->folder((string) $request->input('folder', 'misc'));
        $filename = basename((string) $request->input('filename', ''));

        if ($filename === '') {
            return ApiResponse::error('filename es requerido');
        }

        $path = public_path("uploads/{$workshopCode}/{$folder}/{$filename}");
        if (!is_file($path)) {
            return ApiResponse::error('Archivo no encontrado', 404);
        }

        $title = trim((string) $request->input('title', ''));
        $description = trim((string) $request->input('description', ''));

        DB::table('upload_file_meta')->updateOrInsert(
            ['workshop_code' => $workshopCode, 'folder' => $folder, 'filename' => $filename],
            ['title' => $title !== '' ? $title : null, 'description' => $description !== '' ? $description : null, 'updated_at' => now()],
        );

        return ApiResponse::success([
            'title' => $title !== '' ? $title : null,
            'description' => $description !== '' ? $description : null,
        ], 'Guardado');
    }

    private function cleanupResponse(Request $request): JsonResponse
    {
        $workshopCode = $this->folder((string) $request->input('workshop_code', '')) ?: null;
        if ($resp = $this->authorizeWorkshop($request, (string) $workshopCode, true)) return $resp;
        $folder = $this->folder((string) $request->input('folder', '')) ?: null;

        $totalDeleted = 0;
        $totalKept = 0;

        $foldersToClean = $folder ? [$folder] : array_keys(self::FOLDER_DB_MAP);
        $workshopCodes = [];

        if ($workshopCode) {
            $workshopCodes = [$workshopCode];
        } else {
            // Scan all workshop directories
            $uploadsDir = public_path('uploads');
            if (is_dir($uploadsDir)) {
                foreach (File::directories($uploadsDir) as $dir) {
                    $workshopCodes[] = basename($dir);
                }
            }
        }

        foreach ($workshopCodes as $wCode) {
            foreach ($foldersToClean as $f) {
                ['deleted' => $deleted, 'kept' => $kept] = $this->cleanup($wCode, $f);
                $totalDeleted += $deleted;
                $totalKept += $kept;
            }
        }

        return ApiResponse::success([
            'deleted' => $totalDeleted,
            'kept' => $totalKept,
        ], "Limpieza completada: {$totalDeleted} archivos eliminados, {$totalKept} archivos mantenidos");
    }

    private function cleanup(string $workshopCode, string $folder): array
    {
        $dir = public_path("uploads/{$workshopCode}/{$folder}");
        if (!is_dir($dir) || !isset(self::FOLDER_DB_MAP[$folder])) {
            return ['deleted' => 0, 'kept' => 0];
        }

        $map = self::FOLDER_DB_MAP[$folder];
        $deleted = 0;
        $kept = 0;

        foreach (File::files($dir) as $file) {
            $filename = $file->getFilename();
            $count = DB::table($map['table'])
                ->where($map['column'], 'like', '%'.$filename.'%')
                ->count();

            if ($count === 0) {
                @unlink($file->getPathname());
                DB::table('upload_file_meta')
                    ->where('workshop_code', $workshopCode)
                    ->where('folder', $folder)
                    ->where('filename', $filename)
                    ->delete();
                $deleted++;
            } else {
                $kept++;
            }
        }

        return ['deleted' => $deleted, 'kept' => $kept];
    }

    /**
     * Verifica que el usuario pertenezca al taller indicado por workshop_code.
     * $admin = true exige rol de administrador del taller (borrado masivo / limpieza).
     */
    private function authorizeWorkshop(Request $request, string $workshopCode, bool $admin): ?JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return ApiResponse::error('No autenticado', 401);
        }
        if ($user->isSuperadmin()) {
            return null;
        }

        $workshopCode = strtolower(trim($workshopCode));
        if ($workshopCode === WorkshopFolder::SUPERADMIN) {
            return ApiResponse::error('Estos archivos son exclusivos del SuperAdmin', 403);
        }
        if ($workshopCode === '' || $workshopCode === WorkshopFolder::MISC) {
            return ApiResponse::error('workshop_code es requerido', 400);
        }

        $workshopId = DB::table('workshops')
            ->whereRaw('LOWER(code) = ?', [$workshopCode])
            ->value('id');

        if (!$workshopId) {
            return ApiResponse::error('Taller no encontrado', 404);
        }

        $allowed = $admin
            ? $user->canAdminWorkshop($workshopId)
            : $user->canAccessWorkshop($workshopId);

        return $allowed ? null : ApiResponse::error('Sin acceso a los archivos de este taller', 403);
    }

    private function folder(string $value): string
    {
        return WorkshopFolder::slug($value);
    }

    /**
     * Carpeta raiz de la peticion. Sin workshop_code, el SuperAdmin trabaja en su
     * carpeta privada 'superadmin'; cualquier otro usuario cae en 'misc', que
     * authorizeWorkshop rechaza (nadie mas puede subir sin taller).
     */
    private function bucket(Request $request, string $raw): string
    {
        $slug = WorkshopFolder::slug($raw, '');
        if ($slug !== '') return $slug;
        return $request->user()?->isSuperadmin() ? WorkshopFolder::SUPERADMIN : WorkshopFolder::MISC;
    }

    /** Tablas JSON de Herramientas cuyas imagenes pueden apuntar a uploads/misc/. */
    private const TOOL_JSON_TABLES = ['immo_profiles', 'tool_assignments', 'keycode_profiles', 'alarma_profiles', 'immo_catalog_items'];

    /**
     * Mueve lo que el SuperAdmin subio a 'misc' hacia su carpeta privada 'superadmin'
     * y reescribe los enlaces guardados. Con dry_run=1 solo cuenta.
     *
     * Orden pensado para no romper nada: 1) copiar archivos, 2) reescribir enlaces
     * y metadatos en una transaccion, 3) borrar de 'misc' solo lo que quedo copiado
     * igual. Es idempotente: si se interrumpe, volver a ejecutarla termina el trabajo.
     */
    private function migrateMiscToSuperadmin(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user || !$user->isSuperadmin()) {
            return ApiResponse::error('Solo el SuperAdmin puede mover estos archivos', 403);
        }
        $dryRun = filter_var($request->input('dry_run', $request->query('dry_run', false)), FILTER_VALIDATE_BOOLEAN);

        $from = public_path('uploads/'.WorkshopFolder::MISC);
        $to = public_path('uploads/'.WorkshopFolder::SUPERADMIN);
        $files = is_dir($from) ? File::allFiles($from) : [];
        $refs = $this->rewriteMiscRefs(false);

        if ($dryRun) {
            return ApiResponse::success([
                'files' => count($files),
                'references' => $refs,
                'moved' => 0,
                'dry_run' => true,
            ], 'Revision completada');
        }

        $copied = 0;
        foreach ($files as $file) {
            $dest = $to.'/'.$file->getRelativePathname();
            if (is_file($dest)) continue;
            File::ensureDirectoryExists(dirname($dest), 0755, true);
            if (!@copy($file->getPathname(), $dest)) {
                return ApiResponse::error("No se pudo copiar {$file->getRelativePathname()}; no se cambio ningun enlace. Intentalo de nuevo.", 500);
            }
            $copied++;
        }

        $rewritten = 0;
        DB::transaction(function () use (&$rewritten): void {
            $rewritten = $this->rewriteMiscRefs(true);

            foreach (DB::table('upload_file_meta')->where('workshop_code', WorkshopFolder::MISC)->get() as $meta) {
                DB::table('upload_file_meta')->updateOrInsert(
                    ['workshop_code' => WorkshopFolder::SUPERADMIN, 'folder' => $meta->folder, 'filename' => $meta->filename],
                    ['title' => $meta->title, 'description' => $meta->description, 'updated_at' => now()],
                );
            }
            DB::table('upload_file_meta')->where('workshop_code', WorkshopFolder::MISC)->delete();
        });

        $removed = 0;
        foreach ($files as $file) {
            $dest = $to.'/'.$file->getRelativePathname();
            if (is_file($dest) && filesize($dest) === $file->getSize() && @unlink($file->getPathname())) {
                $removed++;
            }
        }
        if (is_dir($from)) {
            foreach (array_reverse(File::directories($from)) as $dir) {
                if (count(File::allFiles($dir)) === 0) File::deleteDirectory($dir);
            }
        }

        return ApiResponse::success([
            'files' => count($files),
            'copied' => $copied,
            'moved' => $removed,
            'references' => $rewritten,
            'dry_run' => false,
        ], "Listo: {$removed} archivo(s) movidos a la carpeta del SuperAdmin y {$rewritten} registro(s) actualizados");
    }

    /** Cuenta (y con $apply reescribe) los registros que enlazan a /uploads/misc/. */
    private function rewriteMiscRefs(bool $apply): int
    {
        $changed = 0;
        foreach (self::TOOL_JSON_TABLES as $table) {
            if (!Schema::hasTable($table) || !Schema::hasColumn($table, 'data')) continue;

            DB::table($table)->select(['id', 'data'])->orderBy('id')->chunk(50, function ($rows) use ($table, $apply, &$changed): void {
                foreach ($rows as $row) {
                    $raw = (string) $row->data;
                    // Laravel guarda el JSON con barras escapadas ("\/uploads\/misc\/").
                    if (!str_contains($raw, 'uploads/misc/') && !str_contains($raw, 'uploads\\/misc\\/')) continue;
                    $decoded = json_decode($raw, true);
                    if (!is_array($decoded)) continue;
                    $changed++;
                    if ($apply) {
                        DB::table($table)->where('id', $row->id)->update(['data' => json_encode($this->replaceMiscRefs($decoded))]);
                    }
                }
            });
        }
        return $changed;
    }

    private function replaceMiscRefs(mixed $value): mixed
    {
        if (is_string($value)) {
            return str_replace('/uploads/'.WorkshopFolder::MISC.'/', '/uploads/'.WorkshopFolder::SUPERADMIN.'/', $value);
        }
        if (is_array($value)) {
            foreach ($value as $k => $v) $value[$k] = $this->replaceMiscRefs($v);
        }
        return $value;
    }

    private function uploadErrorMessage(int $error): string
    {
        return match ($error) {
            UPLOAD_ERR_INI_SIZE => 'el archivo supera upload_max_filesize del servidor',
            UPLOAD_ERR_FORM_SIZE => 'el archivo supera el limite permitido por el formulario',
            UPLOAD_ERR_PARTIAL => 'el archivo se subio incompleto',
            UPLOAD_ERR_NO_FILE => 'no se recibio ningun archivo',
            UPLOAD_ERR_NO_TMP_DIR => 'falta la carpeta temporal de PHP',
            UPLOAD_ERR_CANT_WRITE => 'PHP no pudo escribir el archivo en disco',
            UPLOAD_ERR_EXTENSION => 'una extension de PHP bloqueo la subida',
            default => 'codigo '.$error,
        };
    }
}
