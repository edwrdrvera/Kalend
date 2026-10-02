import { format } from "date-fns";
import { alertMessage, type AlertKind } from "@/lib/alerts";
import type { AlertClaim, ClaimedAlert } from "@/lib/calendar-types";

/** One line the user can read and click to open the event or task. */
export interface AlertMessage {
  id: string;
  kind: AlertKind;
  itemId: string;
  text: string;
}

/**
 * What the delivery UI shows. `due` alerts pop up and clear themselves.
 * `missed` alerts (they came due while Kalend was closed) wait in one list
 * until the user dismisses them.
 */
export interface AlertTray {
  due: AlertMessage[];
  missed: AlertMessage[];
}

export const emptyAlertTray: AlertTray = { due: [], missed: [] };

export type AlertTrayAction =
  | { type: "claimed"; claim: AlertClaim }
  | { type: "dismiss"; id: string }
  | { type: "clearMissed" };

export const dueMessage = (alert: ClaimedAlert): AlertMessage => ({
  id: alert.id,
  kind: alert.kind,
  itemId: alert.item_id,
  text: alertMessage(alert.kind, alert.title, alert.offset_minutes),
});

// A missed alert is no longer "in 15 min", so it reads as a past reminder.
export const missedMessage = (alert: ClaimedAlert): AlertMessage => ({
  id: alert.id,
  kind: alert.kind,
  itemId: alert.item_id,
  text: `${alert.title} (reminder at ${format(new Date(alert.fire_at), "MMM d, h:mm a")})`,
});

/** Adds the messages the tray does not already hold, so a repeat never doubles up. */
function appendNew(current: AlertMessage[], incoming: AlertMessage[], known: Set<string>): AlertMessage[] {
  const fresh = incoming.filter((message) => !known.has(message.id));
  return fresh.length === 0 ? current : [...current, ...fresh];
}

export function alertTrayReducer(tray: AlertTray, action: AlertTrayAction): AlertTray {
  switch (action.type) {
    case "claimed": {
      const known = new Set([...tray.due, ...tray.missed].map((message) => message.id));
      const due = appendNew(tray.due, action.claim.due.map(dueMessage), known);
      const missed = appendNew(tray.missed, action.claim.missed.map(missedMessage), known);
      return due === tray.due && missed === tray.missed ? tray : { due, missed };
    }
    case "dismiss":
      return {
        due: tray.due.filter((message) => message.id !== action.id),
        missed: tray.missed.filter((message) => message.id !== action.id),
      };
    case "clearMissed":
      return tray.missed.length === 0 ? tray : { ...tray, missed: [] };
  }
}
