import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // v2 prototype: surface2 bg, 1.5px border, 13px radius, 13/14 padding, focus -> primary border
          "flex h-12 w-full rounded-sm border-[1.5px] border-input bg-card px-4 py-3 text-[15px] font-medium text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground placeholder:font-normal transition-colors hover:border-foreground/60 focus-visible:outline-none focus-visible:border-2 focus-visible:border-primary focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-muted",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
