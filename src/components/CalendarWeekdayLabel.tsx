interface CalendarWeekdayLabelProps {
  children: string;
  className?: string;
}

/** Shared weekday typography for the calendar's month, week, and day headers. */
export default function CalendarWeekdayLabel({
  children,
  className,
}: CalendarWeekdayLabelProps) {
  return (
    <span
      className={`text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground ${className ?? ""}`}
    >
      {children}
    </span>
  );
}
