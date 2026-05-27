import * as React from "react";

import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        // v2 prototype: matches Input
        "flex min-h-[88px] w-full rounded-lg border-[1.5px] border-border bg-[hsl(var(--surface-2))] px-3.5 py-3 text-sm font-medium text-foreground ring-offset-background placeholder:text-muted-foreground placeholder:font-normal transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
