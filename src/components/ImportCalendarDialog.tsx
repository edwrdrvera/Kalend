"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ICS_TOO_LARGE_MESSAGE, MAX_ICS_BYTES } from "@/lib/ics-limits";

interface ImportCalendarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy: boolean;
  error: string | null;
  result: string | null;
  onFile: (file: File) => void;
}

export default function ImportCalendarDialog({
  open,
  onOpenChange,
  busy,
  error,
  result,
  onFile,
}: ImportCalendarDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Import calendar</DialogTitle>
          <DialogDescription>
            Choose an .ics file from Canvas, Google, Outlook, or Apple Calendar.
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <ImportCalendarForm busy={busy} error={error} result={result} onFile={onFile} onClose={() => onOpenChange(false)} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ImportCalendarForm({
  busy,
  error,
  result,
  onFile,
  onClose,
}: {
  busy: boolean;
  error: string | null;
  result: string | null;
  onFile: (file: File) => void;
  onClose: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  function chooseFile(next: File | null) {
    setFile(next);
    setLocalError(next && next.size > MAX_ICS_BYTES ? ICS_TOO_LARGE_MESSAGE : null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || busy || file.size > MAX_ICS_BYTES) return;
    onFile(file);
  }

  const shownError = localError ?? error;
  const tooLarge = file !== null && file.size > MAX_ICS_BYTES;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
      <input
        type="file"
        accept=".ics,text/calendar"
        aria-label="Calendar file"
        disabled={busy}
        onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
        className="text-sm file:mr-2 file:rounded-md file:border-0 file:bg-muted file:px-2 file:py-1 file:text-sm"
      />
      {shownError ? <p className="text-xs text-destructive">{shownError}</p> : null}
      {result ? <p className="text-xs">{result}</p> : null}
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={!file || busy || tooLarge}>
          {busy && <Loader2 className="animate-spin" />}
          {busy ? "Importing..." : "Import"}
        </Button>
      </div>
    </form>
  );
}
