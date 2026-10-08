"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import type { AlertKind } from "@/lib/alerts";
import type { AlertTray } from "@/lib/alert-tray";

export const ALERT_AUTO_DISMISS_MS = 10_000;

interface AlertMessagesProps {
  tray: AlertTray;
  onOpen: (kind: AlertKind, itemId: string) => void;
  onDismiss: (id: string) => void;
  onClearMissed: () => void;
}

const dismissButton =
  "grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring";

// The timer stops while the pointer or keyboard focus is on the message, so
// nobody loses a reminder they are still reading.
function DueMessage({
  message,
  onOpen,
  onDismiss,
}: {
  message: { id: string; text: string };
  /** Absent for a notice, which has nothing to open. */
  onOpen?: () => void;
  onDismiss: AlertMessagesProps["onDismiss"];
}) {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(() => onDismiss(message.id), ALERT_AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [paused, message.id, onDismiss]);

  return (
    <li
      className="pointer-events-auto flex items-center gap-2 rounded-lg bg-muted px-3 py-2.5 text-sm text-foreground shadow-lg ring-1 ring-border"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={(event) => {
        if (event.key === "Escape") onDismiss(message.id);
      }}
    >
      <Bell className="size-4 shrink-0 text-primary-text" aria-hidden />
      {onOpen ? (
        <button
          type="button"
          onClick={() => {
            onOpen();
            onDismiss(message.id);
          }}
          className="min-w-0 flex-1 text-left font-medium hover:underline focus-visible:outline-2 focus-visible:outline-ring"
        >
          {message.text}
        </button>
      ) : (
        <span className="min-w-0 flex-1 font-medium">{message.text}</span>
      )}
      <button
        type="button"
        onClick={() => onDismiss(message.id)}
        aria-label={`Dismiss: ${message.text}`}
        className={dismissButton}
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </li>
  );
}

/**
 * Reminder messages for the calendar. The wrapper is always mounted so screen
 * readers announce messages as they arrive. A due reminder is a button that
 * opens its event or task, and clears itself after a few seconds. Reminders
 * missed while the app was closed share one list that stays until dismissed.
 */
export default function AlertMessages({ tray, onOpen, onDismiss, onClearMissed }: AlertMessagesProps) {
  return (
    <div
      role="region"
      aria-label="Reminders"
      aria-live="polite"
      aria-relevant="additions text"
      className="pointer-events-none absolute inset-x-4 bottom-4 z-[60] flex flex-col items-end gap-2 sm:left-auto sm:w-96"
    >
      {tray.missed.length > 0 && (
        <section
          aria-label="Missed reminders"
          className="pointer-events-auto w-full rounded-lg bg-muted p-3 text-sm text-foreground shadow-lg ring-1 ring-border"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[13px] font-semibold">Missed while you were away</h2>
            <button
              type="button"
              onClick={onClearMissed}
              className="text-[13px] font-medium text-primary-text transition-colors hover:text-primary-text/80 focus-visible:outline-2 focus-visible:outline-ring"
            >
              Dismiss all
            </button>
          </div>
          <ul className="mt-2 flex flex-col gap-1">
            {tray.missed.map((message) => (
              <li key={message.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onOpen(message.kind, message.itemId);
                    onDismiss(message.id);
                  }}
                  className="min-w-0 flex-1 truncate rounded text-left hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {message.text}
                </button>
                <button
                  type="button"
                  onClick={() => onDismiss(message.id)}
                  aria-label={`Dismiss: ${message.text}`}
                  className={dismissButton}
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {tray.due.length + tray.notices.length > 0 && (
        <ul className="flex w-full flex-col gap-2">
          {tray.due.map((message) => (
            <DueMessage
              key={message.id}
              message={message}
              onOpen={() => onOpen(message.kind, message.itemId)}
              onDismiss={onDismiss}
            />
          ))}
          {tray.notices.map((notice) => (
            <DueMessage key={notice.id} message={notice} onDismiss={onDismiss} />
          ))}
        </ul>
      )}
    </div>
  );
}
