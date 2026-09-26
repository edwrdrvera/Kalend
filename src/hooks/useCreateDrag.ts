import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { addMinutes, startOfDay } from "date-fns";
import {
  MINUTES_PER_DAY,
  clamp,
  computeCreateRange,
  passedDragThreshold,
  pointerToMinutes,
  snapMinutes,
} from "@/lib/time-grid-drag-math";
import { lockBodyForDrag, restoreBodyAfterDrag } from "@/lib/body-drag-lock";

/** Tracks an in-progress drag across empty slots to create a new event. All
 *  minutes are relative to midnight of the column being dragged in. `anchor`
 *  is where the pointer went down; `live` follows the pointer. `moved` flips
 *  true only once the pointer travels past the drag threshold, so a plain
 *  click (which selects the day) never creates an event. */
export interface CreateDrag {
  dayIndex: number;
  day: Date;
  anchorMinutes: number;
  liveMinutes: number;
  pointerStartY: number;
  moved: boolean;
}

interface UseCreateDragParams {
  gridRef: RefObject<HTMLDivElement | null>;
  dayHeight: number;
  /** When set, a drag across empty slots opens the creator for the range.
   *  When absent, slot drags are disabled. */
  onSlotDragCreate?: (start: Date, end: Date, anchorRect: DOMRect) => void;
  /** True while another gesture owns the pointer. A slot drag must not start
   *  while a move or resize is in progress. */
  blocked: boolean;
}

export interface CreateDragState {
  onSlotPointerDown: (e: ReactPointerEvent<HTMLDivElement>, dayIndex: number, day: Date) => void;
  /** The live drag, for rendering the sketch preview on its column. */
  preview: CreateDrag | null;
  /** True (and clears the flag) when the click that follows a completed drag
   *  should be swallowed instead of selecting the day. */
  consumeSlotClickSuppression: () => boolean;
}

export function useCreateDrag({
  gridRef,
  dayHeight,
  onSlotDragCreate,
  blocked,
}: UseCreateDragParams): CreateDragState {
  const [createDrag, setCreateDrag] = useState<CreateDrag | null>(null);
  // Mirrors state and props so the window-level handlers, which outlive any
  // single render, always read the latest values without stale closures.
  const createDragRef = useRef<CreateDrag | null>(null);
  const onSlotDragCreateRef = useRef(onSlotDragCreate);
  // Suppresses the click that fires after a create-drag ends, so the drag
  // doesn't also select the day.
  const suppressSlotClickRef = useRef(false);

  useEffect(() => {
    createDragRef.current = createDrag;
    onSlotDragCreateRef.current = onSlotDragCreate;
  });

  function clientYToMinutes(clientY: number): number {
    const top = gridRef.current?.getBoundingClientRect().top ?? 0;
    return pointerToMinutes(clientY, top, dayHeight);
  }

  function onSlotPointerDown(e: ReactPointerEvent<HTMLDivElement>, dayIndex: number, day: Date) {
    if (!onSlotDragCreate || e.button !== 0 || blocked) return;
    const minutes = clamp(snapMinutes(clientYToMinutes(e.clientY)), 0, MINUTES_PER_DAY);
    setCreateDrag({
      dayIndex,
      day,
      anchorMinutes: minutes,
      liveMinutes: minutes,
      pointerStartY: e.clientY,
      moved: false,
    });
  }

  const isCreateDragging = createDrag !== null;
  useEffect(() => {
    if (!isCreateDragging) return;

    function onPointerMove(e: PointerEvent) {
      const drag = createDragRef.current;
      if (!drag) return;
      const minutes = clamp(snapMinutes(clientYToMinutes(e.clientY)), 0, MINUTES_PER_DAY);
      const moved = drag.moved || passedDragThreshold(0, e.clientY - drag.pointerStartY);
      setCreateDrag((prev) =>
        prev && (prev.liveMinutes !== minutes || prev.moved !== moved)
          ? { ...prev, liveMinutes: minutes, moved }
          : prev
      );
    }

    function onPointerUp() {
      const drag = createDragRef.current;
      setCreateDrag(null);
      if (!drag || !drag.moved) return;

      // A real drag happened: suppress the trailing click's day-select and
      // open the creator for the spanned range (min 15 min).
      suppressSlotClickRef.current = true;
      const { lo, hi } = computeCreateRange(drag.anchorMinutes, drag.liveMinutes);
      const dayStart = startOfDay(drag.day);
      const columnEl = gridRef.current?.children[drag.dayIndex] as HTMLElement | undefined;
      const rect = columnEl?.getBoundingClientRect() ?? gridRef.current?.getBoundingClientRect();
      if (rect) {
        onSlotDragCreateRef.current?.(addMinutes(dayStart, lo), addMinutes(dayStart, hi), rect);
      }
    }

    function onCancel() {
      setCreateDrag(null);
    }

    const previousBodyStyle = lockBodyForDrag("ns-resize");
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("blur", onCancel);

    return () => {
      restoreBodyAfterDrag(previousBodyStyle);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("blur", onCancel);
    };
  });

  function consumeSlotClickSuppression(): boolean {
    if (suppressSlotClickRef.current) {
      suppressSlotClickRef.current = false;
      return true;
    }
    return false;
  }

  return { onSlotPointerDown, preview: createDrag, consumeSlotClickSuppression };
}
