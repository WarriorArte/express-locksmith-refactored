import { useRef } from "react";
import { Bold, Brackets, Info, Italic, List } from "lucide-react";
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
}

export function RichTextEditor({ value, onChange, placeholder, rows = 4, className }: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
  const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\])/g).filter((p) => p !== "");
  if (parts.length === 0) return [line];
  return parts.map((part, i) => {
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
    if (line.trim() === "") {
      blocks.push(<br key={`br-${idx}`} />);
    } else {
      blocks.push(<p key={`p-${idx}`}>{renderInline(line, `p-${idx}`)}</p>);
    }
  });
  flushBullets("bullets-end");

  return <div className={className}>{blocks}</div>;
}
