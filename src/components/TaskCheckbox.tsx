"use client";

import type { MouseEvent } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskCheckboxProps {
  title: string;
  /** Lets a `<Label htmlFor>` toggle the box. */
  id?: string;
  checked: boolean;
  onToggle: () => void;
  overdue?: boolean;
  onClick?: (e: MouseEvent<HTMLElement>) => void;
  className?: string;
}

/** The one task checkbox: a 14px box in the library checkbox look, muted fill
 *  when done, with a 24px hit area. The unchecked border is the solid
 *  muted-foreground token, which scripts/contrast-check.ts holds to 3:1 against
 *  the card. A plain button, not `ui/checkbox`: Base UI's checkbox added about
 *  40 ms to opening a 30-task list (measured on a production build). */
export default function TaskCheckbox({ title, id, checked, onToggle, overdue, onClick, className }: TaskCheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      id={id}
      aria-checked={checked}
      onClick={(e) => {
        onClick?.(e);
        onToggle();
      }}
      aria-label={checked ? `Mark ${title} as not done` : `Mark ${title} as done`}
      className={cn(
        "relative flex size-3.5 shrink-0 items-center justify-center rounded-[3px] border border-muted-foreground transition-colors outline-none after:absolute after:-inset-1.5 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30",
        checked && "bg-muted-foreground text-background dark:bg-muted-foreground",
        overdue && "border-destructive",
        className
      )}
    >
      {checked && <Check className="size-3.5" />}
    </button>
  );
}
