import { useState, useEffect } from "react";
import type { AlarmaYearImage } from "@/types";

type ImageFileHandle = {
  kind: "file";
  name: string;
  getFile(): Promise<File>;
};

type ImageDirectoryHandle = {
  kind: "directory";
  name: string;
  values(): AsyncIterableIterator<ImageFileHandle | ImageDirectoryHandle>;
};

// ── Module-level state — shared across all instances, survives re-renders ─────

let _dirHandle: ImageDirectoryHandle | null = null;
let _imageCache = new Map<string, string>(); // filename → objectUrl
let _folderName: string | null = null;
const _listeners = new Set<() => void>();

function notify() {
  _listeners.forEach((fn) => fn());
}

// ── Public helpers (module-level, no re-creation on render) ───────────────────

export function getImageByFile(file: string): string | null {
  if (!file) return null;
  const filename = file.split(/[/\\]/).pop() ?? file;
  return _imageCache.get(filename) ?? null;
}

export function getYearImageUrl(
  yearImages: AlarmaYearImage[] | undefined,
  year: number
): string | null {
  if (!yearImages?.length) return null;
  const match = yearImages.find((img) => img.years.includes(String(year)));
  const file = (match ?? yearImages[0]).file;
  return getImageByFile(file);
}

export function getFirstImageUrl(
  yearImages: AlarmaYearImage[] | undefined
): string | null {
  if (!yearImages?.length) return null;
  return getImageByFile(yearImages[0].file);
}

// ── Async actions ─────────────────────────────────────────────────────────────

export async function openImageFolder(): Promise<boolean> {
  if (!("showDirectoryPicker" in window)) return false;
  try {
    const handle = await (
      window as unknown as {
        showDirectoryPicker(opts?: { mode: string }): Promise<ImageDirectoryHandle>;
      }
    ).showDirectoryPicker({ mode: "read" });

    // Revoke old object URLs to free memory
    _imageCache.forEach((url) => URL.revokeObjectURL(url));
    _imageCache = new Map();
    _dirHandle = handle;
    _folderName = handle.name;

    // Scan all image files in the folder using .values() (correct FSA API)
    for await (const entry of handle.values()) {
      if (entry.kind === "file" && /\.(webp|jpg|jpeg|png|gif|avif)$/i.test(entry.name)) {
        try {
          const file = await entry.getFile();
          _imageCache.set(entry.name, URL.createObjectURL(file));
        } catch {
          // skip unreadable file
        }
      }
    }

    notify();
    return true;
  } catch {
    return false;
  }
}

export function clearImageFolder(): void {
  _imageCache.forEach((url) => URL.revokeObjectURL(url));
  _imageCache = new Map();
  _dirHandle = null;
  _folderName = null;
  notify();
}

// ── Hook — provides reactivity when folder state changes ─────────────────────

export function useImageFolder() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const update = () => setTick((n) => n + 1);
    _listeners.add(update);
    return () => void _listeners.delete(update);
  }, []);

  return {
    folderName: _folderName,
    imageCount: _imageCache.size,
    isSupported: typeof window !== "undefined" && "showDirectoryPicker" in window,
    openFolder: openImageFolder,
    clearFolder: clearImageFolder,
  };
}
