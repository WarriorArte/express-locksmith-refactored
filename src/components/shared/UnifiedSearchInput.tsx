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
}

export function UnifiedSearchInput({
  value,
  onChange,
  placeholder,
  className,
  inputClassName,
  onFocus,
  onBlur,
}: UnifiedSearchInputProps) {
  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/45 pointer-events-none z-10" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        className={cn(
          "pl-9 rounded-2xl h-11 text-[13px]",
          "bg-white/[.09] border-white/[.13] text-[hsl(240_22%_95%)]",
          "placeholder:text-white/38 placeholder:font-normal",
          "focus-visible:border-white/30 focus-visible:bg-white/[.12]",
          "transition-[border-color,background-color] duration-200",
          inputClassName,
        )}
      />
    </div>
  );
}
