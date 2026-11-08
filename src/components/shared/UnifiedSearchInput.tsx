import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface UnifiedSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  inputClassName?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  type?: string;
  enterKeyHint?: "enter" | "done" | "go" | "next" | "previous" | "search" | "send";
  inputMode?: "none" | "text" | "tel" | "url" | "email" | "numeric" | "decimal" | "search";
  autoCapitalize?: string;
  autoCorrect?: string;
  spellCheck?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
}

export function UnifiedSearchInput({
  value,
  onChange,
  placeholder,
  className,
  inputClassName,
  onFocus,
  onBlur,
  type,
  enterKeyHint,
  inputMode,
  autoCapitalize,
  autoCorrect,
  spellCheck,
  inputRef,
}: UnifiedSearchInputProps) {
  // Barra de búsqueda M3 (criterio docs/CRITERIO-DISENO-M3E.md): píldora tonal
  // sin borde, texto de 16 px (evita el zoom automático de iOS) y botón para borrar.
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        type={type}
        enterKeyHint={enterKeyHint}
        inputMode={inputMode}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        spellCheck={spellCheck}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        className={cn(
          "h-12 rounded-full border-0 bg-card pl-12 text-base text-foreground shadow-sm",
          value ? "pr-12" : "pr-4",
          "placeholder:font-normal placeholder:text-muted-foreground",
          "focus-visible:border-0 focus-visible:ring-2 focus-visible:ring-primary",
          "[&::-webkit-search-cancel-button]:hidden",
          inputClassName,
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Borrar búsqueda"
          className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground active:bg-muted"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
