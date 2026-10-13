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
      const parsed = parseImportResponse(await response.json());
      if (!response.ok || !("counts" in parsed)) {
        throw new Error("error" in parsed ? parsed.error : "Could not import that calendar");
      }
      setResult(importResultLine(parsed.counts));
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

const IMPORT_FAILED = "Could not import that calendar";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function countOf(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

export function parseImportResponse(value: unknown): { counts: ImportCalendarCounts } | { error: string } {
  if (!isRecord(value)) return { error: IMPORT_FAILED };
  if (value.success !== true) {
    return { error: typeof value.error === "string" && value.error ? value.error : IMPORT_FAILED };
  }
  if (!isRecord(value.data)) return { error: IMPORT_FAILED };
  const imported = countOf(value.data.imported);
  const updated = countOf(value.data.updated);
  const unchanged = countOf(value.data.unchanged);
  const skipped = countOf(value.data.skipped);
  if (imported === null || updated === null || unchanged === null || skipped === null) return { error: IMPORT_FAILED };
  return { counts: { imported, updated, unchanged, skipped } };
}
