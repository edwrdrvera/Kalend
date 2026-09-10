"use client";

import { useRef, useState, type FormEvent, type FocusEvent } from "react";
import {
  Check,
  Ellipsis,
  Layers3,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DEFAULT_EVENT_COLOR,
  EVENT_COLOR_SWATCH_CLASSES,
  isEventColor,
  type EventColor,
} from "@/lib/event-colors";
import ColorSwatchPicker from "./ColorSwatchPicker";
import { APP_INPUT_CLS } from "./DateField";
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
  const [actionsOpen, setActionsOpen] = useState(false);
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

  const startEditing = () => {
    setActionsOpen(false);
    setEditing(true);
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
      setActionsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete Space");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className={cn(
        "group flex min-h-9 flex-wrap items-center gap-1 rounded-lg px-1 transition-colors hover:bg-muted/60",
        selected && "bg-muted"
      )}
    >
      <button
        type="button"
        onClick={onToggleVisibility}
        aria-label={`${visible ? "Hide" : "Show"} ${category.name} on calendar`}
        aria-pressed={visible}
        className={cn(
          "grid size-7 shrink-0 place-items-center rounded-md outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
          visible ? "opacity-100" : "opacity-30 grayscale"
        )}
      >
        <span className={cn("size-3 rounded-[3px]", EVENT_COLOR_SWATCH_CLASSES[color])} />
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
          className={cn(APP_INPUT_CLS, "min-w-0 flex-1 font-medium")}
        />
      ) : (
        <button
          type="button"
          onClick={onSelect}
          aria-current={selected ? "true" : undefined}
          className={cn(
            "min-w-0 flex-1 self-stretch rounded-md px-1.5 text-left text-xs font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring",
            !visible && "text-muted-foreground line-through",
            selected && "font-semibold"
          )}
        >
          <span className="block truncate">{category.name}</span>
        </button>
      )}

      {editing ? (
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={saveName}
            aria-label={`Save ${category.name}`}
            className="grid size-8 place-items-center rounded-lg text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Check className="size-4" />
          </button>
          <button
            type="button"
            onClick={cancelEdit}
            aria-label={`Cancel renaming ${category.name}`}
            className="grid size-8 place-items-center rounded-lg text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <Popover open={actionsOpen} onOpenChange={setActionsOpen}>
          <PopoverTrigger
            aria-label={`More actions for ${category.name}`}
            className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 data-[popup-open]:opacity-100 data-[popup-open]:bg-muted data-[popup-open]:text-foreground"
          >
            <Ellipsis className="size-4" />
          </PopoverTrigger>
          <PopoverContent align="end" className="w-48 gap-1 p-1.5">
            <button
              type="button"
              onClick={startEditing}
              aria-label={`Rename ${category.name}`}
              className="flex min-h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm outline-none hover:bg-muted focus-visible:bg-muted"
            >
              <Pencil className="size-3.5 text-muted-foreground" />
              Rename
            </button>
            <div className="flex min-h-9 items-center justify-between gap-2 rounded-md px-2 text-sm">
              <span>Color</span>
              <ColorSwatchPicker
                color={color}
                onColorChange={(nextColor) => {
                  onUpdateCategory({ color: nextColor });
                  setActionsOpen(false);
                }}
                className="size-5 rounded-[5px]"
              />
            </div>
            <div className="my-0.5 border-t border-border" />
            <button
              type="button"
              onClick={deleteSpace}
              disabled={deleting}
              aria-label={`Delete ${category.name}`}
              className="flex min-h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm text-destructive outline-none hover:bg-destructive/10 focus-visible:bg-destructive/10 disabled:opacity-40"
            >
              {deleting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Trash2 className="size-3.5" />
              )}
              Delete
            </button>
          </PopoverContent>
        </Popover>
      )}

      {error && <p className="w-full px-11 pb-2 text-xs text-destructive">{error}</p>}
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
  const formRef = useRef<HTMLFormElement>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState<EventColor>(DEFAULT_EVENT_COLOR);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close the form when focus leaves it entirely, but only if the user
  // hasn't started typing (don't discard their work).
  const handleBlur = (e: FocusEvent) => {
    if (name.trim() || submitting) return;
    const next = e.relatedTarget as Node | null;
    if (next && formRef.current?.contains(next)) return;
    close();
  };

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
    <form ref={formRef} onSubmit={handleSubmit} onBlur={handleBlur} className="flex flex-col gap-1.5 border-y border-border py-1.5">
      <div className="flex min-h-9 items-center gap-1">
        <ColorSwatchPicker
          color={color}
          onColorChange={setColor}
          className="mx-1.5 size-3 rounded-[3px] ring-offset-muted"
        />
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => event.key === "Escape" && close()}
          placeholder="Space name"
          aria-label="New Space name"
          autoFocus
          className={cn(APP_INPUT_CLS, "min-w-0 flex-1")}
        />
        <button
          type="submit"
          disabled={!name.trim() || submitting}
          aria-label="Add Space"
          className="grid size-7 shrink-0 place-items-center rounded-sm text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
        >
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
        </button>
        <button
          type="button"
          onClick={close}
          aria-label="Cancel"
          className="grid size-7 shrink-0 place-items-center rounded-sm text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-4" />
        </button>
      </div>

      {error && <p className="px-11 text-xs text-destructive">{error}</p>}
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
    <div className="flex flex-col px-4 pb-2 pt-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-foreground">Spaces</h2>
        <button
          type="button"
          onClick={() => setCreating((current) => !current)}
          aria-label={creating ? "Cancel creating Space" : "Create a Space"}
          aria-expanded={creating}
          className="grid size-7 place-items-center rounded-md text-foreground hover:bg-muted"
        >
          {creating ? <X className="size-4" /> : <Plus className="size-4" />}
        </button>
      </div>

      <div className="mt-1.5 flex flex-col gap-1">
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
                "flex min-h-9 items-center gap-1 rounded-lg px-1 text-left text-xs font-medium text-foreground outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring",
                selectedSpaceId === null && "bg-muted font-semibold"
              )}
            >
              <span className="grid size-7 shrink-0 place-items-center text-muted-foreground">
                <Layers3 className="size-3.5" />
              </span>
              <span className="px-1.5">All Spaces</span>
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
