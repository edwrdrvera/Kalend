import "./test-dom";
import { typeInto, typeIntoTextarea } from "./test-dom";
import { afterEach, describe, expect, it } from "bun:test";
import { createElement } from "react";
import { act } from "react";
import type { Root } from "react-dom/client";
import type { CalendarTask } from "@/lib/calendar-types";
import type { PanelSubject } from "@/lib/panel-subject";
import type { UpcomingDay } from "@/lib/space-overview";

// DOM globals must be installed (test-dom above) before importing react-dom.
const { createRoot } = await import("react-dom/client");
const { default: SpacePanel } = await import("../SpacePanel");

let root: Root | null = null;
let container: HTMLDivElement | null = null;
/** The props of the last render, so a test can re-render with a new subject. */
let lastProps: Parameters<typeof SpacePanel>[0];

afterEach(async () => {
  if (root) await act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  document.body.replaceChildren();
});

interface Handlers {
  closes: number;
  created: string[];
  eventCreates: number;
  /** Each description save, as the panel sent it. */
  descriptionSaves: (string | null)[];
  saveResult: boolean;
  dirty: boolean[];
  proceeds: number;
  stays: number;
  renames: string[];
  renameResult: boolean;
}

async function render(
  subject: PanelSubject,
  tasks: CalendarTask[] = [],
  upcoming: UpcomingDay[] = [],
  navigationPending = false
) {
  const handlers: Handlers = {
    closes: 0,
    created: [],
    eventCreates: 0,
    descriptionSaves: [],
    saveResult: true,
    dirty: [],
    proceeds: 0,
    stays: 0,
    renames: [],
    renameResult: true,
  };
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  lastProps = {
        subject,
        tasks,
        upcoming,
        weekLoad: [],
        modal: false,
        onClose: () => {
          handlers.closes++;
        },
        onToggleComplete: () => {},
        onOpenTask: () => {},
        onOpenEvent: () => {},
        onChangeTaskDue: () => {},
        onDeleteTask: () => {},
        onSelectDay: () => {},
        onCreateEvent: () => {
          handlers.eventCreates++;
        },
        onCreateTask: async (title: string) => {
          handlers.created.push(title);
        },
        onOpenSettings: () => {},
        onRename: async (name: string) => {
          handlers.renames.push(name);
          return handlers.renameResult;
        },
        onSaveDescription: async (description: string | null) => {
          handlers.descriptionSaves.push(description);
          return handlers.saveResult;
        },
        onDirtyChange: (dirty: boolean) => {
          handlers.dirty.push(dirty);
        },
        navigationPending,
        onProceed: () => {
          handlers.proceeds++;
        },
        onStay: () => {
          handlers.stays++;
        },
      };
  await act(() => root?.render(createElement(SpacePanel, lastProps)));
  return handlers;
}

const buttonWithText = (text: string) =>
  [...document.querySelectorAll("button")].find(
    (b) => b.textContent === text || b.getAttribute("aria-label") === text
  );

const TASK: CalendarTask = {
  id: "t1",
  title: "Submit timesheet",
  due_at: null,
  completed: false,
  color: null,
  color_overridden: false,
  category_id: "fixture-school",
  group_id: null,
};

const SHIFT_DAY: UpcomingDay = {
  day: new Date(2030, 0, 1),
  events: [
    {
      id: "e1",
      title: "Morning shift",
      start_at: new Date(2030, 0, 1, 9).toISOString(),
      end_at: new Date(2030, 0, 1, 13).toISOString(),
      color: null,
      color_overridden: false,
      category_id: "fixture-school",
      group_id: null,
      location: null,
      icon: null,
      description: null,
    },
  ],
};

const descriptionBox = () => document.querySelector<HTMLTextAreaElement>("#space-description");
const typeDescription = (value: string) => act(async () => typeIntoTextarea(descriptionBox()!, value));
const alertText = () => document.querySelector('[role="alert"]')?.textContent ?? "";
const SPACE: PanelSubject = {
  kind: "space",
  spaceId: "fixture-school",
  name: "School",
  color: "blue",
  description: "Databases & Information Systems. Wolfe 214.",
};
const GROUP: PanelSubject = {
  kind: "group",
  groupId: "fixture-cs340",
  name: "CS 340",
  spaceId: "fixture-school",
  spaceName: "School",
  color: "blue",
};
const NO_DESCRIPTION: PanelSubject = { ...SPACE, description: null };

describe("SpacePanel description", () => {
  it("shows no description section for a Space without one, only a way to add it", async () => {
    await render(NO_DESCRIPTION);
    expect(descriptionBox()).toBeNull();
    expect(container?.textContent).not.toContain("Description");
    expect(buttonWithText("Add description")).toBeDefined();
    expect(buttonWithText("Edit description")).toBeUndefined();
  });

  it("shows a saved description as text with an edit button", async () => {
    await render(SPACE);
    expect(container?.textContent).toContain("Databases & Information Systems. Wolfe 214.");
    expect(descriptionBox()).toBeNull();
    expect(buttonWithText("Edit description")).toBeDefined();
  });

  it("adds a description: trims it, saves, and goes back to reading", async () => {
    const handlers = await render(NO_DESCRIPTION);
    await act(() => buttonWithText("Add description")?.click());
    expect(buttonWithText("Save")?.disabled).toBe(true);
    await typeDescription("  Lab sections on Tuesday\n");
    expect(handlers.dirty.at(-1)).toBe(true);
    await act(() => buttonWithText("Save")?.click());

    expect(handlers.descriptionSaves).toEqual(["Lab sections on Tuesday"]);
    expect(descriptionBox()).toBeNull();
    expect(handlers.dirty.at(-1)).toBe(false);
  });

  it("edits an existing description starting from its text", async () => {
    const handlers = await render(SPACE);
    await act(() => buttonWithText("Edit description")?.click());
    expect(descriptionBox()?.value).toBe("Databases & Information Systems. Wolfe 214.");
    await typeDescription("Wolfe 301");
    await act(() => buttonWithText("Save")?.click());
    expect(handlers.descriptionSaves).toEqual(["Wolfe 301"]);
  });

  it("removes the description by saving blank text as null", async () => {
    const handlers = await render(SPACE);
    await act(() => buttonWithText("Edit description")?.click());
    await typeDescription("   ");
    await act(() => buttonWithText("Save")?.click());
    expect(handlers.descriptionSaves).toEqual([null]);
  });

  it("keeps what was typed and offers a retry when the save fails", async () => {
    const handlers = await render(NO_DESCRIPTION);
    handlers.saveResult = false;
    await act(() => buttonWithText("Add description")?.click());
    await typeDescription("Exam room 12");
    await act(() => buttonWithText("Save")?.click());

    expect(descriptionBox()?.value).toBe("Exam room 12");
    expect(alertText()).toContain("Couldn't save");

    handlers.saveResult = true;
    await act(() => buttonWithText("Retry")?.click());
    expect(handlers.descriptionSaves).toEqual(["Exam room 12", "Exam room 12"]);
    expect(descriptionBox()).toBeNull();
  });

  it("rejects an over-long description with a message and does not save", async () => {
    const handlers = await render(NO_DESCRIPTION);
    await act(() => buttonWithText("Add description")?.click());
    await typeDescription("x".repeat(2001));
    await act(() => buttonWithText("Save")?.click());
    expect(handlers.descriptionSaves).toEqual([]);
    expect(alertText()).toContain("Description is too long");
  });

  it("Cancel drops the edit without saving", async () => {
    const handlers = await render(SPACE);
    await act(() => buttonWithText("Edit description")?.click());
    await typeDescription("Changed my mind");
    await act(() => buttonWithText("Cancel")?.click());
    expect(handlers.descriptionSaves).toEqual([]);
    expect(descriptionBox()).toBeNull();
    expect(handlers.dirty.at(-1)).toBe(false);
    expect(container?.textContent).toContain("Wolfe 214");
  });

  it("asks what to do with an unsaved description when a navigation is held", async () => {
    const handlers = await render(NO_DESCRIPTION, [], [], true);
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
    await act(() => buttonWithText("Add description")?.click());
    await typeDescription("Unsaved");
    await act(() => buttonWithText("Stay")?.click());
    expect(handlers.stays).toBe(1);
    await act(() => buttonWithText("Discard")?.click());
    expect(handlers.proceeds).toBe(1);
  });
});

describe("SpacePanel for a Space", () => {
  it("has no settings footer, because the title renames the Space", async () => {
    await render(SPACE);
    expect(document.querySelector('[aria-label="Space settings"]')).toBeNull();
    expect(document.querySelector("footer")).toBeNull();
  });
});

describe("SpacePanel for a Group", () => {
  it("has no description section, because Groups have none", async () => {
    await render(GROUP);
    expect(buttonWithText("Add description")).toBeUndefined();
    expect(descriptionBox()).toBeNull();
  });

  it("offers Group settings in the footer", async () => {
    await render(GROUP);
    expect(document.querySelector('[aria-label="Group settings"]')).not.toBeNull();
    expect(document.querySelector('[aria-label="Space settings"]')).toBeNull();
  });

  it("says nothing is scheduled when the Group has no events", async () => {
    await render(GROUP);
    expect(container?.textContent).toContain("Nothing scheduled.");
  });
});

describe("SpacePanel", () => {
  it("shows the Space label and Group heading, with no placeholder sections", async () => {
    await render(GROUP);
    const text = container?.textContent ?? "";
    expect(text).toContain("School");
    expect(text).toContain("CS 340");
    expect(text).not.toContain("Meets");
    expect(text).not.toContain("People");
    expect(text).not.toContain("Links");
  });

  it("shows per-section empty states with both add actions when the Space has nothing", async () => {
    const handlers = await render(SPACE);
    expect(container?.textContent).toContain("Nothing scheduled.");
    expect(container?.textContent).toContain("All caught up.");
    await act(() => buttonWithText("Add event")?.click());
    expect(handlers.eventCreates).toBe(1);
  });

  it("opens the task composer from the Add task button", async () => {
    await render(SPACE);
    await act(() => buttonWithText("Add task")?.click());
    expect(document.querySelector('[aria-label="New task title"]')).not.toBeNull();
  });

  it("switches between the Overview, Resources and Alerts tabs", async () => {
    await render(SPACE);
    const tab = (name: string) =>
      [...document.querySelectorAll<HTMLElement>('[role="tab"]')].find((t) => t.textContent === name);
    await act(() => tab("Resources")?.click());
    expect(container?.textContent).toContain("Add link");
    expect(container?.textContent).not.toContain("Tasks · ");
    await act(() => tab("Alerts")?.click());
    expect(container?.textContent).toContain("Notify me about School");
    await act(() => tab("Overview")?.click());
    expect(container?.textContent).toContain("Tasks · ");
  });

  it("lists upcoming events for a Space with events and no tasks", async () => {
    await render(SPACE, [], [SHIFT_DAY]);
    const text = container?.textContent ?? "";
    expect(text).toContain("Morning shift");
    expect(text).toContain("All caught up.");
    expect(text).not.toContain("Nothing scheduled.");
  });

  it("lists the task and drops the tasks empty state once the Space has one", async () => {
    await render(SPACE, [TASK]);
    const text = container?.textContent ?? "";
    expect(text).toContain("Submit timesheet");
    expect(text).not.toContain("All caught up.");
  });

  it("closes on Escape when focus is inside the panel", async () => {
    const handlers = await render(SPACE);
    const panel = container?.querySelector<HTMLElement>('[role="complementary"]');
    await act(() => {
      panel?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      );
    });
    expect(handlers.closes).toBe(1);
  });

  it("closes only the task composer on Escape, leaving the panel open", async () => {
    const handlers = await render(SPACE);
    await act(() => buttonWithText("Add task")?.click());
    const input = document.querySelector<HTMLInputElement>('[aria-label="New task title"]');
    await act(() => {
      input?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(document.querySelector('[aria-label="New task title"]')).toBeNull();
    expect(handlers.closes).toBe(0);
  });

  it("reveals a composer from + Add and creates a task from the open panel", async () => {
    const handlers = await render(SPACE);
    const add = buttonWithText("Add task");
    await act(() => add?.click());

    const input = document.querySelector<HTMLInputElement>(
      '[aria-label="New task title"]'
    );
    expect(input).not.toBeNull();
    if (input) await act(() => typeInto(input, "Read chapter 4"));
    const form = document.querySelector<HTMLFormElement>("form");
    await act(() => {
      form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    expect(handlers.created).toEqual(["Read chapter 4"]);
  });
});

describe("SpacePanel rename", () => {
  const nameInput = () => document.querySelector<HTMLInputElement>('input[aria-label="School name"]');
  const key = (k: string) =>
    act(async () => {
      nameInput()?.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true }));
    });

  it("has no options button, and the title opens a name box", async () => {
    await render(SPACE);
    expect(buttonWithText("Space options")).toBeUndefined();
    await act(() => buttonWithText("Rename School")?.click());
    expect(nameInput()?.value).toBe("School");
  });

  it("saves the trimmed name on Enter", async () => {
    const handlers = await render(SPACE);
    await act(() => buttonWithText("Rename School")?.click());
    await act(() => typeInto(nameInput()!, "  Biology "));
    await key("Enter");
    expect(handlers.renames).toEqual(["Biology"]);
    expect(nameInput()).toBeNull();
  });

  it("cancels on Escape without saving or closing the panel", async () => {
    const handlers = await render(SPACE);
    await act(() => buttonWithText("Rename School")?.click());
    await act(() => typeInto(nameInput()!, "Biology"));
    await key("Escape");
    expect(handlers.renames).toEqual([]);
    expect(handlers.closes).toBe(0);
    expect(nameInput()).toBeNull();
  });

  it("does not save a blank or unchanged name", async () => {
    const handlers = await render(SPACE);
    await act(() => buttonWithText("Rename School")?.click());
    await act(() => typeInto(nameInput()!, "   "));
    await key("Enter");
    await act(() => buttonWithText("Rename School")?.click());
    await key("Enter");
    expect(handlers.renames).toEqual([]);
  });

  it("drops an unsaved name when the panel switches to another Space", async () => {
    const handlers = await render(SPACE);
    handlers.renameResult = false;
    await act(() => buttonWithText("Rename School")?.click());
    await act(() => typeInto(nameInput()!, "Biology"));
    await key("Enter");

    const work = { ...SPACE, spaceId: "fixture-work", name: "Work" };
    await act(() => root?.render(createElement(SpacePanel, { ...lastProps, subject: work })));
    expect(document.querySelector('input[aria-label="Work name"]')).toBeNull();
    expect(buttonWithText("Rename Work")).toBeDefined();
    expect(container?.textContent).not.toContain("Couldn't rename");
  });

  it("keeps the box open with a message when the save fails", async () => {
    const handlers = await render(SPACE);
    handlers.renameResult = false;
    await act(() => buttonWithText("Rename School")?.click());
    await act(() => typeInto(nameInput()!, "Biology"));
    await key("Enter");
    expect(nameInput()?.value).toBe("Biology");
    expect(container?.textContent).toContain("Couldn't rename");
  });
});
