import { DetailSection } from "@/design-system/detail/DetailScreen";
import { resolveStorageUrl } from "@/lib/phpApi";
import { spawnRipple } from "@/lib/ripple";
import type { ServiceImage } from "./types";

interface Props {
  images: ServiceImage[];
  onView: (index: number) => void;
}

/** Fotos del servicio en cuadrícula; tocar abre el visor. */
export function DetailViewImages({ images, onView }: Props) {
  if (!images.length) return null;
  return (
    <DetailSection
      title="Fotos"
      className="bg-muted shadow-none"
      action={<span className="text-sm tabular-nums text-muted-foreground">{images.length}</span>}
    >
      <div className="grid grid-cols-3 gap-2">
        {images.map((image, index) => (
          <button
            key={image.id}
            type="button"
            onClick={() => onView(index)}
            onPointerDown={spawnRipple}
            aria-label={image.description ? `Ver foto: ${image.description}` : `Ver foto ${index + 1}`}
            className="relative aspect-square overflow-hidden rounded-2xl bg-background"
          >
            <img
              src={resolveStorageUrl(image.image_url) ?? undefined}
              alt={image.description || "Foto del servicio"}
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/placeholder.svg";
              }}
            />
          </button>
        ))}
      </div>
    </DetailSection>
  );
}
