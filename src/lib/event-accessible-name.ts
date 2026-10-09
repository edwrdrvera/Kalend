import { format, isSameDay } from "date-fns";
import type { CalendarEvent } from "@/lib/calendar-types";

/** The name a screen reader reads for an event button, such as
 *  "Calculus problem set, School, Tuesday October 7, 9:00 AM to 10:00 AM".
 *  A multi-day event has no times, because the grids show it in the all-day row. */
export function eventAccessibleName(
  event: Pick<CalendarEvent, "title" | "start_at" | "end_at">,
  spaceName: string | null
): string {
  const start = new Date(event.start_at);
  const end = new Date(event.end_at);
  const parts = [event.title];
  if (spaceName) parts.push(spaceName);

  if (isSameDay(start, end)) {
    parts.push(format(start, "EEEE MMMM d"), `${format(start, "h:mm a")} to ${format(end, "h:mm a")}`);
  } else {
    parts.push(`${format(start, "EEEE MMMM d")} to ${format(end, "EEEE MMMM d")}`);
  }

  return parts.join(", ");
}
