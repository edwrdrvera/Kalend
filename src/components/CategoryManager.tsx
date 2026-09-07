"use client";

import { useState, type FormEvent } from "react";
import { ChevronDown, Loader2, Plus, Trash2, X } from "lucide-react";
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
  hiddenCategoryIds: string[];
  onToggleCategoryVisibility: (categoryId: string) => void;
  onCreateCategory: (name: string, color: string) => Promise<void>;
  onUpdateCategory: (
    category: CalendarCategory,
    updates: { name?: string; color?: string }
  ) => void;
  onDeleteCategory: (category: CalendarCategory) => void;
}

function CategoryRow({
  category,
  visible,
  onToggleVisibility,
  onUpdateCategory,
  onDeleteCategory,
  indented = false,
}: {
  category: CalendarCategory;
  visible: boolean;
  onToggleVisibility: () => void;
  onUpdateCategory: (updates: { name?: string; color?: string }) => void;
  onDeleteCategory: () => void;
  indented?: boolean;
}) {
  const [name, setName] = useState(category.name);
  const color: EventColor = isEventColor(category.color) ? category.color : DEFAULT_EVENT_COLOR;

  const commitName = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setName(category.name);
      return;
    }
    if (trimmed !== category.name) {
      onUpdateCategory({ name: trimmed });
    }
  };

  return (
    <div className={cn("group flex items-center gap-2 rounded-lg py-1.5 hover:bg-muted/60", indented ? "pl-5 pr-1" : "px-1")}>
      <button
        type="button"
        onClick={onToggleVisibility}
        aria-label={`${visible ? "Hide" : "Show"} ${category.name} on calendar`}
        aria-pressed={visible}
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-md border border-transparent transition-all",
          visible ? "opacity-100" : "opacity-30 grayscale"
        )}
      >
        <span className={cn("size-3 rounded-[4px]", EVENT_COLOR_SWATCH_CLASSES[color])} />
      </button>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={commitName}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") setName(category.name);
        }}
        aria-label="Space name"
        className={cn(
          "min-w-0 flex-1 truncate border-0 bg-transparent p-0 text-sm font-medium text-foreground outline-none focus:text-foreground",
          !visible && "text-muted-foreground line-through"
        )}
      />

      <ColorSwatchPicker
        color={color}
        onColorChange={(c) => onUpdateCategory({ color: c })}
        className="size-4 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
      />

      <button
        type="button"
        onClick={onDeleteCategory}
        aria-label="Delete Space"
        className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}

/** Compact create form opened by the plus button in the Spaces header. */
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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim() || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      await onCreateCategory(name.trim(), color);
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create category");
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
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
          }}
          placeholder="Space name"
          aria-label="New Space name"
          autoFocus
          className="h-6 flex-1 rounded border border-input bg-transparent px-1.5 text-xs text-foreground outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={!name.trim() || submitting}
          aria-label="Add Space"
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
        >
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
        </button>
        <button
          type="button"
          onClick={close}
          aria-label="Cancel"
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
  hiddenCategoryIds,
  onToggleCategoryVisibility,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
}: CategoryManagerProps) {
  const [creating, setCreating] = useState(false);
  const [schoolOpen, setSchoolOpen] = useState(true);
  const workCategory = categories.find((category) => category.name.toLowerCase() === "work");
  const personalCategory = categories.find((category) => category.name.toLowerCase() === "personal");
  const schoolCategories = categories.filter(
    (category) => category.id !== workCategory?.id && category.id !== personalCategory?.id
  );

  return (
    <div className="flex flex-col px-5 pb-4 pt-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold tracking-[-0.035em] text-foreground">Spaces</h2>
        <button
          type="button"
          onClick={() => setCreating((current) => !current)}
          aria-label={creating ? "Cancel creating Space" : "Create a Space"}
          aria-expanded={creating}
          className="grid size-9 place-items-center rounded-lg text-foreground transition-colors hover:bg-muted"
        >
          {creating ? <X className="size-5" /> : <Plus className="size-5" />}
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-2">
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
              onClick={() => setSchoolOpen((open) => !open)}
              aria-expanded={schoolOpen}
              className="flex items-center gap-3 rounded-lg py-2 text-left text-sm font-semibold text-foreground hover:bg-muted/60"
            >
              <span className="size-3.5 rounded-[5px] bg-indigo-600" />
              <span>School</span>
              <ChevronDown className={cn("ml-auto size-4 transition-transform", !schoolOpen && "-rotate-90")} />
            </button>

            {schoolOpen && schoolCategories.map((category) => (
              <CategoryRow
                key={category.id}
                category={category}
                indented
                visible={!hiddenCategoryIds.includes(category.id)}
                onToggleVisibility={() => onToggleCategoryVisibility(category.id)}
                onUpdateCategory={(updates) => onUpdateCategory(category, updates)}
                onDeleteCategory={() => onDeleteCategory(category)}
              />
            ))}

            {workCategory && (
              <div className="mt-3 flex items-center">
                <div className="min-w-0 flex-1">
                  <CategoryRow
                    category={workCategory}
                    visible={!hiddenCategoryIds.includes(workCategory.id)}
                    onToggleVisibility={() => onToggleCategoryVisibility(workCategory.id)}
                    onUpdateCategory={(updates) => onUpdateCategory(workCategory, updates)}
                    onDeleteCategory={() => onDeleteCategory(workCategory)}
                  />
                </div>
                <ChevronDown className="size-4 shrink-0 text-foreground" />
              </div>
            )}

            {personalCategory && (
              <div className="flex items-center">
                <div className="min-w-0 flex-1">
                  <CategoryRow
                    category={personalCategory}
                    visible={!hiddenCategoryIds.includes(personalCategory.id)}
                    onToggleVisibility={() => onToggleCategoryVisibility(personalCategory.id)}
                    onUpdateCategory={(updates) => onUpdateCategory(personalCategory, updates)}
                    onDeleteCategory={() => onDeleteCategory(personalCategory)}
                  />
                </div>
                <ChevronDown className="size-4 shrink-0 text-foreground" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
