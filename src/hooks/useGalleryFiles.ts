import { useCallback, useEffect, useState } from "react";
import { phpApiRequest } from "@/lib/phpApi";
import type { UploadFolder } from "@/hooks/useFileUpload";

export interface GalleryFile {
  filename: string;
  url: string;
  previewUrl: string;
  size: number;
  mimeType: string;
  modified: number;
  folder?: string;
  cacheBuster?: number;
}

interface UseGalleryFilesOptions {
  folder: UploadFolder;
  workshopCode?: string;
  enabled?: boolean;
}

interface UseGalleryFilesResult {
  files: GalleryFile[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  deleteFile: (file: GalleryFile) => Promise<void>;
}

type UploadsApiFile = {
  filename: string;
  secure_url: string;
  size: number;
  mimeType: string;
  created_at: string;
  folder?: string | null;
};

/**
 * Loads and manages files for a given upload folder via /uploads.php.
 * Extracted from ImageGalleryDialog so it can be reused elsewhere.
 */
export function useGalleryFiles({
  folder,
  workshopCode,
  enabled = true,
}: UseGalleryFilesOptions): UseGalleryFilesResult {
  const [files, setFiles] = useState<GalleryFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ action: "list", folder });
      if (workshopCode) params.set("workshop_code", workshopCode);
      const data = await phpApiRequest<UploadsApiFile[]>(`/uploads.php?${params}`, { method: "GET" });

      if (Array.isArray(data)) {
        const now = Date.now();
        setFiles(
          data.map((file) => ({
            filename: file.filename,
            url: file.secure_url,
            previewUrl: file.secure_url,
            size: file.size,
            mimeType: file.mimeType,
            modified: new Date(file.created_at).getTime() / 1000,
            folder: file.folder || folder,
            cacheBuster: now,
          })),
        );
      } else {
        setError("Error al cargar imágenes");
      }
    } catch (err) {
      console.error("useGalleryFiles - load error:", err);
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }, [folder, workshopCode]);

  const deleteFile = useCallback(
    async (file: GalleryFile) => {
      const formData = new FormData();
      formData.append("filename", file.filename);
      formData.append("folder", file.folder || folder);
      if (workshopCode) formData.append("workshop_code", workshopCode);
      await phpApiRequest<null>(`/uploads.php?action=delete`, {
        method: "POST",
        body: formData,
      });
      setFiles((prev) => prev.filter((f) => f.filename !== file.filename));
    },
    [folder, workshopCode],
  );

  useEffect(() => {
    if (enabled) void reload();
  }, [enabled, reload]);

  return { files, loading, error, reload, deleteFile };
}
