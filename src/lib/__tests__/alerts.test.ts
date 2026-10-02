import { describe, expect, it } from "bun:test";
import {
  ALERT_OFFSETS,
  MISSED_AFTER_MS,
  alertMessage,
  fireAtFor,
  isAlertOffset,
  isMissed,
} from "../alerts";

describe("fireAtFor", () => {
  const start = new Date("2026-08-10T10:00:00Z");

  it("fires at the item time for offset 0", () => {
    expect(fireAtFor(start, 0).toISOString()).toBe("2026-08-10T10:00:00.000Z");
  });

  it("subtracts each offset in minutes", () => {
    expect(fireAtFor(start, 5).toISOString()).toBe("2026-08-10T09:55:00.000Z");
    expect(fireAtFor(start, 15).toISOString()).toBe("2026-08-10T09:45:00.000Z");
    expect(fireAtFor(start, 60).toISOString()).toBe("2026-08-10T09:00:00.000Z");
    expect(fireAtFor(start, 1440).toISOString()).toBe("2026-08-09T10:00:00.000Z");
  });

  it("does not change the date it was given", () => {
    fireAtFor(start, 60);
    expect(start.toISOString()).toBe("2026-08-10T10:00:00.000Z");
  });
});

describe("alertMessage", () => {
  it("reads naturally for an event", () => {
    expect(alertMessage("event", "CS 101 Lecture", 15)).toBe("CS 101 Lecture starts in 15 min");
    expect(alertMessage("event", "CS 101 Lecture", 0)).toBe("CS 101 Lecture starts now");
  });

  it("reads naturally for a task", () => {
    expect(alertMessage("task", "Essay", 60)).toBe("Essay is due in 1 hour");
    expect(alertMessage("task", "Essay", 1440)).toBe("Essay is due in 1 day");
    expect(alertMessage("task", "Essay", 0)).toBe("Essay is due now");
  });

  it("has distinct text for every offset", () => {
    const messages = ALERT_OFFSETS.map((offset) => alertMessage("event", "X", offset));
    expect(new Set(messages).size).toBe(ALERT_OFFSETS.length);
  });
});

describe("isAlertOffset", () => {
  it("accepts only the supported offsets", () => {
    for (const offset of ALERT_OFFSETS) expect(isAlertOffset(offset)).toBe(true);
    for (const bad of [-1, 1, 10, 30, "15", null, undefined, 15.5]) expect(isAlertOffset(bad)).toBe(false);
  });
});

describe("isMissed", () => {
  const fireAt = new Date("2026-08-10T10:00:00Z");

  it("is not missed when claimed within five minutes of firing", () => {
    expect(isMissed(fireAt, new Date(fireAt.getTime() + 30_000))).toBe(false);
    expect(isMissed(fireAt, new Date(fireAt.getTime() + MISSED_AFTER_MS))).toBe(false);
  });

  it("is missed once more than five minutes late", () => {
    expect(isMissed(fireAt, new Date(fireAt.getTime() + MISSED_AFTER_MS + 1))).toBe(true);
  });
});
