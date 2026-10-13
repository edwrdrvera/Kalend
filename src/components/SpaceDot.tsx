import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { EVENT_COLOR_SWATCH_CLASSES, isEventColor } from "@/lib/event-colors";

interface SpaceDotProps {
  /** A Space color name. Anything else falls back to a neutral dot. */
  color: string | null | undefined;
  /** An overdue item shows an alert icon in the dot's place, so lateness is not color alone. */
  overdue?: boolean;
  className?: string;
}

/** The 6px Space color marker used on task rows, task chips, the rail and the
 *  mobile Spaces bar. The overdue icon is drawn over the same 6px footprint so
 *  swapping it in never changes the row's width. */
export default function SpaceDot({ color, overdue = false, className }: SpaceDotProps) {
  if (overdue) {
    return (
      <span aria-hidden="true" className={cn("relative size-1.5 shrink-0", className)}>
        <TriangleAlert
          className="absolute top-1/2 left-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 text-destructive"
          strokeWidth={2.5}
        />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        "size-1.5 shrink-0 rounded-[2px]",
        isEventColor(color) ? EVENT_COLOR_SWATCH_CLASSES[color] : "bg-muted-foreground/70",
        className
      )}
    />
  );
}
