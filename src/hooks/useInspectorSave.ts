import { useEffect, useState, type FormEvent } from "react";

interface InspectorSaveOptions {
  dirty: boolean;
  /** Why the draft can't be saved yet, or null when it can. */
  invalidReason: string | null;
  /** Resolves false or rejects when the save failed, so the draft stays. */
  persist: () => Promise<boolean>;
  onDirtyChange: (dirty: boolean) => void;
  onProceed: () => void;
  onStay: () => void;
}

/** Save, retry, and unsaved-edits answers shared by the task and event inspectors. */
export function useInspectorSave({
  dirty,
  invalidReason,
  persist,
  onDirtyChange,
  onProceed,
  onStay,
}: InspectorSaveOptions) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  const save = async (): Promise<boolean> => {
    if (invalidReason) {
      setSaveError(invalidReason);
      return false;
    }
    setSaving(true);
    setSaveError(null);
    const ok = await persist().catch(() => false);
    setSaving(false);
    if (!ok) setSaveError("Couldn't save your changes.");
    return ok;
  };

  return {
    saving,
    saveError,
    clearError: () => setSaveError(null),
    handleSubmit: (e: FormEvent) => {
      e.preventDefault();
      if (dirty && !saving) void save();
    },
    saveAndProceed: async () => {
      if (await save()) onProceed();
      else onStay();
    },
  };
}
