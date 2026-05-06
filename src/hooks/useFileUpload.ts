import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { phpApiUpload } from "@/lib/phpApi";

export type UploadFolder = 'products' | 'services' | 'logos' | 'documents' | 'general' | 'avatars';

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
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const { folder = 'general', maxSizeMB = 10 } = options;
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const uploadFile = async (file: File): Promise<UploadResult> => {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast({
        title: "Archivo muy grande",
        description: `El archivo excede el límite de ${maxSizeMB}MB`,
        variant: "destructive",
      });
      return { success: false, error: "Archivo muy grande" };
    }

    console.log("=== UPLOAD START ===");
    console.log("File:", file.name, "Size:", file.size, "Type:", file.type);
    console.log("Folder:", folder);

    setIsUploading(true);
    setProgress(0);

    try {
      setProgress(25);
      const result = await phpApiUpload(file, folder);
      setProgress(100);

      console.log("✓ Upload successful!");

      return {
        success: true,
        url: result.url,
        secureUrl: result.url,
        filename: result.name,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      console.error('Upload error:', error);
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

// Verificar si el almacenamiento está configurado
export function isStorageConfigured(): boolean {
  return true;
}
