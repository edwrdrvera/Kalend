"use client";

import { useState, type FormEvent } from "react";
import { cn } from "@/lib/utils";
import { APP_INPUT_CLS } from "@/components/DateField";
import type { Branch } from "@/lib/branch-types";
import type { CalendarTask } from "@/lib/calendar-types";
import PanelShell from "./PanelShell";
import SpacePanelHeader from "./SpacePanelHeader";
import PanelTasksSection from "./PanelTasksSection";
import SpacePanelFooter from "./SpacePanelFooter";

interface SpacePanelProps {
  branch: Branch;
  tasks: CalendarTask[];
  /** Modal dialog in overlay/full-screen modes; see PanelShell. */
  modal: boolean;
  onClose: () => void;
  onToggleComplete: (task: CalendarTask) => void;
  onOpenTask: (task: CalendarTask) => void;
  /** Creates a task in this branch's Space (title only; date/Space implied). */
  onCreateTask: (title: string) => Promise<void>;
  /** Opens the Space editor (rename / recolor / delete) for this branch's
   *  Space. Wired to both the header overflow button and the footer row. */
  onOpenSettings: () => void;
}

export default function SpacePanel({
  branch,
  tasks,
  modal,
  onClose,
  onToggleComplete,
  onOpenTask,
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
        <div>
          <PanelTasksSection
            tasks={tasks}
            onToggleComplete={onToggleComplete}
            onOpenTask={onOpenTask}
            onAdd={() => setComposerOpen(true)}
          />
          {composerOpen && (
            <form onSubmit={handleCreateTask} className="px-4 pb-3">
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
      </div>

      <SpacePanelFooter onOpenSettings={onOpenSettings} />
    </PanelShell>
  );
}
