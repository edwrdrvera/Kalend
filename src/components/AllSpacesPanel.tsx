"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { CalendarCategory, CalendarGroup, CalendarTask } from "@/lib/calendar-types";
import type { WeekLoadDay } from "@/lib/space-overview";
import type { Membership } from "@/lib/membership";
import InlineTaskComposer from "./InlineTaskComposer";
import PanelAlertsTab from "./PanelAlertsTab";
import PanelShell from "./PanelShell";
import PanelTabs from "./PanelTabs";
import PanelTasksSection from "./PanelTasksSection";
import PanelWeekLoad from "./PanelWeekLoad";

interface AllSpacesPanelProps {
  /** Every task across all Spaces; the panel splits open from completed. */
  tasks: CalendarTask[];
  categories: CalendarCategory[];
  groups: CalendarGroup[];
  weekLoad: WeekLoadDay[];
  /** Seeds a new task's Space. */
  selectedSpaceId: string | null;
  modal: boolean;
  onClose: () => void;
  onCreateTask: (title: string, dueAt?: string, membership?: Membership) => Promise<void>;
  onToggleTaskComplete: (task: CalendarTask) => void;
  onChangeTaskDue: (task: CalendarTask, due: Date | null) => void;
  onDeleteTask: (task: CalendarTask) => void;
  onOpenTask: (task: CalendarTask) => void;
  onSelectDay: (day: Date) => void;
}

type AllTab = "tasks" | "alerts";

const TABS: { id: AllTab; label: string }[] = [
  { id: "tasks", label: "Tasks" },
  { id: "alerts", label: "Alerts" },
];

const ICON_BUTTON_CLS =
  "grid size-7 shrink-0 place-items-center rounded-[7px] border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** The dashboard for "all spaces": same frame as a Space's panel, across every Space. */
export default function AllSpacesPanel({
  tasks,
  categories,
  groups,
  weekLoad,
  selectedSpaceId,
  modal,
  onClose,
  onCreateTask,
  onToggleTaskComplete,
  onChangeTaskDue,
  onDeleteTask,
  onOpenTask,
  onSelectDay,
}: AllSpacesPanelProps) {
  const [tab, setTab] = useState<AllTab>("tasks");
  const [composerOpen, setComposerOpen] = useState(false);

  const open = tasks.filter((t) => !t.completed);
  const completed = tasks.filter((t) => t.completed);
  const pathOf = (task: CalendarTask) =>
    [
      categories.find((c) => c.id === task.category_id)?.name,
      groups.find((g) => g.id === task.group_id)?.name,
    ]
      .filter(Boolean)
      .join(" · ");

  return (
    <PanelShell label="All tasks" modal={modal} onClose={onClose}>
      <header className="border-b border-border px-4 pt-4">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="size-[10px] shrink-0 rounded-[3px] bg-muted-foreground/50" />
          <h2 className="min-w-0 flex-1 truncate text-[20px] font-semibold tracking-tight text-foreground">
            All tasks
          </h2>
          <button type="button" aria-label="Close panel" onClick={onClose} className={ICON_BUTTON_CLS}>
            <X className="size-4" />
          </button>
        </div>
        <PanelTabs tabs={TABS} value={tab} onChange={setTab} />
      </header>

      <div className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
        {tab === "tasks" && (
          <>
            <PanelWeekLoad days={weekLoad} color="blue" scopeName="all spaces" onSelectDay={onSelectDay} neutral />
            <PanelTasksSection
              tasks={open}
              scope="all"
              bucketed
              completed={completed}
              pathOf={pathOf}
              onToggleComplete={onToggleTaskComplete}
              onOpenTask={onOpenTask}
              onChangeDue={onChangeTaskDue}
              onDelete={onDeleteTask}
              onAddTask={() => setComposerOpen(true)}
            >
              {composerOpen && (
                <InlineTaskComposer
                  categories={categories}
                  groups={groups}
                  selectedSpaceId={selectedSpaceId}
                  onCreateTask={onCreateTask}
                  onClose={() => setComposerOpen(false)}
                />
              )}
            </PanelTasksSection>
          </>
        )}
        {tab === "alerts" && <PanelAlertsTab name="all spaces" kindWord="view" />}
      </div>
    </PanelShell>
  );
}
