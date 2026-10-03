import { describe, expect, it } from "bun:test";
import { alertPermissionPlan } from "../alert-permission";

describe("alertPermissionPlan", () => {
  it("asks only when the browser has not been asked yet", () => {
    expect(alertPermissionPlan("default")).toBe("ask");
  });

  it("never asks again once the user answered", () => {
    expect(alertPermissionPlan("granted")).toBe("none");
    expect(alertPermissionPlan("denied")).toBe("none");
  });

  it("explains in-app-only alerts when the browser has no notifications", () => {
    expect(alertPermissionPlan("unsupported")).toBe("explain");
  });
});
