# ADR-0001: Decompose the TimeGrid drag gestures into pure geometry and gesture hooks

**Status:** Accepted
**Date:** 2026-09-21
**Deciders:** Edward Rivera

## Context

`TimeGrid.tsx` renders the shared hour-by-hour grid behind both the Week and Day views. It had grown to 979 lines. For its callers it is already a deep module. `WeekGrid` and `DayGrid` hand it days, events, categories, and a set of callbacks, and get a full interactive grid back. The cost sat inside the file, not at its interface.

Three pointer gestures were braided together with the view and with each other. Move-drag, resize-drag, and create-drag each carried their own React state, a cluster of refs, a rAF throttle, a window-level listener effect, and a block of pixel-to-minute geometry. The geometry was pure arithmetic but lived inline, so the only way to exercise "does a move snap to 15 minutes and land on the right day" was to mount the whole grid and synthesise DOM pointer events. In practice that meant the drag behaviour had no unit coverage at all.

A separate but related shape exists one file up. `Calendar.tsx` (664 lines) is a god orchestrator holding roughly fifteen state hooks across several unrelated feature clusters (the event editor popover, event selection and context menus, the space and branch panel). It is recorded here so the two decisions stay in one place, but only the TimeGrid work is in flight.

Constraints. The change must be behaviour-preserving, there is no appetite for a rewrite. The authenticated calendar grid at `/app` is behind a demo login whose password is out of bounds for the agent, so a live end-to-end drag smoke cannot be run by the tooling. Verification leans on unit tests plus type checking plus review, with the live smoke deferred to a human-signed-in pass.

## Decision

Split TimeGrid along two seams.

First, lift the drag arithmetic into a pure, DOM-free module, `src/lib/time-grid-drag-math.ts`. It exports snap, clamp, pointer-to-minutes, move-start, day-index-from-x, ghost delta, resize-edge, and create-range as plain functions of numbers. This is a deep module. A large amount of gesture behaviour sits behind a small interface, and it is fully unit-testable with no React and no layout engine.

Second, extract each gesture into its own hook (`useMoveDrag`, `useResizeDrag`, `useCreateDrag`). Each hook owns the imperative shell for one gesture, meaning its refs, its rAF throttle, its window listeners, and the body cursor lock, and calls the pure math for the decisions. Each hook presents a small interface: the pointer-down handler to wire plus the live preview to render. TimeGrid then shrinks to the view, wiring the three hooks' handlers onto the grid, and the coordination that genuinely spans gestures (which gesture currently owns the pointer) stays in the component.

Calendar follows the same idea with three feature hooks (`useEventEditor`, `useEventSelection`, `useSpacePanel`), leaving Calendar as a composition root. That half is designed, not yet built.

## Options Considered

### Option A: Pure geometry module plus one hook per gesture (chosen)

| Dimension | Assessment |
|-----------|------------|
| Complexity | Medium. Several new files, but each is small and single-purpose. |
| Testability | High. The geometry is pure and unit-tested. Each gesture shell is isolated. |
| Reader load | Lower. A gesture reads as a named call, not an inline arithmetic block. |
| Risk | Low to medium. Behaviour-preserving, guarded by the geometry tests and the export contract test. |

**Pros:** The geometry becomes reachable to tests without the DOM, which is the whole debt. Each gesture is isolated for locality. The seams are honest, they exist for testability and locality rather than a pretended plugin point.

**Cons:** The three hooks are not fully independent. They share `gridRef`, `dayHeight`, and `days`, and move disables resize and create while it runs, so a thin slice of coordination stays in the component.

### Option B: One unified `usePointerGestures` hook

| Dimension | Assessment |
|-----------|------------|
| Complexity | Medium. One file instead of three. |
| Testability | Low. The gestures stay entangled, one layer down. |
| Reader load | Unchanged. The tangle moves rather than dissolves. |
| Risk | Medium. A larger single unit to get right in one move. |

**Pros:** One place for the shared context. Fewer files.

**Cons:** Fails the deletion test. Deleting the hook does not concentrate complexity anywhere, it just relocates it. The knot of three gestures is exactly what we are trying to separate.

### Option C: Leave TimeGrid as-is

| Dimension | Assessment |
|-----------|------------|
| Complexity | Zero now, compounding later. |
| Testability | The drag logic stays untested. |
| Reader load | Unchanged at 979 lines. |
| Risk | Ongoing. Every change to the grid pays the tangle tax. |

**Pros:** No work, no regression risk today.

**Cons:** The untested drag geometry keeps blocking safe change, and the file keeps absorbing new behaviour.

## Trade-off Analysis

The core trade is a handful of new files against a testable, single-sourced geometry and isolated gesture shells. Option B looks tidier by file count but keeps the entanglement that is the actual problem, so it loses on the one axis that motivated the work. Option C is only cheaper until the next grid change. Option A accepts a small residue of shared coordination in the component as the honest cost of gestures that really do interact, and buys back testability and locality for it.

## Consequences

- Easier. The drag geometry is unit-tested and lives in one place, so a snap or clamp bug is fixed once. Each gesture can be read and changed without holding the other two in mind.
- Harder. There is a little more indirection, a gesture now spans a hook and the view. The shared coordination is a seam a reader must still notice.
- To revisit. If a fourth gesture appears, or if the shared coordination grows past a thin slice, reconsider whether a small shared drag-context object should own it explicitly rather than the component.
- Verification gap. The live grid drag smoke is blocked by the demo login and remains the one check the automated suite cannot cover. It must be run by a signed-in human before this is considered fully proven.

## Action Items

1. [x] Extract the pure geometry module with unit tests (commit `9ccb12a`).
2. [x] Wire TimeGrid to call the pure module, behaviour-preserving (commit `a4b70ca`).
3. [ ] Extract `useMoveDrag`, `useResizeDrag`, and `useCreateDrag`, one at a time, each keeping the suite green.
4. [ ] Thin TimeGrid to the view once the three hooks land.
5. [ ] Run the signed-in drag smoke to close the verification gap.
6. [ ] Apply the same feature-hook split to `Calendar.tsx` as a separate effort.
