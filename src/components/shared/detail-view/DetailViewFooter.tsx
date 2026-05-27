import { DialogActionBar, type DialogAction } from "@/components/shared/DialogActionBar";
import { Edit, Trash2 } from "lucide-react";
import type { OverflowAction } from "./types";

interface Props {
  onEdit?: () => void;
  onDelete?: () => void;
  actions?: DialogAction[];
  overflowItems: OverflowAction[];
}

export function DetailViewFooter({ onEdit, onDelete, actions, overflowItems }: Props) {
  const defaultActions: DialogAction[] = [
    ...(onEdit
      ? [{ icon: Edit, label: "Editar", onClick: onEdit }]
      : []),
    ...(onDelete
      ? [{ icon: Trash2, label: "Eliminar", onClick: onDelete, tone: "destructive" as const }]
      : []),
  ];

  return (
    <DialogActionBar
      actions={actions ?? defaultActions}
      menuActions={overflowItems}
    />
  );
}
