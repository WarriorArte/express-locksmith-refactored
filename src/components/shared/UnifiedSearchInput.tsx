import { Search } from "lucide-react";
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
  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
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
          "pl-9 rounded-2xl h-11 text-[13px]",
          "bg-card border-foreground/25 text-foreground",
          "placeholder:text-muted-foreground placeholder:font-normal",
          "focus-visible:border-primary focus-visible:border-2",
          "transition-[border-color,background-color] duration-200",
          inputClassName,
        )}
      />
    </div>
  );
}
