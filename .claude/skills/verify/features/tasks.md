# Tasks

Persistent to-do list. API: `/api/tasks`, `/api/tasks/<id>` (rows carry `title`, `due_at`, `completed`, `category_id`).

## Sub-features
- All tasks panel: the agenda header's `All tasks` button opens a right-side panel (heading "All tasks", "N open across all Spaces") listing every task in due-date buckets relative to the real current day: Overdue, Today, This week, This month, Unscheduled (`src/lib/task-buckets.ts`), plus a `Completed` group. Bucket collapse persists in `localStorage["kalend:taskBuckets:collapsed"]`; `Completed` always starts collapsed.
- Create from the All tasks panel: header `+` (`Add a task`) opens a composer: `New task title` (placeholder `Task title`), `+ due date`, a Space picker, submit `Add task` (Return submits).
- Create from a Space panel ("Open tasks" section, `Add task` `+`, same `New task title` label, placeholder `New task`).
- Create from the task dialog (`TaskCreateDialog`, "New task", input `Task title`, `Create`): right-click an empty calendar slot → `Create task`. The due date is fixed to the clicked day.
- Agenda: the left column lists only tasks due on the selected day, under "Due today" or "Due this day". There is no composer in the agenda.
- Complete: only the checkbox toggles, labeled `Mark <title> as done` / `Mark <title> as not done` on rows (agenda, All tasks, Space panel). A task marked done in the All tasks panel moves into `Completed`.
- Open details: every task title is a button `Open task <title>` (rows and chips). It opens the Task inspector in the right panel slot (heading "Task details", close `Close task details`).
- Task inspector: fields `Title` (textbox), `Due date` (`Due date, not selected` or `Due date, <Month D, YYYY>`), `Space` (`Space: <name>` / `Space: No Space`), a `Done` checkbox (role checkbox, saves immediately, no Save needed), `Delete`, and `Save` (disabled until an edit; `Saving…`, then `Retry` on failure).
- Alerts: the Task details panel has an `Alert` select like the event one (id `task-inspector-alert`). With no due date it is disabled with the note "Add a due date to set an alert."; clearing the due date of an alerted task and saving removes the alert. Tasks with an alert show an `Alert set` bell in the agenda row. In this panel the Tab order after the select is `Done`, then `Delete`, then `Save`, so click `Save` instead of tabbing to it.
- Delete: inspector `Delete` → group `Confirm delete` with "Delete this task?" → `Delete` / `Cancel`. The inspector closes after the delete succeeds.
- Unsaved changes: with a dirty draft, opening another panel (e.g. `All tasks`) shows alertdialog `Unsaved changes` ("You have unsaved changes to this task.") with `Save` / `Discard` / `Stay`. `Save` saves, then continues to the requested panel.
- Dated tasks render as `TaskChip`s in the Week/Day all-day row: checkbox `Mark as done: <title>` / `Mark as not done: <title>` plus title button `Open task <title>`. The Month grid shows only a plain "N task(s)" count per day cell, not chips.

## How to get to it (user POV)
Sign in → `/app` → `All tasks` at the top of the left agenda column.

## Driving it with the browser pane
1. `find "All tasks"` → click the first hit. `find "Add a task"` → click. `find "New task title"` → click, `computer {action:"type", text:"verify-task-<ts>"}`, then `computer {action:"key", text:"Return"}`. Typing matters; `form_input` may not fire React's onChange.
2. UI proof: `find "verify-task-<ts>"` returns `Mark verify-task-<ts> as done` and `Open task verify-task-<ts>`.
3. Toggle: click `Mark verify-task-<ts> as done`. The row moves into `Completed`; click `Completed` to expand it and find `Mark verify-task-<ts> as not done`.
4. Persistence: in the page, `(await fetch('/api/tasks').then(r=>r.json())).data.filter(t=>t.title.startsWith('verify-'))` shows `completed` matching the UI. The toggle is optimistic; wait ~3s before the GET.
5. Inspector: click `Open task verify-task-<ts>`, `triple_click` the `Title` textbox (`read_page` on the `Task details` complementary gives its ref), type a new title. Click `All tasks` to get the `Unsaved changes` prompt and click its `Save`, or click the footer `Save` (see Gotchas). Re-GET for the new title.
6. Dated path: right-click an empty slot → `Create task` → type in `Task title` → Return. Its chip appears in that day's all-day row (`find "Mark as done: verify-task-<ts>"`) and in the agenda when that day is selected.
7. Cleanup through the UI: `Open task …` → `Delete` → `Delete` inside `Confirm delete`. GET confirms none remain. Fallback: `fetch('/api/tasks/<id>', {method:'DELETE'})` (the open page keeps the row until a reload).

## Gotchas
- `aria-label="Add task"` is on two elements (Space panel `+`, All tasks composer submit). `Add a task` is unique to the All tasks header `+`.
- `New task title` exists in both the All tasks and Space panel composers; only one is open at a time because they share the right panel slot.
- `Mark <title> as done` and `Open task <title>` appear once per surface (agenda, All tasks, chip). Any hit acts on the same task.
- Under `bun run dev` the Next.js dev tools badge sits over the inspector's footer `Save` at the bottom right. Use the `Unsaved changes` prompt's `Save`, or focus the button and press Return.
- The inspector's two `Delete` buttons both say "Delete". The confirm one is inside the `Confirm delete` group (`read_page` on that group).
