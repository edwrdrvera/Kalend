"use client";

import { ALERT_OFFSETS, OFFSET_LABEL, isAlertOffset, type AlertOffset } from "@/lib/alerts";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FIELD_LABEL_CLS } from "./InspectorParts";

const NONE = "none";
const ITEMS = [
  { value: NONE, label: "None" },
  ...ALERT_OFFSETS.map((offset) => ({ value: String(offset), label: OFFSET_LABEL[offset] })),
];

interface AlertFieldProps {
  id: string;
  value: AlertOffset | null;
  onChange: (offset: AlertOffset | null) => void;
  /** Why the choice is turned off, or null when it is available. */
  disabledReason?: string | null;
  /** For a label/value row that supplies its own visible label. */
  inline?: boolean;
}

/** The "Alert" choice shared by the event and task inspectors. */
export default function AlertField({ id, value, onChange, disabledReason = null, inline = false }: AlertFieldProps) {
  const noteId = `${id}-note`;
  return (
    <div className="flex w-full flex-col gap-1.5">
      <Label htmlFor={id} className={inline ? "sr-only" : FIELD_LABEL_CLS}>
        Alert
      </Label>
      <Select
        items={ITEMS}
        value={value === null ? NONE : String(value)}
        disabled={disabledReason !== null}
        onValueChange={(next) => {
          const offset = Number(next);
          onChange(next !== NONE && isAlertOffset(offset) ? offset : null);
        }}
      >
        <SelectTrigger
          id={id}
          aria-describedby={disabledReason ? noteId : undefined}
          size="sm"
          className="w-full text-[13px]"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          <SelectGroup>
            <SelectLabel>Alert</SelectLabel>
            {ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value} className="text-[13px]">
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {disabledReason && (
        <p id={noteId} className="text-[12px] text-muted-foreground">
          {disabledReason}
        </p>
      )}
    </div>
  );
}
