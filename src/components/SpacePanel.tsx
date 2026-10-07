"use client";

import { useState, type FormEvent } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_INPUT_CLS } from "@/components/DateField";
import { subjectKey, type PanelSubject } from "@/lib/panel-subject";
import type { CalendarEvent, CalendarTask } from "@/lib/calendar-types";
import type { UpcomingDay, WeekLoadDay } from "@/lib/space-overview";
import PanelShell from "./PanelShell";
import SpacePanelHeader from "./SpacePanelHeader";
import SpacePanelDescription from "./SpacePanelDescription";
import PanelUpcomingSection from "./PanelUpcomingSection";
import PanelTabs from "./PanelTabs";
import PanelWeekLoad from "./PanelWeekLoad";
import PanelGroupChips, { type PanelGroupNav } from "./PanelGroupChips";
import PanelTasksSection from "./PanelTasksSection";
import PanelResourcesTab from "./PanelResourcesTab";
import PanelAlertsTab from "./PanelAlertsTab";
import SpacePanelFooter from "./SpacePanelFooter";

interface SpacePanelProps {
  subject: PanelSubject;
  tasks: CalendarTask[];
  upcoming: UpcomingDay[];
  weekLoad: WeekLoadDay[];
  /** The Space's Groups as chips under the title. Omitted hides the row. */
  groupNav?: PanelGroupNav;
  /** Modal dialog in overlay/full-screen modes; see PanelShell. */
  modal: boolean;
  onClose: () => void;
  onToggleComplete: (task: CalendarTask) => void;
  onOpenTask: (task: CalendarTask) => void;
  onOpenEvent: (event: CalendarEvent) => void;
  /** Moves a task's due date (null clears it). */
  onChangeTaskDue: (task: CalendarTask, due: Date | null) => void;
  onDeleteTask: (task: CalendarTask) => void;
  /** Selects a day in the calendar (the week bars). */
  onSelectDay: (day: Date) => void;
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

type PanelTab = "overview" | "resources" | "alerts";

const TABS: { id: PanelTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "resources", label: "Resources" },
  { id: "alerts", label: "Alerts" },
];

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
  onChangeTaskDue,
  onDeleteTask,
  onSelectDay,
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
  const [tab, setTab] = useState<PanelTab>("overview");

  // Reset the task composer when the panel swaps to a different Space or Group
  // (the recommended "adjust state during render" pattern, not an effect).
  const key = subjectKey(subject);
  const [renderedKey, setRenderedKey] = useState(key);
  if (renderedKey !== key) {
    setRenderedKey(key);
    setComposerOpen(false);
    setNewTitle("");
    setTab("overview");
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
        {groupNav && <PanelGroupChips subject={subject} nav={groupNav} />}
        <PanelTabs tabs={TABS} value={tab} onChange={setTab} />
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
        {tab === "overview" && (
          <>
            <PanelWeekLoad days={weekLoad} color={subject.color} scopeName={subject.name} onSelectDay={onSelectDay} />
            <PanelUpcomingSection days={upcoming} onOpenEvent={onOpenEvent} onCreateEvent={onCreateEvent} />
            <PanelTasksSection
              tasks={tasks}
              scope={subject.kind === "group" ? "Group" : "Space"}
              onToggleComplete={onToggleComplete}
              onOpenTask={onOpenTask}
              onChangeDue={onChangeTaskDue}
              onDelete={onDeleteTask}
              onAddTask={() => setComposerOpen(true)}
            >
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
            </PanelTasksSection>
            <section aria-label="Resources summary" className="px-4 py-3">
              <button
                type="button"
                onClick={() => setTab("resources")}
                className="flex w-full items-center justify-between rounded-xl border border-border p-3 text-left transition-colors hover:border-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span>
                  <span className="block text-[12px] font-semibold text-muted-foreground">Files and links</span>
                  <span className="mt-1 block text-[13px] text-foreground">Open Resources</span>
                </span>
                <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
              </button>
            </section>
          </>
        )}
        {tab === "resources" && <PanelResourcesTab kindWord={subject.kind === "group" ? "Group" : "Space"} />}
        {tab === "alerts" && (
          <PanelAlertsTab name={subject.name} kindWord={subject.kind === "group" ? "Group" : "Space"} />
        )}
      </div>

      <SpacePanelFooter
        label={subject.kind === "group" ? "Group settings" : "Space settings"}
        onOpenSettings={onOpenSettings}
      />
    </PanelShell>
  );
}
