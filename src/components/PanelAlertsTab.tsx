"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

// Placeholder: the switch is component state only and no alert list is loaded.
// Per-item alerts still work from each event's and task's own editor.

export default function PanelAlertsTab({ name, kindWord }: { name: string; kindWord: "Space" | "Group" | "view" }) {
  const [notify, setNotify] = useState(true);

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2.5 rounded-xl border border-border px-3 py-2.5">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold">Notify me about {name}</span>
          <span className="block text-[11.5px] text-muted-foreground">
            {notify ? "You get a notification before each one." : `Alerts are off for this ${kindWord.toLowerCase()}.`}
          </span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={notify}
          aria-label={`Notify me about ${name}`}
          onClick={() => setNotify(!notify)}
          className={cn(
            "relative h-5 w-[34px] shrink-0 rounded-full transition-colors duration-200 ease-snappy focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/60",
            notify ? "bg-primary" : "bg-muted-foreground/30"
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow transition-transform duration-200 ease-snappy",
              notify && "translate-x-[14px]"
            )}
          />
        </button>
      </div>
      <div className={cn("transition-opacity duration-200", !notify && "pointer-events-none opacity-45")}>
        <section aria-label="Coming up">
          <h3 className="label-caps mb-1 mt-4">Coming up</h3>
          <p className="text-[13px] text-muted-foreground">No alerts scheduled.</p>
        </section>
      </div>
    </div>
  );
}
