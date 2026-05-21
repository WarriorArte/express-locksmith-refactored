import { User, Phone, Mail, MapPin } from "lucide-react";
import type { DetailData } from "./types";

interface Props {
  data: Pick<DetailData, "customer_name" | "customer_phone" | "customer_email" | "customer_address">;
}

export function DetailViewCustomer({ data }: Props) {
  if (!data.customer_name && !data.customer_phone && !data.customer_email) return null;
  return (
    <div>
      <h4 className="font-semibold mb-3 flex items-center gap-2">
        <User className="w-4 h-4" />
        Cliente
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {data.customer_name && (
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-muted-foreground" />
            <span>{data.customer_name}</span>
          </div>
        )}
        {data.customer_phone && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="w-4 h-4 text-muted-foreground" />
            <span>{data.customer_phone}</span>
          </div>
        )}
        {data.customer_email && (
          <div className="flex items-center gap-2 text-sm">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <span>{data.customer_email}</span>
          </div>
        )}
        {data.customer_address && (
          <div className="flex items-center gap-2 text-sm col-span-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span>{data.customer_address}</span>
          </div>
        )}
      </div>
    </div>
  );
}
