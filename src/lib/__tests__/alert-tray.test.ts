import { describe, expect, it } from "bun:test";
import { format } from "date-fns";
import { alertTrayReducer, dueMessage, emptyAlertTray, missedMessage } from "../alert-tray";
import type { ClaimedAlert } from "../calendar-types";

const lecture: ClaimedAlert = {
  id: "a1",
  kind: "event",
  item_id: "e1",
  title: "CS 101 Lecture",
  offset_minutes: 15,
  fire_at: "2026-08-10T09:45:00Z",
};
const essay: ClaimedAlert = {
  id: "a2",
  kind: "task",
  item_id: "t1",
  title: "Essay",
  offset_minutes: 60,
  fire_at: "2026-08-10T22:00:00Z",
};

describe("messages", () => {
  it("words a due alert from its offset", () => {
    expect(dueMessage(lecture)).toEqual({
      id: "a1",
      kind: "event",
      itemId: "e1",
      text: "CS 101 Lecture starts in 15 min",
    });
    expect(dueMessage(essay).text).toBe("Essay is due in 1 hour");
  });

  it("words a missed alert as a past reminder, not a countdown", () => {
    const message = missedMessage(lecture);
    expect(message.text).toBe(`CS 101 Lecture (reminder at ${format(new Date(lecture.fire_at), "MMM d, h:mm a")})`);
    expect(message.text).not.toContain("starts in");
  });
});

describe("alertTrayReducer", () => {
  it("sorts a claim into the due and missed lists", () => {
    const tray = alertTrayReducer(emptyAlertTray, { type: "claimed", claim: { due: [lecture], missed: [essay] } });
    expect(tray.due.map((m) => m.id)).toEqual(["a1"]);
    expect(tray.missed.map((m) => m.id)).toEqual(["a2"]);
  });

  it("ignores an alert it already holds", () => {
    const once = alertTrayReducer(emptyAlertTray, { type: "claimed", claim: { due: [lecture], missed: [] } });
    const twice = alertTrayReducer(once, { type: "claimed", claim: { due: [lecture], missed: [] } });
    expect(twice).toBe(once);
  });

  it("keeps earlier messages when a new claim arrives", () => {
    const first = alertTrayReducer(emptyAlertTray, { type: "claimed", claim: { due: [lecture], missed: [] } });
    const second = alertTrayReducer(first, { type: "claimed", claim: { due: [essay], missed: [] } });
    expect(second.due.map((m) => m.id)).toEqual(["a1", "a2"]);
  });

  it("dismisses one message from either list", () => {
    const tray = alertTrayReducer(emptyAlertTray, { type: "claimed", claim: { due: [lecture], missed: [essay] } });
    expect(alertTrayReducer(tray, { type: "dismiss", id: "a1" }).due).toEqual([]);
    expect(alertTrayReducer(tray, { type: "dismiss", id: "a2" }).missed).toEqual([]);
    expect(alertTrayReducer(tray, { type: "dismiss", id: "a1" }).missed).toHaveLength(1);
  });

  it("adds a notice and dismisses it by id", () => {
    const notice = { id: "n1", text: "That event no longer exists." };
    const tray = alertTrayReducer(emptyAlertTray, { type: "notice", notice });
    expect(tray.notices).toEqual([notice]);
    expect(alertTrayReducer(tray, { type: "dismiss", id: "n1" }).notices).toEqual([]);
  });

  it("keeps notices when a claim arrives", () => {
    const notice = { id: "n1", text: "x" };
    const withNotice = alertTrayReducer(emptyAlertTray, { type: "notice", notice });
    const next = alertTrayReducer(withNotice, { type: "claimed", claim: { due: [lecture], missed: [] } });
    expect(next.notices).toEqual([notice]);
  });

  it("clears the whole missed list and leaves due messages", () => {
    const tray = alertTrayReducer(emptyAlertTray, { type: "claimed", claim: { due: [lecture], missed: [essay] } });
    const cleared = alertTrayReducer(tray, { type: "clearMissed" });
    expect(cleared.missed).toEqual([]);
    expect(cleared.due).toHaveLength(1);
  });
});
