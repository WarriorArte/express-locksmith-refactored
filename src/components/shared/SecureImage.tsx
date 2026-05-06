import { useState, useEffect, memo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageOff } from "lucide-react";

interface SecureImageProps {
  src: string;
  alt?: string;
  className?: string;
  fallback?: React.ReactNode;
  onClick?: () => void;
  lazy?: boolean;
}

/**
 * SecureImage - Componente ultra-simple para imágenes
 * 
 * Los URLs ya vienen con tokens inclusos del servidor,
 * no hay lógica de token aquí - es solo rendering
 */
export const SecureImage = memo(function SecureImage({ 
  src, 
  alt = "", 
  className = "", 
  fallback, 
  onClick,
  lazy = true 
}: SecureImageProps) {
  const [loading, setLoading] = useState(!!src);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Reiniciar estado cuando cambia el src
  useEffect(() => {
    setLoading(!!src);
    setError(false);
    setRetryCount(0);
  }, [src]);

  const handleError = () => {
    if (retryCount < 2) {
      setRetryCount(prev => prev + 1);
    } else {
      setError(true);
      setLoading(false);
    }
  };

  const handleLoad = () => {
    setLoading(false);
    setError(false);
  };

  // Sin src
  if (!src) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <div className={`flex items-center justify-center bg-muted ${className}`}>
        <ImageOff className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  // Error al cargar
  if (error) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <div className={`flex items-center justify-center bg-muted ${className}`}>
        <ImageOff className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  // Cargando
  if (loading) {
    return <Skeleton className={className} />;
  }

  // Imagen lista
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onLoad={handleLoad}
      onError={handleError}
      onClick={onClick}
      loading={lazy ? "lazy" : "eager"}
      decoding="async"
    />
  );
});

// Obtener URL sin token para guardar en BD
export function getStorableUrl(url: string): string {
  if (!url) return '';
  try {
    const urlObj = new URL(url);
    urlObj.searchParams.delete('token');
    return urlObj.toString();
  } catch {
    return url;
  }
};
