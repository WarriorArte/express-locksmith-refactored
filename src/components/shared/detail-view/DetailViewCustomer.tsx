import { User, Phone, Mail, MapPin } from "lucide-react";
import type { DetailData } from "./types";

interface Props {
  data: Pick<DetailData, "customer_name" | "customer_phone" | "customer_email" | "customer_address">;
}

export function DetailViewCustomer({ data }: Props) {
  if (!data.customer_name && !data.customer_phone && !data.customer_email) return null;
  return (
    <div>
      <h4 className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <User className="w-3.5 h-3.5" />
        Cliente
      </h4>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {data.customer_name && (
          <div className="flex min-w-0 items-center gap-2 text-[13px] font-semibold">
            <User className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{data.customer_name}</span>
          </div>
        )}
        {data.customer_phone && (
          <div className="flex min-w-0 items-center gap-2 text-[13px]">
            <Phone className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{data.customer_phone}</span>
          </div>
        )}
        {data.customer_email && (
          <div className="flex min-w-0 items-center gap-2 text-[13px]">
            <Mail className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{data.customer_email}</span>
          </div>
        )}
        {data.customer_address && (
          <div className="flex min-w-0 items-center gap-2 text-[13px] sm:col-span-2">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{data.customer_address}</span>
          </div>
        )}
      </div>
    </div>
  );
}
