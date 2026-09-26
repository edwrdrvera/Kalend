import { describe, expect, it } from "bun:test";
import { parseEventCreate, parseEventPatch } from "@/lib/api/event-body";
import { parseTaskCreate, parseTaskPatch } from "@/lib/api/task-body";

const SPACE_ID = "11111111-1111-4111-8111-111111111111";
const validEvent = { title: " Lecture ", start_at: "2026-08-10T10:00:00Z", end_at: "2026-08-10T11:00:00Z" };

describe("parseEventCreate", () => {
  it("returns trimmed title and parsed dates", () => {
    const result = parseEventCreate({ ...validEvent, category_id: SPACE_ID, location: null });
    expect(result).toEqual({
      ok: true,
      value: {
        title: "Lecture",
        start_at: new Date(validEvent.start_at),
        end_at: new Date(validEvent.end_at),
        category_id: SPACE_ID,
        location: null,
      },
    });
  });

  it.each([
    [{ ...validEvent, title: "  " }, "title, start_at, and end_at are required"],
    [{ ...validEvent, end_at: undefined }, "title, start_at, and end_at are required"],
    [{ ...validEvent, start_at: "nope" }, "start_at and end_at must be valid dates"],
    [{ ...validEvent, end_at: validEvent.start_at }, "start_at must be before end_at"],
    [{ ...validEvent, color: "plaid" }, "color must be a supported color"],
    [{ ...validEvent, category_id: "abc" }, "Space must be a valid identifier"],
    [{ ...validEvent, icon: "x".repeat(11) }, "icon must be a string of at most 10 characters"],
    [[], "Request body must be an object"],
  ])("rejects %j", (body, error) => {
    expect(parseEventCreate(body)).toEqual({ ok: false, error });
  });
});

describe("parseEventPatch", () => {
  it("returns only the fields that were sent", () => {
    expect(parseEventPatch({ title: " New ", category_id: null })).toEqual({
      ok: true,
      value: { title: "New", category_id: null },
    });
  });

  it.each([
    [{ title: "" }, "title is required"],
    [{ title: "   " }, "title is required"],
    [{ title: 5 }, "title must be a string"],
    [{ start_at: 5 }, "start_at must be a valid date"],
    [{ color_overridden: "yes" }, "color_overridden must be a boolean"],
    [{}, "No updatable fields provided"],
    [null, "Request body must be an object"],
  ])("rejects %j", (body, error) => {
    expect(parseEventPatch(body)).toEqual({ ok: false, error });
  });
});

describe("parseTaskCreate", () => {
  it("trims the title and leaves absent fields out", () => {
    expect(parseTaskCreate({ title: " Read ch. 3 " })).toEqual({ ok: true, value: { title: "Read ch. 3" } });
  });

  it.each([
    [{}, "title is required"],
    [{ title: " " }, "title is required"],
    [{ title: 42 }, "title must be a string"],
    [{ title: "a", due_at: "nope" }, "due_at must be a valid date"],
    [{ title: "a", category_id: "abc" }, "Space must be a valid identifier"],
    [null, "Request body must be an object"],
  ])("rejects %j", (body, error) => {
    expect(parseTaskCreate(body)).toEqual({ ok: false, error });
  });
});

describe("parseTaskPatch", () => {
  it("accepts null due_at as a clear", () => {
    expect(parseTaskPatch({ due_at: null, completed: true })).toEqual({
      ok: true,
      value: { due_at: null, completed: true },
    });
  });

  it.each([
    [{ completed: "true" }, "completed must be a boolean"],
    [{ title: "" }, "title is required"],
    [{}, "No updatable fields provided"],
    ["x", "Request body must be an object"],
  ])("rejects %j", (body, error) => {
    expect(parseTaskPatch(body)).toEqual({ ok: false, error });
  });
});

describe("unknown fields", () => {
  it.each([
    ["task create", () => parseTaskCreate({ title: "Essay", dueAt: "2026-08-10T10:00:00Z" }), "dueAt"],
    ["task patch", () => parseTaskPatch({ completed: true, user_id: SPACE_ID }), "user_id"],
    ["event create", () => parseEventCreate({ ...validEvent, start: "2026-08-10T10:00:00Z" }), "start"],
    ["event patch", () => parseEventPatch({ title: "Lab", notes: "bring laptop" }), "notes"],
  ])("%s rejects the unknown key", (_label, parse, key) => {
    expect(parse()).toEqual({ ok: false, error: `Unknown field: ${key}` });
  });
});
