import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Edit, MoreHorizontal, Trash2 } from "lucide-react";
import type { OverflowAction } from "./types";

interface Props {
  onEdit?: () => void;
  onDelete?: () => void;
  overflowItems: OverflowAction[];
}

export function DetailViewFooter({ onEdit, onDelete, overflowItems }: Props) {
  const [open, setOpen] = useState(false);

  const hasOverflowMenu = overflowItems.length > 0;
  if (!onEdit && !onDelete && !hasOverflowMenu) return null;

  return (
    <div className="w-full">
      <div className="flex w-full items-center gap-2">
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="flex-1 h-12 rounded-2xl bg-destructive/10 text-destructive font-semibold text-[13px] flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
          >
            <Trash2 className="w-4 h-4" /> Eliminar
          </button>
        )}
        {onEdit && (
          <Button variant="outline" className="flex-1 h-12 rounded-2xl font-semibold" onClick={onEdit}>
            <Edit className="w-4 h-4 mr-1.5" /> Editar
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
