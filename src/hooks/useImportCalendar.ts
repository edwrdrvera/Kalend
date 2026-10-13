"use client";

import { useState } from "react";
import { ICS_TOO_LARGE_MESSAGE, MAX_ICS_BYTES } from "@/lib/ics-limits";

export interface ImportCalendarCounts {
  imported: number;
  updated: number;
  unchanged: number;
  skipped: number;
}

export function importResultLine(counts: ImportCalendarCounts): string {
  return `Imported ${counts.imported} events, updated ${counts.updated}, skipped ${counts.skipped}`;
}

export function useImportCalendar(onImported: () => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function importFile(file: File) {
    if (file.size > MAX_ICS_BYTES) {
      setError(ICS_TOO_LARGE_MESSAGE);
      setResult(null);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const response = await fetch(`/api/events/import?tz=${encodeURIComponent(tz)}`, {
        method: "POST",
        headers: { "Content-Type": "text/calendar" },
        body: await file.text(),
      });
      const json = await response.json() as { success?: boolean; data?: ImportCalendarCounts; error?: string };
      if (!response.ok || !json.success || !json.data) {
        throw new Error(json.error ?? "Could not import that calendar");
      }
      setResult(importResultLine(json.data));
      onImported();
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Could not import that calendar");
    } finally {
      setBusy(false);
    }
  }

  return { busy, error, result, importFile };
}
