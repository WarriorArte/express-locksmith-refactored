import { useRef } from "react";
import { Bold, Italic, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ── Sintaxis soportada (mini-markdown, sin HTML) ────────────────────────────
// **negrita**, *cursiva*, líneas que empiezan con "- " como viñetas.

type TextCommand = (text: string, start: number, end: number) => {
  value: string;
  selectionStart: number;
  selectionEnd: number;
};

const wrapSelection: (marker: string, placeholder: string) => TextCommand =
  (marker, placeholder) => (text, start, end) => {
    const before = text.slice(0, start);
    const selected = text.slice(start, end) || placeholder;
    const after = text.slice(end);
    return {
      value: `${before}${marker}${selected}${marker}${after}`,
      selectionStart: before.length + marker.length,
      selectionEnd: before.length + marker.length + selected.length,
    };
  };

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

function renderInline(line: string, keyPrefix: string): React.ReactNode[] {
  const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter((p) => p !== "");
  if (parts.length === 0) return [line];
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={`${keyPrefix}-${i}`}>{part.slice(1, -1)}</em>;
    }
    return <span key={`${keyPrefix}-${i}`}>{part}</span>;
  });
}

interface FormattedTextProps {
  text: string;
  className?: string;
}

export function FormattedText({ text, className }: FormattedTextProps) {
  const lines = text.split("\n");
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

  lines.forEach((line, idx) => {
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
