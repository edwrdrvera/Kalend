"use client";

import { ALERT_OFFSETS, OFFSET_LABEL, isAlertOffset, type AlertOffset } from "@/lib/alerts";
import { cn } from "@/lib/utils";
import { APP_INPUT_CLS } from "./DateField";
import { FIELD_LABEL_CLS } from "./InspectorParts";

interface AlertFieldProps {
  id: string;
  value: AlertOffset | null;
  onChange: (offset: AlertOffset | null) => void;
  /** Why the choice is turned off, or null when it is available. */
  disabledReason?: string | null;
  /** Borderless select for a label/value row that supplies its own visible label. */
  inline?: boolean;
}

/** The "Alert" choice shared by the event and task inspectors. */
export default function AlertField({ id, value, onChange, disabledReason = null, inline = false }: AlertFieldProps) {
  const noteId = `${id}-note`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={inline ? "sr-only" : FIELD_LABEL_CLS}>
        Alert
      </label>
      <select
        id={id}
        value={value === null ? "" : String(value)}
        disabled={disabledReason !== null}
        aria-describedby={disabledReason ? noteId : undefined}
        onChange={(e) => {
          const next = Number(e.target.value);
          onChange(e.target.value !== "" && isAlertOffset(next) ? next : null);
        }}
        className={cn(
          APP_INPUT_CLS,
          "w-full cursor-pointer focus-ring disabled:cursor-not-allowed",
          inline && "h-7 rounded-md border-transparent bg-transparent pl-1 pr-2 text-xs hover:bg-hover"
        )}
      >
        <option value="">None</option>
        {ALERT_OFFSETS.map((offset) => (
          <option key={offset} value={offset}>
            {OFFSET_LABEL[offset]}
          </option>
        ))}
      </select>
      {disabledReason && (
        <p id={noteId} className="text-[12px] text-muted-foreground">
          {disabledReason}
        </p>
      )}
    </div>
  );
}
