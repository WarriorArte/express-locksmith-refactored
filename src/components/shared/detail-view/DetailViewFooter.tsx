import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Edit, MoreHorizontal, Printer, Trash2, type LucideIcon } from "lucide-react";
import type { OverflowAction } from "./types";

interface Props {
  onPrint?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  overflowItems: OverflowAction[];
}

export function DetailViewFooter({ onPrint, onEdit, onDelete, overflowItems }: Props) {
  const [open, setOpen] = useState(false);

  const mainAction: { icon: LucideIcon; label: string; onClick: () => void } | null = onEdit
    ? { icon: Edit, label: "Editar", onClick: onEdit }
    : onPrint
    ? { icon: Printer, label: "Ticket", onClick: onPrint }
    : null;

  const hasOverflowMenu = overflowItems.length > 0;
  if (!mainAction && !onDelete && !hasOverflowMenu) return null;

  const MainIcon = mainAction?.icon;

  return (
    <div className="pt-4 border-t mt-2">
      <div className="flex items-center gap-2 w-full">
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="flex-1 h-12 rounded-2xl bg-destructive/10 text-destructive font-semibold text-[13px] flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
          >
            <Trash2 className="w-4 h-4" /> Eliminar
          </button>
        )}
        {mainAction && MainIcon && (
          <Button variant="outline" className="flex-1 h-12 rounded-2xl font-semibold" onClick={mainAction.onClick}>
            <MainIcon className="w-4 h-4 mr-1.5" /> {mainAction.label}
          </Button>
        )}
        {hasOverflowMenu && (
          <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl flex-shrink-0">
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top">
              {overflowItems.map((item, idx) => (
                <div key={item.label}>
                  {item.separator && idx > 0 && <DropdownMenuSeparator />}
                  <DropdownMenuItem
                    onClick={() => {
                      setOpen(false);
                      window.setTimeout(item.onClick, 0);
                    }}
                    className={item.className}
                  >
                    <item.icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </DropdownMenuItem>
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
