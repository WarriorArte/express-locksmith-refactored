import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";
import { useDialogBackStep } from "@/components/ui/responsive-dialog";

const Tabs = ({
  value,
  defaultValue,
  onValueChange,
  onTouchStart,
  onTouchEnd,
  onTouchStartCapture,
  onTouchEndCapture,
  style,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) => {
  const { registerBackStep } = useDialogBackStep();
  const currentValueRef = React.useRef<string | undefined>(
    typeof value === "string" ? value : defaultValue,
  );
  const touchStartRef = React.useRef<{ x: number; y: number } | null>(null);

  React.useEffect(() => {
    if (typeof value === "string") {
      currentValueRef.current = value;
    }
  }, [value]);

  const handleValueChange = (nextValue: string) => {
    const previousValue =
      (typeof value === "string" ? value : currentValueRef.current) ?? undefined;

    if (onValueChange && previousValue && previousValue !== nextValue) {
      registerBackStep(() => {
        onValueChange?.(previousValue);
      });
    }

    currentValueRef.current = nextValue;
    onValueChange?.(nextValue);
  };

  const runSwipeNavigation = (event: React.TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;

    const touch = event.changedTouches[0];
    if (!touch) return;
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    const horizontalIntent = Math.abs(deltaX) > Math.abs(deltaY);
    const SWIPE_THRESHOLD = 48;
    if (!horizontalIntent || Math.abs(deltaX) < SWIPE_THRESHOLD) return;

    const root = event.currentTarget;
    const tabNodes = Array.from(
      root.querySelectorAll<HTMLElement>("[role='tab']"),
    ).filter((node) => !node.hasAttribute("disabled") && node.getAttribute("aria-disabled") !== "true");
    if (tabNodes.length < 2) return;

    const activeIndex = tabNodes.findIndex(
      (node) =>
        node.getAttribute("data-state") === "active" ||
        node.getAttribute("aria-selected") === "true",
    );
    if (activeIndex === -1) return;

    const targetIndex = deltaX < 0 ? activeIndex + 1 : activeIndex - 1;
    if (targetIndex < 0 || targetIndex >= tabNodes.length) return;

    tabNodes[targetIndex].click();
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    onTouchStart?.(event);
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    onTouchEnd?.(event);
    runSwipeNavigation(event);
  };

  const handleTouchStartCapture = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    onTouchStartCapture?.(event);
  };

  const handleTouchEndCapture = (event: React.TouchEvent<HTMLDivElement>) => {
    onTouchEndCapture?.(event);
    runSwipeNavigation(event);
  };

  return (
    <TabsPrimitive.Root
      data-tabs-root="true"
      value={value}
      defaultValue={defaultValue}
      onValueChange={handleValueChange}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchStartCapture={handleTouchStartCapture}
      onTouchEndCapture={handleTouchEndCapture}
      style={{ touchAction: "pan-y", ...style }}
      {...props}
    />
  );
};

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-sm bg-muted p-1 text-muted-foreground",
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    data-tab-value={props.value}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
