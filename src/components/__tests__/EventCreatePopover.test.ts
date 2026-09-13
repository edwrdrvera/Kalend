import { afterEach, describe, expect, it } from "bun:test";
import { createElement } from "react";
import { act } from "react";
import type { Root } from "react-dom/client";
import type { CalendarCategory, CalendarEvent } from "@/lib/calendar-types";
import type { EventFormValues } from "@/lib/event-form";
import { typeInto } from "./test-dom";

const { createRoot } = await import("react-dom/client");
const { default: EventCreatePopover } = await import("../EventCreatePopover");

const categories: CalendarCategory[] = [
  { id: "space-1", name: "Work", color: "green" },
  { id: "space-2", name: "Personal", color: "purple" },
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

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: "event-1",
    title: "Standup",
    start_at: "2026-09-09T14:00:00.000Z",
    end_at: "2026-09-09T15:00:00.000Z",
    color: "blue",
    color_overridden: false,
    category_id: null,
    location: null,
    icon: null,
    ...overrides,
  };
}

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
  event?: CalendarEvent | null;
  initialSpaceId?: string | null;
  onSubmit?: (values: EventFormValues) => void;
}

async function renderPopover({
  event = null,
  initialSpaceId = null,
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
        event,
        initialStart: new Date("2026-09-09T10:00:00"),
        initialSpaceId,
        categories,
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

async function submitForm() {
  await act(() =>
    document
      .querySelector<HTMLFormElement>("form")
      ?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))
  );
}

describe("EventCreatePopover Space membership", () => {
  it("starts a new Event in the focused Space", async () => {
    await renderPopover({ event: null, initialSpaceId: "space-1" });
    expect(spaceTriggerLabel()).toBe("Space: Work");
  });

  it("starts a new Event unassigned when creating from All Spaces", async () => {
    await renderPopover({ event: null, initialSpaceId: null });
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
          event: null,
          initialStart: new Date("2026-09-09T10:00:00"),
          initialSpaceId,
          categories,
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

  it("initialises an edit from the Event's own Space, not the current focus", async () => {
    await renderPopover({
      event: makeEvent({ category_id: "space-2" }),
      initialSpaceId: "space-1",
    });
    expect(spaceTriggerLabel()).toBe("Space: Personal");
  });

  it("keeps an unassigned Event unassigned even while a Space is focused", async () => {
    await renderPopover({
      event: makeEvent({ category_id: null }),
      initialSpaceId: "space-1",
    });
    expect(spaceTriggerLabel()).toBe("Space: No Space");
  });
});

describe("EventCreatePopover submitted values", () => {
  it("submits the focused Space id and no space_id field", async () => {
    let submitted: EventFormValues | null = null;
    await renderPopover({
      event: null,
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
      "endAt",
      "icon",
      "location",
      "startAt",
      "title",
    ]);
  });

  it("allows the user to clear an existing Event's Space", async () => {
    let submitted: EventFormValues | null = null;
    await renderPopover({
      event: makeEvent({ category_id: "space-1" }),
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

    await submitForm();

    const values = submitted as EventFormValues | null;
    expect(values).not.toBeNull();
    expect(values?.categoryId).toBeNull();
    expect(Object.keys(values ?? {})).not.toContain("space_id");
  });

  it("submits categoryId null when a new Event clears the focused Space", async () => {
    let submitted: EventFormValues | null = null;
    await renderPopover({
      event: null,
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

  it("moves an Event into a Space chosen from the dropdown", async () => {
    let submitted: EventFormValues | null = null;
    await renderPopover({
      event: makeEvent({ category_id: null }),
      initialSpaceId: null,
      onSubmit: (values) => {
        submitted = values;
      },
    });

    await openSpaceDropdown();
    await act(() => spaceOption("Personal")?.click());
    expect(spaceTriggerLabel()).toBe("Space: Personal");

    await submitForm();

    const values = submitted as EventFormValues | null;
    expect(values?.categoryId).toBe("space-2");
    // Joining a Space inherits its colour; it is not a custom colour choice.
    expect(values?.colorOverridden).toBe(false);
  });
});

describe("EventCreatePopover location and icon", () => {
  it("starts a new Event with empty location and icon fields", async () => {
    await renderPopover({ event: null });
    const locationInput = document.querySelector<HTMLInputElement>("#new-event-location");
    const iconInput = document.querySelector<HTMLInputElement>("#new-event-icon");
    expect(locationInput?.value).toBe("");
    expect(iconInput?.value).toBe("");
  });

  it("initialises the fields from an existing Event", async () => {
    await renderPopover({ event: makeEvent({ location: "Room 204", icon: "🧪" }) });
    const locationInput = document.querySelector<HTMLInputElement>("#new-event-location");
    const iconInput = document.querySelector<HTMLInputElement>("#new-event-icon");
    expect(locationInput?.value).toBe("Room 204");
    expect(iconInput?.value).toBe("🧪");
  });

  it("submits the typed location and icon", async () => {
    let submitted: EventFormValues | null = null;
    await renderPopover({
      event: null,
      onSubmit: (values) => {
        submitted = values;
      },
    });

    const titleInput = document.querySelector<HTMLInputElement>("#new-event-title");
    const locationInput = document.querySelector<HTMLInputElement>("#new-event-location");
    const iconInput = document.querySelector<HTMLInputElement>("#new-event-icon");
    if (!titleInput || !locationInput || !iconInput) throw new Error("Expected fields were not rendered");
    await act(() => typeInto(titleInput, "Study session"));
    await act(() => typeInto(locationInput, "Library, 2nd floor"));
    await act(() => typeInto(iconInput, "📚"));
    await submitForm();

    const values = submitted as EventFormValues | null;
    expect(values?.location).toBe("Library, 2nd floor");
    expect(values?.icon).toBe("📚");
  });

  it("submits null for location and icon when left blank", async () => {
    let submitted: EventFormValues | null = null;
    await renderPopover({
      event: null,
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

describe("EventCreatePopover location toggle", () => {
  /** The location input's enclosing `inert` container, if any — used to
   *  assert the field is non-interactive while collapsed. */
  function locationContainer(): HTMLElement | null {
    return document.querySelector<HTMLInputElement>("#new-event-location")?.closest("[inert]") ?? null;
  }

  function addLocationButton(): HTMLButtonElement | undefined {
    return [...document.querySelectorAll<HTMLButtonElement>("button")].find((button) =>
      /add location/i.test(button.textContent ?? "")
    );
  }

  function removeLocationButton(): HTMLButtonElement | undefined {
    return document.querySelector<HTMLButtonElement>('[aria-label="Remove location"]') ?? undefined;
  }

  it("hides the location input by default for a new event", async () => {
    await renderPopover({ event: null });

    const locationInput = document.querySelector<HTMLInputElement>("#new-event-location");
    expect(locationInput === null || locationContainer() !== null).toBe(true);
    expect(addLocationButton()).toBeDefined();
  });

  it("reveals the location input when + Add location is clicked", async () => {
    await renderPopover({ event: null });

    const addButton = addLocationButton();
    expect(addButton).toBeDefined();
    await act(() => addButton?.click());

    const locationInput = document.querySelector<HTMLInputElement>("#new-event-location");
    expect(locationInput).not.toBeNull();
    expect(locationContainer()).toBeNull();
  });

  it("starts expanded with the value pre-filled when editing an event with a location", async () => {
    await renderPopover({ event: makeEvent({ location: "Room 201" }) });

    const locationInput = document.querySelector<HTMLInputElement>("#new-event-location");
    expect(locationInput).not.toBeNull();
    expect(locationInput?.value).toBe("Room 201");
    expect(locationContainer()).toBeNull();
  });

  it("hides and clears the location when the remove button is clicked", async () => {
    let submitted: EventFormValues | null = null;
    await renderPopover({
      event: makeEvent({ location: "Room 201" }),
      onSubmit: (values) => {
        submitted = values;
      },
    });

    const removeButton = removeLocationButton();
    expect(removeButton).toBeDefined();
    await act(() => removeButton?.click());

    expect(locationContainer()).not.toBeNull();
    expect(addLocationButton()).toBeDefined();

    await submitForm();

    const values = submitted as EventFormValues | null;
    expect(values?.location).toBeNull();
  });
});
