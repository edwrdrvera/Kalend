"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { descriptionProblem, isDescriptionDirty, normalizeDescription } from "@/lib/description";
import { useInspectorSave } from "@/hooks/useInspectorSave";
import { ADD_DESCRIPTION_CLS, DescriptionTextarea } from "./DescriptionField";
import { UnsavedChangesPrompt } from "./InspectorParts";

interface SpacePanelDescriptionProps {
  /** The saved description. Null renders only an "Add description" button. */
  description: string | null;
  /** Resolves false when the save failed, so the draft stays. */
  onSave: (description: string | null) => Promise<boolean>;
  onDirtyChange: (dirty: boolean) => void;
  /** A navigation is waiting on the user's Save / Discard / Stay answer. */
  navigationPending: boolean;
  onProceed: () => void;
  onStay: () => void;
}

/** A Space's description in its overview. Read-only until Edit or Add is
 *  clicked, and absent when empty. Mount it with `key={spaceId}` so each
 *  Space starts with no edit open. */
export default function SpacePanelDescription({
  description,
  onSave,
  onDirtyChange,
  navigationPending,
  onProceed,
  onStay,
}: SpacePanelDescriptionProps) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const dirty = editing && isDescriptionDirty(description, text);
  const { saving, saveError, clearError, handleSubmit, saveAndProceed } = useInspectorSave({
    dirty,
    invalidReason: descriptionProblem(text),
    persist: async () => {
      const saved = await onSave(normalizeDescription(text));
      if (saved) setEditing(false);
      return saved;
    },
    onDirtyChange,
    onProceed,
    onStay,
  });

  const startEditing = () => {
    setText(description ?? "");
    setEditing(true);
  };
  const cancel = () => {
    setEditing(false);
    clearError();
  };

  if (!editing) {
    return description ? (
      <div className="flex flex-col items-start gap-1.5 px-4 py-3">
        <p className="whitespace-pre-wrap break-words text-body leading-relaxed text-foreground/75">{description}</p>
        <button type="button" onClick={startEditing} className={ADD_DESCRIPTION_CLS}>
          <Pencil className="size-3" />
          Edit description
        </button>
      </div>
    ) : (
      <div className="px-4 py-3">
        <button type="button" onClick={startEditing} className={ADD_DESCRIPTION_CLS}>
          <Plus className="size-3" />
          Add description
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      {navigationPending && dirty && (
        <UnsavedChangesPrompt
          noun="Space description"
          saving={saving}
          onSave={saveAndProceed}
          onDiscard={onProceed}
          onStay={onStay}
        />
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <DescriptionTextarea
          id="space-description"
          value={text}
          onChange={(value) => {
            setText(value);
            clearError();
          }}
          autoFocus
        />
        {saveError && (
          <p role="alert" className="text-xs leading-normal text-destructive">
            {saveError}
          </p>
        )}
        <div className="flex items-center justify-end gap-1.5">
          <Button type="button" variant="outline" size="sm" onClick={cancel}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={!dirty || saving}>
            {saving ? "Saving…" : saveError ? "Retry" : "Save"}
          </Button>
        </div>
      </form>
    </div>
  );
}
