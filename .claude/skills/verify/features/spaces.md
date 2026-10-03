# Spaces

User-facing name for categories: colored groups that events and tasks belong to. API: `/api/categories`.

All create/edit/delete goes through one dialog, `SpaceEditorDialog`. (`CategoryManager.tsx` still exists with `Create a Space` / `Rename <name>` / `More actions for <name>` labels, but nothing renders it; don't target those.)

## Sub-features
- Create: icon rail `+` (`Create space`) or the mobile Spaces bar `+` (same label) → dialog "New Space", input `Space name`, color swatch `Change color, currently <color>`, submit `Create` (Return submits).
- Edit/rename: right-click a Space's rail tile (button named after the Space) → dialog "Edit Space", same `Space name` input and color swatch, submit `Save`.
- Delete: in the edit dialog, `Delete Space` (visible text "Delete") → confirm step "Delete <name>?" → `Confirm delete Space` (visible text "Delete Space"). Its events and tasks stay, unassigned.
- Focus: left-click a rail tile to select the Space; the grids keep every event and task but dim the ones outside it (class `opacity-50`, full strength on hover or keyboard focus), the left agenda column lists only that Space's items, and a **Branches** list appears at the top of the left agenda column, above the date header. Selecting does not change the date or view. Clear it with `View all spaces` (second rail control, under the app mark) or by clicking the active tile again. The filter does not survive a reload.
- Space panel: click a branch row under Branches. Header has the Space name, branch name as `h2`, `Branch options`, `Close panel`. Body starts with `Add event` (opens the event editor with the Space preselected, at the next whole hour) and `Add task` (reveals the `New task title` input). Then, each only when it has content: Upcoming (the Space's events in the next 14 days, max 10, grouped by day, folded to 5 rows behind `Show N more`; each row is `Open event <title>` and opens the event inspector) and Open tasks. A Space with neither shows "Nothing coming up in <name>." Footer: `Space settings` opens the edit dialog.
- The right panel is one slot shared by a branch, the All tasks panel, and the Task inspector (see tasks.md); opening one replaces the other. Only an open branch survives a reload (`localStorage["kalend.branchPanel"]`).
- Sidebar collapse: the rail's top control (the app mark, `Collapse sidebar` / `Expand sidebar`, `aria-expanded`) hides the agenda and mini calendar column; the rail stays. Persists in `localStorage["kalend.sidebarCollapsed"]` (`"true"` when collapsed).
- No pin or hide-on-calendar control exists in the live UI.

## How to get to it (user POV)
Sign in → `/app` → the icon rail on the far left.

## Driving it with the browser pane
1. `find "Create space"` → click the first hit; `find "Space name"` → click, type `verify-space-<ts>`, press Return.
2. UI proof: `find "verify-space-<ts>"` hits the new rail tile.
3. Rename: `right_click` that tile ref; `find "Space name"` → `triple_click`, type the new name, click `Save`.
4. Persistence: `fetch('/api/categories')` includes it (`.data[].name`). The UI updates optimistically, so wait a few seconds before the GET.
5. Panel (read-only, use an existing seeded Space such as School): click its tile, click the branch row under Branches, check the `h2` branch name, `Close panel`, and the section headings. Reload: the panel reopens. Close it with `Close panel`.
6. Collapse: click `Collapse sidebar`; `All tasks` is no longer visible and `localStorage["kalend.sidebarCollapsed"]` is `"true"`. Reload, `find "Expand sidebar"`, click it to restore.
7. Cleanup: right-click your tile → `Delete Space` → `Confirm delete Space`; GET confirms it's gone.

## Gotchas
- Deleting a Space unassigns its linked events/tasks; only delete Spaces you created.
- Rail labels appear twice in the tree (desktop and mobile layouts); the first `find` hit is the desktop one.
- Below 1200px the panel is an overlay, and its backdrop is also a button named `Close panel` (the first `find` hit). Either one closes the panel.
