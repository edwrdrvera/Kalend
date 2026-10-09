"use client";

import type { MouseEvent } from "react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

interface TaskCheckboxProps {
  title: string;
  /** Lets a `<Label htmlFor>` toggle the box. */
  id?: string;
  checked: boolean;
  onToggle: () => void;
  /** Late tasks draw the box in the destructive color. */
  overdue?: boolean;
  onClick?: (e: MouseEvent<HTMLElement>) => void;
  className?: string;
}

/** The one task checkbox: a 14px box, muted fill when done, with a 24px hit
 *  area. The unchecked border is the solid muted-foreground token, which
 *  scripts/contrast-check.ts holds to 3:1 against the card. */
export default function TaskCheckbox({ title, id, checked, onToggle, overdue, onClick, className }: TaskCheckboxProps) {
  return (
    <Checkbox
      id={id}
      checked={checked}
      onCheckedChange={onToggle}
      onClick={onClick}
      aria-label={checked ? `Mark ${title} as not done` : `Mark ${title} as done`}
      className={cn(
        "size-3.5 rounded-[3px] border-muted-foreground after:-inset-1.5 data-checked:border-muted-foreground data-checked:bg-muted-foreground data-checked:text-background dark:data-checked:bg-muted-foreground",
        overdue && "border-destructive",
        className
      )}
    />
  );
}
