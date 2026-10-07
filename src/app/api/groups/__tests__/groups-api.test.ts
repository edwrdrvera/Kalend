import { beforeEach, describe, expect, it } from "bun:test";
import { setupMockDb, type MockAuthUser, type MockDbState } from "@/test-utils/mock-db";

interface MockGroup { id: string; user_id: string; category_id: string; name: string }
interface MockSpace { id: string; user_id: string; name: string }
interface MockItem { id: string; user_id: string; category_id: string | null; group_id: string | null; color: string }

const ME = "user-uuid-123";
const OTHER = "other-user-456";
const SCHOOL = "aaaaaaaa-0000-4000-8000-000000000001";
const WORK = "aaaaaaaa-0000-4000-8000-000000000002";
const THEIRS = "aaaaaaaa-0000-4000-8000-000000000003";

let mockCurrentUser: MockAuthUser | null = { id: ME, email: "student@university.edu" };
const groupState: MockDbState<MockGroup> = { rows: [], shouldFail: false, evaluateWhere: true };
const spaceState: MockDbState<MockSpace> = { rows: [], shouldFail: false, evaluateWhere: true };
const eventState: MockDbState<MockItem> = { rows: [], shouldFail: false, evaluateWhere: true };
const taskState: MockDbState<MockItem> = { rows: [], shouldFail: false, evaluateWhere: true };

setupMockDb("group-", groupState, () => mockCurrentUser, {}, true, () => [], {
  categories: spaceState,
  events: eventState,
  tasks: taskState,
});

import { GET, POST } from "../route";
import { PATCH, DELETE } from "../[id]/route";

const json = (method: string, body: unknown) =>
  new Request("http://localhost/api/groups", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  mockCurrentUser = { id: ME, email: "student@university.edu" };
  groupState.shouldFail = false;
  groupState.transactionCount = 0;
  groupState.rows = [
    { id: "bbbbbbbb-0000-4000-8000-000000000001", user_id: ME, category_id: SCHOOL, name: "BIO 102" },
    { id: "bbbbbbbb-0000-4000-8000-000000000002", user_id: ME, category_id: SCHOOL, name: "HIST 201" },
    { id: "bbbbbbbb-0000-4000-8000-000000000003", user_id: OTHER, category_id: THEIRS, name: "Their group" },
  ];
  spaceState.rows = [
    { id: SCHOOL, user_id: ME, name: "School" },
    { id: WORK, user_id: ME, name: "Work" },
    { id: THEIRS, user_id: OTHER, name: "Theirs" },
  ];
  eventState.rows = [
    { id: "evt-bio", user_id: ME, category_id: SCHOOL, group_id: "bbbbbbbb-0000-4000-8000-000000000001", color: "red" },
    { id: "evt-hist", user_id: ME, category_id: SCHOOL, group_id: "bbbbbbbb-0000-4000-8000-000000000002", color: "red" },
    { id: "evt-foreign-same-id", user_id: OTHER, category_id: THEIRS, group_id: "bbbbbbbb-0000-4000-8000-000000000001", color: "red" },
  ];
  taskState.rows = [
    { id: "task-bio", user_id: ME, category_id: SCHOOL, group_id: "bbbbbbbb-0000-4000-8000-000000000001", color: "red" },
    { id: "task-direct", user_id: ME, category_id: SCHOOL, group_id: null, color: "red" },
  ];
});

describe("GET /api/groups", () => {
  it("returns 401 when signed out", async () => {
    mockCurrentUser = null;
    expect((await GET()).status).toBe(401);
  });

  it("returns only the caller's Groups", async () => {
    const body = await (await GET()).json();
    expect(body.data.map((g: MockGroup) => g.id).sort()).toEqual(["bbbbbbbb-0000-4000-8000-000000000001", "bbbbbbbb-0000-4000-8000-000000000002"]);
  });
});

describe("POST /api/groups", () => {
  it("creates a Group in the caller's Space, owned by the caller", async () => {
    const response = await POST(json("POST", { category_id: WORK, name: "  Website redesign  " }));
    expect(response.status).toBe(201);
    const { data } = await response.json();
    expect(data).toMatchObject({ user_id: ME, category_id: WORK, name: "Website redesign" });
    expect(groupState.rows).toHaveLength(4);
  });

  it("allows two Groups with the same name in one Space", async () => {
    await POST(json("POST", { category_id: SCHOOL, name: "BIO 102" }));
    const second = await POST(json("POST", { category_id: SCHOOL, name: "BIO 102" }));
    expect(second.status).toBe(201);
  });

  it("refuses another user's Space and writes nothing", async () => {
    const response = await POST(json("POST", { category_id: THEIRS, name: "Sneaky" }));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("The selected Space is unavailable");
    expect(groupState.rows).toHaveLength(3);
  });

  it("refuses a Space that does not exist", async () => {
    const response = await POST(json("POST", { category_id: "bbbbbbbb-0000-4000-8000-000000000009", name: "x" }));
    expect(response.status).toBe(400);
    expect(groupState.rows).toHaveLength(3);
  });

  it("locks the Space while it checks ownership", async () => {
    await POST(json("POST", { category_id: SCHOOL, name: "x" }));
    expect(spaceState.lockCount).toBeGreaterThan(0);
  });

  const bad: [string, unknown, string][] = [
    ["a missing name", { category_id: SCHOOL }, "name is required"],
    ["a blank name", { category_id: SCHOOL, name: "   " }, "name is required"],
    ["a non-string name", { category_id: SCHOOL, name: 4 }, "name must be a string"],
    ["a name over 100 characters", { category_id: SCHOOL, name: "x".repeat(101) }, "name must be at most 100 characters"],
    ["a missing Space", { name: "x" }, "category_id is required"],
    ["a null Space", { category_id: null, name: "x" }, "Space must be a valid identifier"],
    ["a malformed Space", { category_id: "nope", name: "x" }, "Space must be a valid identifier"],
    ["an unknown field", { category_id: SCHOOL, name: "x", color: "red" }, "Unknown field: color"],
  ];
  for (const [label, body, error] of bad) {
    it(`rejects ${label}`, async () => {
      const response = await POST(json("POST", body));
      expect(response.status).toBe(400);
      expect((await response.json()).error).toBe(error);
      expect(groupState.rows).toHaveLength(3);
    });
  }

  it("accepts a name of exactly 100 characters", async () => {
    expect((await POST(json("POST", { category_id: SCHOOL, name: "x".repeat(100) }))).status).toBe(201);
  });
});

describe("PATCH /api/groups/[id]", () => {
  it("renames the caller's Group", async () => {
    const response = await PATCH(json("PATCH", { name: " Biology " }), ctx("bbbbbbbb-0000-4000-8000-000000000001"));
    expect(response.status).toBe(200);
    expect(groupState.rows.find((g) => g.id === "bbbbbbbb-0000-4000-8000-000000000001")?.name).toBe("Biology");
  });

  it("returns 404 for another user's Group and leaves it alone", async () => {
    const response = await PATCH(json("PATCH", { name: "Mine now" }), ctx("bbbbbbbb-0000-4000-8000-000000000003"));
    expect(response.status).toBe(404);
    expect(groupState.rows.find((g) => g.id === "bbbbbbbb-0000-4000-8000-000000000003")?.name).toBe("Their group");
  });

  it("returns 404 for a Group that does not exist", async () => {
    expect((await PATCH(json("PATCH", { name: "x" }), ctx("bbbbbbbb-0000-4000-8000-000000000009"))).status).toBe(404);
  });

  for (const key of ["category_id", "space_id"]) {
    it(`refuses ${key} because a Group never moves`, async () => {
      const response = await PATCH(json("PATCH", { [key]: WORK }), ctx("bbbbbbbb-0000-4000-8000-000000000001"));
      expect(response.status).toBe(400);
      expect((await response.json()).error).toBe("A Group cannot move to another Space");
      expect(groupState.rows.find((g) => g.id === "bbbbbbbb-0000-4000-8000-000000000001")?.category_id).toBe(SCHOOL);
    });
  }

  it("refuses a rename together with a move", async () => {
    const response = await PATCH(json("PATCH", { name: "Moved", category_id: WORK }), ctx("bbbbbbbb-0000-4000-8000-000000000001"));
    expect(response.status).toBe(400);
    expect(groupState.rows.find((g) => g.id === "bbbbbbbb-0000-4000-8000-000000000001")?.name).toBe("BIO 102");
  });

  it("refuses a blank name and an empty body", async () => {
    expect((await PATCH(json("PATCH", { name: " " }), ctx("bbbbbbbb-0000-4000-8000-000000000001"))).status).toBe(400);
    expect((await PATCH(json("PATCH", {}), ctx("bbbbbbbb-0000-4000-8000-000000000001"))).status).toBe(400);
  });

  it("returns 404 for an id that is not a uuid", async () => {
    expect((await PATCH(json("PATCH", { name: "x" }), ctx("not-a-uuid"))).status).toBe(404);
  });

  it("returns 401 when signed out", async () => {
    mockCurrentUser = null;
    expect((await PATCH(json("PATCH", { name: "x" }), ctx("bbbbbbbb-0000-4000-8000-000000000001"))).status).toBe(401);
  });
});

describe("DELETE /api/groups/[id]", () => {
  it("removes the Group and keeps its items in the Space", async () => {
    const response = await DELETE(undefined, ctx("bbbbbbbb-0000-4000-8000-000000000001"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe("bbbbbbbb-0000-4000-8000-000000000001");
    expect(body.events.map((e: MockItem) => e.id)).toEqual(["evt-bio"]);
    expect(body.tasks.map((t: MockItem) => t.id)).toEqual(["task-bio"]);
    expect(body.events[0]).toMatchObject({ category_id: SCHOOL, group_id: null, color: "red" });
    expect(groupState.rows.map((g) => g.id)).not.toContain("bbbbbbbb-0000-4000-8000-000000000001");
    expect(eventState.rows.find((e) => e.id === "evt-bio")).toMatchObject({ category_id: SCHOOL, group_id: null });
    expect(taskState.rows.find((t) => t.id === "task-bio")).toMatchObject({ category_id: SCHOOL, group_id: null });
  });

  it("leaves other Groups and other users' items alone", async () => {
    await DELETE(undefined, ctx("bbbbbbbb-0000-4000-8000-000000000001"));
    expect(eventState.rows.find((e) => e.id === "evt-hist")?.group_id).toBe("bbbbbbbb-0000-4000-8000-000000000002");
    expect(eventState.rows.find((e) => e.id === "evt-foreign-same-id")?.group_id).toBe("bbbbbbbb-0000-4000-8000-000000000001");
    expect(groupState.rows.map((g) => g.id)).toContain("bbbbbbbb-0000-4000-8000-000000000002");
  });

  it("returns 404 for another user's Group and writes nothing", async () => {
    const response = await DELETE(undefined, ctx("bbbbbbbb-0000-4000-8000-000000000003"));
    expect(response.status).toBe(404);
    expect(groupState.rows).toHaveLength(3);
    expect(eventState.rows.find((e) => e.id === "evt-foreign-same-id")?.group_id).toBe("bbbbbbbb-0000-4000-8000-000000000001");
  });

  it("returns 404 for a Group that does not exist", async () => {
    expect((await DELETE(undefined, ctx("bbbbbbbb-0000-4000-8000-000000000009"))).status).toBe(404);
  });

  it("runs in one transaction and rolls everything back when it fails", async () => {
    groupState.shouldFailOnDelete = true;
    const response = await DELETE(undefined, ctx("bbbbbbbb-0000-4000-8000-000000000001"));
    groupState.shouldFailOnDelete = false;
    expect(response.status).toBe(500);
    expect(groupState.rows.map((g) => g.id)).toContain("bbbbbbbb-0000-4000-8000-000000000001");
    expect(eventState.rows.find((e) => e.id === "evt-bio")?.group_id).toBe("bbbbbbbb-0000-4000-8000-000000000001");
    expect(taskState.rows.find((t) => t.id === "task-bio")?.group_id).toBe("bbbbbbbb-0000-4000-8000-000000000001");
  });

  it("returns 404 for an id that is not a uuid, without touching the database", async () => {
    expect((await DELETE(undefined, ctx("not-a-uuid"))).status).toBe(404);
    expect(groupState.transactionCount).toBe(0);
  });

  it("returns 401 when signed out", async () => {
    mockCurrentUser = null;
    expect((await DELETE(undefined, ctx("bbbbbbbb-0000-4000-8000-000000000001"))).status).toBe(401);
  });
});
