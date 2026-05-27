import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

type CloseActionContextValue = {
  registerCloseAction: (closeAction: () => void) => () => void;
};

const noopUnregister = () => {};
const CloseActionContext = React.createContext<CloseActionContextValue>({
  registerCloseAction: () => noopUnregister,
});

const Dialog = ({
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) => {
  const isMobile = useIsMobile();
  const isControlled = props.open !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState<boolean>(props.defaultOpen ?? false);
  const open = isControlled ? Boolean(props.open) : uncontrolledOpen;
  const historyEntryIdRef = React.useRef<string | null>(null);
  const closedByPopRef = React.useRef(false);
  const closeActionRef = React.useRef<(() => void) | null>(null);

  const handleOpenChange = React.useCallback((nextOpen: boolean) => {
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

      const entryId = `ce-dialog-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.history.pushState({ ...(window.history.state ?? {}), __ceDialogId: entryId }, "");
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
      <DialogPrimitive.Root {...props} open={open} onOpenChange={handleOpenChange}>
        {children}
      </DialogPrimitive.Root>
    </CloseActionContext.Provider>
  );
};

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const hasDialogDescription = (node: React.ReactNode): boolean => {
  if (Array.isArray(node)) {
    return node.some(hasDialogDescription);
  }

  if (!React.isValidElement(node)) {
    return false;
  }

  const displayName = (node.type as { displayName?: string })?.displayName;
  if (displayName === DialogPrimitive.Description.displayName || displayName === "DialogDescription") {
    return true;
  }

  return hasDialogDescription((node.props as { children?: React.ReactNode }).children);
};

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const { registerCloseAction } = React.useContext(CloseActionContext);
  const closeButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const contentA11yProps =
    hasDialogDescription(children) || Object.prototype.hasOwnProperty.call(props, "aria-describedby")
      ? {}
      : { "aria-describedby": undefined };

  React.useEffect(() => {
    return registerCloseAction(() => {
      closeButtonRef.current?.click();
    });
  }, [registerCloseAction]);

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        {...contentA11yProps}
        className={cn(
          "fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-2rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-4 sm:p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-sm sm:rounded-sm max-h-[90vh] overflow-y-auto",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close ref={closeButtonRef} className="absolute right-3 top-3 sm:right-4 sm:top-4 rounded-sm opacity-70 ring-offset-background transition-opacity data-[state=open]:bg-accent data-[state=open]:text-muted-foreground hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left pr-8", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-base sm:text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
