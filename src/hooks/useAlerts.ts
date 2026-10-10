"use client";

import { useEffect, useRef, useState } from "react";
import type { AlertOffset, AlertTarget } from "@/lib/alerts";
import { alertsByItem, alertSteps } from "@/lib/alert-diff";
import { alertPermissionPlan, IN_APP_ONLY_NOTICE, type NotificationSupport } from "@/lib/alert-permission";
import type { CalendarAlert } from "@/lib/calendar-types";
import { createAlert, deleteAlert, fetchAlerts } from "./alert-requests";

const belongsTo = (alert: CalendarAlert, target: AlertTarget) =>
  (target.kind === "event" ? alert.event_id : alert.task_id) === target.id;

/** The alerts of `targets` taken from `fresh`, every other item's from `rest`. */
const replaceTargets = (rest: CalendarAlert[], fresh: CalendarAlert[], targets: AlertTarget[]) => [
  ...rest.filter((alert) => !targets.some((target) => belongsTo(alert, target))),
  ...fresh.filter((alert) => targets.some((target) => belongsTo(alert, target))),
];

const currentSupport = (): NotificationSupport =>
  typeof Notification === "undefined" ? "unsupported" : Notification.permission;

/**
 * The alerts the user has set, for the bell in the day panel and the choice
 * in the details panels. `notify` shows a plain message in the alert tray.
 */
export function useAlerts(notify: (text: string) => void) {
  const [alerts, setAlerts] = useState<CalendarAlert[]>([]);

  // The caller's `notify` changes every render. The load runs once, so it
  // reads the latest one through a ref instead of re-running.
  const latestNotify = useRef(notify);
  useEffect(() => {
    latestNotify.current = notify;
  });

  // Items saved since the page opened. The first load may land after their
  // saves, and its copy of them is older.
  const synced = useRef<AlertTarget[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchAlerts().then(
      (list) => {
        const savedMeanwhile = [...synced.current];
        if (!cancelled) setAlerts((local) => replaceTargets(list, local, savedMeanwhile));
      },
      () => {
        if (!cancelled) latestNotify.current("Couldn't load your alerts.");
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  // Asked once, the first time an alert is saved. The answer is not awaited,
  // so the save finishes while the browser's prompt is still open.
  function askForNotifications() {
    const plan = alertPermissionPlan(currentSupport());
    if (plan === "explain") notify(IN_APP_ONLY_NOTICE);
    if (plan !== "ask") return;
    Notification.requestPermission().then(
      (answer) => {
        if (answer !== "granted") notify(IN_APP_ONLY_NOTICE);
      },
      () => notify(IN_APP_ONLY_NOTICE)
    );
  }

  const byItem = alertsByItem(alerts);

  /**
   * Leaves the item with the wanted alert, or none. Rejects when a request
   * fails, so the caller can keep the draft and offer a retry. Call it after
   * the item itself is saved, because the server computes when the alert fires
   * from the saved time, and may already have removed or moved the alert.
   */
  async function syncAlert(target: AlertTarget, wanted: AlertOffset | null): Promise<void> {
    // Checked against every stored alert, not `byItem`, which shows only one per item.
    if (alertSteps(alerts.filter((alert) => belongsTo(alert, target)), wanted).length === 0) return;

    let current = await fetchAlerts();
    const steps = alertSteps(current.filter((alert) => belongsTo(alert, target)), wanted);
    // The list only updates when every step worked. After a failure it still
    // shows the alert the user had, so the draft stays unsaved and a retry
    // fetches the real list again.
    for (const step of steps) {
      if (step.type === "create") {
        current = [...current, await createAlert(target, step.offset)];
      } else {
        await deleteAlert(step.id);
        current = current.filter((alert) => alert.id !== step.id);
      }
    }
    // Only this item's alerts, so a save for another item running at the same
    // time keeps its own.
    synced.current.push(target);
    setAlerts((local) => replaceTargets(local, current, [target]));
    if (steps.some((step) => step.type === "create")) askForNotifications();
  }

  return { byItem, syncAlert };
}
