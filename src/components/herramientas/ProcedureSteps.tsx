/* eslint-disable react-refresh/only-export-components */
import { Info } from "lucide-react";
import { MaterialShape } from "@/design-system/shapes/MaterialShape";
import { FormattedText, renderInline } from "@/components/herramientas/RichTextField";
import { cn } from "@/lib/utils";

/**
 * Muestra un procedimiento escrito con el mini-markdown de RichTextField como
 * una secuencia de pasos numerados (M3: número en forma "cookie", título y
 * cuerpo), en lugar de una lista de viñetas.
 *
 * Reglas de interpretación (no cambia cómo se guarda el texto):
 *  - Cada línea "- texto" o "1. texto" es un paso.
 *  - "Título: cuerpo" o "**Título:** cuerpo" se separa en título + cuerpo
 *    si el título es corto (≤ 48 caracteres).
 *  - Si el PRIMER paso termina en ":" (p. ej. "El procedimiento puede variar
 *    según el equipo:"), se muestra como nota informativa, no como paso.
 *  - Las líneas sueltas se muestran como párrafos donde aparecen.
 */

type Block =
  | { kind: "note"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "steps"; items: Step[] };

type Step = { title?: string; body: string; raw: string };

const STEP_LINE = /^\s*(?:-|\d+[.)])\s+(.*)$/;
const plain = (s: string) => s.replace(/\*\*?/g, "").trim();

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

  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    if (!line.trim()) continue;
    const step = STEP_LINE.exec(line);
    if (step) {
      if (!current) {
        current = [];
        blocks.push({ kind: "steps", items: current });
      }
      current.push(splitTitle(step[1].trim()));
    } else {
      current = null;
      blocks.push({ kind: "paragraph", text: line.trim() });
    }
  }

  // Primer paso que en realidad es un aviso ("…dependiendo del equipo:")
  const first = blocks.find((b) => b.kind === "steps");
  if (first && first.kind === "steps" && first.items.length >= 2) {
    const lead = first.items[0];
    if (plain(lead.raw).endsWith(":")) {
      first.items.shift();
      blocks.splice(blocks.indexOf(first), 0, {
        kind: "note",
        text: lead.raw.replace(/:\s*$/, "."),
      });
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
          return (
            <p
              key={bi}
              className="flex gap-3 rounded-2xl bg-background/70 p-3.5 text-sm leading-relaxed text-muted-foreground"
            >
              <Info className="mt-0.5 h-[18px] w-[18px] shrink-0 text-primary" />
              <span>{renderInline(block.text, `note-${bi}`)}</span>
            </p>
          );
        }
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
              stepNumber += 1;
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
