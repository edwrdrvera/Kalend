"use client";

import { useState } from "react";
import { Bell, Clock, LayoutGrid, MapPin, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AlertOffset } from "@/lib/alerts";
import type { CalendarCategory, CalendarEvent, CalendarGroup } from "@/lib/calendar-types";
import { MAX_ICON_LENGTH, MAX_LOCATION_LENGTH, type EventFormValues } from "@/lib/event-form";
import {
  draftFromEvent,
  joinDateTimeLocal,
  splitDateTimeLocal,
  rebaseEventDraft,
  eventDraftValues,
  isEventDraftDirty,
  isEventFieldsDirty,
  type EventDraft,
  type SavedEvent,
} from "@/lib/event-draft";
import { useInspectorSave } from "@/hooks/useInspectorSave";
import { APP_INPUT_CLS, DateField } from "./DateField";
import AlertField from "./AlertField";
import DescriptionField from "./DescriptionField";
import IconPicker from "./IconPicker";
import PanelShell from "./PanelShell";
import { EventColorControl, EventSpaceSelect } from "./EventFields";
import {
  DetailRow,
  InspectorFooter,
  InspectorHeader,
  type InspectorNav,
  UnsavedChangesPrompt,
} from "./InspectorParts";

interface EventInspectorProps {
  event: CalendarEvent;
  /** The event's stored alert, which the draft is compared against. */
  alertOffset: AlertOffset | null;
  categories: CalendarCategory[];
  groups: CalendarGroup[];
  modal: boolean;
  nav: InspectorNav;
  onClose: () => void;
  /** Resolves false when the save failed, so the draft stays. `values` is null
   *  when only the alert changed. */
  onSave: (event: CalendarEvent, values: EventFormValues | null, alertOffset: AlertOffset | null) => Promise<boolean>;
  onDelete: (event: CalendarEvent) => void;
  onDirtyChange: (dirty: boolean) => void;
  /** A navigation is waiting on the user's Save / Discard / Stay answer. */
  navigationPending: boolean;
  onProceed: () => void;
  onStay: () => void;
}

const ROW_CONTROL_CLS = "h-8 min-w-0 whitespace-nowrap rounded-lg px-2 text-[13px]";

const INPUT_CLS = cn(APP_INPUT_CLS, "w-full focus-visible:ring-2 focus-visible:ring-ring");

/** An event's details in the right panel. Mount it with `key={event.id}` so
 *  each event gets a fresh draft. */
export default function EventInspector({
  event,
  alertOffset,
  categories,
  groups,
  modal,
  nav,
  onClose,
  onSave,
  onDelete,
  onDirtyChange,
  navigationPending,
  onProceed,
  onStay,
}: EventInspectorProps) {
  const saved: SavedEvent = { event, alertOffset };
  const [draft, setDraft] = useState<EventDraft>(() => draftFromEvent(saved));
  const [seen, setSeen] = useState(saved);
  if (seen.event !== event || seen.alertOffset !== alertOffset) {
    setSeen(saved);
    setDraft((d) => rebaseEventDraft(d, seen, saved));
  }
  const dirty = isEventDraftDirty(saved, draft);
  const { values, error: invalidReason } = eventDraftValues(draft);
  const { saving, saveError, clearError, handleSubmit, saveAndProceed } = useInspectorSave({
    dirty,
    invalidReason,
    persist: () =>
      values
        ? onSave(event, isEventFieldsDirty(event, draft) ? values : null, draft.alertOffset)
        : Promise.resolve(false),
    onDirtyChange,
    onProceed,
    onStay,
  });

  const start = splitDateTimeLocal(draft.startAt);
  const end = splitDateTimeLocal(draft.endAt);

  const update = (changes: Partial<EventDraft>) => {
    setDraft((d) => ({ ...d, ...changes }));
    clearError();
  };

  return (
    <PanelShell label="Event details" modal={modal} onClose={onClose}>
      <InspectorHeader title="Event details" itemTitle={event.title} nav={nav} onClose={onClose} />

      {navigationPending && (
        <UnsavedChangesPrompt noun="event" saving={saving} onSave={saveAndProceed} onDiscard={onProceed} onStay={onStay} />
      )}

      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-5">
        <div className="flex flex-col gap-2">
          <label htmlFor="event-inspector-title" className="sr-only">
            Title
          </label>
          <div className="flex items-center gap-2.5">
            <label htmlFor="event-inspector-icon" className="sr-only">
              Event icon
            </label>
            <IconPicker
              id="event-inspector-icon"
              value={draft.icon}
              onChange={(icon) => update({ icon })}
              maxLength={MAX_ICON_LENGTH}
              className="size-12 rounded-[10px] text-xl"
            />
            <input
              id="event-inspector-title"
              value={draft.title}
              onChange={(e) => update({ title: e.target.value })}
              aria-invalid={draft.title.trim() === "" || undefined}
              className={cn(INPUT_CLS, "h-12 flex-1 rounded-[10px] px-3.5 text-xl font-semibold tracking-tight")}
            />
          </div>
        </div>

        <div className="flex flex-col border-b border-border">
          <DetailRow icon={<Clock />} label="Starts" className="min-h-13">
            <DateField
              label="Start date"
              value={start.date}
              className={ROW_CONTROL_CLS}
              onChange={(d) => update({ startAt: joinDateTimeLocal(d, start.time) })}
            />
            <input
              type="time"
              aria-label="Start time"
              value={start.time}
              onChange={(e) => update({ startAt: joinDateTimeLocal(start.date, e.target.value) })}
              className={cn(APP_INPUT_CLS, ROW_CONTROL_CLS, "w-28 shrink-0")}
            />
          </DetailRow>
          <DetailRow icon={<Clock />} label="Ends" className="min-h-13">
            <DateField
              label="End date"
              value={end.date}
              className={ROW_CONTROL_CLS}
              onChange={(d) => update({ endAt: joinDateTimeLocal(d, end.time) })}
            />
            <input
              type="time"
              aria-label="End time"
              value={end.time}
              onChange={(e) => update({ endAt: joinDateTimeLocal(end.date, e.target.value) })}
              className={cn(APP_INPUT_CLS, ROW_CONTROL_CLS, "w-28 shrink-0")}
            />
          </DetailRow>
          <DetailRow icon={<MapPin />} label="Location" labelFor="event-inspector-location">
            <input
              id="event-inspector-location"
              value={draft.location}
              onChange={(e) => update({ location: e.target.value })}
              maxLength={MAX_LOCATION_LENGTH}
              placeholder="Empty"
              className={cn(APP_INPUT_CLS, "h-8 w-full border-transparent bg-transparent px-2 text-sm -mx-2 focus-visible:ring-2 focus-visible:ring-ring")}
            />
          </DetailRow>
          <DetailRow icon={<Bell />} label="Alert" labelFor="event-inspector-alert">
            <AlertField
              id="event-inspector-alert"
              inline
              value={draft.alertOffset}
              onChange={(offset) => update({ alertOffset: offset })}
            />
          </DetailRow>
          <DetailRow icon={<LayoutGrid />} label="Space">
            <EventSpaceSelect
              colorState={draft.colorState}
              categories={categories}
              groups={groups}
              onChange={(colorState) => update({ colorState })}
              className="-ml-2 h-8 text-sm text-foreground"
            />
          </DetailRow>
          <DetailRow icon={<Palette />} label="Color" className="justify-between">
            <EventColorControl
              colorState={draft.colorState}
              categories={categories}
              onChange={(colorState) => update({ colorState })}
              className="ml-auto"
              swatchClassName="size-5 rounded-full"
            />
          </DetailRow>
        </div>

        <DescriptionField
          id="event-inspector-description"
          value={draft.description}
          onChange={(description) => update({ description })}
        />

        <InspectorFooter
          noun="event"
          dirty={dirty}
          saving={saving}
          saveError={saveError}
          navigationPending={navigationPending}
          onDelete={() => onDelete(event)}
        />
      </form>
    </PanelShell>
  );
}
