import { beforeEach, describe, expect, it } from "bun:test";
import { setupMockDb, type MockAuthUser, type MockDbState } from "@/test-utils/mock-db";

interface MockTask {
  id: string;
  user_id: string;
  title: string;
  completed: boolean;
  color: string;
  color_overridden: boolean;
  category_id: string | null;
  group_id: string | null;
}
interface MockSpace { id: string; user_id: string; color: string }
interface MockGroup { id: string; user_id: string; category_id: string }

const ME = "user-uuid-123";
const OTHER = "other-user-456";
const SCHOOL = "aaaaaaaa-0000-4000-8000-000000000001";
const WORK = "aaaaaaaa-0000-4000-8000-000000000002";
const THEIRS = "aaaaaaaa-0000-4000-8000-000000000003";
const BIO = "bbbbbbbb-0000-4000-8000-000000000001";
const HIST = "bbbbbbbb-0000-4000-8000-000000000002";
const THEIR_GROUP = "bbbbbbbb-0000-4000-8000-000000000003";
const MISSING_GROUP = "bbbbbbbb-0000-4000-8000-000000000009";

let mockCurrentUser: MockAuthUser | null = { id: ME, email: "student@university.edu" };
const taskState: MockDbState<MockTask> = { rows: [], shouldFail: false, evaluateWhere: true };
const spaceState: MockDbState<MockSpace> = { rows: [], shouldFail: false, evaluateWhere: true };
const groupState: MockDbState<MockGroup> = { rows: [], shouldFail: false, evaluateWhere: true };

setupMockDb("task-", taskState, () => mockCurrentUser, {}, true, () => [], {
  categories: spaceState,
  groups: groupState,
});

import { POST } from "../route";
import { PATCH } from "../[id]/route";

const request = (method: string, body: unknown) =>
  new Request("http://localhost/api/tasks", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const create = (extra: Record<string, unknown>) =>
  POST(request("POST", { title: "Read chapter", ...extra }));
const stored = (id: string) => taskState.rows.find((e) => e.id === id);

beforeEach(() => {
  mockCurrentUser = { id: ME, email: "student@university.edu" };
  spaceState.rows = [
    { id: SCHOOL, user_id: ME, color: "green" },
    { id: WORK, user_id: ME, color: "orange" },
    { id: THEIRS, user_id: OTHER, color: "red" },
  ];
  groupState.rows = [
    { id: BIO, user_id: ME, category_id: SCHOOL },
    { id: HIST, user_id: ME, category_id: SCHOOL },
    { id: THEIR_GROUP, user_id: OTHER, category_id: THEIRS },
  ];
  const base = { user_id: ME, title: "t", completed: false, color: "blue", color_overridden: false };
  taskState.rows = [
    { ...base, id: "a0000000-0000-4000-8000-000000000001", category_id: SCHOOL, group_id: BIO },
    { ...base, id: "a0000000-0000-4000-8000-000000000002", category_id: SCHOOL, group_id: null },
    { ...base, id: "a0000000-0000-4000-8000-000000000003", category_id: null, group_id: null },
    { ...base, id: "a0000000-0000-4000-8000-000000000004", user_id: OTHER, category_id: THEIRS, group_id: THEIR_GROUP },
  ];
});

describe("POST /api/tasks with a Group", () => {
  it("derives the Space from the Group", async () => {
    const response = await create({ group_id: BIO });
    expect(response.status).toBe(201);
    expect((await response.json()).data).toMatchObject({ category_id: SCHOOL, group_id: BIO, user_id: ME });
  });

  it("accepts a category_id that matches the Group's Space", async () => {
    expect((await create({ group_id: BIO, category_id: SCHOOL })).status).toBe(201);
  });

  it("rejects a category_id that is not the Group's Space and writes nothing", async () => {
    const response = await create({ group_id: BIO, category_id: WORK });
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("The selected Group belongs to a different Space");
    expect(taskState.rows).toHaveLength(4);
  });

  it("rejects a Group with category_id null", async () => {
    expect((await create({ group_id: BIO, category_id: null })).status).toBe(400);
    expect(taskState.rows).toHaveLength(4);
  });

  it("rejects another user's Group and writes nothing", async () => {
    const response = await create({ group_id: THEIR_GROUP });
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("The selected Group is unavailable");
    expect(taskState.rows).toHaveLength(4);
  });

  it("rejects a Group that does not exist", async () => {
    expect((await create({ group_id: MISSING_GROUP })).status).toBe(400);
    expect(taskState.rows).toHaveLength(4);
  });

  it("rejects a malformed group_id", async () => {
    const response = await create({ group_id: "nope" });
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("Group must be a valid identifier");
  });

  it("stores no Group when group_id is null or absent", async () => {
    expect((await (await create({ category_id: SCHOOL, group_id: null })).json()).data.group_id).toBeNull();
    expect((await (await create({ category_id: SCHOOL })).json()).data.group_id).toBeNull();
  });
});

describe("PATCH /api/tasks/[id] with a Group", () => {
  it("joins a Group and takes its Space", async () => {
    const response = await PATCH(request("PATCH", { group_id: HIST }), ctx("a0000000-0000-4000-8000-000000000003"));
    expect(response.status).toBe(200);
    expect(stored("a0000000-0000-4000-8000-000000000003")).toMatchObject({ category_id: SCHOOL, group_id: HIST });
  });

  it("moves between Groups of one Space", async () => {
    await PATCH(request("PATCH", { group_id: HIST }), ctx("a0000000-0000-4000-8000-000000000001"));
    expect(stored("a0000000-0000-4000-8000-000000000001")).toMatchObject({ category_id: SCHOOL, group_id: HIST });
  });

  it("clears the Group when the Space changes", async () => {
    const response = await PATCH(request("PATCH", { category_id: WORK }), ctx("a0000000-0000-4000-8000-000000000001"));
    expect(response.status).toBe(200);
    expect(stored("a0000000-0000-4000-8000-000000000001")).toMatchObject({ category_id: WORK, group_id: null });
  });

  it("keeps the Group when the same Space is sent again", async () => {
    await PATCH(request("PATCH", { category_id: SCHOOL }), ctx("a0000000-0000-4000-8000-000000000001"));
    expect(stored("a0000000-0000-4000-8000-000000000001")).toMatchObject({ category_id: SCHOOL, group_id: BIO });
  });

  it("leaves the Group and stays in the Space when group_id is null", async () => {
    await PATCH(request("PATCH", { group_id: null }), ctx("a0000000-0000-4000-8000-000000000001"));
    expect(stored("a0000000-0000-4000-8000-000000000001")).toMatchObject({ category_id: SCHOOL, group_id: null });
  });

  it("clears Space and Group when category_id is null", async () => {
    await PATCH(request("PATCH", { category_id: null }), ctx("a0000000-0000-4000-8000-000000000001"));
    expect(stored("a0000000-0000-4000-8000-000000000001")).toMatchObject({ category_id: null, group_id: null });
  });

  it("keeps the Group on an edit that does not name membership", async () => {
    await PATCH(request("PATCH", { title: "Renamed" }), ctx("a0000000-0000-4000-8000-000000000001"));
    expect(stored("a0000000-0000-4000-8000-000000000001")).toMatchObject({ title: "Renamed", category_id: SCHOOL, group_id: BIO });
  });

  it("rejects a conflicting Space and Group with no partial write", async () => {
    const response = await PATCH(request("PATCH", { group_id: BIO, category_id: WORK, title: "Changed" }), ctx("a0000000-0000-4000-8000-000000000002"));
    expect(response.status).toBe(400);
    expect(stored("a0000000-0000-4000-8000-000000000002")).toMatchObject({ title: "t", category_id: SCHOOL, group_id: null });
  });

  it("rejects another user's Group and leaves the task as it was", async () => {
    const response = await PATCH(request("PATCH", { group_id: THEIR_GROUP, title: "Changed" }), ctx("a0000000-0000-4000-8000-000000000002"));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("The selected Group is unavailable");
    expect(stored("a0000000-0000-4000-8000-000000000002")).toMatchObject({ title: "t", group_id: null });
  });

  it("returns 404 for another user's task even with my Group", async () => {
    const response = await PATCH(request("PATCH", { group_id: BIO }), ctx("a0000000-0000-4000-8000-000000000004"));
    expect(response.status).toBe(404);
    expect(stored("a0000000-0000-4000-8000-000000000004")?.group_id).toBe(THEIR_GROUP);
  });
});
