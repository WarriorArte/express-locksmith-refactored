import { Calendar, X } from "lucide-react";
import {
  endOfDay,
  endOfMonth,
  format,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
} from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type DateFilterMode = "day" | "week" | "month" | "range";

export type DateFilterValue = {
  mode: DateFilterMode;
  day: string;
  week: string;
  month: string;
  startDate: string;
  endDate: string;
};

export const emptyDateFilter: DateFilterValue = {
  mode: "day",
  day: "",
  week: "",
  month: "",
  startDate: "",
  endDate: "",
};

type DateFilterButtonProps = {
  value: DateFilterValue;
  onChange: (value: DateFilterValue) => void;
  ariaLabel: string;
  className?: string;
};

const modes: { key: DateFilterMode; label: string }[] = [
  { key: "day", label: "Dia" },
  { key: "week", label: "Semana" },
  { key: "month", label: "Mes" },
  { key: "range", label: "Rango" },
];

export function hasDateFilterValue(filter: DateFilterValue) {
  if (filter.mode === "day") return filter.day.length > 0;
  if (filter.mode === "week") return filter.week.length > 0;
  if (filter.mode === "month") return filter.month.length > 0;
  return filter.startDate.length > 0 || filter.endDate.length > 0;
}

export function isDateInDateFilter(dateValue: string, filter: DateFilterValue) {
  if (!hasDateFilterValue(filter)) return true;

  const date = parseISO(dateValue);

  if (filter.mode === "day" && filter.day) {
    const selectedDay = parseISO(`${filter.day}T00:00:00`);
    return isWithinInterval(date, {
      start: startOfDay(selectedDay),
      end: endOfDay(selectedDay),
    });
  }

  if (filter.mode === "week" && filter.week) {
    const weekStart = getISOWeekStart(filter.week);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return isWithinInterval(date, {
      start: startOfDay(weekStart),
      end: endOfDay(weekEnd),
    });
  }

  if (filter.mode === "month" && filter.month) {
    const selectedMonth = parseISO(`${filter.month}-01T00:00:00`);
    return isWithinInterval(date, {
      start: startOfMonth(selectedMonth),
      end: endOfMonth(selectedMonth),
    });
  }

  if (filter.mode === "range") {
    const start = filter.startDate
      ? startOfDay(parseISO(`${filter.startDate}T00:00:00`))
      : new Date(-8640000000000000);
    const end = filter.endDate
      ? endOfDay(parseISO(`${filter.endDate}T00:00:00`))
      : new Date(8640000000000000);

    return isWithinInterval(date, { start, end });
  }

  return true;
}

export function DateFilterButton({
  value,
  onChange,
  ariaLabel,
  className,
}: DateFilterButtonProps) {
  const active = hasDateFilterValue(value);
  const label = getDateFilterLabel(value);

  const updateMode = (mode: DateFilterMode) => {
    onChange({ ...value, mode });
  };

  const updateField = (field: keyof DateFilterValue, fieldValue: string) => {
    onChange({ ...value, [field]: fieldValue });
  };

  return (
    <div className={cn("flex shrink-0 items-center gap-1.5", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={ariaLabel}
            className={cn(
              "flex h-10 min-w-10 items-center justify-center gap-2 rounded-xl border border-white/[.13] bg-white/[.09] px-0 text-[hsl(240_22%_95%)] transition-colors active:scale-95 lg:min-w-[132px] lg:justify-start lg:px-3",
              active && "border-primary/50 bg-primary/18 text-primary",
            )}
          >
            <Calendar className="h-4 w-4 shrink-0" />
            <span className="hidden truncate text-sm font-semibold lg:inline">
              {label}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-[min(calc(100vw-2rem),22rem)] rounded-[16px] border-white/10 bg-popover/95 p-3 shadow-xl backdrop-blur-xl"
        >
          <div className="grid grid-cols-4 gap-1 rounded-[14px] bg-muted p-1">
            {modes.map((mode) => (
              <button
                key={mode.key}
                type="button"
                onClick={() => updateMode(mode.key)}
                className={cn(
                  "h-9 rounded-[10px] text-xs font-extrabold transition-colors",
                  value.mode === mode.key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-background/70 hover:text-foreground",
                )}
              >
                {mode.label}
              </button>
            ))}
          </div>

          <div className="mt-3">
            {value.mode === "day" && (
              <DateInput
                label="Dia"
                type="date"
                value={value.day}
                onChange={(nextValue) => updateField("day", nextValue)}
              />
            )}

            {value.mode === "week" && (
              <DateInput
                label="Semana"
                type="week"
                value={value.week}
                onChange={(nextValue) => updateField("week", nextValue)}
              />
            )}

            {value.mode === "month" && (
              <DateInput
                label="Mes"
                type="month"
                value={value.month}
                onChange={(nextValue) => updateField("month", nextValue)}
              />
            )}

            {value.mode === "range" && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <DateInput
                  label="Desde"
                  type="date"
                  value={value.startDate}
                  onChange={(nextValue) => updateField("startDate", nextValue)}
                />
                <DateInput
                  label="Hasta"
                  type="date"
                  value={value.endDate}
                  onChange={(nextValue) => updateField("endDate", nextValue)}
                />
              </div>
            )}
          </div>

          {active && (
            <button
              type="button"
              onClick={() => onChange(emptyDateFilter)}
              className="mt-3 flex h-10 w-full items-center justify-center rounded-[12px] border border-border bg-background text-sm font-bold text-foreground transition-colors hover:bg-muted"
            >
              Limpiar fecha
            </button>
          )}
        </PopoverContent>
      </Popover>

      {active && (
        <button
          type="button"
          aria-label="Limpiar filtro de fecha"
          onClick={() => onChange(emptyDateFilter)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[.13] bg-white/[.09] text-[hsl(240_22%_95%)] transition-colors active:scale-95 lg:h-9 lg:w-9"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function DateInput({
  label,
  type,
  value,
  onChange,
}: {
  label: string;
  type: "date" | "week" | "month";
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-[12px] border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none transition-colors focus:border-primary"
      />
    </label>
  );
}

function getDateFilterLabel(filter: DateFilterValue) {
  if (filter.mode === "day" && filter.day) {
    return format(parseISO(`${filter.day}T00:00:00`), "dd MMM", { locale: es });
  }

  if (filter.mode === "week" && filter.week) {
    const [, week] = filter.week.split("-W");
    return `Semana ${Number(week)}`;
  }

  if (filter.mode === "month" && filter.month) {
    return format(parseISO(`${filter.month}-01T00:00:00`), "MMM yyyy", {
      locale: es,
    });
  }

  if (filter.mode === "range" && (filter.startDate || filter.endDate)) {
    const start = filter.startDate
      ? format(parseISO(`${filter.startDate}T00:00:00`), "dd MMM", { locale: es })
      : "Inicio";
    const end = filter.endDate
      ? format(parseISO(`${filter.endDate}T00:00:00`), "dd MMM", { locale: es })
      : "Hoy";
    return `${start} - ${end}`;
  }

  return "Fecha";
}

function getISOWeekStart(weekValue: string) {
  const [yearText, weekText] = weekValue.split("-W");
  const year = Number(yearText);
  const week = Number(weekText);
  const fourthOfJanuary = new Date(year, 0, 4);
  const day = fourthOfJanuary.getDay() || 7;
  const firstMonday = new Date(fourthOfJanuary);
  firstMonday.setDate(fourthOfJanuary.getDate() - day + 1);

  const weekStart = new Date(firstMonday);
  weekStart.setDate(firstMonday.getDate() + (week - 1) * 7);
  return weekStart;
}
