import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { phpApiUpload } from "@/lib/phpApi";

export type UploadFolder = "products" | "services" | "logos" | "documents" | "general" | "avatars";

interface UploadResult {
  success: boolean;
  url?: string;
  secureUrl?: string;
  filename?: string;
  error?: string;
}

interface UseFileUploadOptions {
  folder?: UploadFolder;
  maxSizeMB?: number;
  workshopCode?: string;
}

const HOSTING_SAFE_IMAGE_SIZE_BYTES = Math.floor(1.8 * 1024 * 1024);
const MAX_IMAGE_DIMENSION = 1920;

const canCompressImage = (file: File) => (
  file.type.startsWith("image/") &&
  !["image/gif", "image/svg+xml"].includes(file.type)
);

const loadImage = (url: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error("No se pudo preparar la imagen para subirla"));
  image.src = url;
});

const canvasToBlob = (canvas: HTMLCanvasElement, quality: number) => (
  new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", quality);
  })
);

export async function compressImageForHosting(file: File): Promise<File> {
  if (!canCompressImage(file)) return file;

  const isAlreadyWebP = file.type === "image/webp";
  if (isAlreadyWebP && file.size <= HOSTING_SAFE_IMAGE_SIZE_BYTES) {
    return file;
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);
    const largestSide = Math.max(image.naturalWidth, image.naturalHeight);
    let scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(1, largestSide));
    let quality = 0.82;
    let lastBlob: Blob | null = null;

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");
      if (!context) break;

      context.drawImage(image, 0, 0, width, height);
      const blob = await canvasToBlob(canvas, quality);
      if (!blob) break;

      lastBlob = blob;
      if (blob.size <= HOSTING_SAFE_IMAGE_SIZE_BYTES) {
        const baseName = file.name.replace(/\.[^.]+$/, "") || "imagen";
        return new File([blob], `${baseName}.webp`, {
          type: "image/webp",
          lastModified: Date.now(),
        });
      }

      if (quality > 0.58) {
        quality -= 0.08;
      } else {
        scale *= 0.82;
      }
    }

    if (lastBlob && lastBlob.size < file.size) {
      const baseName = file.name.replace(/\.[^.]+$/, "") || "imagen";
      return new File([lastBlob], `${baseName}.webp`, {
        type: "image/webp",
        lastModified: Date.now(),
      });
    }

    return file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const { folder = "general", maxSizeMB = 10, workshopCode } = options;
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const uploadFile = async (file: File): Promise<UploadResult> => {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    setIsUploading(true);
    setProgress(0);

    try {
      setProgress(10);
      const uploadCandidate = await compressImageForHosting(file);

      if (uploadCandidate.size > maxSizeBytes) {
        toast({
          title: "Archivo muy grande",
          description: `El archivo excede el limite de ${maxSizeMB}MB`,
          variant: "destructive",
        });
        return { success: false, error: "Archivo muy grande" };
      }

      if (canCompressImage(file) && uploadCandidate.size > HOSTING_SAFE_IMAGE_SIZE_BYTES) {
        toast({
          title: "Imagen muy grande",
          description: "La imagen sigue siendo demasiado pesada para el hosting. Prueba con una imagen mas pequena.",
          variant: "destructive",
        });
        return { success: false, error: "Imagen muy grande para el hosting" };
      }

      console.log("=== UPLOAD START ===");
      console.log(
        "File:",
        uploadCandidate.name,
        "Size:",
        uploadCandidate.size,
        "Type:",
        uploadCandidate.type,
        file !== uploadCandidate ? `(original ${file.size})` : "",
      );
      console.log("Folder:", folder, "Workshop:", workshopCode);

      setProgress(25);
      const result = await phpApiUpload(uploadCandidate, folder, workshopCode);
      setProgress(100);

      console.log("Upload successful!");

      return {
        success: true,
        url: result.url,
        secureUrl: result.url,
        filename: result.name,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      console.error("Upload error:", error);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    } finally {
      setIsUploading(false);
      setProgress(0);
      console.log("=== UPLOAD END ===");
    }
  };

  const uploadMultiple = async (files: File[]): Promise<UploadResult[]> => {
    const results: UploadResult[] = [];
    for (const file of files) {
      const result = await uploadFile(file);
      results.push(result);
    }
    return results;
  };

  return {
    uploadFile,
    uploadMultiple,
    isUploading,
    progress,
  };
}

export function isStorageConfigured(): boolean {
  return true;
}
