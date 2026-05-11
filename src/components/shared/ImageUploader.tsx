import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { compressImageForHosting, isStorageConfigured, type UploadFolder } from "@/hooks/useFileUpload";
import { Camera, Upload, X, Loader2, Image as ImageIcon, Link, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { ImageGalleryDialog } from "./ImageGalleryDialog";

function getStorableUrl(url: string): string {
  if (!url) return '';
  try {
    const urlObj = new URL(url);
    urlObj.searchParams.delete('token');
    return urlObj.toString();
  } catch {
    return url;
  }
}

interface ImageUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  onPendingFile?: (file: File | null, blobUrl?: string) => void;
  folder?: UploadFolder;
  workshopCode?: string;
  placeholder?: string;
  className?: string;
  showPreview?: boolean;
  disabled?: boolean;
}

export function ImageUploader({
  value,
  onChange,
  onPendingFile,
  folder = 'general',
  workshopCode,
  placeholder = "https://ejemplo.com/imagen.png",
  className,
  showPreview = true,
  disabled = false,
}: ImageUploaderProps) {
  const [mode, setMode] = useState<'upload' | 'url' | 'gallery'>('upload');
  const [urlInput, setUrlInput] = useState(value || '');
  const [showGallery, setShowGallery] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const blobUrlRef = useRef<string | null>(null);
  const storageConfigured = isStorageConfigured();

  // Revoke blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  useEffect(() => {
    setUrlInput(value || '');
  }, [value]);

  const handleFileSelect = async (file: File) => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const converted = await compressImageForHosting(file);
      // Revoke previous blob URL
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
      const blobUrl = URL.createObjectURL(converted);
      blobUrlRef.current = blobUrl;
      setPreviewUrl(blobUrl);
      onPendingFile?.(converted, blobUrl);
      onChange(blobUrl);
      setUrlInput(blobUrl);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      // Clear any pending file since user is using a direct URL
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      onPendingFile?.(null);
      setPreviewUrl(null);
      onChange(getStorableUrl(urlInput.trim()));
    }
  };

  const handleClear = () => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    onPendingFile?.(null);
    onChange('');
    setUrlInput('');
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleGallerySelect = (url: string) => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    onPendingFile?.(null);
    setPreviewUrl(null);
    onChange(url);
    setUrlInput(url);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) handleFileSelect(file);
  }, []);

  const effectivePreviewUrl = previewUrl || value;

  const tabs = [
    { id: 'upload' as const, icon: Upload, label: 'Subir' },
    { id: 'gallery' as const, icon: FolderOpen, label: 'Galería', disabled: !storageConfigured },
    { id: 'url' as const, icon: Link, label: 'URL' },
  ];

  return (
    <div className={cn("space-y-3", className)}>
      {/* Tab strip */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
        {tabs.map(({ id, icon: Icon, label, disabled: tabDisabled }) => (
          <button
            key={id}
            type="button"
            disabled={tabDisabled || disabled}
            onClick={() => {
              setMode(id);
              if (id === 'gallery') setShowGallery(true);
            }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all",
              mode === id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
              (tabDisabled || disabled) && "opacity-40 cursor-not-allowed",
            )}
          >
            <Icon className="w-3 h-3" />
            {label}
          </button>
        ))}
      </div>

      {/* Upload zone */}
      {mode === 'upload' && (
        <>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
            disabled={disabled || isProcessing}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
            disabled={disabled || isProcessing}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />

          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => !isProcessing && storageConfigured && fileInputRef.current?.click()}
            className={cn(
              "relative rounded-2xl border-2 border-dashed transition-all overflow-hidden",
              "flex flex-col items-center justify-center gap-2 cursor-pointer select-none",
              effectivePreviewUrl ? "border-transparent p-0" : "p-6 min-h-[140px]",
              isDragging
                ? "border-primary bg-primary/5 scale-[1.01]"
                : effectivePreviewUrl
                  ? "border-transparent"
                  : "border-border hover:border-primary/50 hover:bg-muted/50",
              (disabled || isProcessing || !storageConfigured) && "cursor-not-allowed opacity-60",
            )}
          >
            {/* Preview state */}
            {effectivePreviewUrl && !isProcessing ? (
              <div className="relative w-full group">
                <img
                  src={effectivePreviewUrl}
                  alt="Preview"
                  className="w-full max-h-52 object-cover rounded-2xl border border-border"
                  onError={() => { if (previewUrl) setPreviewUrl(null); }}
                />
                <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 backdrop-blur-sm text-white text-xs font-semibold border border-white/30 hover:bg-white/30 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Cambiar
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleClear(); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/80 backdrop-blur-sm text-white text-xs font-semibold hover:bg-red-500 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    Quitar
                  </button>
                </div>
              </div>
            ) : isProcessing ? (
              <div className="flex flex-col items-center gap-3 py-2 w-full px-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                </div>
                <p className="text-sm text-muted-foreground">Procesando imagen…</p>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground">Seleccionar imagen</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isDragging ? "Suelta aquí" : "Haz clic o arrastra una imagen"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); cameraInputRef.current?.click(); }}
                  disabled={disabled || isProcessing || !storageConfigured}
                  className="absolute top-3 right-3 w-8 h-8 rounded-xl bg-muted border border-border flex items-center justify-center hover:bg-muted/80 transition-colors"
                >
                  <Camera className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* URL mode */}
      {mode === 'url' && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder={placeholder}
              disabled={disabled}
              className="flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
            />
            <button
              type="button"
              onClick={handleUrlSubmit}
              disabled={disabled || !urlInput.trim()}
              className={cn(
                "px-4 rounded-xl text-sm font-semibold transition-all",
                "bg-primary text-primary-foreground hover:brightness-95",
                (!urlInput.trim() || disabled) && "opacity-40 cursor-not-allowed",
              )}
            >
              Aplicar
            </button>
          </div>
          {effectivePreviewUrl && (
            <div className="relative group">
              <img
                src={effectivePreviewUrl}
                alt="Preview"
                className="w-full max-h-44 object-cover rounded-2xl border border-border"
                onError={() => { if (previewUrl) setPreviewUrl(null); }}
              />
              <button
                type="button"
                onClick={handleClear}
                className="absolute top-2 right-2 w-7 h-7 rounded-xl bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors"
              >
                <X className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Gallery Dialog */}
      <ImageGalleryDialog
        open={showGallery}
        onOpenChange={setShowGallery}
        folder={folder}
        workshopCode={workshopCode}
        onSelect={handleGallerySelect}
      />
    </div>
  );
}
