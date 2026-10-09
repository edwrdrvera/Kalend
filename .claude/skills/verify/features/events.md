# Calendar events

Week / Month / Day views with a time grid. API: `/api/events`, `/api/events/<id>`.

## Sub-features
- Create by drag on an empty time slot in Week/Day (`useCreateDrag`), by double-clicking an empty hour slot (Week/Day) or an empty Month day cell, or right-click an empty slot → menu with `Create event` and `Create task`.
- Edit via click on an event → popover (`EventCreatePopover`, aria-label `Edit event`, title input `Event title`, submit `Save changes`).
- Move by dragging an event (`useMoveDrag`); resize by dragging its top or bottom edge (`useResizeDrag`). Timed events only: all-day and multi-day bars in the all-day row open the popover on click but have no drag, shift-click, or right-click menu.
- Delete from the popover (`Delete event`, immediate, no confirm) or right-click → `Delete event` → dialog "Delete this event?" → `Delete`.
- Keyboard: Shift+F10 or the ContextMenu key on a focused event, slot, or Month day button opens the same menu as right-click, anchored to that element, with focus on the first item. Escape closes it and focus returns to the element.
- Multi-select: shift-click events; right-clicking a selected one offers `Delete N events` with a "Delete N events?" confirm.
- Agenda "Schedule" list (left column, selected day only; "Nothing scheduled for <Month D>" when empty): `Edit event: <title>` buttons. The selected day changes on a click in a day header, a slot, a Month cell, a mini-calendar date, or `Today`. A drag-create does not change it.
- Alerts: the Event details panel (click an event) has an `Alert` select (None, At the time, 5 min, 15 min, 1 hour, 1 day before) between Space and the footer. It saves with `Save`, after the event itself; an alert-only change sends no event update. Events with an alert show an `Alert set` bell in the agenda Schedule row. API: `GET /api/alerts`. Native `<select>`: use `form_input` (arrow keys from the pane may not change it), then click `Save`. The first saved alert asks for notification permission once; the pane's permission may already be `denied`, so no prompt appears. Delete the event to remove its alerts.
- Description: the Event details panel (click an event) has an optional description between Location and Space. An event without one shows only an `Add description` button; clicking it opens a `Description` textarea (`#event-inspector-description`) that stays open, and a saved description opens already showing. It saves with `Save` along with the other fields; text is trimmed, blank text is stored as null, and over 2000 characters is refused with "Description is too long". A failed save keeps the text and the button reads `Retry`. The create popover has no description. API: `description` on `/api/events` (POST and PATCH; `null` clears).
- View switcher: Week / Month / Day (buttons with `aria-pressed`; below 768px they read W / M / D); `Previous` / `Today` / `Next` (Today is hidden below 768px).

## How to get to it (user POV)
Sign in → `/app`. Week view by default, Day view if the window is under 768px wide at load.

## Driving it with the browser pane
1. Screenshot, pick an empty slot in the grid, `left_click_drag` from start to end coordinates (an hour span).
2. Popover opens: `find "Create event"`; title input has placeholder `New event`. Type `verify-event-<ts>`, then click the submit button.
3. UI proof: the block with that title renders in the grid. To see it in the agenda, click its day in the mini calendar (or the day header), then `find "Edit event: verify-event-<ts>"`.
4. Persistence: `(await fetch('/api/events').then(r=>r.json())).data.filter(e=>e.title.startsWith('verify-'))`; times are `start_at` / `end_at`.
5. Move: `left_click_drag` from the block's middle one hour down. Resize: the edge handles are 6 CSS px tall and inset 1px from the block's edges, and drag coordinates round to whole frame pixels, so aim at a handle's center: `[...btn.parentElement.querySelectorAll('.cursor-ns-resize')].map(h=>h.getBoundingClientRect())` (`btn` = the button containing the title), take `(top+bottom)/2`, and scale by frame width / `innerWidth`. Starting outside the handle moves the event instead. Re-GET and compare `start_at` / `end_at`.
6. Edit: click `Edit event: verify-event-<ts>` in the agenda, `triple_click` the title input (`#new-event-title`), type, click `Save changes`.
7. Cleanup: right-click the block → `Delete event` → in the "Delete this event?" dialog, `find "Delete"` and click the `Delete` button. Or popover `Delete event`, or DELETE `/api/events/<id>`.

## Gotchas
- Drag gestures need real pointer events; coordinates come from a fresh screenshot.
- Times are local; API `start_at` / `end_at` are UTC ISO strings.
- The agenda `Edit event: <title>` label appears twice (desktop and mobile layouts); use the first hit.
- `find` names the title input by its placeholder (`New event` when creating, `Event title` when editing); `find "Event title"` in the create popover hits only the sr-only label.
- Double-click create opens the same `Create event` popover; Escape closes it without saving.
