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
      className={`label-caps ${className ?? ""}`}
    >
      {children}
    </span>
  );
}
