import { Mail, MapPin, Phone, User } from "lucide-react";
import { DetailSection } from "@/design-system/detail/DetailScreen";
import { spawnRipple } from "@/lib/ripple";
import type { DetailData } from "./types";

interface Props {
  data: Pick<DetailData, "customer_name" | "customer_phone" | "customer_email" | "customer_address">;
}

/** Fila de contacto: si tiene `href`, se toca para llamar / escribir (como en Android). */
function ContactRow({
  icon,
  text,
  href,
  strong,
  external,
}: {
  icon: React.ReactNode;
  text: string;
  href?: string;
  strong?: boolean;
  /** Abre en otra app/pestaña (mapas) en lugar de navegar fuera de la app. */
  external?: boolean;
}) {
  const content = (
    <>
      <span className="text-muted-foreground">{icon}</span>
      <span className={`min-w-0 flex-1 truncate text-[15px] ${strong ? "font-semibold" : ""} ${href ? "text-primary" : "text-foreground"}`}>
        {text}
      </span>
    </>
  );
  const className = "relative -mx-2 flex min-h-11 items-center gap-3 overflow-hidden rounded-xl px-2";
  return href ? (
    <a
      href={href}
      onPointerDown={spawnRipple}
      className={className}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {content}
    </a>
  ) : (
    <div className={className}>{content}</div>
  );
}

export function DetailViewCustomer({ data }: Props) {
  if (!data.customer_name && !data.customer_phone && !data.customer_email && !data.customer_address) return null;
  return (
    <DetailSection title="Cliente" className="bg-muted shadow-none">
      <div className="-my-1">
        {data.customer_name && <ContactRow icon={<User className="h-[18px] w-[18px]" />} text={data.customer_name} strong />}
        {data.customer_phone && (
          <ContactRow
            icon={<Phone className="h-[18px] w-[18px]" />}
            text={data.customer_phone}
            href={`tel:${data.customer_phone.replace(/[^\d+]/g, "")}`}
          />
        )}
        {data.customer_email && (
          <ContactRow icon={<Mail className="h-[18px] w-[18px]" />} text={data.customer_email} href={`mailto:${data.customer_email}`} />
        )}
        {data.customer_address && (
          <ContactRow
            icon={<MapPin className="h-[18px] w-[18px]" />}
            text={data.customer_address}
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.customer_address)}`}
            external
          />
        )}
      </div>
    </DetailSection>
  );
}
