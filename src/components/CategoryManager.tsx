"use client";

import { useState, type FormEvent } from "react";
import { ChevronRight, Loader2, Plus, Trash2, X } from "lucide-react";
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
}: {
  category: CalendarCategory;
  visible: boolean;
  onToggleVisibility: () => void;
  onUpdateCategory: (updates: { name?: string; color?: string }) => void;
  onDeleteCategory: () => void;
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
    <div className="group flex items-center gap-2 rounded-lg px-1 py-1.5 hover:bg-muted/60">
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
          "min-w-0 flex-1 truncate border-0 bg-transparent p-0 text-[13px] text-foreground outline-none focus:text-foreground",
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

/** Idle: a plain "Add a category" row, same trigger style as TaskList's
 *  CreateTaskForm. Expanded: a color swatch + name input. Submitting (or
 *  Escape, or the cancel button) collapses back to the idle row. */
function CreateCategoryForm({
  onCreateCategory,
}: {
  onCreateCategory: (name: string, color: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState<EventColor>(DEFAULT_EVENT_COLOR);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setOpen(false);
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

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md px-1 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
      >
        <Plus className="size-3.5" />
        Add a Space
      </button>
    );
  }

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

const COLLAPSED_STORAGE_KEY = "kalend:categories-panel-collapsed";

export default function CategoryManager({
  categories,
  loading,
  hiddenCategoryIds,
  onToggleCategoryVisibility,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
}: CategoryManagerProps) {
  // Collapsed by default, same reasoning as TaskList: don't cost permanent
  // sidebar space for someone not using categories yet. Only reachable
  // client-side (never rendered during SSR, see Calendar's `mounted` gate).
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(COLLAPSED_STORAGE_KEY) === "true"
  );

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSED_STORAGE_KEY, String(next));
      return next;
    });
  };

  return (
    <div className="flex flex-col border-t border-border px-5 py-4">
      <button
        type="button"
        onClick={toggleCollapsed}
        aria-expanded={!collapsed}
        className="flex items-center justify-between text-sm font-bold tracking-[-0.02em] text-foreground transition-colors hover:text-foreground"
      >
        <span>Spaces</span>
        <ChevronRight
          className={cn(
            "size-4 text-muted-foreground transition-transform duration-200",
            !collapsed && "rotate-90"
          )}
        />
      </button>

      <div
        inert={collapsed}
        className={cn(
          "grid transition-all duration-200 ease-in-out",
          collapsed ? "grid-rows-[0fr] opacity-0" : "mt-3 grid-rows-[1fr] opacity-100"
        )}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-3">
            <CreateCategoryForm onCreateCategory={onCreateCategory} />

            {loading ? (
              <p className="text-xs text-muted-foreground">Loading Spaces…</p>
            ) : categories.length === 0 ? null : (
              <div className="flex flex-col">
                {categories.map((category) => (
                  <CategoryRow
                    key={category.id}
                    category={category}
                    visible={!hiddenCategoryIds.includes(category.id)}
                    onToggleVisibility={() => onToggleCategoryVisibility(category.id)}
                    onUpdateCategory={(updates) => onUpdateCategory(category, updates)}
                    onDeleteCategory={() => onDeleteCategory(category)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
