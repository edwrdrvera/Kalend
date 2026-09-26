# Calendar events

Week / Month / Day views with a time grid. API: `/api/events`, `/api/events/<id>`.

## Sub-features
- Create by drag on an empty time slot in Week/Day (`useCreateDrag`), by double-clicking an empty hour slot (Week/Day) or an empty Month day cell, or right-click an empty slot → menu with `Create event` and `Create task`.
- Edit via click on an event → popover (`EventCreatePopover`, aria-label `Edit event`, title input `Event title`, submit `Save changes`).
- Move by dragging an event (`useMoveDrag`); resize by dragging its top or bottom edge (`useResizeDrag`).
- Delete from the popover (`Delete event`, immediate, no confirm) or right-click → `Delete event` → dialog "Delete this event?" → `Delete`.
- Multi-select: shift-click events; right-clicking a selected one offers `Delete N events` with a "Delete N events?" confirm.
- Agenda "Schedule" list: `Edit event: <title>` buttons.
- View switcher: Week / Month / Day (buttons with `aria-pressed`; below 768px they read W / M / D); `Previous` / `Today` / `Next` (Today is hidden below 768px).

## How to get to it (user POV)
Sign in → `/app`. Week view by default, Day view if the window is under 768px wide at load.

## Driving it with the browser pane
1. Screenshot, pick an empty slot in the grid, `left_click_drag` from start to end coordinates (an hour span).
2. Popover opens: `find "Create event"`; title input has placeholder `New event`. Type `verify-event-<ts>`, then click the submit button.
3. UI proof: the block with that title renders in the grid; `find "Edit event: verify-event-<ts>"` in the agenda if the event is on the selected day (the agenda lists the selected day, which starts as today).
4. Persistence: `(await fetch('/api/events').then(r=>r.json())).data.filter(e=>e.title.startsWith('verify-'))`; times are `start_at` / `end_at`.
5. Move: `left_click_drag` from the block's middle one hour down. Resize: the edge handles are 6 CSS px tall, so measure the block first (`getBoundingClientRect()` on the button containing the title, scaled by frame width / `innerWidth`) and start the drag within 2px of the top or bottom edge; a few px further in moves the event instead. Re-GET and compare `start_at` / `end_at`.
6. Edit: click `Edit event: verify-event-<ts>` in the agenda, `triple_click` the title input (`#new-event-title`), type, click `Save changes`.
7. Cleanup: right-click the block → `Delete event` → `Delete`, or popover `Delete event`, or DELETE `/api/events/<id>`.

## Gotchas
- Drag gestures need real pointer events; coordinates come from a fresh screenshot.
- Times are local; API `start_at` / `end_at` are UTC ISO strings.
- The agenda `Edit event: <title>` label appears twice (desktop and mobile layouts); use the first hit.
- `find` names the title input by its placeholder (`New event` when creating, `Event title` when editing); `find "Event title"` in the create popover hits only the sr-only label.
- Double-click create opens the same `Create event` popover; Escape closes it without saving.
