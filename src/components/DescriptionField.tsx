"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { descriptionProblem } from "@/lib/description";
import { APP_INPUT_CLS } from "./DateField";
import { FIELD_LABEL_CLS } from "./InspectorParts";

interface DescriptionFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/** An optional description. Empty and not being edited, it is a single
 *  "Add description" button instead of an empty box. It stays a box once
 *  opened, so clearing the text while typing doesn't make it vanish. */
export default function DescriptionField({ id, value, onChange, className }: DescriptionFieldProps) {
  const [open, setOpen] = useState(value !== "");
  const [focusOnOpen, setFocusOnOpen] = useState(false);
  const problem = descriptionProblem(value);

  if (!open && value === "") {
    return (
      <button
        type="button"
        onClick={() => {
          setFocusOnOpen(true);
          setOpen(true);
        }}
        className={cn(
          "flex w-fit items-center gap-1 rounded-md text-[12px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className
        )}
      >
        <Plus className="size-3.5" />
        Add description
      </button>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className={FIELD_LABEL_CLS}>
        Description
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={focusOnOpen}
        rows={3}
        aria-invalid={problem !== null || undefined}
        aria-describedby={problem ? `${id}-problem` : undefined}
        className={cn(APP_INPUT_CLS, "min-h-20 w-full resize-y focus-visible:ring-2 focus-visible:ring-ring")}
      />
      {problem && (
        <p id={`${id}-problem`} className="text-[12px] text-destructive">
          {problem}
        </p>
      )}
    </div>
  );
}
