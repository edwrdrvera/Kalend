"use client";

import { useState } from "react";
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
  placeholder,
}: DescriptionFieldProps & { autoFocus?: boolean; onBlur?: () => void; placeholder?: string }) {
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
        placeholder={placeholder}
        rows={3}
        aria-invalid={problem !== null || undefined}
        aria-describedby={problem ? `${id}-problem` : undefined}
        className={cn(APP_INPUT_CLS, "min-h-20 w-full resize-y px-3 py-2 leading-relaxed")}
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
  "flex w-fit items-center gap-1 rounded-md text-[11.5px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/60";

/** A description box that is always shown, empty or not. With `formatted`,
 *  saved text renders as formatted notes until clicked. */
export default function DescriptionField({
  id,
  value,
  onChange,
  className,
  label = "Description",
  formatted = false,
}: DescriptionFieldProps) {
  const [editing, setEditing] = useState(false);
  const [focusOnOpen, setFocusOnOpen] = useState(false);

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
          className="min-h-20 cursor-text rounded-sm border border-input px-3 py-2 text-[13px] leading-relaxed text-foreground outline-none transition-colors hover:border-foreground/20 focus-visible:border-foreground/30"
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
      onChange={(next) => {
        // Typing into the empty box must not flip it to the formatted view.
        setEditing(true);
        onChange(next);
      }}
      autoFocus={focusOnOpen}
      className={className}
      label={label}
      placeholder={`Add ${label.toLowerCase()}`}
      onBlur={formatted ? () => setEditing(false) : undefined}
    />
  );
}
