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
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        className={cn("pl-9 rounded-2xl bg-card border-border h-11 text-[13px]", inputClassName)}
      />
    </div>
  );
}
