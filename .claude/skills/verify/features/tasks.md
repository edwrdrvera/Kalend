# Tasks

Persistent to-do list, shown in the agenda column and in a Space's panel. API: `/api/tasks`, `/api/tasks/<id>`.

## Sub-features
- Create from the agenda "Tasks" section.
- Create from a Space panel ("Open tasks" section).
- Create from the task dialog (`TaskCreateDialog`, `Task title` field), opened by right-clicking an empty calendar slot → `Create task`.
- Due date: the composer's `+ due date` button swaps in a date field; click that field to open the picker. After a pick the field is a button named `Due date, <Month D, YYYY>`.
- Toggle done / not done, from the agenda row or the Space panel row (`Mark as done` / `Mark as not done`).
- Dated tasks also render as chips on the Month grid and in the Week/Day all-day row (`TaskChip`). Clicking a chip toggles the same state; its label carries the title: `Mark as done: <title>` / `Mark as not done: <title>`.
- Bucketing by due date relative to the real current day: Overdue, Today, This week, This month, Unscheduled (`src/lib/task-buckets.ts`).
- No UI delete for tasks (the hook has `deleteTask`, but nothing renders a control for it).

## How to get to it (user POV)
Sign in → `/app`. The agenda column on the right has a **Tasks** heading with a `+`.

## Driving it with the browser pane
1. `find "Add a task"` → click (the `+` next to the Tasks heading).
2. `find "New task title"` → click it, `computer {action:"type", text:"verify-task-<ts>"}`, then `computer {action:"key", text:"Return"}`. Typing matters; `form_input` may not fire React's onChange.
3. UI proof: `find "verify-task-<ts>"` returns the row; `find "Mark as done"` near it exists.
4. Toggle: `find "Mark as done"` returns one hit per open task, so locate your row's button in the page (`[...document.querySelectorAll('*')].find(e=>e.children.length===0&&e.textContent==='verify-task-<ts>').closest('div.flex').querySelector('button').getBoundingClientRect()`) and click its center. Screenshot coordinates are in the screenshot frame, not CSS pixels: scale by frame width / `innerWidth`. The label flips to `Mark as not done`.
5. Persistence: in the page, `(await fetch('/api/tasks').then(r=>r.json())).data.filter(t=>t.title.startsWith('verify-'))` shows the row with `completed` matching the UI. The toggle is optimistic; wait a few seconds before the GET or it reads the old value.
6. Cleanup: `fetch('/api/tasks/<id>', {method:'DELETE'})` for your ids.

## Gotchas
- Two elements carry `aria-label="Add task"` (agenda submit button, Space panel). Use `Add a task` for the agenda opener.
- Space panel composer uses the same `New task title` label; scope with `read_page` if both are open.
- `find "Mark as done"` also hits grid chips of dated tasks. For a dated task, `find "Mark as done: verify-task-<ts>"` is a direct handle to its chip.
- Deleting through `fetch` DELETE doesn't update the open page; the row stays on screen until a reload.
