"use client";

import { useReducer } from "react";
import { alertTrayReducer, emptyAlertTray } from "@/lib/alert-tray";

/** The reminder messages on screen. Delivery and the item opener both add to it. */
export function useAlertTray() {
  const [tray, dispatch] = useReducer(alertTrayReducer, emptyAlertTray);
  return {
    tray,
    dispatch,
    dismiss: (id: string) => dispatch({ type: "dismiss", id }),
    clearMissed: () => dispatch({ type: "clearMissed" }),
    /** A plain message that clears itself, such as "that event no longer exists". */
    notify: (text: string) => dispatch({ type: "notice", notice: { id: crypto.randomUUID(), text } }),
  };
}
