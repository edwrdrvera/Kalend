/**
 * The one place that knows what an alert is: which offsets exist, how long
 * before the item each one fires, how its message reads, and when a claimed
 * alert counts as missed. The database check constraint, the request parser,
 * the claim route and the client message text all read from here.
 */

export type AlertKind = "event" | "task";

/** The one event or task an alert belongs to. */
export type AlertTarget = { kind: AlertKind; id: string };

const MINUTE_MS = 60_000;

/** How far before the item's start (event) or due time (task) each alert fires. */
export const ALERT_OFFSETS = [0, 5, 15, 60, 1440] as const;
export type AlertOffset = (typeof ALERT_OFFSETS)[number];

export const isAlertOffset = (value: unknown): value is AlertOffset =>
  ALERT_OFFSETS.some((offset) => offset === value);

const OFFSET_PHRASE: Record<AlertOffset, string> = {
  0: "now",
  5: "in 5 min",
  15: "in 15 min",
  60: "in 1 hour",
  1440: "in 1 day",
};

const KIND_VERB: Record<AlertKind, string> = {
  event: "starts",
  task: "is due",
};

/** An alert that came due this long before it was claimed is "missed", not "due". */
export const MISSED_AFTER_MS = 5 * MINUTE_MS;

/** When an alert fires: the item's start or due time, minus its offset. */
export function fireAtFor(itemTime: Date, offset: AlertOffset): Date {
  return new Date(itemTime.getTime() - offset * MINUTE_MS);
}

/** "CS 101 Lecture starts in 15 min", "Essay is due now". */
export function alertMessage(kind: AlertKind, title: string, offset: AlertOffset): string {
  return `${title} ${KIND_VERB[kind]} ${OFFSET_PHRASE[offset]}`;
}

export function isMissed(fireAt: Date, claimedAt: Date): boolean {
  return claimedAt.getTime() - fireAt.getTime() > MISSED_AFTER_MS;
}
