import { Fragment, useEffect, useRef, useState, type ElementType } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type DialogActionTone = "default" | "primary" | "destructive" | "warning";

export interface DialogAction {
  id?: string;
  icon: ElementType;
  label: string;
  desktopLabel?: string;
  tooltip?: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: DialogActionTone;
  className?: string;
  menuClassName?: string;
  separator?: boolean;
}

interface DialogActionBarProps {
  actions?: DialogAction[];
  menuActions?: DialogAction[];
  className?: string;
  menuLabel?: string;
}

const actionToneClass: Record<DialogActionTone, string> = {
  default: "",
  primary: "border-primary/25 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
  destructive:
    "border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/15 hover:text-destructive",
  warning: "border-warning/20 bg-warning/10 text-warning hover:bg-warning/15 hover:text-warning",
};

const menuToneClass: Record<DialogActionTone, string> = {
  default: "",
  primary: "text-foreground dark:text-primary",
  destructive: "text-destructive focus:text-destructive",
  warning: "text-warning focus:text-warning",
};

export function DialogActionBar({
  actions = [],
  menuActions = [],
  className,
  menuLabel = "Más acciones",
}: DialogActionBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const visibleActions = actions.filter(Boolean);
  const visibleMenuActions = menuActions.filter(Boolean);
  const controlCount = visibleActions.length + (visibleMenuActions.length > 0 ? 1 : 0);
  const isCrowded = controlCount >= 4;
  const showDesktopLabels = controlCount <= 3;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const activeElement = document.activeElement;
      if (
        activeElement instanceof HTMLElement &&
        barRef.current?.contains(activeElement)
      ) {
        activeElement.blur();
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [controlCount]);

  if (visibleActions.length === 0 && visibleMenuActions.length === 0) return null;

  const runMenuAction = (action: DialogAction) => {
    setMenuOpen(false);
    window.setTimeout(action.onClick, 0);
  };

  return (
    <TooltipProvider delayDuration={180}>
      <div ref={barRef} className={cn("flex w-full min-w-0 items-center", isCrowded ? "gap-1.5" : "gap-2", className)}>
        {visibleActions.map((action) => {
          const Icon = action.icon;
          const tone = action.tone ?? "default";
          const button = (
            <Button
              type="button"
              variant="outline"
              aria-label={action.label}
              title={action.tooltip ?? action.label}
              disabled={action.disabled}
              onClick={action.onClick}
              className={cn(
                "h-12 min-w-0 flex-1 rounded-2xl px-0 text-[13px] font-semibold focus-visible:ring-0 focus-visible:ring-offset-0 sm:px-2 lg:px-3",
                isCrowded && "gap-0 sm:px-0 lg:px-0",
                actionToneClass[tone],
                action.className,
              )}
            >
              <Icon aria-hidden="true" />
              <span className={cn("hidden min-w-0 truncate", showDesktopLabels && "sm:inline")}>
                {action.desktopLabel ?? action.label}
              </span>
            </Button>
          );

          return (
            <Tooltip key={action.id ?? action.label}>
              <TooltipTrigger asChild>{button}</TooltipTrigger>
              <TooltipContent side="top">{action.tooltip ?? action.label}</TooltipContent>
            </Tooltip>
          );
        })}

        {visibleMenuActions.length > 0 && (
          <DropdownMenu modal={false} open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={menuLabel}
                title={menuLabel}
                className={cn("h-12 flex-shrink-0 rounded-2xl focus-visible:ring-0 focus-visible:ring-offset-0", isCrowded ? "w-11" : "w-12")}
              >
                <MoreHorizontal aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top">
              <DropdownMenuGroup>
                {visibleMenuActions.map((action, index) => {
                  const Icon = action.icon;
                  const tone = action.tone ?? "default";

                  return (
                    <Fragment key={action.id ?? action.label}>
                      {action.separator && index > 0 && <DropdownMenuSeparator />}
                      <DropdownMenuItem
                        disabled={action.disabled}
                        className={cn("gap-2 [&_svg]:size-4 [&_svg]:shrink-0", menuToneClass[tone], action.menuClassName)}
                        onClick={() => runMenuAction(action)}
                      >
                        <Icon aria-hidden="true" />
                        {action.label}
                      </DropdownMenuItem>
                    </Fragment>
                  );
                })}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </TooltipProvider>
  );
}
