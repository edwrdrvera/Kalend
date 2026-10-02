"use client";

import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_INPUT_CLS } from "@/components/DateField";
import type { Branch } from "@/lib/branch-types";
import type { CalendarEvent, CalendarTask } from "@/lib/calendar-types";
import type { UpcomingDay } from "@/lib/space-overview";
import PanelShell from "./PanelShell";
import SpacePanelHeader from "./SpacePanelHeader";
import PanelUpcomingSection from "./PanelUpcomingSection";
import PanelTasksSection from "./PanelTasksSection";
import SpacePanelFooter from "./SpacePanelFooter";

interface SpacePanelProps {
  branch: Branch;
  tasks: CalendarTask[];
  upcoming: UpcomingDay[];
  /** Modal dialog in overlay/full-screen modes; see PanelShell. */
  modal: boolean;
  onClose: () => void;
  onToggleComplete: (task: CalendarTask) => void;
  onOpenTask: (task: CalendarTask) => void;
  onOpenEvent: (event: CalendarEvent) => void;
  /** Opens the event editor, anchored to the clicked button. */
  onCreateEvent: (anchor: DOMRect) => void;
  /** Creates a task in this branch's Space (title only; date/Space implied). */
  onCreateTask: (title: string) => Promise<void>;
  /** Opens the Space editor (rename / recolor / delete) for this branch's
   *  Space. Wired to both the header overflow button and the footer row. */
  onOpenSettings: () => void;
}

const ADD_BUTTON_CLS =
  "flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[12px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function SpacePanel({
  branch,
  tasks,
  upcoming,
  modal,
  onClose,
  onToggleComplete,
  onOpenTask,
  onOpenEvent,
  onCreateEvent,
  onCreateTask,
  onOpenSettings,
}: SpacePanelProps) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  // Reset the task composer when the panel swaps to a different branch — the
  // recommended "adjust state during render" pattern, not an effect.
  const [renderedBranchId, setRenderedBranchId] = useState(branch.id);
  if (renderedBranchId !== branch.id) {
    setRenderedBranchId(branch.id);
    setComposerOpen(false);
    setNewTitle("");
  }

  async function handleCreateTask(e: FormEvent) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    await onCreateTask(title);
    setNewTitle("");
    setComposerOpen(false);
  }

  return (
    <PanelShell label={`${branch.spaceName}, ${branch.name}`} modal={modal} onClose={onClose}>
      <SpacePanelHeader branch={branch} onClose={onClose} onOverflow={onOpenSettings} />

      {/* Body: scrolls independently; sections self-omit when empty, and
          divide-y draws a hairline only between the sections that render.
          Keyed on branch.id so swapping branches cross-fades the body. */}
      <div
        key={branch.id}
        className="min-h-0 flex-1 divide-y divide-border overflow-y-auto motion-safe:animate-[fadeIn_180ms_ease-out]"
      >
        <div className="px-4 py-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={(e) => onCreateEvent(e.currentTarget.getBoundingClientRect())}
              className={ADD_BUTTON_CLS}
            >
              <Plus className="size-3.5" />
              Add event
            </button>
            <button type="button" onClick={() => setComposerOpen(true)} className={ADD_BUTTON_CLS}>
              <Plus className="size-3.5" />
              Add task
            </button>
          </div>
          {composerOpen && (
            <form onSubmit={handleCreateTask} className="mt-2">
              <input
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setComposerOpen(false);
                    setNewTitle("");
                  }
                }}
                onBlur={() => {
                  if (!newTitle.trim()) setComposerOpen(false);
                }}
                aria-label="New task title"
                placeholder="New task"
                className={cn(APP_INPUT_CLS, "w-full")}
              />
            </form>
          )}
        </div>
        {upcoming.length === 0 && tasks.length === 0 ? (
          <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">
            Nothing coming up in {branch.name}. Events and tasks you add here show up in this panel.
          </p>
        ) : null}
        <PanelUpcomingSection days={upcoming} onOpenEvent={onOpenEvent} />
        <PanelTasksSection
          tasks={tasks}
          onToggleComplete={onToggleComplete}
          onOpenTask={onOpenTask}
        />
      </div>

      <SpacePanelFooter onOpenSettings={onOpenSettings} />
    </PanelShell>
  );
}
