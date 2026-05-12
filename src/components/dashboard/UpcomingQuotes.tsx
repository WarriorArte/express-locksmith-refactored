import { motion } from "framer-motion";
import { Calendar, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { differenceInDays } from "date-fns";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";

interface UpcomingQuotesProps {
  quotes: {
    id: string;
    quote_number: string;
    customer_name: string | null;
    description: string | null;
    total: number;
    valid_until: string | null;
  }[];
}

export function UpcomingQuotes({ quotes }: UpcomingQuotesProps) {
  const { data: settings } = useBusinessSettings();
  const currencySymbol = settings?.currency_symbol || "$";
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.08 }}
      className="card-elevated p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Cotizaciones por Vencer</h3>
        </div>
      </div>
      
      {quotes.length === 0 ? (
        <p className="text-muted-foreground text-center py-4">No hay cotizaciones próximas a vencer</p>
      ) : (
        <div className="space-y-3">
          {quotes.map((quote, index) => {
            const daysLeft = quote.valid_until ? differenceInDays(new Date(quote.valid_until), new Date()) : 0;
            const status = daysLeft <= 2 ? "urgent" : daysLeft <= 5 ? "warning" : "normal";
            const statusStyles = {
              urgent: "border-l-destructive bg-destructive-light/30",
              warning: "border-l-warning bg-warning-light/30",
              normal: "border-l-info bg-info-light/30",
            };
            return (
              <motion.div
                key={quote.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.08 }}
                className={cn(
                  "p-4 rounded-sm border-l-4 cursor-pointer hover:shadow-md transition-shadow",
                  statusStyles[status]
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{quote.customer_name || "Sin cliente"}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{quote.description || "Sin descripción"}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold">{currencySymbol}{quote.total.toLocaleString()}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{daysLeft} días</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
