import { useWorkshop } from "@/hooks/useWorkshop";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2 } from "lucide-react";

export function WorkshopSelector() {
  const { currentWorkshop, workshops, setCurrentWorkshop, isSuperAdmin } = useWorkshop();

  if (!isSuperAdmin && workshops.length <= 1) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <Select
        value={currentWorkshop?.id || ""}
        onValueChange={(value) => {
          const workshop = workshops.find((w) => w.id === value);
          if (workshop) {
            setCurrentWorkshop(workshop);
          }
        }}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Seleccionar taller" />
        </SelectTrigger>
        <SelectContent>
          {workshops.map((workshop) => (
            <SelectItem key={workshop.id} value={workshop.id}>
              {workshop.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
