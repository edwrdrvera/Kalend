import { beforeEach, describe, expect, it } from "bun:test";
import { setupMockDb, type MockAuthUser, type MockDbState } from "@/test-utils/mock-db";

/** A user who guesses another user's Group id can neither change that Group nor put an item in it. */

interface MockGroup { id: string; user_id: string; category_id: string; name: string }
interface MockSpace { id: string; user_id: string; color: string }
interface MockEvent {
  id: string;
  user_id: string;
  title: string;
  start_at: Date;
  end_at: Date;
  color: string;
  color_overridden: boolean;
  category_id: string | null;
  group_id: string | null;
}

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const SPACE_A = "aaaaaaaa-0000-4000-8000-00000000000a";
const GROUP_A = "bbbbbbbb-0000-4000-8000-00000000000b"; // owned by USER_A

let mockCurrentUser: MockAuthUser | null = { id: USER_A, email: "a@example.com" };
const groupState: MockDbState<MockGroup> = { rows: [], shouldFail: false, evaluateWhere: true };
const spaceState: MockDbState<MockSpace> = { rows: [], shouldFail: false, evaluateWhere: true };
const eventState: MockDbState<MockEvent> = { rows: [], shouldFail: false, evaluateWhere: true };

setupMockDb("group-", groupState, () => mockCurrentUser, {}, true, () => [], {
  categories: spaceState,
  events: eventState,
});

import { PATCH, DELETE } from "../[id]/route";
import { POST as createEvent } from "@/app/api/events/route";

const patchBody = (body: unknown) =>
  new Request("http://localhost/api/groups/x", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
const eventRequest = (body: unknown) =>
  new Request("http://localhost/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  mockCurrentUser = { id: USER_B, email: "b@example.com" };
  groupState.rows = [{ id: GROUP_A, user_id: USER_A, category_id: SPACE_A, name: "Alice's group" }];
  spaceState.rows = [{ id: SPACE_A, user_id: USER_A, color: "red" }];
  eventState.rows = [];
});

describe("Group ownership", () => {
  it("PATCH by user B on user A's Group returns 404 and leaves it unchanged", async () => {
    const response = await PATCH(patchBody({ name: "Pwned" }), ctx(GROUP_A));
    expect(response.status).toBe(404);
    expect(groupState.rows.find((g) => g.id === GROUP_A)?.name).toBe("Alice's group");
  });

  it("DELETE by user B on user A's Group returns 404 and leaves it (and its Space) unchanged", async () => {
    const response = await DELETE(undefined, ctx(GROUP_A));
    expect(response.status).toBe(404);
    expect(groupState.rows).toHaveLength(1);
    expect(groupState.rows[0]).toMatchObject({ id: GROUP_A, user_id: USER_A });
  });

  it("user B cannot attach their own event to user A's Group by guessing its id, and nothing is written", async () => {
    const response = await createEvent(
      eventRequest({
        title: "Sneaky",
        start_at: "2026-09-08T10:00:00Z",
        end_at: "2026-09-08T11:00:00Z",
        group_id: GROUP_A,
      })
    );
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error).toBe("The selected Group is unavailable");
    expect(eventState.rows).toHaveLength(0);
    // Alice's Group is untouched: still exists, still owned by Alice, still points at her Space.
    expect(groupState.rows[0]).toMatchObject({ id: GROUP_A, user_id: USER_A, category_id: SPACE_A });
  });

  it("a 404 for someone else's Group looks the same as a 404 for a missing one", async () => {
    const forOther = await PATCH(patchBody({ name: "x" }), ctx(GROUP_A));
    const forMissing = await PATCH(patchBody({ name: "x" }), ctx("cccccccc-0000-4000-8000-000000000009"));
    expect(forOther.status).toBe(forMissing.status);
    expect(await forOther.json()).toEqual(await forMissing.json());
  });
});
