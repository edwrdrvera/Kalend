/** What `Notification.permission` says, or "unsupported" when the browser has no Notification. */
export type NotificationSupport = NotificationPermission | "unsupported";

/** What to do right after the user saves an alert. */
export type AlertPermissionPlan = "ask" | "explain" | "none";

export const IN_APP_ONLY_NOTICE =
  "Browser notifications are off, so alerts will show only inside Kalend.";

/**
 * Ask only while the browser has not been asked ("default"). A granted or
 * denied answer is final, and a browser with no notifications can't be asked,
 * so it gets the explanation straight away.
 */
export function alertPermissionPlan(current: NotificationSupport): AlertPermissionPlan {
  if (current === "default") return "ask";
  if (current === "unsupported") return "explain";
  return "none";
}
