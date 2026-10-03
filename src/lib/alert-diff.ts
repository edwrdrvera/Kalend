import type { AlertOffset } from "@/lib/alerts";
import type { CalendarAlert } from "@/lib/calendar-types";

/** One request that moves an item's stored alerts toward the one the user wants. */
export type AlertStep = { type: "create"; offset: AlertOffset } | { type: "delete"; id: string };

/**
 * The requests that leave an item with exactly the wanted alert (or none).
 * A new alert is created before the old one is deleted, so a failure partway
 * through never leaves the item without an alert it had.
 */
export function alertSteps(stored: CalendarAlert[], wanted: AlertOffset | null): AlertStep[] {
  const keep = wanted === null ? undefined : stored.find((alert) => alert.offset_minutes === wanted);
  const steps: AlertStep[] = [];
  if (wanted !== null && !keep) steps.push({ type: "create", offset: wanted });
  for (const alert of stored) {
    if (alert !== keep) steps.push({ type: "delete", id: alert.id });
  }
  return steps;
}

/** Each event or task id mapped to its alert, the earliest-offset one when it has several. */
export function alertsByItem(alerts: CalendarAlert[]): Map<string, CalendarAlert> {
  const byItem = new Map<string, CalendarAlert>();
  const ordered = [...alerts].sort((a, b) => a.offset_minutes - b.offset_minutes);
  for (const alert of ordered) {
    const itemId = alert.event_id ?? alert.task_id;
    if (itemId !== null && !byItem.has(itemId)) byItem.set(itemId, alert);
  }
  return byItem;
}
