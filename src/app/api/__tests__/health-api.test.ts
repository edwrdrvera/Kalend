import { describe, expect, it } from "bun:test";
import { GET as pingGET } from "../ping/route";

describe("Health Endpoints", () => {
  describe("GET /api/ping", () => {
    it("returns 200 with pong message", async () => {
      const response = await pingGET();
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json).toEqual({ message: "pong" });
    });
  });
});
