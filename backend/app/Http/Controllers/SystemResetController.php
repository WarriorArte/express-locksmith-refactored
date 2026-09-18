<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\AuthorizesWorkshop;
use App\Support\ApiResponse;
use App\Support\Uploads\WorkshopFolder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

/**
 * "Restaurar Sistema" selectivo: a diferencia de BackupRestoreController (que
 * siempre limpia TODO el taller antes de importar un backup), aqui el usuario
 * marca en un checklist que secciones borrar y cuales conservar.
 *
 * Nunca toca datos globales del modulo Herramientas (perfiles Keycode/Alarmas/
 * Immo, asignaciones, base de vehiculos): esos son compartidos por todos los
 * talleres y solo se purgan desde MaintenanceController (SuperAdmin).
 */
final class SystemResetController
{
    use AuthorizesWorkshop;

    private const VALID_SECTIONS = [
        'customers',
        'products',
        'categories_tags',
        'quotes',
        'sales',
        'services',
        'warranties',
        'business_settings',
        'warranty_settings',
        'quote_doc_settings',
    ];

    /** Carpeta de uploads que se vacia junto con cada seccion (si aplica). */
    private const SECTION_FOLDERS = [
        'products' => 'products',
        'services' => 'services',
        'business_settings' => 'logos',
    ];

    public function handle(Request $request): JsonResponse
    {
        $data = $request->json()->all();
        $workshopId = $request->query('workshop_id', $data['workshop_id'] ?? null);

        if ($resp = $this->requireAdmin($request, $workshopId)) return $resp;

        $sections = is_array($data['sections'] ?? null) ? $data['sections'] : [];
        $selected = array_values(array_keys(array_filter($sections)));

        if (empty($selected)) {
            return ApiResponse::error('Selecciona al menos una seccion para restaurar');
        }

        $unknown = array_diff($selected, self::VALID_SECTIONS);
        if (!empty($unknown)) {
            return ApiResponse::error('Seccion desconocida: '.implode(', ', $unknown));
        }

        $selectedSet = array_flip($selected);
        $workshopCode = DB::table('workshops')->where('id', $workshopId)->value('code');
        $counts = [];

        DB::transaction(function () use ($workshopId, $selectedSet, &$counts): void {
            // warranty_category_settings depende de categorias (ON DELETE CASCADE) y
            // tambien es parte conceptual de "Configuracion de garantias". Se cuenta
            // y borra primero: si se dejara para despues de resetCategoriesTags, el
            // cascade ya la habria vaciado y el conteo reportado saldria en 0.
            if (isset($selectedSet['categories_tags']) || isset($selectedSet['warranty_settings'])) {
                $this->resetWarrantyCategorySettings($workshopId, $counts);
            }

            if (isset($selectedSet['customers'])) $this->resetCustomers($workshopId, $counts);
            if (isset($selectedSet['products'])) $this->resetProducts($workshopId, $counts);
            if (isset($selectedSet['quotes'])) $this->resetQuotes($workshopId, $counts);
            if (isset($selectedSet['sales'])) $this->resetSales($workshopId, $counts);
            if (isset($selectedSet['services'])) $this->resetServices($workshopId, $counts);
            if (isset($selectedSet['warranties'])) $this->resetWarranties($workshopId, $counts);
            if (isset($selectedSet['categories_tags'])) $this->resetCategoriesTags($workshopId, $counts);
            if (isset($selectedSet['warranty_settings'])) $this->resetWarrantySettings($workshopId, $counts);
            if (isset($selectedSet['business_settings'])) $this->resetBusinessSettings($workshopId, $counts);
            if (isset($selectedSet['quote_doc_settings'])) $this->resetQuoteDocSettings($workshopId, $counts);
        });

        $workshopFolder = $workshopCode ? WorkshopFolder::slug($workshopCode) : null;
        // 'misc' es el bucket generico de uploads sin workshop_code: nunca debe
        // tratarse como si fuera la carpeta de un taller.
        $counts['media_files'] = ($workshopFolder && $workshopFolder !== 'misc')
            ? $this->wipeSelectedFolders($workshopFolder, $selectedSet)
            : 0;

        return ApiResponse::success([
            'restored_at' => now()->toIso8601String(),
            'workshop_id' => $workshopId,
            'sections' => $selected,
            'counts' => $counts,
        ], 'Restauracion completada correctamente');
    }

    private function resetCustomers(string $workshopId, array &$counts): void
    {
        DB::delete('DELETE ct FROM customer_tags ct JOIN customers c ON c.id = ct.customer_id WHERE c.workshop_id = ?', [$workshopId]);
        $counts['customers'] = DB::table('customers')->where('workshop_id', $workshopId)->count();
        DB::table('customers')->where('workshop_id', $workshopId)->delete();
    }

    private function resetProducts(string $workshopId, array &$counts): void
    {
        DB::delete('DELETE pt FROM product_tags pt JOIN products p ON p.id = pt.product_id WHERE p.workshop_id = ?', [$workshopId]);
        // inventory_movements tiene ON DELETE CASCADE desde products: no se
        // puede conservar el historial de movimientos si se borran los
        // productos, asi que van siempre juntos.
        $counts['inventory_movements'] = DB::table('inventory_movements')->where('workshop_id', $workshopId)->count();
        $counts['products'] = DB::table('products')->where('workshop_id', $workshopId)->count();
        DB::table('products')->where('workshop_id', $workshopId)->delete();
    }

    private function resetQuotes(string $workshopId, array &$counts): void
    {
        DB::delete('DELETE qi FROM quote_items qi JOIN quotes q ON q.id = qi.quote_id WHERE q.workshop_id = ?', [$workshopId]);
        $counts['quotes'] = DB::table('quotes')->where('workshop_id', $workshopId)->count();
        DB::table('quotes')->where('workshop_id', $workshopId)->delete();
    }

    private function resetSales(string $workshopId, array &$counts): void
    {
        DB::delete('DELETE si FROM sale_items si JOIN sales sa ON sa.id = si.sale_id WHERE sa.workshop_id = ?', [$workshopId]);
        $counts['sales'] = DB::table('sales')->where('workshop_id', $workshopId)->count();
        DB::table('sales')->where('workshop_id', $workshopId)->delete();
    }

    private function resetServices(string $workshopId, array &$counts): void
    {
        DB::delete('DELETE simg FROM service_images simg JOIN services s ON s.id = simg.service_id WHERE s.workshop_id = ?', [$workshopId]);
        DB::delete('DELETE sp FROM service_products sp JOIN services s ON s.id = sp.service_id WHERE s.workshop_id = ?', [$workshopId]);
        $counts['services'] = DB::table('services')->where('workshop_id', $workshopId)->count();
        DB::table('services')->where('workshop_id', $workshopId)->delete();
    }

    private function resetWarranties(string $workshopId, array &$counts): void
    {
        $counts['warranties'] = DB::table('warranties')->where('workshop_id', $workshopId)->count();
        DB::table('warranties')->where('workshop_id', $workshopId)->delete();
    }

    private function resetCategoriesTags(string $workshopId, array &$counts): void
    {
        DB::delete('DELETE pt FROM product_tags pt JOIN tags t ON t.id = pt.tag_id WHERE t.workshop_id = ?', [$workshopId]);
        DB::delete('DELETE ct FROM customer_tags ct JOIN tags t ON t.id = ct.tag_id WHERE t.workshop_id = ?', [$workshopId]);
        $counts['categories'] = DB::table('categories')->where('workshop_id', $workshopId)->count();
        DB::table('categories')->where('workshop_id', $workshopId)->delete();
        $counts['tags'] = DB::table('tags')->where('workshop_id', $workshopId)->count();
        DB::table('tags')->where('workshop_id', $workshopId)->delete();
    }

    private function resetWarrantySettings(string $workshopId, array &$counts): void
    {
        $counts['warranty_settings'] = DB::table('warranty_settings')->where('workshop_id', $workshopId)->count();
        DB::table('warranty_settings')->where('workshop_id', $workshopId)->delete();
    }

    private function resetWarrantyCategorySettings(string $workshopId, array &$counts): void
    {
        $counts['warranty_category_settings'] = DB::table('warranty_category_settings')->where('workshop_id', $workshopId)->count();
        DB::table('warranty_category_settings')->where('workshop_id', $workshopId)->delete();
    }

    private function resetBusinessSettings(string $workshopId, array &$counts): void
    {
        $counts['business_settings'] = DB::table('business_settings')->where('workshop_id', $workshopId)->count();
        DB::table('business_settings')->where('workshop_id', $workshopId)->delete();
    }

    private function resetQuoteDocSettings(string $workshopId, array &$counts): void
    {
        $counts['quote_doc_settings'] = DB::table('quote_doc_settings')->where('workshop_id', $workshopId)->count();
        DB::table('quote_doc_settings')->where('workshop_id', $workshopId)->delete();
    }

    private function wipeSelectedFolders(string $workshopCode, array $selectedSet): int
    {
        $deleted = 0;
        foreach (self::SECTION_FOLDERS as $section => $folder) {
            if (isset($selectedSet[$section])) {
                $deleted += $this->wipeFolder($workshopCode, $folder);
            }
        }
        return $deleted;
    }

    private function wipeFolder(string $workshopCode, string $folder): int
    {
        $dir = public_path("uploads/{$workshopCode}/{$folder}");
        if (!is_dir($dir)) return 0;

        $deleted = 0;
        foreach (File::files($dir) as $file) {
            if (@unlink($file->getPathname())) $deleted++;
        }

        DB::table('upload_file_meta')
            ->where('workshop_code', $workshopCode)
            ->where('folder', $folder)
            ->delete();

        return $deleted;
    }
}
