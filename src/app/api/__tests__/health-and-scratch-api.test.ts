import { describe, expect, it } from "bun:test";
import { GET as pingGET } from "../ping/route";
import { GET as testGET, POST as testPOST } from "../test/route";

describe("Health and Scratch Endpoints", () => {
  describe("GET /api/ping", () => {
    it("returns 200 with pong message", async () => {
      const response = await pingGET();
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json).toEqual({ message: "pong" });
    });
  });

  describe("GET and POST /api/test", () => {
    it("GET returns mock test events", async () => {
      const response = await testGET();
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBe(2);
    });

    it("POST echoes back the request payload", async () => {
      const payload = { sampleKey: "sampleValue", number: 42 };
      const req = new Request("http://localhost/api/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const response = await testPOST(req);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.message).toBe("Data received successfully");
      expect(json.echo).toEqual(payload);
    });
  });
});
