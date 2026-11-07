import type { AlertKind } from "@/lib/alerts";
import { isUuid } from "@/lib/uuid";

/** The query a notification click puts on `/app` so the calendar opens that item. */
export function alertQuery(kind: AlertKind, itemId: string): string {
  return `${kind}:${itemId}`;
}

export function parseAlertQuery(value: string | null): { kind: AlertKind; itemId: string } | null {
  if (!value) return null;
  const split = value.indexOf(":");
  if (split <= 0) return null;
  const kind = value.slice(0, split);
  const itemId = value.slice(split + 1);
  if ((kind !== "event" && kind !== "task") || !isUuid(itemId)) return null;
  return { kind, itemId };
}
