import { alertMessage, isAlertOffset, type AlertKind, type AlertOffset } from "@/lib/alerts";
import type { ClaimedAlert } from "@/lib/calendar-types";

/** The body of one push. The service worker and the open tab both read it. */
export interface PushAlert {
  id: string;
  kind: AlertKind;
  itemId: string;
  title: string;
  message: string;
  offsetMinutes: AlertOffset;
  fireAt: string;
}

export function pushAlertFromClaim(alert: ClaimedAlert): PushAlert {
  return {
    id: alert.id,
    kind: alert.kind,
    itemId: alert.item_id,
    title: alert.title,
    message: alertMessage(alert.kind, alert.title, alert.offset_minutes),
    offsetMinutes: alert.offset_minutes,
    fireAt: alert.fire_at,
  };
}

export function claimedFromPush(alert: PushAlert): ClaimedAlert {
  return {
    id: alert.id,
    kind: alert.kind,
    item_id: alert.itemId,
    title: alert.title,
    offset_minutes: alert.offsetMinutes,
    fire_at: alert.fireAt,
  };
}

export function isPushAlert(value: unknown): value is PushAlert {
  if (!value || typeof value !== "object") return false;
  const alert = value as Record<string, unknown>;
  return (
    typeof alert.id === "string" &&
    (alert.kind === "event" || alert.kind === "task") &&
    typeof alert.itemId === "string" &&
    typeof alert.title === "string" &&
    typeof alert.message === "string" &&
    isAlertOffset(alert.offsetMinutes) &&
    typeof alert.fireAt === "string"
  );
}
