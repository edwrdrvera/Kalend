"use client";

import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_INPUT_CLS } from "@/components/DateField";
import { subjectKey, type PanelSubject } from "@/lib/panel-subject";
import type { CalendarEvent, CalendarTask } from "@/lib/calendar-types";
import type { UpcomingDay, WeekLoadDay } from "@/lib/space-overview";
import PanelShell from "./PanelShell";
import SpacePanelHeader from "./SpacePanelHeader";
import SpacePanelDescription from "./SpacePanelDescription";
import PanelUpcomingSection from "./PanelUpcomingSection";
import PanelWeekLoad from "./PanelWeekLoad";
import PanelGroupChips, { type PanelGroupNav } from "./PanelGroupChips";
import PanelTasksSection from "./PanelTasksSection";
import SpacePanelFooter from "./SpacePanelFooter";

interface SpacePanelProps {
  subject: PanelSubject;
  tasks: CalendarTask[];
  upcoming: UpcomingDay[];
  weekLoad: WeekLoadDay[];
  /** The Space's Groups as chips under the title. Omitted, or with no Groups, hides the row. */
  groupNav?: PanelGroupNav;
  /** Modal dialog in overlay/full-screen modes; see PanelShell. */
  modal: boolean;
  onClose: () => void;
  onToggleComplete: (task: CalendarTask) => void;
  onOpenTask: (task: CalendarTask) => void;
  onOpenEvent: (event: CalendarEvent) => void;
  /** Opens the event editor, anchored to the clicked button. */
  onCreateEvent: (anchor: DOMRect) => void;
  /** Creates a task in the open Space or Group (title only; date and membership implied). */
  onCreateTask: (title: string) => Promise<void>;
  /** Opens the editor for the open Space or Group. Wired to both the header
   *  overflow button and the footer row. */
  onOpenSettings: () => void;
  /** Saves the Space's description (null removes it). Resolves false when the save failed. */
  onSaveDescription: (description: string | null) => Promise<boolean>;
  onDirtyChange: (dirty: boolean) => void;
  /** A navigation is waiting on the user's Save / Discard / Stay answer. */
  navigationPending: boolean;
  onProceed: () => void;
  onStay: () => void;
}

const ADD_BUTTON_CLS =
  "flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[12px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function SpacePanel({
  subject,
  tasks,
  upcoming,
  weekLoad,
  groupNav,
  modal,
  onClose,
  onToggleComplete,
  onOpenTask,
  onOpenEvent,
  onCreateEvent,
  onCreateTask,
  onOpenSettings,
  onSaveDescription,
  onDirtyChange,
  navigationPending,
  onProceed,
  onStay,
}: SpacePanelProps) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  // Reset the task composer when the panel swaps to a different Space or Group
  // (the recommended "adjust state during render" pattern, not an effect).
  const key = subjectKey(subject);
  const [renderedKey, setRenderedKey] = useState(key);
  if (renderedKey !== key) {
    setRenderedKey(key);
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
    <PanelShell
      label={subject.kind === "group" ? `${subject.spaceName}, ${subject.name}` : subject.name}
      modal={modal}
      onClose={onClose}
    >
      <SpacePanelHeader subject={subject} onClose={onClose} onOverflow={onOpenSettings}>
        {groupNav && groupNav.groups.length > 0 && <PanelGroupChips subject={subject} nav={groupNav} />}
      </SpacePanelHeader>

      {/* Body: scrolls independently; sections self-omit when empty, and
          divide-y draws a hairline only between the sections that render.
          Keyed on the subject so swapping Spaces and Groups cross-fades the body. */}
      <div
        key={key}
        className="min-h-0 flex-1 divide-y divide-border overflow-y-auto motion-safe:animate-[fadeIn_180ms_ease-out]"
      >
        {subject.kind === "space" && (
          <SpacePanelDescription
            key={key}
            description={subject.description}
            onSave={onSaveDescription}
            onDirtyChange={onDirtyChange}
            navigationPending={navigationPending}
            onProceed={onProceed}
            onStay={onStay}
          />
        )}
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
                    // Keep PanelShell from also closing the whole panel.
                    e.stopPropagation();
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
        {upcoming.length === 0 && tasks.length === 0 && !composerOpen ? (
          <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">
            Nothing coming up in {subject.name}. Events and tasks you add here show up in this panel.
          </p>
        ) : null}
        <PanelWeekLoad days={weekLoad} color={subject.color} scopeName={subject.name} />
        <PanelUpcomingSection days={upcoming} onOpenEvent={onOpenEvent} />
        <PanelTasksSection
          tasks={tasks}
          scope={subject.kind === "group" ? "Group" : "Space"}
          onToggleComplete={onToggleComplete}
          onOpenTask={onOpenTask}
        />
      </div>

      <SpacePanelFooter
        label={subject.kind === "group" ? "Group settings" : "Space settings"}
        onOpenSettings={onOpenSettings}
      />
    </PanelShell>
  );
}
