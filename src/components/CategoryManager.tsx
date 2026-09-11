"use client";

import { useState, type FormEvent } from "react";
import {
  Check,
  Ellipsis,
  Eye,
  EyeOff,
  Layers3,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverBackdrop, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
        "group relative flex min-h-9 flex-wrap items-center gap-1 rounded-lg px-1 transition-colors hover:bg-muted/60 focus-within:bg-muted/40",
        selected && "bg-muted"
      )}
    >
      {selected && (
        <span
          aria-hidden
          className={cn(
            "absolute inset-y-1.5 left-0 w-0.5 rounded-full",
            EVENT_COLOR_SWATCH_CLASSES[color]
          )}
        />
      )}
      <span
        aria-hidden
        className={cn(
          "ml-1.5 size-3 shrink-0 rounded-[4px]",
          EVENT_COLOR_SWATCH_CLASSES[color],
          !visible && "opacity-30 grayscale"
        )}
      />

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
            "min-w-0 flex-1 self-stretch rounded-md px-1.5 text-left text-[13px] font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring",
            !visible && "text-muted-foreground opacity-65",
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
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={onToggleVisibility}
            aria-label={`${visible ? "Hide" : "Show"} ${category.name} on calendar`}
            aria-pressed={visible}
            title={`${visible ? "Hide" : "Show"} ${category.name} on calendar`}
            className={cn(
              "grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 md:focus-visible:opacity-100",
              selected && "md:opacity-100"
            )}
          >
            {visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
          </button>
          <Popover open={actionsOpen} onOpenChange={setActionsOpen}>
            <PopoverTrigger
              aria-label={`More actions for ${category.name}`}
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 md:focus-visible:opacity-100 data-[popup-open]:bg-muted data-[popup-open]:text-foreground data-[popup-open]:opacity-100",
                selected && "md:opacity-100"
              )}
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
        </div>
      )}

      {error && <p className="w-full px-11 pb-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function CreateCategoryForm({
  draft,
  onDraftChange,
  onDiscard,
  onCreateCategory,
}: {
  draft: { name: string; color: EventColor };
  onDraftChange: (draft: { name: string; color: EventColor }) => void;
  onDiscard: () => void;
  onCreateCategory: (name: string, color: string) => Promise<void>;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.name.trim() || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      await onCreateCategory(draft.name.trim(), draft.color);
      onDiscard();
      setError(null);
      setSubmitting(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create Space");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <ColorSwatchPicker
          color={draft.color}
          onColorChange={(color) => onDraftChange({ ...draft, color })}
          className="size-3 rounded-[3px]"
        />
        <input
          value={draft.name}
          onChange={(event) => onDraftChange({ ...draft, name: event.target.value })}
          placeholder="Space name"
          aria-label="New Space name"
          autoFocus
          className={cn(APP_INPUT_CLS, "min-w-0 flex-1")}
        />
      </div>

      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          onClick={onDiscard}
          aria-label="Cancel"
          className="grid size-7 shrink-0 place-items-center rounded-sm text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-4" />
        </button>
        <button
          type="submit"
          disabled={!draft.name.trim() || submitting}
          aria-label="Add Space"
          className="grid size-7 shrink-0 place-items-center rounded-sm text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
        >
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
        </button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}

/** How many individual space rows to show before collapsing the rest. */
const VISIBLE_SPACE_CAP = 3;

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
  const [draft, setDraft] = useState({ name: "", color: DEFAULT_EVENT_COLOR });
  const hasDraft = Boolean(draft.name.trim()) || draft.color !== DEFAULT_EVENT_COLOR;
  const [expanded, setExpanded] = useState(false);

  // Auto-expand when the selected space would be hidden behind the toggle.
  const selectedIsHidden =
    selectedSpaceId !== null &&
    !expanded &&
    categories.findIndex((c) => c.id === selectedSpaceId) >= VISIBLE_SPACE_CAP;
  const showAll = expanded || selectedIsHidden;
  const overflowCount = Math.max(0, categories.length - VISIBLE_SPACE_CAP);
  const visibleCategories = showAll ? categories : categories.slice(0, VISIBLE_SPACE_CAP);

  const discardDraft = () => {
    setCreating(false);
    setDraft({ name: "", color: DEFAULT_EVENT_COLOR });
  };

  return (
    <div className="flex flex-col px-4 pb-2 pt-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">Spaces</h2>
        <Popover
          open={creating}
          onOpenChange={(open, details) => {
            if (open) setCreating(true);
            else if (details.reason === "escape-key") discardDraft();
            else setCreating(false);
          }}
        >
          <PopoverTrigger
            aria-label={creating ? "Cancel creating Space" : "Create a Space"}
            aria-expanded={creating}
            title={!creating && hasDraft ? "Continue Space draft" : undefined}
            className="relative grid size-7 place-items-center rounded-md text-foreground hover:bg-muted"
          >
            {creating ? <X className="size-4" /> : <Plus className="size-4" />}
            {!creating && hasDraft && (
              <span
                aria-label="Space draft saved"
                className="absolute right-0.5 top-0.5 size-1.5 rounded-full bg-primary"
              />
            )}
          </PopoverTrigger>
          <PopoverBackdrop />
          <PopoverContent
            side="right"
            align="start"
            sideOffset={8}
            className="w-[min(260px,calc(100vw-2rem))] p-2.5"
          >
            <CreateCategoryForm
              draft={draft}
              onDraftChange={setDraft}
              onDiscard={discardDraft}
              onCreateCategory={onCreateCategory}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="mt-1.5 flex flex-col gap-1">

        {loading ? (
          <p className="text-xs text-muted-foreground">Loading Spaces…</p>
        ) : (
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => onSelectSpace(null)}
              aria-current={selectedSpaceId === null ? "true" : undefined}
              className={cn(
                "flex min-h-9 items-center gap-1 rounded-lg px-1 text-left text-[13px] font-medium text-foreground outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring",
                selectedSpaceId === null && "bg-muted font-semibold"
              )}
            >
              <span className="grid size-7 shrink-0 place-items-center text-muted-foreground">
                <Layers3 className="size-3.5" />
              </span>
              <span className="px-1.5">All Spaces</span>
            </button>
            {visibleCategories.map((category) => (
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
            {overflowCount > 0 && (
              <button
                type="button"
                onClick={() => setExpanded(!showAll)}
                className="mt-0.5 px-3 text-left text-[12px] text-muted-foreground hover:text-foreground"
              >
                {showAll ? "Show less" : `${overflowCount} more`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
