"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { cn } from "@/lib/utils";
import { APP_INPUT_CLS } from "@/components/DateField";
import type { Branch } from "@/lib/branch-types";
import type { CalendarTask } from "@/lib/calendar-types";
import SpacePanelHeader from "./SpacePanelHeader";
import PanelMeetsSection from "./PanelMeetsSection";
import PanelPeopleSection from "./PanelPeopleSection";
import PanelTasksSection from "./PanelTasksSection";
import PanelLinksSection from "./PanelLinksSection";
import SpacePanelFooter from "./SpacePanelFooter";

interface SpacePanelProps {
  branch: Branch;
  tasks: CalendarTask[];
  /**
   * true in overlay/full-screen modes (< ~1200px): the panel behaves as a
   * modal dialog (focus trapped). false when pinned on desktop: it is a
   * complementary landmark and the calendar stays interactive alongside it.
   */
  modal: boolean;
  onClose: () => void;
  onToggleComplete: (task: CalendarTask) => void;
  /** Creates a task in this branch's Space (title only; date/Space implied). */
  onCreateTask: (title: string) => Promise<void>;
  onOpenSettings: () => void;
}

export default function SpacePanel({
  branch,
  tasks,
  modal,
  onClose,
  onToggleComplete,
  onCreateTask,
  onOpenSettings,
}: SpacePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
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

  // Move focus into the panel on open; restore it to the opener on close.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => opener?.focus?.();
  }, []);

  async function handleCreateTask(e: FormEvent) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    await onCreateTask(title);
    setNewTitle("");
    setComposerOpen(false);
  }

  // Escape closes when focus is inside the panel (all breakpoints). In modal
  // mode, keep Tab focus contained within the panel.
  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (!modal || e.key !== "Tab") return;
    const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
      'a[href],button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])'
    );
    if (!focusables || focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      role={modal ? "dialog" : "complementary"}
      aria-modal={modal ? true : undefined}
      aria-label={`${branch.spaceName}, ${branch.name}`}
      onKeyDown={handleKeyDown}
      className="flex h-full w-full flex-col border-l border-border bg-card outline-none"
    >
      <SpacePanelHeader branch={branch} onClose={onClose} />

      {/* Body: scrolls independently; sections self-omit when empty, and
          divide-y draws a hairline only between the sections that render.
          Keyed on branch.id so swapping branches cross-fades the body. */}
      <div
        key={branch.id}
        className="min-h-0 flex-1 divide-y divide-border overflow-y-auto motion-safe:animate-[fadeIn_180ms_ease-out]"
      >
        <PanelMeetsSection meets={branch.meets} />
        <PanelPeopleSection people={branch.people} />
        <div>
          <PanelTasksSection
            tasks={tasks}
            onToggleComplete={onToggleComplete}
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
        <PanelLinksSection links={branch.links} />
      </div>

      <SpacePanelFooter onOpenSettings={onOpenSettings} />
    </div>
  );
}
