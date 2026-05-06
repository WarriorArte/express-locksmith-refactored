<?php

namespace App\Http\Controllers;

use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

final class UploadController
{
    private const MAX_FILE_SIZE = 10 * 1024 * 1024;

    private const ALLOWED_MIME = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/gif' => 'gif',
        'image/webp' => 'webp',
        'image/svg+xml' => 'svg',
        'application/pdf' => 'pdf',
    ];

    public function handle(Request $request): JsonResponse
    {
        if ($request->isMethod('GET') && $request->query('action') === 'list') {
            return $this->index($request);
        }

        if ($request->isMethod('POST') && ($request->query('action') === 'delete' || $request->input('action') === 'delete')) {
            return $this->destroy($request);
        }

        if ($request->isMethod('POST')) {
            return $this->store($request);
        }

        return ApiResponse::error('Metodo no permitido', 405);
    }

    private function index(Request $request): JsonResponse
    {
        $folder = $this->folder((string) $request->query('folder', 'misc'));
        $dir = public_path("uploads/{$folder}");

        if (!is_dir($dir)) {
            return ApiResponse::success([], 'Sin archivos');
        }

        $files = [];
        foreach (File::files($dir) as $file) {
            $files[] = [
                'filename' => $file->getFilename(),
                'folder' => $folder,
                'size' => $file->getSize(),
                'mimeType' => $file->getMimeType() ?: 'application/octet-stream',
                'created_at' => date('c', $file->getMTime()),
                'secure_url' => url("uploads/{$folder}/".rawurlencode($file->getFilename())),
            ];
        }

        usort($files, fn ($a, $b) => strtotime($b['created_at']) <=> strtotime($a['created_at']));

        return ApiResponse::success($files);
    }

    private function store(Request $request): JsonResponse
    {
        if (!$request->hasFile('file')) {
            return ApiResponse::error('No se recibio ningun archivo');
        }

        $file = $request->file('file');
        if (!$file || !$file->isValid()) {
            return ApiResponse::error('Error al subir archivo');
        }

        if ($file->getSize() > self::MAX_FILE_SIZE) {
            return ApiResponse::error('El archivo supera el limite de 10MB');
        }

        $mime = $file->getMimeType() ?: 'application/octet-stream';
        if (!array_key_exists($mime, self::ALLOWED_MIME)) {
            return ApiResponse::error('Tipo de archivo no permitido: '.$mime);
        }

        $folder = $this->folder((string) $request->input('folder', 'misc'));
        $name = Str::random(32).'.'.self::ALLOWED_MIME[$mime];
        $dir = public_path("uploads/{$folder}");
        File::ensureDirectoryExists($dir, 0755, true);
        $file->move($dir, $name);

        return ApiResponse::success([
            'url' => url("uploads/{$folder}/".rawurlencode($name)),
            'name' => $name,
            'mime' => $mime,
            'size' => $file->getSize(),
            'folder' => $folder,
        ], 'Archivo subido correctamente');
    }

    private function destroy(Request $request): JsonResponse
    {
        $folder = $this->folder((string) $request->input('folder', 'misc'));
        $filename = basename((string) $request->input('filename', ''));

        if ($filename === '') {
            return ApiResponse::error('filename es requerido');
        }

        $path = public_path("uploads/{$folder}/{$filename}");
        if (!is_file($path)) {
            return ApiResponse::error('Archivo no encontrado', 404);
        }

        if (!@unlink($path)) {
            return ApiResponse::error('No se pudo eliminar el archivo', 500);
        }

        return ApiResponse::success(null, 'Archivo eliminado correctamente');
    }

    private function folder(string $value): string
    {
        return preg_replace('/[^a-z0-9_\-]/', '', strtolower($value)) ?: 'misc';
    }
}
