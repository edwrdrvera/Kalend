import { afterEach, describe, expect, it } from "bun:test";
import { createElement } from "react";
import { act } from "react";
import type { Root } from "react-dom/client";
import type { CalendarCategory, CalendarGroup } from "@/lib/calendar-types";
import type { EventFormValues } from "@/lib/event-form";
import { typeInto } from "./test-dom";

const { createRoot } = await import("react-dom/client");
const { default: EventCreatePopover } = await import("../EventCreatePopover");

const categories: CalendarCategory[] = [
  { id: "space-1", name: "Work", color: "green", description: null },
  { id: "space-2", name: "Personal", color: "purple", description: null },
];

const groups: CalendarGroup[] = [
  { id: "group-site", category_id: "space-1", name: "Website" },
  { id: "group-trip", category_id: "space-2", name: "Trip" },
];

const anchorRect: DOMRect = {
  top: 120,
  left: 200,
  right: 320,
  bottom: 180,
  width: 120,
  height: 60,
  x: 200,
  y: 120,
  toJSON: () => ({}),
};

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  if (root) await act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  document.body.replaceChildren();
  localStorage.clear();
});

interface RenderOptions {
  initialSpaceId?: string | null;
  initialGroupId?: string | null;
  onSubmit?: (values: EventFormValues, openDetails?: boolean) => void;
}

async function renderPopover({
  initialSpaceId = null,
  initialGroupId = null,
  onSubmit = () => {},
}: RenderOptions = {}) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(() =>
    root?.render(
      createElement(EventCreatePopover, {
        anchorRect,
        side: "right",
        initialStart: new Date("2026-09-09T10:00:00"),
        initialSpaceId,
        initialGroupId,
        categories,
        groups,
        onSubmit,
        onClose: () => {},
      })
    )
  );
}

/** The membership selector's trigger, found by its frozen accessible name.
 *  The popover renders into document.body, so query the document. */
function spaceTriggerLabel(): string | null {
  return document.querySelector('[aria-label^="Space: "]')?.getAttribute("aria-label") ?? null;
}

async function openSpaceDropdown() {
  await act(() => document.querySelector<HTMLElement>('[aria-label^="Space: "]')?.click());
}

/** An option row inside the opened Space dropdown. */
function spaceOption(name: string): HTMLButtonElement | undefined {
  return [
    ...document.querySelectorAll<HTMLButtonElement>('[data-slot="popover-content"] button'),
  ].find((button) => button.textContent?.trim() === name);
}

/** The Location chip, which swaps itself for the location input. */
async function openLocation() {
  const chip = [...document.querySelectorAll<HTMLButtonElement>("form button")].find(
    (button) => button.textContent?.trim() === "Location"
  );
  await act(() => chip?.click());
}

async function submitForm() {
  await act(() =>
    document
      .querySelector<HTMLFormElement>("form")
      ?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))
  );
}

describe("EventCreatePopover Space membership", () => {
  it("starts a new Event in the focused Space", async () => {
    await renderPopover({ initialSpaceId: "space-1" });
    expect(spaceTriggerLabel()).toBe("Space: Work");
  });

  it("starts a new Event unassigned when creating from All Spaces", async () => {
    await renderPopover({ initialSpaceId: null });
    expect(spaceTriggerLabel()).toBe("Space: No Space");
  });

  it("keeps the snapshotted Space when focus changes while the draft is open", async () => {
    let submitted: EventFormValues | null = null;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    const render = (initialSpaceId: string | null) =>
      root?.render(
        createElement(EventCreatePopover, {
          anchorRect,
          side: "right",
          initialStart: new Date("2026-09-09T10:00:00"),
          initialSpaceId,
          categories,
          groups: [],
          onSubmit: (values: EventFormValues) => {
            submitted = values;
          },
          onClose: () => {},
        })
      );
    await act(() => render("space-1"));
    expect(spaceTriggerLabel()).toBe("Space: Work");

    // Simulate the calendar changing focus while the editor is open. The
    // popover's Space must remain the value captured at open time.
    await act(() => render("space-2"));
    expect(spaceTriggerLabel()).toBe("Space: Work");

    const titleInput = document.querySelector<HTMLInputElement>("#new-event-title");
    if (!titleInput) throw new Error("Event title input was not rendered");
    await act(() => typeInto(titleInput, "Sprint kickoff"));
    await submitForm();

    const values = submitted as EventFormValues | null;
    expect(values?.categoryId).toBe("space-1");
  });
});

describe("EventCreatePopover Group membership", () => {
  it("starts in the Group it was opened from, and submits both the Space and the Group", async () => {
    let submitted: EventFormValues | null = null;
    await renderPopover({
      initialSpaceId: "space-1",
      initialGroupId: "group-site",
      onSubmit: (values) => {
        submitted = values;
      },
    });
    expect(spaceTriggerLabel()).toBe("Space: Work / Website");

    const titleInput = document.querySelector<HTMLInputElement>("#new-event-title");
    await act(() => typeInto(titleInput as HTMLInputElement, "Client call"));
    await submitForm();
    const values = submitted as EventFormValues | null;
    expect(values?.categoryId).toBe("space-1");
    expect(values?.groupId).toBe("group-site");
  });

  it("lets the user pick another Group, which brings its Space", async () => {
    let submitted: EventFormValues | null = null;
    await renderPopover({
      initialSpaceId: "space-1",
      initialGroupId: "group-site",
      onSubmit: (values) => {
        submitted = values;
      },
    });
    await openSpaceDropdown();
    await act(() => spaceOption("Trip")?.click());
    expect(spaceTriggerLabel()).toBe("Space: Personal / Trip");

    const titleInput = document.querySelector<HTMLInputElement>("#new-event-title");
    await act(() => typeInto(titleInput as HTMLInputElement, "Flight"));
    await submitForm();
    const values = submitted as EventFormValues | null;
    expect(values?.categoryId).toBe("space-2");
    expect(values?.groupId).toBe("group-trip");
  });

  it("choosing the Space row leaves the Group but stays in the Space", async () => {
    let submitted: EventFormValues | null = null;
    await renderPopover({
      initialSpaceId: "space-1",
      initialGroupId: "group-site",
      onSubmit: (values) => {
        submitted = values;
      },
    });
    await openSpaceDropdown();
    await act(() => spaceOption("Work")?.click());
    expect(spaceTriggerLabel()).toBe("Space: Work");

    const titleInput = document.querySelector<HTMLInputElement>("#new-event-title");
    await act(() => typeInto(titleInput as HTMLInputElement, "Offsite"));
    await submitForm();
    const values = submitted as EventFormValues | null;
    expect(values?.categoryId).toBe("space-1");
    expect(values?.groupId).toBeNull();
  });

  it("keeps the snapshotted Group when the selection elsewhere changes while the draft is open", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    const render = (initialGroupId: string | null) =>
      root?.render(
        createElement(EventCreatePopover, {
          anchorRect,
          side: "right",
          initialStart: new Date("2026-09-09T10:00:00"),
          initialSpaceId: "space-1",
          initialGroupId,
          categories,
          groups,
          onSubmit: () => {},
          onClose: () => {},
        })
      );
    await act(() => render("group-site"));
    await act(() => render(null));
    expect(spaceTriggerLabel()).toBe("Space: Work / Website");
  });
});

describe("EventCreatePopover submitted values", () => {
  it("submits the focused Space id and no space_id field", async () => {
    let submitted: EventFormValues | null = null;
    await renderPopover({
      initialSpaceId: "space-1",
      onSubmit: (values) => {
        submitted = values;
      },
    });

    const titleInput = document.querySelector<HTMLInputElement>("#new-event-title");
    expect(titleInput).not.toBeNull();
    await act(() => typeInto(titleInput as HTMLInputElement, "Sprint planning"));
    await submitForm();

    const values = submitted as EventFormValues | null;
    expect(values).not.toBeNull();
    expect(values?.title).toBe("Sprint planning");
    expect(values?.categoryId).toBe("space-1");
    expect(Object.keys(values ?? {}).sort()).toEqual([
      "categoryId",
      "color",
      "colorOverridden",
      "description",
      "endAt",
      "groupId",
      "icon",
      "location",
      "startAt",
      "title",
    ]);
  });

  it("submits categoryId null when a new Event clears the focused Space", async () => {
    let submitted: EventFormValues | null = null;
    await renderPopover({
      initialSpaceId: "space-1",
      onSubmit: (values) => {
        submitted = values;
      },
    });
    expect(spaceTriggerLabel()).toBe("Space: Work");

    await openSpaceDropdown();
    const noSpace = spaceOption("No Space");
    expect(noSpace).toBeDefined();
    await act(() => noSpace?.click());
    expect(spaceTriggerLabel()).toBe("Space: No Space");

    const titleInput = document.querySelector<HTMLInputElement>("#new-event-title");
    if (!titleInput) throw new Error("Event title input was not rendered");
    await act(() => typeInto(titleInput, "Unscheduled planning"));
    await submitForm();

    const values = submitted as EventFormValues | null;
    expect(values?.categoryId).toBeNull();
    expect(Object.keys(values ?? {})).not.toContain("space_id");
  });
});

describe("EventCreatePopover location", () => {
  it("starts a new Event with no icon box and the location input behind a chip", async () => {
    await renderPopover();
    expect(document.querySelector("#new-event-location")).toBeNull();
    await openLocation();
    expect(document.querySelector<HTMLInputElement>("#new-event-location")?.value).toBe("");
    expect(document.querySelector("#new-event-icon")).toBeNull();
  });

  it("submits the typed location", async () => {
    let submitted: EventFormValues | null = null;
    await renderPopover({
      onSubmit: (values) => {
        submitted = values;
      },
    });

    await openLocation();
    const titleInput = document.querySelector<HTMLInputElement>("#new-event-title");
    const locationInput = document.querySelector<HTMLInputElement>("#new-event-location");
    if (!titleInput || !locationInput) throw new Error("Expected fields were not rendered");
    await act(() => typeInto(titleInput, "Study session"));
    await act(() => typeInto(locationInput, "Library, 2nd floor"));
    await submitForm();

    const values = submitted as EventFormValues | null;
    expect(values?.location).toBe("Library, 2nd floor");
  });

  it("submits null for location and icon when left blank", async () => {
    let submitted: EventFormValues | null = null;
    await renderPopover({
      onSubmit: (values) => {
        submitted = values;
      },
    });

    const titleInput = document.querySelector<HTMLInputElement>("#new-event-title");
    if (!titleInput) throw new Error("Event title input was not rendered");
    await act(() => typeInto(titleInput, "Untitled meeting"));
    await submitForm();

    const values = submitted as EventFormValues | null;
    expect(values?.location).toBeNull();
    expect(values?.icon).toBeNull();
  });
});

describe("EventCreatePopover More options", () => {
  async function typeTitle(title: string) {
    const titleInput = document.querySelector<HTMLInputElement>("#new-event-title");
    if (!titleInput) throw new Error("Event title input was not rendered");
    await act(() => typeInto(titleInput, title));
  }

  function moreOptions() {
    return [...document.querySelectorAll<HTMLButtonElement>("form button")].find(
      (button) => button.textContent?.trim() === "More options"
    );
  }

  it("submits the draft and asks to open it in the panel", async () => {
    const calls: Array<[EventFormValues, boolean | undefined]> = [];
    await renderPopover({ onSubmit: (values, openDetails) => calls.push([values, openDetails]) });
    await typeTitle("Study group");
    await act(() => moreOptions()?.click());
    expect(calls).toHaveLength(1);
    expect(calls[0][0].title).toBe("Study group");
    expect(calls[0][1]).toBe(true);
  });

  it("does not submit when the draft is invalid", async () => {
    const calls: unknown[] = [];
    await renderPopover({ onSubmit: (values) => calls.push(values) });
    await act(() => moreOptions()?.click());
    expect(calls).toHaveLength(0);
  });

  it("a normal submit does not ask to open the panel", async () => {
    const calls: Array<boolean | undefined> = [];
    await renderPopover({ onSubmit: (_values, openDetails) => calls.push(openDetails) });
    await typeTitle("Study group");
    await submitForm();
    expect(calls).toEqual([false]);
  });
});

describe("EventCreatePopover keyboard", () => {
  it("is a modal dialog", async () => {
    await renderPopover();
    expect(document.querySelector('[role="dialog"]')?.getAttribute("aria-modal")).toBe("true");
  });

  it("wraps Tab from the last control to the first, and Shift+Tab back", async () => {
    await renderPopover();
    const title = document.getElementById("new-event-title")!;
    const create = [...document.querySelectorAll<HTMLButtonElement>("form button")].find(
      (b) => b.textContent?.trim() === "Create"
    )!;
    await act(() => create.focus());
    await act(() => {
      create.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }));
    });
    expect(document.activeElement).toBe(title);
    await act(() => {
      title.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true, cancelable: true })
      );
    });
    expect(document.activeElement).toBe(create);
  });

  it("gives focus back to the element that had it when the popover closes", async () => {
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    opener.focus();
    await renderPopover();
    expect(document.activeElement).toBe(document.getElementById("new-event-title"));
    await act(() => root?.unmount());
    root = null;
    await new Promise((r) => setTimeout(r, 0));
    expect(document.activeElement).toBe(opener);
  });
});
