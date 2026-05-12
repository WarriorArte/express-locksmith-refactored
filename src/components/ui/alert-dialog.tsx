import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { clearActiveElementFocus } from "@/lib/focus";

type CloseActionContextValue = {
  registerCloseAction: (closeAction: () => void) => () => void;
};

const noopUnregister = () => {};
const CloseActionContext = React.createContext<CloseActionContextValue>({
  registerCloseAction: () => noopUnregister,
});

const AlertDialog = ({
  children,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Root>) => {
  const isMobile = useIsMobile();
  const isControlled = props.open !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState<boolean>(props.defaultOpen ?? false);
  const open = isControlled ? Boolean(props.open) : uncontrolledOpen;
  const historyEntryIdRef = React.useRef<string | null>(null);
  const closedByPopRef = React.useRef(false);
  const closeActionRef = React.useRef<(() => void) | null>(null);

  const handleOpenChange = React.useCallback((nextOpen: boolean) => {
    if (nextOpen) {
      clearActiveElementFocus();
    }
    if (!isControlled) {
      setUncontrolledOpen(nextOpen);
    }
    props.onOpenChange?.(nextOpen);
  }, [isControlled, props]);

  const registerCloseAction = React.useCallback((closeAction: () => void) => {
    closeActionRef.current = closeAction;
    return () => {
      if (closeActionRef.current === closeAction) {
        closeActionRef.current = null;
      }
    };
  }, []);

  React.useInsertionEffect(() => {
    if (open) {
      clearActiveElementFocus();
    }
  }, [open]);

  const requestCloseWithAnimation = React.useCallback(() => {
    if (closeActionRef.current) {
      closeActionRef.current();
      return;
    }
    handleOpenChange(false);
  }, [handleOpenChange]);

  React.useEffect(() => {
    if (!isMobile) return;

    if (open) {
      if (historyEntryIdRef.current) return;

      const entryId = `ce-alert-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.history.pushState({ ...(window.history.state ?? {}), __ceAlertDialogId: entryId }, "");
      historyEntryIdRef.current = entryId;
      closedByPopRef.current = false;

      const onPopState = () => {
        closedByPopRef.current = true;
        requestCloseWithAnimation();
      };

      window.addEventListener("popstate", onPopState, { once: true });
      return () => {
        window.removeEventListener("popstate", onPopState);
      };
    }

    if (historyEntryIdRef.current) {
      const shouldConsume = !closedByPopRef.current;
      historyEntryIdRef.current = null;
      closedByPopRef.current = false;
      if (shouldConsume) {
        window.history.back();
      }
    }
  }, [open, isMobile, requestCloseWithAnimation]);

  return (
    <CloseActionContext.Provider value={{ registerCloseAction }}>
      <AlertDialogPrimitive.Root {...props} open={open} onOpenChange={handleOpenChange}>
        {children}
      </AlertDialogPrimitive.Root>
    </CloseActionContext.Provider>
  );
};

const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

const AlertDialogPortal = AlertDialogPrimitive.Portal;

const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
    ref={ref}
  />
));
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName;

const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const { registerCloseAction } = React.useContext(CloseActionContext);
  const cancelRef = React.useRef<HTMLButtonElement | null>(null);

  React.useEffect(() => {
    return registerCloseAction(() => {
      cancelRef.current?.click();
    });
  }, [registerCloseAction]);

  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-sm",
          className,
        )}
        {...props}
      >
        {children}
        <AlertDialogPrimitive.Cancel ref={cancelRef} className="hidden" aria-hidden="true" tabIndex={-1}>
          cancel
        </AlertDialogPrimitive.Cancel>
      </AlertDialogPrimitive.Content>
    </AlertDialogPortal>
  );
});
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName;

const AlertDialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />
);
AlertDialogHeader.displayName = "AlertDialogHeader";

const AlertDialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
);
AlertDialogFooter.displayName = "AlertDialogFooter";

const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title ref={ref} className={cn("text-lg font-semibold", className)} {...props} />
));
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName;

const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
AlertDialogDescription.displayName = AlertDialogPrimitive.Description.displayName;

const AlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Action ref={ref} className={cn(buttonVariants(), className)} {...props} />
));
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName;

const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel
    ref={ref}
    className={cn(buttonVariants({ variant: "outline" }), "mt-2 sm:mt-0", className)}
    {...props}
  />
));
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName;

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};
