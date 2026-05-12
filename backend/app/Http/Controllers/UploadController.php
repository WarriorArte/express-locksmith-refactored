<?php

namespace App\Http\Controllers;

use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
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
        'image/svg+xml' => 'svg',
        'application/pdf' => 'pdf',
    ];

    private const FOLDER_DB_MAP = [
        'products' => ['table' => 'products',         'column' => 'image_url'],
        'services' => ['table' => 'service_images',    'column' => 'image_url'],
        'logos'    => ['table' => 'business_settings', 'column' => 'logo_url'],
        'avatars'  => ['table' => 'profiles',          'column' => 'avatar_url'],
    ];

    public function handle(Request $request): JsonResponse
    {
        if ($request->isMethod('GET') && $request->query('action') === 'list') {
            return $this->index($request);
        }

        if ($request->isMethod('POST') && ($request->query('action') === 'delete' || $request->input('action') === 'delete')) {
            return $this->destroy($request);
        }

        if ($request->isMethod('POST') && ($request->query('action') === 'cleanup' || $request->input('action') === 'cleanup')) {
            return $this->cleanupResponse($request);
        }

        if ($request->isMethod('POST')) {
            return $this->store($request);
        }

        return ApiResponse::error('Metodo no permitido', 405);
    }

    private function index(Request $request): JsonResponse
    {
        $workshopCode = $this->folder((string) $request->query('workshop_code', '')) ?: 'misc';
        $folder = $this->folder((string) $request->query('folder', 'misc'));
        $dir = public_path("uploads/{$workshopCode}/{$folder}");

        if (!is_dir($dir)) {
            return ApiResponse::success([], 'Sin archivos');
        }

        // Silently clean unused files before listing
        $this->cleanup($workshopCode, $folder);

        $files = [];
        foreach (File::files($dir) as $file) {
            $files[] = [
                'filename' => $file->getFilename(),
                'folder' => $folder,
                'workshop_code' => $workshopCode,
                'size' => $file->getSize(),
                'mimeType' => mime_content_type($file->getPathname()) ?: 'application/octet-stream',
                'created_at' => date('c', $file->getMTime()),
                'secure_url' => "/uploads/{$workshopCode}/{$folder}/".rawurlencode($file->getFilename()),
            ];
        }

        usort($files, fn ($a, $b) => strtotime($b['created_at']) <=> strtotime($a['created_at']));

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

        $workshopCode = $this->folder((string) $request->input('workshop_code', '')) ?: 'misc';
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
        $workshopCode = $this->folder((string) $request->input('workshop_code', '')) ?: 'misc';
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

        return ApiResponse::success(null, 'Archivo eliminado correctamente');
    }

    private function cleanupResponse(Request $request): JsonResponse
    {
        $workshopCode = $this->folder((string) $request->input('workshop_code', '')) ?: null;
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
                $deleted++;
            } else {
                $kept++;
            }
        }

        return ['deleted' => $deleted, 'kept' => $kept];
    }

    private function folder(string $value): string
    {
        return preg_replace('/[^a-z0-9_\-]/', '', strtolower($value)) ?: 'misc';
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
