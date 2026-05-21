import { useState } from "react";
import { resolveStorageUrl } from "@/lib/phpApi";
import { ChevronDown, ChevronUp, Image as ImageIcon, ZoomIn } from "lucide-react";
import type { ServiceImage } from "./types";

interface Props {
  images: ServiceImage[];
  onView: (index: number) => void;
}

export function DetailViewImages({ images, onView }: Props) {
  const [showImages, setShowImages] = useState(true);
  if (!images.length) return null;
  return (
    <div>
      <button
        type="button"
        className="w-full flex items-center justify-between p-0 hover:opacity-80 transition-opacity"
        onClick={() => setShowImages(!showImages)}
      >
        <h4 className="font-semibold flex items-center gap-2">
          <ImageIcon className="w-4 h-4" />
          Imágenes ({images.length})
        </h4>
        {showImages ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {showImages && (
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {images.map((image, index) => (
            <div key={image.id} className="relative group rounded-lg overflow-hidden border bg-muted/30">
              <div className="aspect-square">
                <img
                  src={resolveStorageUrl(image.image_url) ?? undefined}
                  alt={image.description || "Imagen del servicio"}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/placeholder.svg";
                  }}
                />
              </div>
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  type="button"
                  className="flex items-center gap-1 bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded"
                  onClick={() => onView(index)}
                >
                  <ZoomIn className="w-4 h-4" />
                  Ver
                </button>
              </div>
              {image.description && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                  <p className="text-xs text-white truncate">{image.description}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
