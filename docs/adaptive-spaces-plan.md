# Adaptive Spaces Product and Implementation Plan

Status: Product direction agreed; Spaces MVP defined; implementation not started
Last updated: 2026-09-09

## Purpose

This document preserves Kalend's original student-first product idea, explains why the product broadened, and defines the implementation path for adaptive Space templates.

The intended outcome is one neutral calendar and task system that works for non-students while still delivering a purpose-built academic workflow inside Course Spaces.

## Product Thesis

Kalend is a calendar for commitments that require follow-through. Spaces keep events, tasks, deadlines, reminders, and the time reserved to complete the work together.

The calendar answers **when**. A Space answers **what the commitment belongs to, what remains to be done, and how it fits into the week**.

## Original Product Idea

Kalend began as a calendar built specifically around student life. Instead of treating everything as an unrelated event, the calendar would understand four kinds of information:

1. Classes
2. Deadlines, with subtypes such as assignments and quizzes
3. Time blocks reserved for completing work
4. Reminders

At the beginning of a term, a student would enter their courses as the primary organizing units. Each course would provide:

- A recurring class schedule that populates the calendar
- A visibility toggle so class meetings can be hidden when the calendar becomes noisy
- Course-specific deadlines
- Links from deadlines to preparation time blocks and reminders
- Priority and progress information
- Course-level filtering

Courses therefore behaved like smaller calendars, but with more knowledge than an ordinary calendar because they connected classes, deadlines, and preparation.

Export to Google Calendar and Apple Calendar was considered a critical requirement. A future master list would bring work from every course together.

### Original Challenges

Two risks were identified from the beginning:

1. **Recurring classes are deceptively complex.** Classes repeat on the same days and times for a term, but holidays, cancellations, rescheduling, reading weeks, and daylight-saving boundaries create exceptions.
2. **Initial setup can cause abandonment.** Manually entering every course, meeting pattern, assignment, quiz, and exam takes long enough that users may quit before receiving value.

These challenges remain part of the implementation scope; broadening the product does not remove them.

## Why the Direction Broadened

The original model made the entire application feel academic. A non-student opening Kalend would encounter concepts such as courses, classes, assignments, tests, exams, terms, and semesters even when none applied to their life.

That was especially problematic because the creator also wanted to use Kalend as a non-student for projects, work, health, social events, and personal plans.

The product therefore moved toward generic categories, later presented as Spaces. This preserved color coding, task/event grouping, and visibility filtering, but removed most of the semantic structure that distinguished Kalend from a conventional calendar.

The broadening was valid. The drift occurred because student concepts were removed from the core without being reintroduced as optional specialized behavior.

## Agreed Middle Ground

Kalend will have:

- One neutral application shell
- One universal event, task, scheduling, and reminder model
- Optional templates selected per Space
- Academic terminology only inside Course Spaces
- No account-wide student or professional mode

A person can simultaneously have:

- `Kalend launch` using the Project template
- `Health` using the Routine template
- `Social` using the Blank template
- `Evening Spanish` using the Course template
- `Montreal trip` using the Event Plan template

This is important: **the user does not choose an identity; each Space chooses the structure it needs**.

## Core Domain

The canonical terminology for this handoff is defined here so the plan remains self-contained when shared through Git.

The core relationships are:

```text
Space
├── Events
├── Tasks
│   └── optional Deadline
├── Work Blocks linked to Tasks
├── Reminders linked to Events or Tasks
├── Recurring Schedules
└── optional template-specific details
```

| Term | Canonical meaning |
| --- | --- |
| Space | A named context grouping related Events and Tasks; it may remain lightweight or gain specialized structure through a template. |
| All Spaces | The combined calendar view; it is not a stored Space. |
| Space Template | Optional per-Space setup, vocabulary, and sections; it is not an account mode. |
| Event | Something happening at a fixed time or over a fixed date range. |
| Task | An action the user intends to complete, optionally by a Deadline. |
| Deadline | The date or time by which a Task must be completed. |
| Work Block | Calendar time reserved to progress a Task without changing its Deadline. |
| Reminder | A notification rule attached to an Event or Task. |
| Schedule | A recurring Event pattern with optional start and end dates. |
| Course Space | A Space whose template supplies academic setup and vocabulary. |
| Term | The academic date range associated with Course Spaces. |
| Calendar Source | The local or external calendar storing or synchronizing an Event; it is independent of Space membership. |

### Space Membership, Templates, Types, and Tags

Categories do not survive as a second product concept. Every existing Category is already a Space under a legacy implementation name. Future classification features use distinct terms and fresh identities rather than reinterpreting existing Category IDs.

| Concept | Question it answers | Cardinality and behavior |
| --- | --- | --- |
| Space | What commitment or context does this belong to? | Zero or one per Event or Task; owns organizational color, focus, and optional lifecycle. |
| Space Template | What setup and vocabulary does this Space offer? | One `template_key`, default Blank; it is not another grouping layer. |
| Event Type | What kind of scheduled Event is this? | Optional controlled `event_type`, such as lecture, lab, or meeting. |
| Task Type | What kind of work is this? | Optional controlled `task_type`, such as assignment or reading. |
| Event Kind | Is this ordinary scheduling or a linked Work Block? | Structural `kind`; separate from presentation Type. |
| Tag | What cross-cutting label helps find this item? | Optional many-to-many labels, only if later validated. |
| Calendar Source | Where is this Event stored or synchronized? | Independent of Space membership and classification. |

Keep template-driven Types controlled initially. A lecture belongs to `BIO 102`; `BIO 102` is a Course Space. `Lecture` is an Event Type, not a second Space, and `Course` is a Space Template, not an Event Type.

Types do not own color inheritance, notifications, recurrence, or Task Deadlines. Templates may suggest Types but must not infer or change them from item titles.

Tags are outside the current adaptive release. If later user research validates them, introduce new `tags`, `event_tags`, and `task_tags` identities with user ownership and unique item/tag pairs. Tags must not replace Space membership, move items implicitly, or determine Space visibility. Do not call them Categories.

Do not add a separate “Space category” alongside `template_key`. Broad Spaces such as `Work` and finite Spaces such as `Montreal trip` are both valid Spaces.

### Important Corrections to the Original Language

- “To-do,” “In Progress,” and “Done” are task statuses, not priorities.
- Priorities are Low, Normal, High, and Urgent.
- “Blocker” means an obstacle in common product language. Kalend uses **Work Block** for calendar time reserved to complete work.
- A Reminder is a notification rule, not a category of calendar item.
- A Deadline belongs to a Task; it is not a standalone organizational category.
- A class meeting is a recurring Event inside a Course Space.

## Space Templates

Templates are starting configurations, not separate products and not rigid modes.

### Blank

For lightweight organization such as Social, Family, or Personal.

- Name and color
- Upcoming events
- Optional tasks
- Future reminder and Calendar Source defaults, only after those capabilities ship
- No additional structure until the user needs it

### Project

For work or personal efforts with an outcome.

- Optional target dates
- Milestone-oriented task language
- Meetings
- Tasks and deadlines
- Work Blocks linked to tasks

### Routine

For ongoing repeating commitments such as Health, Fitness, or Household maintenance.

- Recurring sessions
- Appointments
- Optional recurring tasks
- No fabricated progress or health score

### Course

The flagship student template and direct continuation of the original idea.

- Course name and optional course code
- Term dates
- Recurring class, lab, or tutorial schedule
- Assignment, quiz, exam, project, and reading vocabulary
- Coursework deadlines
- Study Blocks linked to coursework
- Academic terminology contained within this Space

### Event Plan

For finite commitments containing multiple scheduled and preparatory items, such as a trip, move, conference, or large party.

- Start and end dates
- Itinerary
- Reservations or appointments
- Preparation tasks
- Automatic archive suggestion after completion

## UX Requirements

### Post-MVP Neutral Global Shell

The eventual global navigation should remain neutral:

```text
Calendar
Tasks
Inbox
Spaces
```

Do not add global navigation named Classes, Assignments, Exams, or Semesters. Those labels appear only in Course Spaces.

### Low-Friction Capture

- A user can create an event without assigning a Space.
- Blank is the default Space template.
- The last or currently selected Space may be suggested, never forced.
- Kalend must not silently move events between Spaces.
- Template-specific fields use progressive disclosure.

### Selection Versus Visibility

These are separate actions:

- In the MVP, clicking a Space selects and exclusively filters it. After the inspector ships, the same action also opens that Space's inspector.
- Clicking its visibility control hides or shows its items.
- `All Spaces` clears the selection; it is a view, not a stored Space.
- The MVP uses exclusive filtering when a Space is selected. Retaining other Spaces as quiet background context is a post-MVP experiment, not a simultaneous requirement.
- `All Spaces` preserves explicit visibility choices; it does not silently unhide Spaces.

### Post-MVP Adaptive Inspector

Every selected Space has a shared inspector shell. Its labels and sections come from the template definition.

| Template | Schedule label | Task label | Primary summary |
| --- | --- | --- | --- |
| Blank | Schedule | Tasks | Next event |
| Project | Meetings | Project work | Next milestone |
| Routine | Sessions | Actions | Next session |
| Course | Class schedule | Coursework | Next deadline |
| Event Plan | Itinerary | Preparation | Next booking |

Simple Spaces must remain simple. Do not show project health, workload estimates, or progress when the user has not provided enough information to calculate them honestly.

### When Something Deserves a Space

A single dinner, dentist appointment, or party normally remains an Event. A commitment is a good Space candidate when at least two of these are true:

- It contains multiple events
- It recurs
- It contains several independent tasks
- It has its own start and end period
- It needs information outside one Event

Do not introduce nested Spaces in the first release. For example, `Alex's birthday` can remain an Event with preparation tasks inside the `Social` Space; `Montreal trip` can be its own Space because it contains an itinerary, reservations, and multiple days.

## Current Implementation

The current application already provides a strong horizontal foundation:

- Authenticated calendar workspace
- Month, Week, and Day views
- Event CRUD
- Dragging and resizing timed events
- All-day and multi-day presentation
- Task CRUD with optional due dates
- Categories linked to both events and tasks
- Category color inheritance
- Category visibility toggles
- User-scoped API access control

However, Spaces are still implemented as categories containing only a name and color:

- `src/db/schema/categories.ts`
- `src/app/api/categories/`
- `src/components/CategoryManager.tsx`
- `src/components/CategorySelect.tsx`

The sidebar also infers School, Work, and Personal from category names. This is presentation logic rather than a real domain model and must be removed.

The following original capabilities are not implemented:

- Term or Course entities
- Recurring event series and exceptions
- Deadline subtypes
- Task status beyond a completed boolean
- Priority
- Linked Work Blocks
- Reminder rules
- Calendar export or synchronization
- Low-friction course setup

The landing page currently claims calendar synchronization even though no export or sync integration exists. Until export ships, that language must be marked `Coming soon` or removed.

## Spaces MVP: Validate the Core Before the Full Roadmap

The first implementation milestone is intentionally smaller than the adaptive-template vision. Its purpose is to prove that Spaces make the existing calendar easier to organize before Kalend invests in schema renames, templates, recurrence, Work Blocks, reminders, or calendar export.

The MVP uses the existing category-backed implementation. `Category` may remain the internal database, API, hook, and component name temporarily; every user-facing label should say `Space`. This avoids a migration that delivers no immediate user value. The later Category-to-Space migration remains in the post-MVP roadmap.

### MVP Product Promise

> Create a Space, put events and tasks inside it, and focus the calendar on that part of your life.

Examples include `Work`, `BIO 102`, `Health`, `Social`, and `Kalend launch`. All MVP Spaces behave like the future Blank template. No template choice or specialized vocabulary is shown yet.

### MVP User Flow

1. The user opens the calendar in `All Spaces`.
2. They create a Space with a name and color using the existing inline form.
3. They optionally assign an Event or Task to that Space using the existing selector.
4. They select a Space using its name button in the sidebar.
5. The calendar and task list show only items assigned to the selected Space.
6. A compact bar above the calendar identifies the active Space and provides `All Spaces`.
7. New Events and Tasks default to the selected Space while focus is active.
8. The user may still explicitly clear the Space before saving an item.
9. Hiding, renaming, recoloring, and deleting a Space continue to work.

### MVP Scope

#### 1. Flat Space Sidebar

- Remove the name-based School, Work, and Personal grouping from `CategoryManager`.
- Add an `All Spaces` row at the top of the list.
- Display user-created Spaces in a single flat list.
- Render the Space name as a keyboard-accessible selection button; Enter and Space select it.
- Keep the colored visibility control separate from selection.
- Move rename into an explicit action or overflow menu that enters inline edit mode. Enter saves and Escape cancels, so selection and editing do not compete for the same click target.
- Preserve create, recolor, and delete behavior.
- Use a clear selected state that does not rely on color alone.

#### 2. Restore the Reachable Task Surface

`Calendar.tsx` currently loads Tasks and passes Task callbacks to `CalendarSidebar`, but the sidebar does not render `TaskList`. The MVP promise cannot be met until Tasks are reachable again.

- Render the existing `TaskList` from `CalendarSidebar`.
- Pass the centrally derived visible Task collection so Space focus affects the calendar and task list consistently.
- Keep undated Tasks visible when they belong to the selected Space or when All Spaces is active.
- Preserve the current create, complete, and delete behavior.
- Editing or reassigning an existing Task from the sidebar is not required for the MVP.

#### 3. Space Focus

Add calendar state equivalent to:

```text
selectedSpaceId: string | null
hiddenSpaceIds: string[]
```

Rules:

- `selectedSpaceId = null` means `All Spaces`.
- All Spaces shows every item except items belonging to explicitly hidden Spaces.
- Selecting a Space uses exclusive filtering and shows only that Space's Events and Tasks. This is the canonical MVP behavior.
- Unassigned items appear in All Spaces but not inside a selected Space.
- Selecting an already hidden Space makes it visible before focusing it.
- Hiding the currently selected Space clears the selection back to All Spaces.
- Selection resets to All Spaces on reload for the MVP.
- The active Space bar always offers a one-click `All Spaces` action.
- Returning to All Spaces clears only `selectedSpaceId`; it preserves `hiddenSpaceIds`.
- A hidden-item count and dimmed background context are deferred until user testing shows they are useful.

#### 4. Focus-Aware Creation

- Opening Event or Task creation snapshots the currently selected Space and uses it as the form's initial value. Changing focus while the editor is open must not silently change the draft.
- The user can choose another Space or `No Space` before saving.
- Creating from All Spaces retains the existing unassigned default.
- Editing an existing item initializes from the item's current Space and never changes it because of calendar focus.
- An inherited Space color continues through the existing display-color logic and must not set `color_overridden` unless the user explicitly chooses a custom item color.

#### 5. Clear Delete Behavior

Deleting a Space requires confirmation stating that its Events and Tasks will be kept and become unassigned. Preserve the existing transactional API behavior that locks the Space, snapshots linked items, detaches them, preserves inherited display colors, deletes the Space, and reconciles the returned items in client state.

- If deletion succeeds for the selected Space, return to All Spaces.
- If deletion fails, keep the Space selected and show the error.

#### 6. Honest User-Facing Language

- Replace visible `Category`, `No category`, and category-specific wording with `Space` and `No Space` across labels, selector text, accessibility labels, confirmations, empty states, tooltips, validation errors, hook fallbacks, and owned API error prose.
- Give Event and Task membership selectors an accessible name such as `Space: Work` or `Space: No Space`; do not rely on the selected Space name alone to communicate the field's purpose.
- Change human-readable API failures to wording such as `Space not found` or `The selected Space is unavailable`. Keep status codes, response envelopes, route paths, and machine field names unchanged because API error strings are surfaced directly to users.
- Preserve the nouns Event and Task. Space replaces their organizational selector; it does not rename either item type.
- Never rewrite user-authored Space names or Event and Task titles. A Space that a user names `Categories` keeps that name.
- Internal database, API, hook, and component identifiers may remain category-based for the MVP.
- Remove or mark the landing-page calendar synchronization claim as `Coming soon` until export actually ships.

### Explicit MVP Non-Goals

- Database or API rename from Category to Space
- Space templates or template selection
- Right-side adaptive Space inspector
- Space metadata beyond name and color
- Archive lifecycle
- Start or end dates
- Task status beyond completed or incomplete
- Priority
- Work Blocks linked to Tasks
- Recurring event series
- Course-specific setup or terminology
- Reminders
- Calendar export or provider synchronization
- Nested Spaces
- Automatic classification
- Editing or reassigning an existing Task from the sidebar

### Category-to-Space Compatibility Contract

The MVP has one domain model with temporary legacy names at implementation boundaries, not separate Category and Space models.

| Boundary | MVP representation |
| --- | --- |
| User interface and explanatory text | Space, Spaces, and No Space |
| Existing component and hook identifiers | `CategorySelect`, `CategoryManager`, and `useCategories` may remain |
| Existing wire types | `CalendarCategory`, `CalendarEvent.category_id`, and `CalendarTask.category_id` |
| Existing form values | `categoryId` may remain |
| HTTP endpoints | `/api/categories` and `/api/categories/[id]` |
| Request and response membership field | `category_id` |
| Database | `categories`, `events.category_id`, and `tasks.category_id` |
| New focus state | `selectedSpaceId`, containing the same UUID used by `category_id` |

An Event or Task belongs to zero or one Space. `All Spaces` is a view, not a stored row. `No Space` means null membership. New selection code may compare `selectedSpaceId` directly with `item.category_id`.

MVP guardrails:

- Do not add `/api/spaces`, a second membership column, duplicated membership state, or dual payload names.
- Create with a Space by sending `category_id: "<existing UUID>"`.
- First-party forms create without a Space by sending `category_id: null`; omission may remain backward-compatible for existing callers.
- Patch with a UUID to assign, with null to clear, and with the field omitted to leave membership unchanged.
- Focus supplies only the creation form's initial value. It is never a server-side default.
- Clearing a selector must send null and must not fall back through logic equivalent to `draft.categoryId ?? selectedSpaceId`.
- Editing starts from saved membership, including a saved null.
- Keep translating form `categoryId` to wire `category_id`; do not emit unsupported `space_id` fields during the MVP.
- Preserve ownership checks, color inheritance and overrides, transactional Space deletion, and deletion response snapshots.
- Do not introduce a schema migration in either MVP PR.
- Preserve every existing Category UUID, owner, name, color, and association. Do not merge similarly named rows, infer templates from names, seed an All Spaces row, or rewrite historical migrations.

### MVP Implementation Touchpoints

Prefer the smallest changes around the existing state owner and components:

- `src/components/Calendar.tsx`: selected Space state, derived Event and Task filtering, focus-aware creation defaults
- `src/components/CategoryManager.tsx`: flat list, All Spaces row, separate select and visibility actions
- `src/components/CalendarSidebar.tsx`: selection props and restoration of the focused Task list
- `src/components/EventCreatePopover.tsx`: snapshotted initial Space for creation without changing edit behavior
- `src/components/TaskList.tsx`: initial Space selection for Task creation
- `src/components/CategorySelect.tsx`: `Space` and `No Space` labels
- `src/hooks/useCategories.ts` and surfaced API errors: user-facing Space wording while retaining internal identifiers
- Event and Task form color initialization: preserve inherited-color semantics without setting an override
- Existing calendar grids should continue receiving already-filtered arrays and should not implement Space filtering themselves.

Do not add a global state library for this MVP. `Calendar.tsx` already owns Events, Tasks, categories, and view state, so Space selection belongs there until a later refactor demonstrates a need for broader state management.

### MVP Test Plan

Add focused tests for:

- All Spaces is selected initially.
- Selecting a Space filters both Events and Tasks.
- The restored Task list includes matching dated and undated Tasks.
- Unassigned items remain visible in All Spaces.
- Hidden Spaces remain excluded from All Spaces.
- Selecting a hidden Space makes it visible.
- Hiding the selected Space returns to All Spaces.
- Returning to All Spaces preserves other explicit visibility exclusions.
- Event creation defaults to the selected Space.
- Task creation defaults to the selected Space.
- Changing focus after opening a creation form does not change that draft's snapshotted Space.
- Editing uses the item's existing Space rather than the current focus.
- Users may clear the suggested Space before saving.
- Focused creation, explicit clearing, and editing an unassigned item submit the expected UUID or null.
- Submitted Event and Task payloads retain `category_id` and do not introduce `space_id`.
- API contract tests preserve create assignment and patch UUID, null, and omitted-field behavior.
- Event and Task forms use Space terminology, including server-reported failures.
- An inherited Space color is not recorded as a custom color override.
- Renaming and recoloring continue to update linked items.
- Successful deletion of the selected Space returns to All Spaces and preserves linked items as unassigned.
- Failed deletion preserves the selected Space and existing client state.
- Deletion snapshots retain the expected membership fields and reconcile without losing colors or unrelated concurrent edits.
- Existing ownership behavior, status codes, and response structures remain; wording assertions may change where human-readable errors change.
- Neither MVP PR introduces schema or migration changes.

There is no established component-interaction test suite for all of these paths. Add unit coverage where current seams support it, then run a short browser verification matrix covering desktop and mobile layouts, zero Spaces, undated Tasks, selection changes while an editor is open, deletion success, deletion failure, and successful item creation outside the currently focused filter.

Verification:

```bash
bunx tsc --noEmit
bun test
```

A production build is only required when the MVP branch is ready to merge.

### MVP Pull Request Sequence

Keep the MVP to two moderate, reviewable implementation PRs:

1. `feat(spaces): add flat selection and focused calendar filtering`
   - Restore the reachable Task list in the sidebar
   - Remove name-based sidebar grouping
   - Add All Spaces and selected Space state
   - Separate selection from visibility
   - Filter Events and Tasks centrally
   - Add the active Space bar
   - Cover selection, visibility, undated Tasks, and selected-Space deletion behavior
2. `feat(spaces): default new items to the focused Space`
   - Add snapshotted focus-aware Event and Task creation
   - Add delete confirmation while preserving the existing transaction and reconciliation behavior
   - Update user-facing wording and correct the unsupported synchronization claim
   - Preserve inherited-color behavior
   - Add regression and interaction coverage

### MVP Acceptance Criteria

The MVP is complete when a user can:

1. Create, rename, recolor, hide, and delete a Space.
2. Assign an Event or Task to a Space.
3. Select a Space and see only its Events and Tasks.
4. Return to the full calendar using All Spaces without losing explicit visibility choices.
5. Create a new Event or Task that defaults to the focused Space.
6. Use the entire flow without seeing student-only terminology.
7. Delete a Space without deleting its Events or Tasks.

The MVP should feel like a coherent organizational feature even though it still uses the category model internally.

### Post-MVP Decision Gate

Before beginning the adaptive-template roadmap, evaluate:

- Do users understand what a Space is without explanation?
- Do they create Spaces around broad areas, finite commitments, or both?
- Do they use selection more often than simple visibility toggles?
- Does defaulting new items to the focused Space reduce entry friction?
- Do users expect a selected Space to have its own overview or dashboard?
- Which template would create the most value next: Project, Course, Routine, or Event Plan?

If the basic grouping and focus workflow is not valuable, do not proceed directly into templates. Revise the Space interaction first.

## Post-MVP Adaptive Spaces Implementation Plan

### Phase 1: Replace the Category Domain with Spaces

Extend the category concept into a genuine Space model while preserving existing data.

Proposed common fields:

```text
spaces
- id
- user_id
- name
- color
- template_key      blank | project | routine | course | event_plan
- status            active | archived
- starts_on         nullable
- ends_on           nullable
- created_at
- updated_at
```

Work:

1. **Canonical application names:** introduce Space-named components, hooks, and domain types with explicit adapters to the legacy wire and storage shape. Retire Category-named frontend surfaces while keeping one internal membership value.
2. **API transition:** introduce `/api/spaces` routes backed by the same handlers as the temporary Category routes. During the transition, reads may provide both membership keys, including deletion snapshots. Accept either request key; reject a request containing conflicting values with `400`. Check property presence explicitly so null remains meaningful.
3. **First-party client switch:** move Kalend's clients to Space endpoints and `space_id`. Test old and new clients against the same records. Both route families must execute identical authorization and deletion behavior rather than duplicate business logic.
4. **Physical rename:** use a generated migration to rename `categories` to `spaces`, plus `events.category_id` and `tasks.category_id` to `space_id`. Preserve UUIDs, foreign keys, nulls, colors, policies, indexes, ownership, and `ON DELETE SET NULL` behavior.
5. **Compatibility retirement:** remove legacy routes and membership aliases only after the supported old-client window ends. Document the retirement condition so an old cached client cannot silently save an item without its Space.
6. **Template evolution:** add template and lifecycle fields separately, default existing rows to Blank, then add controlled Event and Task Types only when template vocabulary requires them. Tags require later validation and are not part of this phase.
7. Remove the legacy name-based School, Work, and Personal inference.

This phase must use the repository's `db-migrate` skill and generated Drizzle migrations.

API aliases cannot protect an old server process that still queries a physically renamed table. For the current pre-launch product, prefer a coordinated deployment: pause writes briefly, drain old server instances, apply the reviewed rename, deploy the compatible server, verify migrated fixtures and rollback behavior, and then resume writes. Do not build permanent dual-schema support unless deployment constraints later require it.

### Phase 2: Persist and Refine Space Focus

Build only on the MVP behavior instead of reimplementing it:

1. Persist visibility preferences locally.
2. Decide separately whether selected Space focus should persist across reloads.
3. Use MVP feedback to test an optional quiet-context mode in which other Spaces are dimmed rather than removed.
4. If quiet context is adopted, state the hidden-item count and provide a clear route back to the exclusive focused view.
5. Keep exclusive filtering as the default until evidence supports changing it.

### Phase 3: Add the Template Foundation

Build a `CreateSpaceDialog`, but expose only templates whose required capabilities have shipped. Start with Blank, Project, and Event Plan. Routine remains unavailable until recurrence ships, and Course remains unavailable until both recurrence and Course details ship.

Use a centralized template definition registry containing:

- Key
- Name
- Description
- Icon
- Setup fields
- Section configuration
- Vocabulary

Do not scatter `template_key === "course"` conditions through unrelated components.

Template-specific setup:

- Blank: name and color
- Project: name and optional target date
- Event Plan: name and date range
- Routine, once enabled: name and first recurring schedule
- Course, once enabled: course identity, term, and class schedule

Unavailable templates may be shown as `Coming soon`, but their setup forms must not collect data the model cannot yet store or use.

### Phase 4: Add the Adaptive Space Inspector

Create a shared `SpaceInspector` composed from reusable sections:

```text
SpaceInspector
├── SpaceHeader
├── NextItem
├── UpcomingList
├── TaskList
├── ScheduleSummary
└── optional template section
```

On desktop, the inspector occupies the right side of the calendar. On smaller screens, it becomes a bottom sheet.

The inspector must derive labels from the template registry. Course-only sections are not rendered for other templates.

### Phase 5: Add Task Status, Priority, and Work Blocks

Extend Tasks:

```text
status        todo | in_progress | done
priority      low | normal | high | urgent
```

Migrate `completed = false` to `todo` and `completed = true` to `done`.

Extend Events:

```text
kind          event | work_block
task_id       nullable
```

Rules:

- Scheduling a Task creates a linked Work Block.
- Moving a Work Block does not move the Task's Deadline.
- Completing a Task does not delete its Work Blocks.
- Deleting a Task asks whether linked Work Blocks should remain as ordinary Events.

### Phase 6: Add Recurring Schedules

Recurrence is shared infrastructure for Course and Routine templates.

Suggested model:

```text
event_series
- id
- user_id
- space_id
- title
- timezone
- recurrence_rule
- local_start_time
- local_end_time
- starts_on
- ends_on

event_exceptions
- series_id
- original_date
- action                 cancelled | rescheduled
- replacement_start_at
- replacement_end_at
```

Requirements:

- Store an IANA timezone and local wall-clock time so a 9:00 AM class remains at 9:00 AM across daylight-saving changes.
- Query and expand occurrences only for the visible calendar range; do not materialize an unbounded series in the client.
- Give each generated occurrence a stable identity derived from its series and original local occurrence date.
- Route edits using that occurrence identity so a generated instance cannot be mistaken for a stored standalone Event.
- Support changing one occurrence, this and future occurrences, or the complete series.
- Model cancellations, holidays, and rescheduling as exceptions, with one unique exception per series and original occurrence date.
- Enforce ownership through the parent series for every exception operation.
- Define series splitting for `this and future`: shorten the original series, create the successor series, and keep exceptions attached to the correct side of the split.

Implement Routine recurrence first, then reuse the same engine for Course schedules.

### Phase 7: Add Course Details

Keep academic-only columns out of the common `spaces` table.

```text
course_space_details
- space_id
- course_code
- term_name
- term_starts_on
- term_ends_on
- instructor
- location
```

Course task/event subtypes may include:

- Assignment
- Quiz
- Exam
- Project
- Reading
- Lecture
- Lab
- Tutorial

These are optional presentation metadata. The underlying objects remain Tasks and Events.

Once this phase and recurrence are complete, enable the Course template in `CreateSpaceDialog`. Enable Routine after recurrence is complete.

### Phase 8: Add Reminders

Reminders are notification rules attached to Events or Tasks, not standalone calendar items.

Suggested model:

```text
reminders
- id
- user_id
- event_id              nullable
- task_id               nullable
- offset_minutes
- status                pending | delivered | cancelled
- delivered_at          nullable
- created_at
- updated_at
```

Requirements:

- Before scheduling Task reminders, add an explicit date-only Deadline representation; do not derive a reminder reference from the current `23:59Z` convention.
- Exactly one of `event_id` or `task_id` is set.
- Ownership is checked against both the Reminder and its parent item.
- Users can add, edit, and remove one or more reminder offsets.
- An Event reminder is relative to `starts_at`; a Task reminder is relative to its date-only Deadline in the user's timezone.
- The first complete reminder release includes an in-app delivery worker and in-app notification surface, with idempotent delivery and retry behavior.
- Push, email, and provider alerts remain separate capabilities and must not be promised until their channels exist.
- After this phase ships, template defaults may suggest reminder offsets without silently creating them.

### Phase 9: Add Calendar Export

Ship one-way calendar subscription before bidirectional provider synchronization.

Before publishing feeds:

- Reuse the explicit date-only Task Deadline representation introduced for reminders. Do not serialize the legacy `23:59Z` convention as an all-day date.
- Add and maintain `updated_at` for every exported record so feed revisions are stable and meaningful.
- Define timezone conversion separately for date-only Deadlines and timed Events.

Support:

- One combined Kalend iCalendar feed
- Individual feeds for each Space
- Revocable secret subscription URLs
- Events and Work Blocks as `VEVENT`
- Deadlines as all-day `VEVENT` entries for broad calendar compatibility
- Stable identifiers and update timestamps

Settings should offer:

- Subscribe in Google Calendar
- Subscribe in Apple Calendar
- Copy subscription URL
- Regenerate private URL

The feed URL is a credential. Store only a hash where practical, scope access carefully, and make revocation obvious.

Calendar Source defaults and external provider mapping remain deferred until provider integration is implemented; an iCalendar subscription URL alone is not a writable Calendar Source.

### Phase 10: Reduce Setup Friction

First release:

- Template defaults
- Fast recurring schedule entry
- Copy-and-adjust meeting patterns
- Optional sample content

Later releases:

- Syllabus parsing
- Institutional calendar imports
- Suggested Spaces based on repeated behavior
- Provider calendar mapping

Automation must suggest changes and require confirmation; it must not silently reorganize user data.

## Suggested Post-MVP Pull Request Sequence

1. `docs(domain): define adaptive Space model`
2. `refactor(spaces): add canonical application names and legacy adapters`
3. `feat(api): add Space routes with Category compatibility`
4. `refactor(spaces): switch first-party clients to Space contracts`
5. `refactor(db): rename Category storage to Spaces`
6. `refactor(api): retire Category compatibility after the supported window`
7. `feat(spaces): add template and lifecycle fields`
8. `feat(spaces): persist and refine focus preferences`
9. `feat(spaces): add Blank, Project, and Event Plan creation`
10. `feat(spaces): add adaptive inspector for available templates`
11. `feat(tasks): add status and priority`
12. `feat(calendar): link work blocks to tasks`
13. `feat(calendar): add recurring event series`
14. `feat(spaces): enable Routine template setup`
15. `feat(spaces): add Course details and enable Course setup`
16. `feat(reminders): add date-only deadlines and deliver reminder rules`
17. `feat(calendar): add export metadata`
18. `feat(calendar): publish calendar subscription feeds`
19. `feat(spaces): reduce setup friction`

Keep commits small and conventional. Open PRs into `develop` according to `docs/git-workflow.md` when that file is present.

## Post-MVP Testing and Verification

Every API route must remain an access-control boundary because the database client bypasses RLS.

Required coverage:

- Space CRUD and ownership
- Migration of existing categories and foreign keys
- Mixed old/new client requests against the same Space records
- Conflicting dual membership keys reject with `400`; explicit null remains distinct from omission
- Category compatibility routes and Space routes share authorization and deletion behavior
- Physical renames preserve UUIDs, associations, colors, policies, indexes, nulls, and deletion semantics
- Template validation
- Selection versus visibility behavior
- No Space required during event or task creation
- Focus snapshot behavior while a creation form remains open
- Task status migration
- Work Block and Task lifecycle behavior
- Recurrence expansion across DST boundaries
- Single-occurrence and series edits
- Series splitting, exception uniqueness, and range-bounded recurrence queries
- Course term boundaries and cancelled classes
- Reminder parent validation and ownership
- Date-only Deadline serialization across timezones
- Feed authorization, revocation, and stable identifiers
- Template vocabulary isolation

Verification commands:

```bash
bunx tsc --noEmit
bun test
bun run build
```

Run the type-check and relevant tests incrementally. Reserve the full production build for merge-ready work.

## Full Roadmap Acceptance Criteria

The adaptive Spaces initiative is complete when:

- A non-student can use Blank, Project, Routine, and Event Plan Spaces without seeing academic terminology.
- A student can create a Course Space with a recurring class schedule and coursework deadlines.
- Both users share the same Event, Task, Work Block, recurrence, reminder, and calendar engine.
- Spaces remain optional during quick capture.
- Selecting and hiding a Space are distinct, understandable actions.
- Existing category-linked data migrates without loss.
- Course schedule exceptions handle cancellations and rescheduling.
- Tasks can be connected to scheduled Work Blocks without changing their Deadlines.
- Google and Apple Calendar can subscribe to combined or per-Space feeds.
- Marketing claims match functionality that actually ships.

## Non-Goals for the Full Adaptive Spaces Release

- Nested Spaces
- Global student or professional modes
- Bidirectional calendar synchronization
- Team collaboration
- Arbitrary user-authored templates
- AI-generated productivity scores
- Notion-style documents or databases
- Automatic reorganization without confirmation

## Open Technical Decisions

These require focused design before their implementation phase:

1. Whether recurrence rules are stored as RFC 5545 strings or normalized columns.
2. Whether template-specific task/event subtypes use constrained text fields or extension tables.
3. Whether archived Space events remain visible in All Spaces by default.
4. Whether Work Blocks inherit the Task's Space permanently or can be reassigned independently.
5. Whether calendar feeds include completed deadlines and historical Work Blocks.
6. Whether user research demonstrates a need for cross-Space Tags after the adaptive release.

Do not let these questions block the Category-to-Space migration, selection UX, template registry, or adaptive inspector.

## Reference Scenarios

### Non-Student Project

```text
Kalend launch · Project Space
├── Planning meeting · Event
├── Calendar export · Task due Thursday
├── Build export · Work Block on Monday
└── Test subscriptions · Work Block on Wednesday
```

### Student Course

```text
BIO 102 · Course Space · Fall term
├── Lecture · Recurring Event
├── Lab report · Task due Thursday
├── Draft analysis · Study Block on Tuesday
└── Submission reminder · Reminder on Wednesday
```

### Casual Organization

```text
Social · Blank Space
├── Dinner with Maya · Event
├── Alex's birthday · Event
└── Buy gift · Task in the Social Space
```

### Finite Personal Plan

```text
Montreal trip · Event Plan Space
├── Train and hotel · Events
├── Download tickets · Task
├── Pack charger · Task
└── Archive suggestion after the return date
```
