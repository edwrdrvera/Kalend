"use client";

import { useEffect, useRef, type Dispatch } from "react";
import { parseAlertQuery } from "@/lib/alert-link";
import type { AlertKind } from "@/lib/alerts";
import { dueMessage, type AlertTrayAction } from "@/lib/alert-tray";
import type { AlertClaim } from "@/lib/calendar-types";
import { claimedFromPush, isPushAlert } from "@/lib/push-alert";
import { claimAlerts } from "./alert-requests";

export const ALERT_POLL_MS = 30_000;

/**
 * Asks the server for alerts that came due on mount, every 30 seconds, and
 * whenever the tab becomes visible. The server hands each alert out once, so
 * reloads, other tabs, and a push cannot repeat one. A push that arrives
 * while this tab is open is delivered here too. Due alerts become in-app
 * messages and, when the user already allowed notifications, browser
 * notifications. This never asks for permission. Missed alerts only join
 * the in-app list. Opening `/app?alert=` opens that event or task.
 */
export function useAlertDelivery(
  dispatch: Dispatch<AlertTrayAction>,
  onOpenItem: (kind: AlertKind, itemId: string) => void
): void {
  // Notifications outlive the render that created them, so they open the item
  // through the latest handler instead of the one from claim time.
  const openItem = useRef(onOpenItem);
  useEffect(() => {
    openItem.current = onOpenItem;
  });

  const shown = useRef(new Set<string>());

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const target = parseAlertQuery(params.get("alert"));
    if (!target) return;
    openItem.current(target.kind, target.itemId);
    params.delete("alert");
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
  }, []);

  useEffect(() => {
    function deliver(claim: AlertClaim) {
      dispatch({ type: "claimed", claim });
      if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
      for (const alert of claim.due) {
        if (shown.current.has(alert.id)) continue;
        shown.current.add(alert.id);
        const message = dueMessage(alert);
        const notification = new Notification(message.text, { tag: message.id });
        notification.onclick = () => {
          window.focus();
          openItem.current(message.kind, message.itemId);
          dispatch({ type: "dismiss", id: message.id });
          notification.close();
        };
      }
    }

    async function check() {
      let claim;
      try {
        claim = await claimAlerts();
      } catch {
        // Offline or a server hiccup. The next check retries.
        return;
      }
      // Delivered even if this effect was torn down meanwhile (Strict Mode
      // remounts it): the server already marked these fired, so dropping them
      // would lose them.
      deliver(claim);
    }

    function onWorkerMessage(event: MessageEvent) {
      const data: unknown = event.data;
      if (!data || typeof data !== "object") return;
      const message = data as { type?: string; alert?: unknown; kind?: string; itemId?: string };
      if (message.type === "kalend-alert" && isPushAlert(message.alert)) {
        deliver({ due: [claimedFromPush(message.alert)], missed: [] });
        return;
      }
      if (message.type === "kalend-open-alert") {
        const target = parseAlertQuery(`${message.kind ?? ""}:${message.itemId ?? ""}`);
        if (target) openItem.current(target.kind, target.itemId);
      }
    }

    const worker = navigator.serviceWorker;
    if (typeof worker?.addEventListener === "function") {
      worker.addEventListener("message", onWorkerMessage);
    }

    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };

    void check();
    const timer = setInterval(() => void check(), ALERT_POLL_MS);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      if (typeof worker?.removeEventListener === "function") {
        worker.removeEventListener("message", onWorkerMessage);
      }
    };
  }, [dispatch]);
}
