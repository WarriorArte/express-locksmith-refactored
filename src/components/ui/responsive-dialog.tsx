/**
 * ResponsiveDialog
 *
 * Drop-in replacement for `@/components/ui/dialog`:
 * - Desktop (md+): regular centered Dialog (Radix).
 * - Mobile (<md): native-style bottom sheet built on Radix Dialog
 *   (same primitive as Sheet) with:
 *     - Slide-up animation
 *     - Drag handle pill at the top
 *     - Sticky header (DialogHeader)
 *     - Scrolling body (the content between header and footer)
 *     - Sticky footer (DialogFooter) — buttons stay pinned
 *     - Safe-area padding at the bottom
 *
 * The component preserves the exact same exports as the shadcn dialog,
 * so any file can switch by changing only the import path.
 */
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

type BackStackEntry = {
  id: string;
  scopeId?: string;
  onBack: () => void;
};

const backStack: BackStackEntry[] = [];
const poppedEntryIds = new Set<string>();
let suppressNextPop = false;
let popListenerAttached = false;

const makeBackEntryId = () => `ce-back-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const ensureBackPopListener = () => {
  if (popListenerAttached || typeof window === "undefined") return;

  const onPopState = () => {
    if (suppressNextPop) {
      suppressNextPop = false;
      return;
    }

    const topEntry = backStack[backStack.length - 1];
    if (!topEntry) return;

    poppedEntryIds.add(topEntry.id);
    topEntry.onBack();
  };

  window.addEventListener("popstate", onPopState);
  popListenerAttached = true;
};

const pushBackEntry = (onBack: () => void, scopeId?: string) => {
  const id = makeBackEntryId();
  const nextState = {
    ...(window.history.state ?? {}),
    __ceBackEntry: true,
    __ceBackEntryId: id,
  };

  window.history.pushState(nextState, "");
  backStack.push({ id, scopeId, onBack });
  ensureBackPopListener();
  return id;
};

const removeBackEntry = (
  id: string,
  options?: { consumeHistory?: boolean },
) => {
  const consumeHistory = options?.consumeHistory ?? true;
  const index = backStack.findIndex((entry) => entry.id === id);
  if (index === -1) {
    poppedEntryIds.delete(id);
    return;
  }

  const wasTop = index === backStack.length - 1;
  const closedByPop = poppedEntryIds.has(id);
  backStack.splice(index, 1);
  poppedEntryIds.delete(id);

  if (!consumeHistory || closedByPop || !wasTop) return;

  suppressNextPop = true;
  window.history.back();
};

const clearScopeEntries = (scopeId: string) => {
  const scopeEntries = backStack.filter((entry) => entry.scopeId === scopeId);
  scopeEntries.forEach((entry) => {
    removeBackEntry(entry.id, { consumeHistory: false });
  });
};

// ---------- Mode context ----------
type Mode = "sheet" | "dialog";
const ModeContext = React.createContext<Mode>("dialog");
const useMode = () => React.useContext(ModeContext);

type BackStepContextValue = {
  registerBackStep: (onBack: () => void) => () => void;
};

type CloseActionContextValue = {
  registerCloseAction: (closeAction: () => void) => () => void;
};

const noopUnregister = () => {};
const BackStepContext = React.createContext<BackStepContextValue>({
  registerBackStep: () => noopUnregister,
});
const CloseActionContext = React.createContext<CloseActionContextValue>({
  registerCloseAction: () => noopUnregister,
});

export const useDialogBackStep = () => React.useContext(BackStepContext);

// ---------- Root ----------
const Dialog = ({
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) => {
  const isMobile = useIsMobile();
  const mode: Mode = isMobile ? "sheet" : "dialog";

  const isControlled = props.open !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState<boolean>(props.defaultOpen ?? false);
  const open = isControlled ? Boolean(props.open) : uncontrolledOpen;
  const modalEntryIdRef = React.useRef<string | null>(null);
  const scopeIdRef = React.useRef<string>(`ce-scope-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const closeActionRef = React.useRef<(() => void) | null>(null);

  const handleOpenChange = React.useCallback((nextOpen: boolean) => {
    if (!isControlled) {
      setUncontrolledOpen(nextOpen);
    }
    props.onOpenChange?.(nextOpen);
  }, [isControlled, props]);

  const registerBackStep = React.useCallback((onBack: () => void) => {
    if (!isMobile || !open) return noopUnregister;
    const entryId = pushBackEntry(onBack, scopeIdRef.current);
    return () => {
      removeBackEntry(entryId);
    };
  }, [isMobile, open]);

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
      if (modalEntryIdRef.current) return;

      modalEntryIdRef.current = pushBackEntry(() => {
        requestCloseWithAnimation();
      }, scopeIdRef.current);
      return;
    }

    clearScopeEntries(scopeIdRef.current);

    if (modalEntryIdRef.current) {
      removeBackEntry(modalEntryIdRef.current);
      modalEntryIdRef.current = null;
    }
  }, [open, isMobile, requestCloseWithAnimation]);

  React.useEffect(() => {
    if (!isMobile) return;
    return () => {
      clearScopeEntries(scopeIdRef.current);
      if (modalEntryIdRef.current) {
        removeBackEntry(modalEntryIdRef.current, { consumeHistory: false });
        modalEntryIdRef.current = null;
      }
    };
  }, [isMobile]);

  return (
    <CloseActionContext.Provider value={{ registerCloseAction }}>
      <BackStepContext.Provider value={{ registerBackStep }}>
        <ModeContext.Provider value={mode}>
          <DialogPrimitive.Root
            {...props}
            open={open}
            onOpenChange={handleOpenChange}
          >
            {children}
          </DialogPrimitive.Root>
        </ModeContext.Provider>
      </BackStepContext.Provider>
    </CloseActionContext.Provider>
  );
};

// ---------- Trigger / Portal / Close ----------
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

// ---------- Overlay ----------
const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "ce-responsive-overlay fixed inset-0 z-50 bg-black/30",
      "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:duration-500 data-[state=open]:ease-sheet",
      "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:duration-300 data-[state=closed]:ease-in",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = "DialogOverlay";

const hasDialogDescription = (node: React.ReactNode): boolean => {
  if (Array.isArray(node)) {
    return node.some(hasDialogDescription);
  }

  if (!React.isValidElement(node)) {
    return false;
  }

  const displayName = (node.type as any)?.displayName;
  if (displayName === DialogPrimitive.Description.displayName || displayName === "DialogDescription") {
    return true;
  }

  return hasDialogDescription((node.props as { children?: React.ReactNode }).children);
};

// ---------- Content ----------
//
// On mobile: bottom sheet (rounded top, slide-up). We split children
// into header / footer / body so the body scrolls and footer stays
// pinned. This is the same trick Wigglet uses.
//
// On desktop: classic centered dialog.
//
const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    /** Use a fixed 85vh height (recommended for modals containing tabs so they don't jump). */
    fixedHeight?: boolean;
    /** Disable mobile swipe-to-close gesture (useful for pinch-zoom content). */
    disableSwipeToClose?: boolean;
  }
>(({ className, children, fixedHeight, disableSwipeToClose, style, ...props }, ref) => {
  const mode = useMode();
  const { registerCloseAction } = React.useContext(CloseActionContext);
  const contentA11yProps =
    hasDialogDescription(children) || Object.prototype.hasOwnProperty.call(props, "aria-describedby")
      ? {}
      : { "aria-describedby": undefined };
  const SWIPE_ACTIVATION_PX = 10;
  const SWIPE_VERTICAL_RATIO = 1.25;
  const SHEET_CLOSE_RATIO = 0.25;
  const SHEET_ENTER_MS = 500;
  const SHEET_EXIT_MS = 320;
  const SHEET_ENTER_EASE = "cubic-bezier(0.2, 0, 0, 1)";
  const SHEET_EXIT_EASE = "cubic-bezier(0.3, 0, 0.8, 0.15)";
  const RUBBER_BAND_FACTOR = 0.15;

  const closeRef = React.useRef<HTMLButtonElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const bodyRef = React.useRef<HTMLDivElement | null>(null);
  const dragHandleRef = React.useRef<HTMLDivElement | null>(null);
  const dragStartedFromHandleRef = React.useRef(false);
  const pointerIdRef = React.useRef<number | null>(null);
  const tabSwipeStartRef = React.useRef<{ x: number; y: number } | null>(null);
  const touchActiveRef = React.useRef(false);
  const lastClientYRef = React.useRef(0);
  const startYRef = React.useRef(0);
  const startXRef = React.useRef(0);
  const canDragRef = React.useRef(false);
  const isDraggingRef = React.useRef(false);
  const overlayElRef = React.useRef<HTMLElement | null>(null);
  const sheetHeightRef = React.useRef(0);
  const [dragY, setDragY] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isGestureClosing, setIsGestureClosing] = React.useState(false);

  React.useEffect(() => {
    if (mode !== "sheet") return;
    return registerCloseAction(() => {
      closeRef.current?.click();
    });
  }, [mode, registerCloseAction]);

    const setDragging = React.useCallback((value: boolean) => {
      isDraggingRef.current = value;
      setIsDragging(value);
    }, []);

    const toVisualDrag = React.useCallback((rawDelta: number) => {
      if (rawDelta >= 0) return rawDelta;
      return rawDelta * RUBBER_BAND_FACTOR;
    }, [RUBBER_BAND_FACTOR]);

    const resetGestureState = React.useCallback(() => {
      pointerIdRef.current = null;
      canDragRef.current = false;
      touchActiveRef.current = false;
      dragStartedFromHandleRef.current = false;
      if (overlayElRef.current) {
        const overlayState = overlayElRef.current.getAttribute("data-state");
        // Keep inline fade styles while Radix is animating the closed state to avoid a brief flash.
        if (overlayState !== "closed") {
          overlayElRef.current.style.transition = "";
          overlayElRef.current.style.opacity = "";
        }
      }
      setDragging(false);
      setIsGestureClosing(false);
      setDragY(0);
    }, [setDragging]);

    const getOpenOverlay = React.useCallback((): HTMLElement | null => {
      const overlays = Array.from(
        document.querySelectorAll<HTMLElement>(".ce-responsive-overlay[data-state='open']"),
      );
      return overlays.length > 0 ? overlays[overlays.length - 1] : null;
    }, []);

    const isTopmostDialogContent = React.useCallback(() => {
      const openContents = Array.from(
        document.querySelectorAll<HTMLElement>("[data-ce-dialog-content='true'][data-state='open']"),
      );
      if (openContents.length === 0) return true;
      return openContents[openContents.length - 1] === contentRef.current;
    }, []);

    const prepareDragVisuals = React.useCallback(() => {
      sheetHeightRef.current = contentRef.current?.getBoundingClientRect().height || window.innerHeight;
      overlayElRef.current = getOpenOverlay();
      if (overlayElRef.current) {
        overlayElRef.current.style.transition = "none";
      }
    }, [getOpenOverlay]);

    const updateScrimDuringDrag = React.useCallback((downwardDelta: number) => {
      if (!overlayElRef.current) return;
      const progress = 1 - downwardDelta / Math.max(1, sheetHeightRef.current);
      overlayElRef.current.style.opacity = String(Math.max(0, progress));
    }, []);

    const beginDrag = (e: React.PointerEvent<HTMLDivElement>) => {
      if (isGestureClosing) return;
      if (!isTopmostDialogContent()) return;
      if (e.pointerType === "touch") return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const target = e.target as Node | null;
      const startedFromHandle = !!(target && dragHandleRef.current?.contains(target));
      // Only arm the drag gesture when the user grabs the drag handle.
      // Otherwise pointer-capture would steal clicks from buttons/inputs inside the sheet
      // (this breaks interaction in desktop browsers simulating a mobile viewport).
      if (!startedFromHandle) return;
      dragStartedFromHandleRef.current = true;
      pointerIdRef.current = e.pointerId;
      startYRef.current = e.clientY;
      startXRef.current = e.clientX;
      lastClientYRef.current = e.clientY;
      canDragRef.current = true;
      setDragY(0);
      setDragging(false);
      prepareDragVisuals();
      contentRef.current?.setPointerCapture?.(e.pointerId);
    };

    const onDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === "touch") return;
      if (pointerIdRef.current === null || e.pointerId !== pointerIdRef.current) return;

      const deltaY = e.clientY - startYRef.current;
      const deltaX = Math.abs(e.clientX - startXRef.current);

      if (!isDragging) {
        const startedFromHandle = dragStartedFromHandleRef.current;
        const scrollTop = bodyRef.current?.scrollTop ?? 0;
        const bodyAtTop = scrollTop <= 1;
        const downwardIntent = deltaY > SWIPE_ACTIVATION_PX && Math.abs(deltaY) > deltaX * SWIPE_VERTICAL_RATIO;
        if (!canDragRef.current || !downwardIntent) return;
        if (!startedFromHandle && !bodyAtTop) return;
        // Start drag from the current pointer position, not from a prior scroll gesture origin.
        startYRef.current = e.clientY;
        startXRef.current = e.clientX;
        lastClientYRef.current = e.clientY;
        setDragY(0);
        setDragging(true);
        return;
      }

      const delta = e.clientY - startYRef.current;
      lastClientYRef.current = e.clientY;
      setDragY(toVisualDrag(delta));
      if (delta > 0) {
        updateScrimDuringDrag(delta);
      }
    };

    const finishDrag = (clientY: number) => {
      const wasDragging = isDraggingRef.current;
      const delta = clientY - startYRef.current;
      const downwardDelta = Math.max(0, delta);
      const sheetHeight = sheetHeightRef.current || contentRef.current?.getBoundingClientRect().height || window.innerHeight;
      const shouldClose = downwardDelta > sheetHeight * SHEET_CLOSE_RATIO;
      pointerIdRef.current = null;
      canDragRef.current = false;
      touchActiveRef.current = false;
      dragStartedFromHandleRef.current = false;

      if (!wasDragging) {
        setDragging(false);
        setDragY(0);
        if (overlayElRef.current) {
          overlayElRef.current.style.transition = "";
          overlayElRef.current.style.opacity = "";
        }
        return;
      }

      if (shouldClose) {
        setDragging(false);
        setIsGestureClosing(true);
        setDragY(downwardDelta);
        // Fade out the scrim manually so it fades with the sheet slide.
        // Use ease-in (same as the CSS overlay exit) for visual consistency.
        if (overlayElRef.current) {
          overlayElRef.current.style.transition = `opacity ${SHEET_EXIT_MS}ms ease-in`;
          overlayElRef.current.style.opacity = "0";
        }
        // RAF starts the CSS transition (~16ms later); +40ms buffer ensures
        // the transition has fully settled before Radix unmounts the element.
        requestAnimationFrame(() => {
          setDragY(sheetHeight + 8);
        });
        window.setTimeout(() => {
          closeRef.current?.click();
        }, SHEET_EXIT_MS + 40);
        window.setTimeout(() => {
          resetGestureState();
        }, SHEET_EXIT_MS + 100);
        return;
      }

      setDragging(false);
      setDragY(0);
      if (overlayElRef.current) {
        overlayElRef.current.style.transition = "";
        overlayElRef.current.style.opacity = "";
      }
    };

    const onDragEnd = (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === "touch") return;
      if (pointerIdRef.current === null || e.pointerId !== pointerIdRef.current) return;
      finishDrag(e.clientY);
    };

    const onDragCancel = () => {
      if (!isDragging && pointerIdRef.current === null) return;
      setDragging(false);
      setDragY(0);
      pointerIdRef.current = null;
      canDragRef.current = false;
      touchActiveRef.current = false;
      dragStartedFromHandleRef.current = false;
      if (overlayElRef.current) {
        overlayElRef.current.style.transition = "";
        overlayElRef.current.style.opacity = "";
      }
    };

    const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
      if (isGestureClosing) return;
      if (!isTopmostDialogContent()) return;
      const target = e.target as Node | null;
      dragStartedFromHandleRef.current = !!(target && dragHandleRef.current?.contains(target));
      const t = e.touches[0];
      if (!t) return;
      touchActiveRef.current = true;
      canDragRef.current = true;
      startYRef.current = t.clientY;
      startXRef.current = t.clientX;
      lastClientYRef.current = t.clientY;
      setDragging(false);
      prepareDragVisuals();
    };

    const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
      if (!touchActiveRef.current || !canDragRef.current) return;
      const t = e.touches[0];
      if (!t) return;

      const deltaY = t.clientY - startYRef.current;
      const deltaX = Math.abs(t.clientX - startXRef.current);
      let draggingNow = isDraggingRef.current;

      if (!draggingNow) {
        const startedFromHandle = dragStartedFromHandleRef.current;
        const scrollTop = bodyRef.current?.scrollTop ?? 0;
        const bodyAtTop = scrollTop <= 1;
        const downwardIntent = deltaY > SWIPE_ACTIVATION_PX && Math.abs(deltaY) > deltaX * SWIPE_VERTICAL_RATIO;
        if (!downwardIntent) return;
        if (!startedFromHandle && !bodyAtTop) return;
        // Reset drag origin when transitioning from content scroll to sheet drag.
        startYRef.current = t.clientY;
        startXRef.current = t.clientX;
        lastClientYRef.current = t.clientY;
        setDragY(0);
        setDragging(true);
        draggingNow = true;
        return;
      }

      if (draggingNow) {
        e.preventDefault();
        lastClientYRef.current = t.clientY;
        setDragY(toVisualDrag(deltaY));
        if (deltaY > 0) {
          updateScrimDuringDrag(deltaY);
        }
      }
    };

    const onTouchEnd = () => {
      if (!touchActiveRef.current && !isDraggingRef.current) return;
      finishDrag(lastClientYRef.current);
    };

    const onTouchCancel = () => {
      onDragCancel();
    };

    const switchTabFromSwipe = React.useCallback((container: HTMLElement, deltaX: number, deltaY: number) => {
      const horizontalIntent = Math.abs(deltaX) > Math.abs(deltaY);
      const TAB_SWIPE_THRESHOLD = 48;
      if (!horizontalIntent || Math.abs(deltaX) < TAB_SWIPE_THRESHOLD) return;

      const tabNodes = Array.from(
        container.querySelectorAll<HTMLElement>("[role='tab']"),
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
    }, []);

    const onBodyTouchStartCapture = (event: React.TouchEvent<HTMLDivElement>) => {
      const touch = event.touches[0];
      if (!touch) return;
      tabSwipeStartRef.current = { x: touch.clientX, y: touch.clientY };
    };

    const onBodyTouchEndCapture = (event: React.TouchEvent<HTMLDivElement>) => {
      const start = tabSwipeStartRef.current;
      tabSwipeStartRef.current = null;
      if (!start) return;

      const touch = event.changedTouches[0];
      if (!touch) return;

      const startedInsideTabsRoot = !!((event.target as HTMLElement | null)?.closest("[data-tabs-root='true']"));
      // If the gesture started inside a Tabs root, let tabs.tsx handle it to avoid double-navigation.
      if (startedInsideTabsRoot) return;

      const deltaX = touch.clientX - start.x;
      const deltaY = touch.clientY - start.y;
      switchTabFromSwipe(event.currentTarget, deltaX, deltaY);
    };

  if (mode === "sheet") {
    // Recursively extract DialogHeader and DialogFooter from anywhere in the tree
    // (they may be nested inside <form>, <Tabs>, etc.).
    // We rebuild the body without those nodes so the footer stays pinned.
    const header: React.ReactNode[] = [];
    const footer: React.ReactNode[] = [];

    const isNamed = (el: any, name: string) =>
      React.isValidElement(el) && (el.type as any)?.displayName === name;

    const stripAndCollect = (node: React.ReactNode): React.ReactNode => {
      if (Array.isArray(node)) {
        return node.map((c, i) => {
          const r = stripAndCollect(c);
          return React.isValidElement(r) && r.key == null
            ? React.cloneElement(r, { key: i })
            : r;
        });
      }
      if (!React.isValidElement(node)) return node;
      if (isNamed(node, "DialogHeader")) {
        header.push(node);
        return null;
      }
      if (isNamed(node, "DialogFooter")) {
        footer.push(node);
        return null;
      }
      const props: any = node.props;
      if (props && props.children !== undefined) {
        const newChildren = stripAndCollect(props.children);
        return React.cloneElement(node, props, newChildren);
      }
      return node;
    };

    const body = stripAndCollect(children);
    const useManualTransform = isDragging || isGestureClosing || dragY > 0;
    const contentStyle: React.CSSProperties = useManualTransform
      ? {
          ...(style ?? {}),
          transform: `translateY(${dragY}px)`,
          transition: isDragging
            ? "none"
            : `transform ${isGestureClosing ? SHEET_EXIT_MS : SHEET_ENTER_MS}ms ${isGestureClosing ? SHEET_EXIT_EASE : SHEET_ENTER_EASE}`,
        }
      : (style ?? {});

    return (
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          {...contentA11yProps}
          {...props}
          data-ce-dialog-content="true"
          ref={(node) => {
            contentRef.current = node;
            if (typeof ref === "function") {
              ref(node);
            } else if (ref) {
              (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
            }
          }}
          className={cn(
            "fixed inset-x-0 bottom-0 left-0 right-0 z-50 flex flex-col w-full max-w-none",
            fixedHeight ? "h-[85dvh]" : "max-h-[92dvh]",
            "bg-popover text-popover-foreground",
            "rounded-t-sm outline-none shadow-2xl",
            // Native-feel slide animation
            "data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=open]:duration-500 data-[state=open]:ease-sheet",
            !isGestureClosing && "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=closed]:duration-320 data-[state=closed]:ease-in",
            // Strip caller-provided max-width so the sheet is always full-bleed on mobile
            className?.replace(/(^|\s)(sm:)?max-w-\S+/g, " "),
          )}
          style={contentStyle}
          onOpenAutoFocus={(event) => {
            resetGestureState();
            props.onOpenAutoFocus?.(event);
          }}
          onCloseAutoFocus={(event) => {
            if (!isGestureClosing) {
              resetGestureState();
            }
            props.onCloseAutoFocus?.(event);
          }}
          onPointerDown={beginDrag}
          onPointerMove={disableSwipeToClose ? undefined : onDragMove}
          onPointerUp={disableSwipeToClose ? undefined : onDragEnd}
          onPointerCancel={disableSwipeToClose ? undefined : onDragCancel}
          onTouchStart={disableSwipeToClose ? undefined : onTouchStart}
          onTouchMove={disableSwipeToClose ? undefined : onTouchMove}
          onTouchEnd={disableSwipeToClose ? undefined : onTouchEnd}
          onTouchCancel={disableSwipeToClose ? undefined : onTouchCancel}
        >
          {/* Drag handle */}
          {!disableSwipeToClose && (
            <div ref={dragHandleRef} className="flex items-center justify-center pt-3 pb-2 shrink-0 touch-none">
              <div className="h-1 w-9 rounded-full bg-foreground/25" />
            </div>
          )}

          <DialogPrimitive.Close ref={closeRef} className="hidden" aria-hidden="true" tabIndex={-1}>
            close
          </DialogPrimitive.Close>

          {/* Header (sticky top) — no divider, prototype style */}
          {header.length > 0 && (
            <div className="shrink-0 px-5 pt-1 pb-3">
              {header}
            </div>
          )}

          {/* Body (scrolls) */}
          <div
            ref={bodyRef}
            className="flex-1 overflow-y-auto overscroll-contain px-5 py-2"
            style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
            onTouchStartCapture={onBodyTouchStartCapture}
            onTouchEndCapture={onBodyTouchEndCapture}
          >
            {body}
          </div>

          {/* Footer (sticky bottom + safe area) — no divider */}
          {footer.length > 0 && (
            <div
              className="shrink-0 px-5 pt-3 bg-popover"
              style={{
                paddingBottom: "max(env(safe-area-inset-bottom), 1rem)",
              }}
            >
              {footer}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPortal>
    );
  }

  // Desktop dialog
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        {...contentA11yProps}
        data-ce-dialog-content="true"
        className={cn(
          "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] border bg-background shadow-lg duration-200",
          fixedHeight 
            ? "h-[85vh] grid-rows-[auto_1fr_auto] overflow-hidden p-0 gap-0" 
            : "gap-4 p-6",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
          "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
          "sm:rounded-sm",
          className,
        )}
        style={style}
        {...props}
      >
        {fixedHeight ? (
          <>
            {/* Extract header */}
            {React.Children.map(children, (child) =>
              React.isValidElement(child) &&
              (child.type as { displayName?: string })?.displayName === "DialogHeader"
                ? <div className="shrink-0 px-6 pt-6 pb-3">{child}</div>
                : null
            )}
            {/* Extract body (everything that's not header or footer) */}
            <div className="flex-1 overflow-y-auto px-6 py-2" style={{ WebkitOverflowScrolling: "touch" }}>
              {React.Children.map(children, (child) =>
                React.isValidElement(child) &&
                (child.type as { displayName?: string })?.displayName !== "DialogHeader" &&
                (child.type as { displayName?: string })?.displayName !== "DialogFooter"
                  ? child
                  : null
              )}
            </div>
            {/* Extract footer */}
            <div className="shrink-0 px-6 pt-3 pb-6 border-t">
              {React.Children.map(children, (child) =>
                React.isValidElement(child) &&
                (child.type as { displayName?: string })?.displayName === "DialogFooter" ? child : null
              )}
            </div>
          </>
        ) : (
          <div className="gap-4 p-6">{children}</div>
        )}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = "DialogContent";

// ---------- Header / Footer ----------
const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const mode = useMode();
  return (
    <div
      className={cn(
        "flex flex-col space-y-1.5",
        mode === "sheet" ? "text-left" : "text-center sm:text-left",
        className,
      )}
      {...props}
    />
  );
};
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const mode = useMode();
  return (
    <div
      className={cn(
        mode === "sheet"
          // v2: Cancelar + Crear side-by-side (handled with flex-1/flex-[2] on the buttons)
          ? "flex flex-row gap-2.5 [&>button]:flex-1 [&>button:last-child]:flex-[2]"
          : "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
        className,
      )}
      {...props}
    />
  );
};
DialogFooter.displayName = "DialogFooter";

// ---------- Title / Description ----------
const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
DialogTitle.displayName = "DialogTitle";

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = "DialogDescription";

// Optional helper kept for compatibility with previous version
const DialogBody = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("py-2", className)} {...props} />
);

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogBody,
};
