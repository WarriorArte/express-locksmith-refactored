/* eslint-disable react-refresh/only-export-components */
import { MaterialShape } from "@/design-system/shapes/MaterialShape";
import {
  BlockImage,
  blockImageUrl,
  FormattedText,
  NoteCallout,
  renderInline,
  splitBracketNotes,
} from "@/components/herramientas/RichTextField";
import { cn } from "@/lib/utils";

/**
 * Muestra un procedimiento escrito con el mini-markdown de RichTextField como
 * una secuencia de pasos numerados (M3: número en forma "cookie", título y
 * cuerpo), en lugar de una lista de viñetas.
 *
 * Reglas de interpretación (no cambia cómo se guarda el texto):
 *  - Cada línea "- texto" o "1. texto" es un paso.
 *  - El número escrito se respeta tal cual ("3." muestra 3 aunque sea el quinto
 *    paso, y puede repetirse: procedimientos con varias opciones). Un paso con
 *    "-" continúa desde el número anterior.
 *  - "Título: cuerpo" o "**Título:** cuerpo" se separa en título + cuerpo
 *    si el título es corto (≤ 48 caracteres).
 *  - Una línea entre corchetes — [texto] — es una nota: se muestra como aviso
 *    con ícono de información. Criterio vigente (usuario, 2026-11-14); antes
 *    se usaba el primer paso terminado en ":" y quedó descartado.
 *  - Las líneas sueltas se muestran como párrafos donde aparecen.
 */

type Block =
  | { kind: "note"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "image"; url: string }
  | { kind: "steps"; items: Step[] };

type Step = {
  title?: string;
  body: string;
  raw: string;
  images?: string[];
  /** Número escrito en el texto ("3." → 3); ausente en los pasos con "-". */
  number?: number;
};

/** Grupo 1: número escrito (si lo hay). Grupo 2: texto del paso. */
const STEP_LINE = /^\s*(?:-|(\d+)[.)])\s+(.*)$/;

function splitTitle(text: string): Step {
  const bold = /^\*\*(.+?)\*\*\s*:?\s*(.*)$/.exec(text);
  if (bold) {
    const title = bold[1].replace(/:$/, "").trim();
    if (title.length <= 48 && bold[2].trim()) return { title, body: bold[2].trim(), raw: text };
  }
  const colon = /^([^:*]{2,48}):\s+(.+)$/.exec(text);
  if (colon) return { title: colon[1].trim(), body: colon[2].trim(), raw: text };
  return { body: text, raw: text };
}

export function parseProcedure(text: string): Block[] {
  const blocks: Block[] = [];
  let current: Step[] | null = null;

  for (const chunk of splitBracketNotes(text)) {
    if (chunk.kind === "note") {
      current = null;
      blocks.push({ kind: "note", text: chunk.text });
      continue;
    }
    const line = chunk.text;
    if (!line.trim()) continue;
    const imgUrl = blockImageUrl(line);
    if (imgUrl) {
      // Una imagen de párrafo justo tras un paso queda dentro de ese paso.
      const last = current?.[current.length - 1];
      if (last) last.images = [...(last.images ?? []), imgUrl];
      else blocks.push({ kind: "image", url: imgUrl });
      continue;
    }
    const stepImg = STEP_LINE.exec(line);
    const stepOnlyImg = stepImg ? blockImageUrl(stepImg[2]) : null;
    if (stepOnlyImg && current?.length) {
      current[current.length - 1].images = [...(current[current.length - 1].images ?? []), stepOnlyImg];
      continue;
    }
    const step = stepImg;
    if (step) {
      if (!current) {
        current = [];
        blocks.push({ kind: "steps", items: current });
      }
      const item = splitTitle(step[2].trim());
      if (step[1]) item.number = Number(step[1]);
      current.push(item);
    } else {
      current = null;
      blocks.push({ kind: "paragraph", text: line.trim() });
    }
  }

  return blocks;
}

interface ProcedureStepsProps {
  text: string;
  className?: string;
}

export function ProcedureSteps({ text, className }: ProcedureStepsProps) {
  const blocks = parseProcedure(text);
  if (!blocks.some((b) => b.kind === "steps")) {
    return <FormattedText text={text} className={cn("space-y-1 text-[15px] leading-relaxed", className)} />;
  }

  let stepNumber = 0;
  return (
    <div className={cn("space-y-4", className)}>
      {blocks.map((block, bi) => {
        if (block.kind === "note") {
          return <NoteCallout key={bi}>{renderInline(block.text, `note-${bi}`)}</NoteCallout>;
        }
        if (block.kind === "image") return <BlockImage key={bi} url={block.url} />;
        if (block.kind === "paragraph") {
          return (
            <p key={bi} className="text-[15px] leading-relaxed text-foreground">
              {renderInline(block.text, `p-${bi}`)}
            </p>
          );
        }
        return (
          <ol key={bi} className="space-y-4">
            {block.items.map((item, ii) => {
              // Número escrito = se muestra tal cual; con "-" se sigue contando.
              stepNumber = item.number ?? stepNumber + 1;
              return (
                <li key={ii} className="flex gap-3.5">
                  <MaterialShape name="cookie9" className="h-9 w-9 text-primary-light">
                    <span className="text-sm font-bold tabular-nums text-foreground">{stepNumber}</span>
                  </MaterialShape>
                  <div className="min-w-0 flex-1 pt-1.5">
                    {item.title && (
                      <p className="text-[15px] font-semibold leading-snug text-foreground">
                        {renderInline(item.title, `t-${bi}-${ii}`)}
                      </p>
                    )}
                    <p
                      className={cn(
                        "text-[15px] leading-relaxed",
                        item.title ? "mt-0.5 text-muted-foreground" : "text-foreground",
                      )}
                    >
                      {renderInline(item.body, `b-${bi}-${ii}`)}
                    </p>
                    {item.images?.map((url) => <BlockImage key={url} url={url} className="mt-2" />)}
                  </div>
                </li>
              );
            })}
          </ol>
        );
      })}
    </div>
  );
}
