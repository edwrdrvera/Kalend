# Spaces

User-facing name for categories: colored groups that events and tasks belong to. API: `/api/categories`.

All create/edit/delete goes through one dialog, `SpaceEditorDialog`. (`CategoryManager.tsx` still exists with `Create a Space` / `Rename <name>` / `More actions for <name>` labels, but nothing renders it; don't target those.)

## Sub-features
- Create: icon rail `+` (`Create space`) or the mobile Spaces bar `+` (same label) → dialog "New Space", input `Space name`, submit `Create` (Return submits).
- Edit/rename: right-click a Space's rail tile (button named after the Space) → dialog "Edit Space", same `Space name` input, submit `Save`.
- Delete: in the edit dialog, `Delete Space` (visible text "Delete") → confirm step "Delete <name>?" → `Confirm delete Space` (visible text "Delete Space"). Its events and tasks stay, unassigned.
- Filter: left-click a rail tile to select the Space; the grid shows only its events and the agenda shows a **Branches** list. Clear it with `View all spaces` (top of the rail) or by clicking the active tile again.
- Space panel: click a branch row under Branches. Header has the Space name, branch name as `h2`, `Branch options`, `Close panel`. Body sections in order Meets, People, Open tasks, Links. Meets, People, and Links are omitted when empty; Open tasks always renders (heading, "Everything open in this Space", and an `Add task` `+`). Footer: `Space settings` opens the edit dialog.
- The open branch survives a reload (`localStorage["kalend.branchPanel"]`).
- No pin or hide-on-calendar control exists in the live UI.

## How to get to it (user POV)
Sign in → `/app` → the icon rail on the far left.

## Driving it with the browser pane
1. `find "Create space"` → click the first hit; `find "Space name"` → click, type `verify-space-<ts>`, press Return.
2. UI proof: `find "verify-space-<ts>"` hits the new rail tile.
3. Rename: `right_click` that tile ref; `find "Space name"` → `triple_click`, type the new name, click `Save`.
4. Persistence: `fetch('/api/categories')` includes it (`.data[].name`). The UI updates optimistically, so wait a few seconds before the GET.
5. Panel (read-only, use an existing seeded Space such as School): click its tile, click the branch row under Branches, check `Close panel` and the section headings. Close it with `Close panel`.
6. Cleanup: right-click your tile → `Delete Space` → `Confirm delete Space`; GET confirms it's gone.

## Gotchas
- Deleting a Space unassigns its linked events/tasks; only delete Spaces you created.
- Rail labels appear twice in the tree (desktop and mobile layouts); the first `find` hit is the desktop one.
- Below 1200px the panel is an overlay, and its backdrop is also a button named `Close panel` (the first `find` hit). Either one closes the panel.
