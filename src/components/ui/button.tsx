/* eslint-disable react-refresh/only-export-components */
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { spawnRipple } from "@/lib/ripple";

const buttonVariants = cva(
  "relative overflow-hidden isolate inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold border border-transparent ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border-[1.5px] border-input bg-transparent text-foreground hover:bg-muted hover:text-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary-hover",
        ghost: "border-transparent hover:bg-muted hover:text-foreground",
        link: "border-transparent text-primary underline-offset-4 hover:underline",
        // Prototype (Redesign.html) — chunky, bold, neon
        proto: "bg-primary text-primary-foreground font-bold hover:bg-primary/90",
        // Tonal (sin borde): acción secundaria junto a "proto" (p. ej. Cancelar en formularios).
        "proto-ghost": "bg-muted text-foreground font-semibold hover:bg-muted/80",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 px-3",
        lg: "h-14 px-8 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, onPointerDown, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        onPointerDown={(event: React.PointerEvent<HTMLButtonElement>) => {
          if (variant !== "link") spawnRipple(event);
          onPointerDown?.(event);
        }}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
