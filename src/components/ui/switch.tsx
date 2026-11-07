import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-8 w-[52px] shrink-0 cursor-pointer items-center rounded-full border-2 transition-colors data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=unchecked]:border-input data-[state=unchecked]:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block rounded-full ring-0 transition-all duration-200 ease-emphasized data-[state=unchecked]:h-4 data-[state=unchecked]:w-4 data-[state=unchecked]:translate-x-[6px] data-[state=unchecked]:bg-input data-[state=checked]:h-6 data-[state=checked]:w-6 data-[state=checked]:translate-x-[22px] data-[state=checked]:bg-primary-foreground",
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
