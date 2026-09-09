"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEFAULT_EVENT_COLOR,
  EVENT_COLOR_SWATCH_CLASSES,
  isEventColor,
  type EventColor,
} from "@/lib/event-colors";
import ColorSwatchPicker from "./ColorSwatchPicker";
import type { CalendarCategory } from "@/lib/calendar-types";

interface CategoryManagerProps {
  categories: CalendarCategory[];
  loading: boolean;
  selectedSpaceId: string | null;
  onSelectSpace: (spaceId: string | null) => void;
  hiddenCategoryIds: string[];
  onToggleCategoryVisibility: (categoryId: string) => void;
  onCreateCategory: (name: string, color: string) => Promise<void>;
  onUpdateCategory: (
    category: CalendarCategory,
    updates: { name?: string; color?: string }
  ) => void;
  onDeleteCategory: (category: CalendarCategory) => Promise<void>;
}

function CategoryRow({
  category,
  selected,
  visible,
  onSelect,
  onToggleVisibility,
  onUpdateCategory,
  onDeleteCategory,
}: {
  category: CalendarCategory;
  selected: boolean;
  visible: boolean;
  onSelect: () => void;
  onToggleVisibility: () => void;
  onUpdateCategory: (updates: { name?: string; color?: string }) => void;
  onDeleteCategory: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const color: EventColor = isEventColor(category.color) ? category.color : DEFAULT_EVENT_COLOR;

  const cancelEdit = () => {
    setName(category.name);
    setEditing(false);
  };

  const saveName = () => {
    const trimmed = name.trim();
    if (!trimmed) return cancelEdit();
    if (trimmed !== category.name) onUpdateCategory({ name: trimmed });
    setEditing(false);
  };

  const deleteSpace = async () => {
    if (
      deleting ||
      !window.confirm(`Delete ${category.name}? Its Events and Tasks will remain and become unassigned.`)
    )
      return;

    setDeleting(true);
    setError(null);

    // useCategories reports delete failures through its own error state rather
    // than rejecting, so the busy flag has to clear on both paths or a failed
    // delete leaves the row disabled with no way to retry.
    try {
      await onDeleteCategory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete Space");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={cn("group flex flex-wrap items-center gap-1 rounded-lg px-1 py-1", selected && "bg-primary/10")}>
      <button
        type="button"
        onClick={onToggleVisibility}
        aria-label={`${visible ? "Hide" : "Show"} ${category.name} on calendar`}
        aria-pressed={visible}
        className={cn(
          "grid size-7 shrink-0 place-items-center rounded-md hover:bg-muted",
          visible ? "opacity-100" : "opacity-30 grayscale"
        )}
      >
        <span className={cn("size-3 rounded-[4px]", EVENT_COLOR_SWATCH_CLASSES[color])} />
      </button>

      {editing ? (
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") saveName();
            if (event.key === "Escape") cancelEdit();
          }}
          aria-label="Space name"
          autoFocus
          className="h-7 min-w-0 flex-1 rounded border border-input bg-background px-1.5 text-sm font-medium text-foreground outline-none focus:border-primary"
        />
      ) : (
        <button
          type="button"
          onClick={onSelect}
          aria-current={selected ? "true" : undefined}
          className={cn(
            "min-w-0 flex-1 rounded-md px-1.5 py-1 text-left text-sm font-medium text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
            !visible && "text-muted-foreground line-through",
            selected && "font-semibold"
          )}
        >
          <span className="block truncate">{category.name}</span>
        </button>
      )}

      {!editing && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={`Rename ${category.name}`}
          className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Pencil className="size-3.5" />
        </button>
      )}

      <ColorSwatchPicker
        color={color}
        onColorChange={(nextColor) => onUpdateCategory({ color: nextColor })}
        className="size-5"
      />

      <button
        type="button"
        onClick={deleteSpace}
        disabled={deleting}
        aria-label={`Delete ${category.name}`}
        className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive disabled:opacity-40"
      >
        {deleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
      </button>

      {error && <p className="w-full px-8 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function CreateCategoryForm({
  open,
  onClose,
  onCreateCategory,
}: {
  open: boolean;
  onClose: () => void;
  onCreateCategory: (name: string, color: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<EventColor>(DEFAULT_EVENT_COLOR);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    onClose();
    setName("");
    setColor(DEFAULT_EVENT_COLOR);
    setError(null);
    setSubmitting(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      await onCreateCategory(name.trim(), color);
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create Space");
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <ColorSwatchPicker color={color} onColorChange={setColor} className="size-6" />
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => event.key === "Escape" && close()}
          placeholder="Space name"
          aria-label="New Space name"
          autoFocus
          className="h-7 flex-1 rounded border border-input bg-transparent px-1.5 text-xs text-foreground outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={!name.trim() || submitting}
          aria-label="Add Space"
          className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
        >
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
        </button>
        <button
          type="button"
          onClick={close}
          aria-label="Cancel"
          className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}

export default function CategoryManager({
  categories,
  loading,
  selectedSpaceId,
  onSelectSpace,
  hiddenCategoryIds,
  onToggleCategoryVisibility,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
}: CategoryManagerProps) {
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex flex-col px-4 pb-3 pt-2">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold tracking-[-0.035em] text-foreground">Spaces</h2>
        <button
          type="button"
          onClick={() => setCreating((current) => !current)}
          aria-label={creating ? "Cancel creating Space" : "Create a Space"}
          aria-expanded={creating}
          className="grid size-8 place-items-center rounded-lg text-foreground hover:bg-muted"
        >
          {creating ? <X className="size-5" /> : <Plus className="size-5" />}
        </button>
      </div>

      <div className="mt-2 flex flex-col gap-1.5">
        <CreateCategoryForm
          open={creating}
          onClose={() => setCreating(false)}
          onCreateCategory={onCreateCategory}
        />

        {loading ? (
          <p className="text-xs text-muted-foreground">Loading Spaces…</p>
        ) : (
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => onSelectSpace(null)}
              aria-current={selectedSpaceId === null ? "true" : undefined}
              className={cn(
                "rounded-lg px-2 py-1.5 text-left text-sm font-medium outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
                selectedSpaceId === null && "bg-primary/10 font-semibold text-primary"
              )}
            >
              All Spaces
            </button>
            {categories.map((category) => (
              <CategoryRow
                key={category.id}
                category={category}
                selected={selectedSpaceId === category.id}
                visible={!hiddenCategoryIds.includes(category.id)}
                onSelect={() => onSelectSpace(category.id)}
                onToggleVisibility={() => onToggleCategoryVisibility(category.id)}
                onUpdateCategory={(updates) => onUpdateCategory(category, updates)}
                onDeleteCategory={() => onDeleteCategory(category)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
