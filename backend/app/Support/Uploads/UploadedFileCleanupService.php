<?php

namespace App\Support\Uploads;

use Illuminate\Support\Facades\DB;

final class UploadedFileCleanupService
{
    private const IMAGE_REFERENCE_TABLES = [
        ['table' => 'products', 'column' => 'image_url'],
        ['table' => 'service_images', 'column' => 'image_url'],
        ['table' => 'business_settings', 'column' => 'logo_url'],
        ['table' => 'profiles', 'column' => 'avatar_url'],
    ];

    public function deleteIfUnused(?string $imageUrl): void
    {
        if (!$imageUrl || $this->isReferenced($imageUrl)) {
            return;
        }

        $relativePath = $this->extractUploadsRelativePath($imageUrl);
        if (!$relativePath) {
            return;
        }

        $absolutePath = public_path($relativePath);
        if (is_file($absolutePath)) {
            @unlink($absolutePath);
        }
    }

    private function isReferenced(string $imageUrl): bool
    {
        foreach (self::IMAGE_REFERENCE_TABLES as $target) {
            if (DB::table($target['table'])->where($target['column'], $imageUrl)->exists()) {
                return true;
            }
        }

        return false;
    }

    private function extractUploadsRelativePath(string $imageUrl): ?string
    {
        $path = parse_url($imageUrl, PHP_URL_PATH);
        if (!is_string($path)) {
            return null;
        }

        $normalized = str_replace('\\', '/', $path);
        $markerPos = strpos($normalized, '/uploads/');
        if ($markerPos === false) {
            return null;
        }

        $relativePath = ltrim(substr($normalized, $markerPos), '/');
        if ($relativePath === '' || str_contains($relativePath, '..')) {
            return null;
        }

        return $relativePath;
    }
}