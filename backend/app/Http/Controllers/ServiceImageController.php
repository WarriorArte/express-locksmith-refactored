<?php

namespace App\Http\Controllers;

use App\Support\ApiResponse;
use App\Support\Uploads\UploadedFileCleanupService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class ServiceImageController
{
    public function __construct(private readonly UploadedFileCleanupService $uploadedFileCleanup)
    {
    }

    public function handle(Request $request): JsonResponse
    {
        return match ($request->method()) {
            'GET' => $this->index($request),
            'POST' => $this->store($request),
            'DELETE' => $this->destroy($request),
            default => ApiResponse::error('Metodo no permitido', 405),
        };
    }

    private function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $serviceId = $request->query('service_id');
        if (!$serviceId) return ApiResponse::error('service_id es requerido');

        $workshopId = $this->serviceWorkshop($serviceId);
        if (!$workshopId) return ApiResponse::error('Servicio no encontrado', 404);
        if (!$user->canAccessWorkshop($workshopId)) {
            return ApiResponse::error('Sin acceso al taller indicado', 403);
        }

        return ApiResponse::success(DB::table('service_images')->where('service_id', $serviceId)->orderBy('created_at')->get());
    }

    private function store(Request $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->json()->all();
        $serviceId = $data['service_id'] ?? $request->query('service_id');

        if (!$serviceId) return ApiResponse::error('service_id es requerido');
        if (empty($data['image_url'])) return ApiResponse::error('image_url es requerido');

        $workshopId = $this->serviceWorkshop($serviceId);
        if (!$workshopId) return ApiResponse::error('Servicio no encontrado', 404);
        if (!$user->canAccessWorkshop($workshopId)) {
            return ApiResponse::error('Sin acceso al taller indicado', 403);
        }

        $id = (string) Str::uuid();
        DB::table('service_images')->insert([
            'id' => $id,
            'service_id' => $serviceId,
            'image_url' => $data['image_url'],
            'description' => $data['description'] ?? null,
        ]);

        return ApiResponse::success(DB::table('service_images')->where('id', $id)->first(), 'Imagen agregada');
    }

    private function destroy(Request $request): JsonResponse
    {
        $user = $request->user();
        $id = $request->query('id');
        if (!$id) return ApiResponse::error('ID de imagen requerido');

        $row = DB::table('service_images as si')
            ->join('services as s', 's.id', '=', 'si.service_id')
            ->where('si.id', $id)
            ->first(['si.service_id', 'si.image_url', 's.workshop_id']);

        if (!$row) return ApiResponse::error('Imagen no encontrada', 404);
        if (!$user->canAccessWorkshop($row->workshop_id)) {
            return ApiResponse::error('Sin acceso al taller indicado', 403);
        }

        DB::table('service_images')->where('id', $id)->delete();

        $this->uploadedFileCleanup->deleteIfUnused($row->image_url);

        return ApiResponse::success(null, 'Imagen eliminada');
    }

    private function serviceWorkshop(string $serviceId): ?string
    {
        return DB::table('services')->where('id', $serviceId)->value('workshop_id');
    }
}
