# Alerts (reminders)

Per-item reminders for events and tasks. API: `/api/alerts`, `/api/alerts/<id>`, `/api/alerts/claim`. Source: `AlertField`, `useAlertDelivery`, `useAlertTray`, `AlertMessages`, `AlertBell`, `src/lib/alert-tray.ts`.

Written from source, not yet driven in the browser. Drive each recipe once and correct this file where it is wrong.

## Sub-features
- Set an alert: the `Alert` select in the Event details and Task details panels (steps in events.md and tasks.md). It saves with the item's `Save`.
- Marker: an item with an alert shows an `Alert set` bell in the agenda Schedule row and in task rows.
- Delivery: `useAlertDelivery` calls `POST /api/alerts/claim` on mount, every 30 seconds, and when the tab becomes visible. The server hands each alert out once, so a reload or second tab never repeats one.
- Due alerts: a message in the `Reminders` region, with `Dismiss: <text>`, that clears itself; clicking it opens the event or task. A browser notification also fires, but only if permission was already granted. The app never asks on its own; the first saved alert in an editor does.
- Missed alerts (came due while the app was closed): one `Missed reminders` list titled "Missed while you were away", each row `<title> (reminder at <MMM d, h:mm a>)`, with per-row `Dismiss` and a clear-all button.
- Notices: plain one-line messages such as "that event no longer exists" when a message points at a deleted item.

## How to get to it (user POV)
Sign in → `/app` → click an event or task → `Alert` select → pick an offset → `Save`.

## Driving it with the browser pane
1. Create an event starting a few minutes from now (events.md), open it, set `Alert` to `At the time`, `Save`.
2. Persistence: `(await fetch('/api/alerts').then(r=>r.json())).data` has a row with that item's id and a `fire_at`.
3. UI proof: `find "Alert set"` in the agenda Schedule row.
4. Delivery: wait past the start time (up to 30 s polling), or switch tabs away and back. The `Reminders` region shows the message. Call `fetch('/api/alerts/claim',{method:'POST'})` yourself only to inspect: it consumes the alert.
5. Cleanup: delete the event; its alerts go with it.

## Gotchas
- The Space and All tasks panels' `Alerts` tabs are placeholders, not this feature (see groups.md).
- A claim is destructive and one-shot. Do not call it while a real alert you care about is pending.
- Notification permission is browser state; in the pane it may already be `denied`, so no prompt or system notification appears. The in-app message still does.
