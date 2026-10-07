"use client";

import { useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { EVENT_COLOR_SWATCH_CLASSES } from "@/lib/event-colors";
import { MAX_GROUP_NAME_LENGTH } from "@/lib/group-name";
import { subjectKey, type PanelSubject } from "@/lib/panel-subject";
import { ICON_BUTTON_CLS } from "./InspectorParts";

interface SpacePanelHeaderProps {
  subject: PanelSubject;
  onClose: () => void;
  /** Saves a new name for the Space or Group. Resolves false when the save failed. */
  onRename: (name: string) => Promise<boolean>;
  /** Rendered under the title, inside the header (the Group chips). */
  children?: ReactNode;
}

const TITLE_CLS = "min-w-0 flex-1 truncate text-[20px] font-semibold tracking-tight text-foreground";

export default function SpacePanelHeader({ subject, onClose, onRename, children }: SpacePanelHeaderProps) {
  // null while the title is showing; the typed name while it is being edited.
  const [draft, setDraft] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  // Enter saves and then the input blurs, which would save a second time.
  const saving = useRef(false);

  // A half-typed name belongs to the Space it was typed for, so drop it when
  // the panel switches to another Space or Group.
  const key = subjectKey(subject);
  const [renderedKey, setRenderedKey] = useState(key);
  if (renderedKey !== key) {
    setRenderedKey(key);
    setDraft(null);
    setFailed(false);
  }

  const stopEditing = () => {
    setDraft(null);
    setFailed(false);
  };

  async function commit() {
    if (draft === null || saving.current) return;
    const name = draft.trim();
    if (!name || name === subject.name) return stopEditing();
    saving.current = true;
    const saved = await onRename(name);
    saving.current = false;
    if (saved) stopEditing();
    else setFailed(true);
  }

  return (
    <header className="border-b border-border px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11.5px] text-muted-foreground">{subject.kind === "group" ? subject.spaceName : "Space"}</p>
        <button type="button" aria-label="Close panel" onClick={onClose} className={ICON_BUTTON_CLS}>
          <X className="size-4" />
        </button>
      </div>

      <div className="mt-1.5 flex items-center gap-2">
        <span
          aria-hidden="true"
          className={cn("size-[10px] shrink-0 rounded-[3px]", EVENT_COLOR_SWATCH_CLASSES[subject.color])}
        />
        {draft === null ? (
          <h2 className="min-w-0 flex-1">
            <button
              type="button"
              aria-label={`Rename ${subject.name}`}
              title="Click to rename"
              onClick={() => setDraft(subject.name)}
              className={cn(
                TITLE_CLS,
                "block w-full cursor-text rounded-md text-left transition-colors hover:text-foreground/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/60"
              )}
            >
              {subject.name}
            </button>
          </h2>
        ) : (
          <input
            autoFocus
            onFocus={(e) => e.currentTarget.select()}
            aria-label={`${subject.name} name`}
            aria-invalid={failed || undefined}
            value={draft}
            maxLength={MAX_GROUP_NAME_LENGTH}
            onChange={(e) => {
              setDraft(e.target.value);
              setFailed(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void commit();
              } else if (e.key === "Escape") {
                // Keep PanelShell from also closing the whole panel.
                e.stopPropagation();
                stopEditing();
              }
            }}
            onBlur={() => void commit()}
            className={cn(
              TITLE_CLS,
              "-mx-1 h-[30px] rounded-md border border-foreground/30 bg-transparent px-1 outline-none"
            )}
          />
        )}
      </div>
      {failed && (
        <p role="alert" className="mt-1 text-[11.5px] text-destructive">
          Couldn&apos;t rename. Try again.
        </p>
      )}
      {children}
    </header>
  );
}
