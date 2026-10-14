"use client";

import { Button } from "@/components/ui/button";
import type { ClosedAlertsControl } from "@/hooks/useClosedAlerts";
import { cn } from "@/lib/utils";

/** The settings switch for alerts that arrive when no Kalend tab is open. */
export default function ClosedAlertsSetting({ control }: { control: ClosedAlertsControl }) {
  const on = control.status === "on";
  const unavailable = control.status === "unsupported" || control.status === "unconfigured";
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="lg"
        aria-pressed={on}
        aria-label="Alerts when Kalend is closed"
        disabled={control.busy || control.status === "loading" || unavailable}
        onClick={() => void (on ? control.disable() : control.enable())}
        className="mb-2 h-auto w-full justify-start gap-2 whitespace-normal px-3 py-2 text-left text-body"
      >
        <span>Alerts when Kalend is closed</span>
        <span
          aria-hidden="true"
          className={cn(
            "ml-auto flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors",
            on ? "bg-primary" : "bg-foreground/75"
          )}
        >
          <span
            className={cn(
              "size-4 rounded-full bg-white shadow-sm transition-transform",
              on && "translate-x-4"
            )}
          />
        </span>
      </Button>
      {control.message ? <p className="mb-2 text-meta text-muted-foreground">{control.message}</p> : null}
    </>
  );
}
