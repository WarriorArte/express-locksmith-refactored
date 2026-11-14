import { useRef, useState } from "react";
import { Bold, Brackets, Image as ImageIcon, ImagePlus, Info, Italic, List, Loader2 } from "lucide-react";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useWorkshop } from "@/hooks/useWorkshop";
import { resolveStorageUrl } from "@/lib/phpApi";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ── Sintaxis soportada (mini-markdown, sin HTML) ────────────────────────────
// **negrita**, *cursiva*, líneas que empiezan con "- " como viñetas.
//
// Criterio de notas (usuario, 2026-11-14): una nota se escribe entre corchetes,
// [nota para el técnico], y se muestra como aviso aparte (NoteCallout). Queda
// descartado el criterio anterior: "**título** descripción" con el párrafo
// terminado en ":".

type TextCommand = (text: string, start: number, end: number) => {
  value: string;
  selectionStart: number;
  selectionEnd: number;
};

const wrapWith: (open: string, close: string, placeholder: string) => TextCommand =
  (open, close, placeholder) => (text, start, end) => {
    const before = text.slice(0, start);
    const selected = text.slice(start, end) || placeholder;
    const after = text.slice(end);
    return {
      value: `${before}${open}${selected}${close}${after}`,
      selectionStart: before.length + open.length,
      selectionEnd: before.length + open.length + selected.length,
    };
  };

const wrapSelection = (marker: string, placeholder: string) => wrapWith(marker, marker, placeholder);

const toggleBulletLines: TextCommand = (text, start, end) => {
  const lineStart = text.lastIndexOf("\n", start - 1) + 1;
  const nextBreak = text.indexOf("\n", end);
  const lineEnd = nextBreak === -1 ? text.length : nextBreak;

  const before = text.slice(0, lineStart);
  const block = text.slice(lineStart, lineEnd);
  const after = text.slice(lineEnd);

  const lines = block.split("\n");
  const contentLines = lines.filter((l) => l.trim() !== "");
  const allBulleted = contentLines.length > 0 && contentLines.every((l) => /^-\s/.test(l));
  const nextLines = lines.map((l) => {
    if (l.trim() === "") return l;
    return allBulleted ? l.replace(/^-\s/, "") : (/^-\s/.test(l) ? l : `- ${l}`);
  });
  const nextBlock = nextLines.join("\n");

  return {
    value: before + nextBlock + after,
    selectionStart: lineStart,
    selectionEnd: lineStart + nextBlock.length,
  };
};

// ── Imágenes ─────────────────────────────────────────────────────────────────
// ![](url) sola en su línea → imagen de párrafo (ancho completo).
// ![](url) entre palabras → imagen pequeña en línea (altura de una línea de texto).
// El alt va siempre vacío para no chocar con las notas entre corchetes.

export const IMAGE_TOKEN = /!\[\]\(([^)\s]+)\)/;
const IMAGE_LINE = /^\s*!\[\]\(([^)\s]+)\)\s*$/;

export function blockImageUrl(line: string): string | null {
  const m = IMAGE_LINE.exec(line);
  return m ? m[1] : null;
}

export function imageMarkup(url: string, inline: boolean, text: string, start: number) {
  const token = `![](${url})`;
  if (inline) {
    const before = text.slice(0, start);
    const pad = before && !/\s$/.test(before) ? " " : "";
    return `${pad}${token} `;
  }
  const before = text.slice(0, start);
  const lead = before && !before.endsWith("\n") ? "\n" : "";
  return `${lead}${token}\n`;
}

export function BlockImage({ url, className }: { url: string; className?: string }) {
  return (
    <img
      src={resolveStorageUrl(url) ?? url}
      alt=""
      loading="lazy"
      className={cn("my-1 block h-auto max-h-[420px] max-w-full rounded-2xl bg-muted object-contain", className)}
    />
  );
}

// ── Notas entre corchetes ────────────────────────────────────────────────────

const NOTE_ONLY = /^\s*(?:[-*]|\d+[.)])?\s*\[(.+)\]\s*$/;
const NOTE_OPEN = /^\s*(?:[-*]|\d+[.)])?\s*\[(.*)$/;
const NOTE_CLOSE = /^(.*?)\]\s*$/;

export type TextChunk = { kind: "note"; text: string } | { kind: "line"; text: string };

/**
 * Separa el texto en notas (corchetes, pueden abarcar varias líneas) y líneas
 * normales. Es el criterio vigente para marcar una nota.
 */
export function splitBracketNotes(text: string): TextChunk[] {
  const chunks: TextChunk[] = [];
  let note: string[] | null = null;

  for (const raw of text.split("\n")) {
    const line = raw.trim();

    if (note) {
      const close = NOTE_CLOSE.exec(line);
      if (close && close[1].trim()) {
        note.push(close[1].trim());
        chunks.push({ kind: "note", text: note.filter(Boolean).join(" ") });
        note = null;
      } else if (line) {
        note.push(line);
      }
      continue;
    }

    if (!line) {
      chunks.push({ kind: "line", text: "" });
      continue;
    }
    const only = NOTE_ONLY.exec(line);
    if (only) {
      chunks.push({ kind: "note", text: only[1].trim() });
      continue;
    }
    if (NOTE_OPEN.test(line)) {
      note = [line.replace(NOTE_OPEN, (_m, inner: string) => inner.trim())];
      continue;
    }
    chunks.push({ kind: "line", text: line });
  }

  if (note) chunks.push({ kind: "note", text: note.filter(Boolean).join(" ") });
  return chunks;
}

/** Aviso M3: la nota escrita entre corchetes se muestra así, no como texto suelto. */
export function NoteCallout({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "flex gap-3 rounded-2xl bg-background/70 p-3.5 text-sm leading-relaxed text-muted-foreground",
        className,
      )}
    >
      <Info className="mt-0.5 h-[18px] w-[18px] shrink-0 text-primary" />
      <span className="min-w-0 flex-1">{children}</span>
    </p>
  );
}

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  /** Carpeta del servidor donde se suben las imágenes; sin ella no hay botones de imagen. */
  imageFolder?: "immo";
}

export function RichTextEditor({ value, onChange, placeholder, rows = 4, className, imageFolder }: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const insertInline = useRef(false);
  const savedCursor = useRef(0);
  const { currentWorkshop } = useWorkshop();
  const { uploadFile } = useFileUpload({ folder: imageFolder ?? "immo", workshopCode: currentWorkshop?.code });
  const [uploading, setUploading] = useState(false);

  const pickImage = (inline: boolean) => {
    insertInline.current = inline;
    savedCursor.current = textareaRef.current?.selectionStart ?? value.length;
    fileRef.current?.click();
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    const result = await uploadFile(file);
    setUploading(false);
    if (!result.success || !result.url) return;
    const pos = Math.min(savedCursor.current, value.length);
    const insert = imageMarkup(result.url, insertInline.current, value, pos);
    const next = value.slice(0, pos) + insert + value.slice(pos);
    onChange(next);
    const el = textareaRef.current;
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(pos + insert.length, pos + insert.length);
    });
  };

  const runCommand = (command: TextCommand) => {
    const el = textareaRef.current;
    if (!el) return;
    const result = command(value, el.selectionStart, el.selectionEnd);
    onChange(result.value);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  };

  const toolbarButtons: { icon: React.ReactNode; label: string; command: TextCommand }[] = [
    { icon: <Bold className="w-3.5 h-3.5" />, label: "Negrita", command: wrapSelection("**", "negrita") },
    { icon: <Italic className="w-3.5 h-3.5" />, label: "Cursiva", command: wrapSelection("*", "cursiva") },
    { icon: <List className="w-3.5 h-3.5" />, label: "Viñetas", command: toggleBulletLines },
    {
      icon: <Brackets className="w-3.5 h-3.5" />,
      label: "Nota entre corchetes",
      command: wrapWith("[", "]", "nota para el técnico"),
    },
  ];

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        {toolbarButtons.map(({ icon, label, command }) => (
          <Button
            key={label}
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7"
            title={label}
            aria-label={label}
            onClick={() => runCommand(command)}
          >
            {icon}
          </Button>
        ))}
        {imageFolder && (
          <>
            <Button type="button" variant="outline" size="icon" className="h-7 w-7" title="Imagen en párrafo"
              aria-label="Imagen en párrafo" disabled={uploading} onClick={() => pickImage(false)}>
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
            </Button>
            <Button type="button" variant="outline" size="icon" className="h-7 w-7" title="Imagen pequeña entre palabras"
              aria-label="Imagen pequeña entre palabras" disabled={uploading} onClick={() => pickImage(true)}>
              <ImageIcon className="w-3 h-3" />
            </Button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} />
          </>
        )}
      </div>
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={cn("resize-none", className)}
      />
    </div>
  );
}

// ── Renderizado de solo lectura ──────────────────────────────────────────────

export function renderInline(line: string, keyPrefix: string): React.ReactNode[] {
  const parts = line.split(/(!\[\]\([^)\s]+\)|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\])/g).filter((p) => p !== "");
  if (parts.length === 0) return [line];
  return parts.map((part, i) => {
    const img = /^!\[\]\(([^)\s]+)\)$/.exec(part);
    if (img) {
      return (
        <img
          key={`${keyPrefix}-${i}`}
          src={resolveStorageUrl(img[1]) ?? img[1]}
          alt=""
          loading="lazy"
          className="mx-0.5 inline-block h-[1.6em] w-auto rounded-md align-middle object-contain"
        />
      );
    }
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={`${keyPrefix}-${i}`}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("[") && part.endsWith("]") && part.length > 2) {
      return (
        <span
          key={`${keyPrefix}-${i}`}
          className="mx-0.5 inline-block rounded-md bg-foreground/10 px-1.5 py-0.5 font-medium text-foreground"
        >
          {part.slice(1, -1)}
        </span>
      );
    }
    return <span key={`${keyPrefix}-${i}`}>{part}</span>;
  });
}

interface FormattedTextProps {
  text: string;
  className?: string;
}

export function FormattedText({ text, className }: FormattedTextProps) {
  const blocks: React.ReactNode[] = [];
  let bulletBuffer: string[] = [];

  const flushBullets = (key: string) => {
    if (bulletBuffer.length === 0) return;
    blocks.push(
      <ul key={key} className="list-disc pl-4 space-y-0.5">
        {bulletBuffer.map((item, i) => (
          <li key={i}>{renderInline(item, `${key}-li-${i}`)}</li>
        ))}
      </ul>,
    );
    bulletBuffer = [];
  };

  splitBracketNotes(text).forEach((chunk, idx) => {
    if (chunk.kind === "note") {
      flushBullets(`bullets-${idx}`);
      blocks.push(
        <NoteCallout key={`note-${idx}`}>{renderInline(chunk.text, `note-${idx}`)}</NoteCallout>,
      );
      return;
    }
    const line = chunk.text;
    const bulletMatch = /^-\s+(.*)/.exec(line);
    if (bulletMatch) {
      bulletBuffer.push(bulletMatch[1]);
      return;
    }
    flushBullets(`bullets-${idx}`);
    const blockUrl = blockImageUrl(line);
    if (blockUrl) {
      blocks.push(<BlockImage key={`img-${idx}`} url={blockUrl} />);
    } else if (line.trim() === "") {
      blocks.push(<br key={`br-${idx}`} />);
    } else {
      blocks.push(<p key={`p-${idx}`}>{renderInline(line, `p-${idx}`)}</p>);
    }
  });
  flushBullets("bullets-end");

  return <div className={className}>{blocks}</div>;
}
