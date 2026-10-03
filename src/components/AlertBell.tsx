import { Bell } from "lucide-react";

/** Marks an event or task that has an alert. Sits beside the row's button, not inside it, so screen readers announce it. */
export default function AlertBell() {
  return <Bell role="img" aria-label="Alert set" className="size-3 shrink-0 text-muted-foreground" />;
}
