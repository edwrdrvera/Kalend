"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { descriptionProblem } from "@/lib/description";
import { APP_INPUT_CLS } from "./DateField";
import { FIELD_LABEL_CLS } from "./InspectorParts";
import NotesView from "./NotesView";

interface DescriptionFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  /** What the box is called, e.g. "Notes". */
  label?: string;
  /** Show bold, bullets, and links as formatted until the user clicks to edit. */
  formatted?: boolean;
}

/** The labeled description box, with the too-long message under it. */
export function DescriptionTextarea({
  id,
  value,
  onChange,
  autoFocus,
  className,
  label = "Description",
  onBlur,
}: DescriptionFieldProps & { autoFocus?: boolean; onBlur?: () => void }) {
  const problem = descriptionProblem(value);
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className={FIELD_LABEL_CLS}>
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        onBlur={onBlur}
        rows={3}
        aria-invalid={problem !== null || undefined}
        aria-describedby={problem ? `${id}-problem` : undefined}
        className={cn(APP_INPUT_CLS, "min-h-20 w-full resize-y px-3 py-2 leading-relaxed focus-visible:ring-2 focus-visible:ring-ring")}
      />
      {problem && (
        <p id={`${id}-problem`} className="text-[12px] text-destructive">
          {problem}
        </p>
      )}
    </div>
  );
}

export const ADD_DESCRIPTION_CLS =
  "flex w-fit items-center gap-1 rounded-md text-[12px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** An optional description. Empty and not being edited, it is a single
 *  "Add description" button instead of an empty box. It stays a box once
 *  opened, so clearing the text while typing doesn't make it vanish. */
export default function DescriptionField({
  id,
  value,
  onChange,
  className,
  label = "Description",
  formatted = false,
}: DescriptionFieldProps) {
  const [open, setOpen] = useState(value !== "");
  const [editing, setEditing] = useState(false);
  const [focusOnOpen, setFocusOnOpen] = useState(false);

  if (!open && value === "") {
    return (
      <button
        type="button"
        onClick={() => {
          setFocusOnOpen(true);
          setOpen(true);
          setEditing(true);
        }}
        className={cn(ADD_DESCRIPTION_CLS, className)}
      >
        <Plus className="size-3.5" />
        Add {label.toLowerCase()}
      </button>
    );
  }

  if (formatted && !editing && value !== "") {
    const startEditing = () => {
      setFocusOnOpen(true);
      setEditing(true);
    };
    return (
      <div className={cn("flex flex-col gap-1.5", className)}>
        <span id={`${id}-label`} className={FIELD_LABEL_CLS}>
          {label}
        </span>
        <div
          role="button"
          tabIndex={0}
          aria-labelledby={`${id}-label`}
          title="Click to edit"
          onClick={(e) => {
            if (!(e.target as HTMLElement).closest("a")) startEditing();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.target === e.currentTarget) startEditing();
          }}
          className="cursor-text rounded-sm border border-transparent px-3 py-2 text-[13px] leading-relaxed text-foreground outline-none transition-colors hover:border-input focus-visible:ring-2 focus-visible:ring-ring"
        >
          <NotesView value={value} />
        </div>
      </div>
    );
  }

  return (
    <DescriptionTextarea
      id={id}
      value={value}
      onChange={onChange}
      autoFocus={focusOnOpen}
      className={className}
      label={label}
      onBlur={formatted ? () => setEditing(false) : undefined}
    />
  );
}
