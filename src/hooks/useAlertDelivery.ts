"use client";

import { useEffect, useRef, type Dispatch } from "react";
import type { AlertKind } from "@/lib/alerts";
import { dueMessage, type AlertTrayAction } from "@/lib/alert-tray";
import { claimAlerts } from "./alert-requests";

export const ALERT_POLL_MS = 30_000;

/**
 * Asks the server for alerts that came due on mount, every 30 seconds, and
 * whenever the tab becomes visible. The server hands each alert out once, so
 * reloads and other tabs never repeat one. Due alerts become in-app messages
 * and, when the user already allowed notifications, browser notifications.
 * This never asks for permission. Missed alerts only join the in-app list.
 * Messages go to the tray from `useAlertTray`.
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

  useEffect(() => {
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
      dispatch({ type: "claimed", claim });
      if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
      for (const alert of claim.due) {
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

    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };

    void check();
    const timer = setInterval(() => void check(), ALERT_POLL_MS);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [dispatch]);
}
