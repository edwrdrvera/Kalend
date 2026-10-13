import { describe, expect, it } from "bun:test";
import { eventAccessibleName } from "../event-accessible-name";

describe("eventAccessibleName", () => {
  it("names a timed event with its Space, weekday, date, and time range", () => {
    const name = eventAccessibleName(
      {
        title: "Calculus problem set",
        start_at: new Date(2025, 9, 7, 9, 0).toISOString(),
        end_at: new Date(2025, 9, 7, 10, 0).toISOString(),
      },
      "School"
    );

    expect(name).toBe("Calculus problem set, School, Tuesday October 7, 9:00 AM to 10:00 AM");
  });

  it("names a multi-day event by its date range, without times", () => {
    const name = eventAccessibleName(
      {
        title: "Spring break",
        start_at: new Date(2025, 2, 15, 0, 0).toISOString(),
        end_at: new Date(2025, 2, 17, 0, 0).toISOString(),
      },
      "School"
    );

    expect(name).toBe("Spring break, School, Saturday March 15 to Monday March 17");
  });

  it("leaves the Space out when the event has none", () => {
    const name = eventAccessibleName(
      {
        title: "Dentist",
        start_at: new Date(2025, 9, 7, 14, 30).toISOString(),
        end_at: new Date(2025, 9, 7, 15, 0).toISOString(),
      },
      null
    );

    expect(name).toBe("Dentist, Tuesday October 7, 2:30 PM to 3:00 PM");
  });
});
