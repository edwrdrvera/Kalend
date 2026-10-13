# Groups and Space panel tabs

A Group is a named subdivision of one Space. Events and tasks can sit in a Space, or in one of its Groups. API: `/api/groups`, `/api/groups/<id>`. Source: `GroupEditorDialog`, `PanelGroupChips`, `SpacePanel`, `MembershipSelect`.

Written from source, not yet driven in the browser. Drive each recipe once and correct this file where it is wrong.

## Sub-features
- Chip row in the Space panel header (toggle group `Groups`): `All` (the Space itself), one chip per Group, and `New Group` (+). Picking a chip switches the panel between the Space and that Group, and the header shows the Space and Group names.
- Create: `New Group` → dialog with input `Group name` → `Create`. Rename: Group panel → `Group settings` (footer) → dialog → `Save`. Delete: in that dialog, `Delete Group` (visible text "Delete") → confirm "Delete <name>?" → `Confirm delete Group`. Its events and tasks stay in the Space, no longer in the Group. The confirm text gives the counts.
- Group panel: same layout as the Space panel (tabs, week load, Upcoming, Open tasks) filtered to the Group. Only an open Space or Group panel survives a reload (`localStorage["kalend.panel"]`).
- Membership: the event and task inspectors have a `Space: <Space / Group>` select (`MembershipSelect`). Picking a Group also sets its Space.
- Panel tabs: `Overview`, `Resources`, `Alerts`. The All tasks panel has `Tasks`, `Alerts`.
  - `This week` (Overview): bars per weekday, `<Weekday>, N hours`; clicking a bar selects that day.
  - `Resources`: placeholder, nothing persists. `Link address` input (`Paste a link, then Enter`), `Remove <host>`, a Files list that says uploads are not saved yet. A reload empties both.
  - `Alerts`: placeholder. The `Notify me about <name>` switch is component state only and `Coming up` always reads "No alerts scheduled." Real alerts live on each event and task (see alerts.md).

## How to get to it (user POV)
Sign in → `/app` → click a Space tile in the icon rail → the right panel opens with the chip row.

## Driving it with the browser pane
1. Open a seeded Space's panel. `find "New Group"`, click, type `verify-group-<ts>` in `Group name`, click `Create`.
2. UI proof: a chip named `verify-group-<ts>` appears in the `Groups` row. API: `(await fetch('/api/groups').then(r=>r.json())).data.filter(g=>g.name.startsWith('verify-'))`.
3. Rename: click the chip, `find "Group settings"`, `triple_click` the input, type, `Save`. Re-GET.
4. Membership: open an event (see events.md), set `Space: ...` to the new Group, `Save`, re-GET `/api/events` and check `group_id`.
5. Cleanup: Group panel → `Group settings` → `Delete Group` → `Confirm delete Group`. GET confirms it is gone, and the event keeps its Space.

## Gotchas
- Group names are trimmed, up to 100 characters; a blank name keeps `Create` disabled.
- Deleting a Space deletes its Groups (database cascade); only touch Spaces and Groups you created.
- The panel is an overlay below 1200px; its backdrop is also a button named `Close panel`.
