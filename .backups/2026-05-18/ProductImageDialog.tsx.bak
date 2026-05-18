import { Dialog, DialogContent, DialogTitle } from "@/components/ui/responsive-dialog";
import { Package } from "lucide-react";
import { ImageViewDialog } from "@/components/shared/ImageViewDialog";

interface ProductImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string | null;
  productName: string;
}

export function ProductImageDialog({ 
  open, 
  onOpenChange, 
  imageUrl, 
  productName 
}: ProductImageDialogProps) {
  if (imageUrl) {
    return (
      <ImageViewDialog
        open={open}
        onOpenChange={onOpenChange}
        images={[{ url: imageUrl, description: productName }]}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogTitle className="sr-only">Imagen de {productName}</DialogTitle>
        <div className="flex items-center justify-center min-h-[400px] bg-muted/50 rounded-lg">
          <div className="text-center">
            <Package className="w-24 h-24 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Sin imagen</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
