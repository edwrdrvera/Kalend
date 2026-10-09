"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalendarCategory, CalendarGroup, CalendarTask, TaskPatchRequest } from "@/lib/calendar-types";
import type { AlertOffset } from "@/lib/alerts";
import {
  draftFromTask,
  draftPatch,
  isTaskDraftDirty,
  rebaseTaskDraft,
  wantedAlert,
  type SavedTask,
  type TaskDraft,
} from "@/lib/task-draft";
import { APP_INPUT_CLS, DateField } from "./DateField";
import AlertField from "./AlertField";
import MembershipSelect from "./MembershipSelect";
import { membershipOf } from "@/lib/membership";
import PanelShell from "./PanelShell";
import {
  FIELD_LABEL_CLS,
  IconButton,
  InspectorFooter,
  InspectorHeader,
  type InspectorNav,
  UnsavedChangesPrompt,
} from "./InspectorParts";
import { useInspectorSave } from "@/hooks/useInspectorSave";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import TaskCheckbox from "./TaskCheckbox";
import { FIELD_SIZE_CLS, FIELD_INLINE_RING_CLS } from "@/components/DateField";

interface TaskInspectorProps {
  task: CalendarTask;
  /** The task's stored alert, which the draft is compared against. */
  alertOffset: AlertOffset | null;
  categories: CalendarCategory[];
  groups: CalendarGroup[];
  modal: boolean;
  nav: InspectorNav;
  onClose: () => void;
  /** Resolves false when the save failed, so the draft stays. An empty patch
   *  means only the alert changed. */
  onSave: (task: CalendarTask, patch: TaskPatchRequest, alertOffset: AlertOffset | null) => Promise<boolean>;
  onToggleComplete: (task: CalendarTask) => void;
  onDelete: (task: CalendarTask) => void;
  onDirtyChange: (dirty: boolean) => void;
  /** A navigation is waiting on the user's Save / Discard / Stay answer. */
  navigationPending: boolean;
  onProceed: () => void;
  onStay: () => void;
}

/** A task's details in the right panel. Mount it with `key={task.id}` so each
 *  task gets a fresh draft. */
export default function TaskInspector({
  task,
  alertOffset,
  categories,
  groups,
  modal,
  nav,
  onClose,
  onSave,
  onToggleComplete,
  onDelete,
  onDirtyChange,
  navigationPending,
  onProceed,
  onStay,
}: TaskInspectorProps) {
  const saved: SavedTask = { task, alertOffset };
  const [draft, setDraft] = useState<TaskDraft>(() => draftFromTask(saved));
  const [seen, setSeen] = useState(saved);
  if (seen.task !== task || seen.alertOffset !== alertOffset) {
    setSeen(saved);
    setDraft((d) => rebaseTaskDraft(d, seen, saved));
  }
  const patch = draftPatch(task, draft);
  const dirty = isTaskDraftDirty(saved, draft);
  const titleMissing = draft.title.trim() === "";
  const { saving, saveError, clearError, handleSubmit, saveAndProceed } = useInspectorSave({
    dirty,
    invalidReason: titleMissing ? "Add a title before saving." : null,
    persist: () => onSave(task, patch, wantedAlert(draft)),
    onDirtyChange,
    onProceed,
    onStay,
  });

  const update = (changes: Partial<TaskDraft>) => {
    setDraft((d) => ({ ...d, ...changes }));
    clearError();
  };

  return (
    <PanelShell label="Task details" modal={modal} onClose={onClose}>
      <InspectorHeader title="Task details" itemTitle={task.title} nav={nav} onClose={onClose} />

      {navigationPending && (
        <UnsavedChangesPrompt noun="task" saving={saving} onSave={saveAndProceed} onDiscard={onProceed} onStay={onStay} />
      )}

      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 py-5">
        <label className="flex flex-col gap-1.5">
          <span className={FIELD_LABEL_CLS}>
            Title
          </span>
          <Input
            value={draft.title}
            onChange={(e) => update({ title: e.target.value })}
            aria-invalid={titleMissing || undefined}
            className={cn(FIELD_SIZE_CLS, FIELD_INLINE_RING_CLS, "w-full")}
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className={FIELD_LABEL_CLS}>
            Due date
          </span>
          <div className="flex items-center gap-1.5">
            <DateField label="Due date" value={draft.dueDate} onChange={(dueDate) => update({ dueDate })} />
            {draft.dueDate && (
              <IconButton aria-label="Clear due date" onClick={() => update({ dueDate: "" })}>
                <X className="size-3.5" />
              </IconButton>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className={FIELD_LABEL_CLS}>
            Space
          </span>
          <MembershipSelect
            categories={categories}
            groups={groups}
            membership={membershipOf({ category_id: draft.categoryId, group_id: draft.groupId })}
            onChange={(next) => update({ categoryId: next.category_id, groupId: next.group_id })}
            className="w-full"
          />
        </div>

        <AlertField
          id="task-inspector-alert"
          value={wantedAlert(draft)}
          onChange={(offset) => update({ alertOffset: offset })}
          disabledReason={draft.dueDate ? null : "Add a due date to set an alert."}
        />

        <div className="flex w-fit items-center gap-2">
          <TaskCheckbox
            id="task-inspector-done"
            title={task.title}
            checked={task.completed}
            onToggle={() => onToggleComplete(task)}
          />
          <Label htmlFor="task-inspector-done" className="text-body font-normal text-foreground">
            Done
          </Label>
        </div>

        <InspectorFooter
          noun="task"
          dirty={dirty}
          saving={saving}
          saveError={saveError}
          navigationPending={navigationPending}
          onDelete={() => onDelete(task)}
        />
      </form>
    </PanelShell>
  );
}
