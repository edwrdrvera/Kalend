import type { AlertOffset, AlertTarget } from "@/lib/alerts";
import { mutateResource } from "@/lib/api";
import type {
  AlertClaim,
  AlertCreateRequest,
  AlertsApiResponse,
  CalendarAlert,
} from "@/lib/calendar-types";

/**
 * Typed calls to the alert endpoints. `useAlerts` (the alert choice in the
 * details panels) uses `fetchAlerts`, `createAlert` and `deleteAlert`;
 * delivery uses `claimAlerts`. Each rejects with the server's message on failure.
 */

export async function fetchAlerts(): Promise<CalendarAlert[]> {
  const res = await fetch("/api/alerts");
  const json: AlertsApiResponse = await res.json();
  if (!res.ok || !json.success || !json.data) throw new Error(json.error ?? "Failed to load alerts");
  return json.data;
}

/** Asking twice for the same item and offset returns the alert that exists. */
export async function createAlert(target: AlertTarget, offset: AlertOffset): Promise<CalendarAlert> {
  const body: AlertCreateRequest =
    target.kind === "event"
      ? { event_id: target.id, offset_minutes: offset }
      : { task_id: target.id, offset_minutes: offset };
  const json = await mutateResource<CalendarAlert>("/api/alerts", "POST", body, "Failed to set alert");
  if (!json.data) throw new Error("Failed to set alert");
  return json.data;
}

export async function deleteAlert(id: string): Promise<void> {
  await mutateResource<CalendarAlert>(`/api/alerts/${id}`, "DELETE", undefined, "Failed to remove alert");
}

/** Marks every due alert fired on the server and returns it, so each is shown once. */
export async function claimAlerts(): Promise<AlertClaim> {
  const json = await mutateResource<AlertClaim>("/api/alerts/claim", "POST", undefined, "Failed to check alerts");
  if (!json.data) throw new Error("Failed to check alerts");
  return json.data;
}
