"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { AlertOffset } from "@/lib/alerts";
import type { CalendarCategory, CalendarEvent } from "@/lib/calendar-types";
import { MAX_ICON_LENGTH, MAX_LOCATION_LENGTH, type EventFormValues } from "@/lib/event-form";
import {
  draftFromEvent,
  rebaseEventDraft,
  eventDraftValues,
  isEventDraftDirty,
  isEventFieldsDirty,
  type EventDraft,
  type SavedEvent,
} from "@/lib/event-draft";
import { useInspectorSave } from "@/hooks/useInspectorSave";
import { APP_INPUT_CLS } from "./DateField";
import AlertField from "./AlertField";
import DescriptionField from "./DescriptionField";
import IconPicker from "./IconPicker";
import PanelShell from "./PanelShell";
import { EventColorSpaceFields, EventTimeFields } from "./EventFields";
import {
  FIELD_LABEL_CLS,
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

const INPUT_CLS = cn(APP_INPUT_CLS, "w-full focus-visible:ring-2 focus-visible:ring-ring");

/** An event's details in the right panel. Mount it with `key={event.id}` so
 *  each event gets a fresh draft. */
export default function EventInspector({
  event,
  alertOffset,
  categories,
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

      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="event-inspector-title" className={FIELD_LABEL_CLS}>
            Title
          </label>
          <div className="flex items-center gap-1.5">
            <label htmlFor="event-inspector-icon" className="sr-only">
              Event icon
            </label>
            <IconPicker
              id="event-inspector-icon"
              value={draft.icon}
              onChange={(icon) => update({ icon })}
              maxLength={MAX_ICON_LENGTH}
            />
            <input
              id="event-inspector-title"
              value={draft.title}
              onChange={(e) => update({ title: e.target.value })}
              aria-invalid={draft.title.trim() === "" || undefined}
              className={INPUT_CLS}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className={FIELD_LABEL_CLS}>Time</span>
          <EventTimeFields
            startAt={draft.startAt}
            endAt={draft.endAt}
            onStartChange={(startAt) => update({ startAt })}
            onEndChange={(endAt) => update({ endAt })}
          />
        </div>

        <label className="flex flex-col gap-1.5">
          <span className={FIELD_LABEL_CLS}>Location</span>
          <input
            value={draft.location}
            onChange={(e) => update({ location: e.target.value })}
            maxLength={MAX_LOCATION_LENGTH}
            className={INPUT_CLS}
          />
        </label>

        <DescriptionField
          id="event-inspector-description"
          value={draft.description}
          onChange={(description) => update({ description })}
        />

        <div className="flex flex-col gap-1.5">
          <span className={FIELD_LABEL_CLS}>Space</span>
          <EventColorSpaceFields
            colorState={draft.colorState}
            categories={categories}
            onChange={(colorState) => update({ colorState })}
          />
        </div>

        <AlertField
          id="event-inspector-alert"
          value={draft.alertOffset}
          onChange={(offset) => update({ alertOffset: offset })}
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
