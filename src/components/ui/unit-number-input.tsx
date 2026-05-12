import * as React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface UnitNumberInputProps
  extends Omit<React.ComponentProps<typeof Input>, "type" | "value" | "onChange"> {
  value: number | string;
  onValueChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  wrapperClassName?: string;
  allowManualInput?: boolean;
}

const clamp = (value: number, min?: number, max?: number) => {
  let next = value;
  if (typeof min === "number") next = Math.max(min, next);
  if (typeof max === "number") next = Math.min(max, next);
  return next;
};

export function UnitNumberInput({
  value,
  onValueChange,
  step = 1,
  min,
  max,
  className,
  wrapperClassName,
  allowManualInput = false,
  ...props
}: UnitNumberInputProps) {
  const numericValue = Number(value);
  const isIntegerStep = Number.isInteger(step);
  const manualInputMode = props.inputMode ?? (isIntegerStep ? "numeric" : "decimal");

  const nudge = (direction: 1 | -1) => {
    const base = Number.isFinite(numericValue) ? numericValue : (typeof min === "number" ? min : 0);
    const next = clamp(base + direction * step, min, max);
    onValueChange(next);
  };

  return (
    <div className={cn("flex items-stretch gap-2", wrapperClassName)}>
      <Input
        {...props}
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        readOnly={!allowManualInput}
        inputMode={allowManualInput ? manualInputMode : "none"}
        onPointerDown={(event) => {
          if (!allowManualInput) {
            event.preventDefault();
          }
          props.onPointerDown?.(event);
        }}
        onFocus={(event) => {
          if (!allowManualInput) {
            event.target.blur();
          }
          props.onFocus?.(event);
        }}
        onChange={(event) => {
          const parsed = Number(event.target.value);
          if (Number.isFinite(parsed)) {
            onValueChange(clamp(parsed, min, max));
          }
        }}
        className={cn(
          "flex-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
          className,
        )}
      />
      <div className="w-9 grid grid-rows-2 gap-1">
        <button
          type="button"
          aria-label="Aumentar"
          className="rounded-sm border border-border bg-background/70 text-muted-foreground hover:text-foreground hover:bg-background flex items-center justify-center"
          onClick={() => nudge(1)}
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          aria-label="Disminuir"
          className="rounded-sm border border-border bg-background/70 text-muted-foreground hover:text-foreground hover:bg-background flex items-center justify-center"
          onClick={() => nudge(-1)}
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
