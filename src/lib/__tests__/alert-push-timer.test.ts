import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const service = readFileSync(new URL("../../../guides/kalend-alert-push.service", import.meta.url), "utf8");
const timer = readFileSync(new URL("../../../guides/kalend-alert-push.timer", import.meta.url), "utf8");
const guide = readFileSync(new URL("../../../guides/alert-push-timer.md", import.meta.url), "utf8");
const example = readFileSync(new URL("../../../.env.example", import.meta.url), "utf8");

const ENV_NAMES = [
  "VAPID_PRIVATE_KEY",
  "VAPID_SUBJECT",
  "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
  "ALERT_PUSH_SECRET",
];

describe("alert push timer", () => {
  it("runs the check once a minute and does not catch up after downtime", () => {
    expect(timer).toContain("OnUnitActiveSec=1min");
    expect(timer).toContain("OnBootSec=1min");
    expect(timer).not.toContain("Persistent=");
  });

  it("calls the configured address with the secret from the environment file", () => {
    expect(service).toContain("-X POST");
    expect(service).toContain('"$ALERT_PUSH_URL"');
    expect(service).not.toContain("127.0.0.1");
    expect(service).not.toContain("vercel.app");
    expect(service).toContain('Authorization: Bearer $ALERT_PUSH_SECRET');
    expect(service).toContain("EnvironmentFile=/etc/kalend/alert-push.env");
    expect(service).not.toMatch(/Bearer [A-Za-z0-9+/=]{16,}/);
  });

  it("tells the owner how to aim the timer at a VPS or at Vercel", () => {
    expect(guide).toContain("once a minute");
    expect(guide).toContain("systemd");
    expect(guide).toContain("ALERT_PUSH_URL=http://127.0.0.1/api/alerts/push-due");
    expect(guide).toContain("ALERT_PUSH_URL=https://your-app.vercel.app/api/alerts/push-due");
    expect(guide).toContain("When Kalend is hosted on Vercel");
    expect(guide).toContain("systemctl enable --now kalend-alert-push.timer");
    expect(guide).toContain("The owner installs this timer");
  });

  it("documents the push keys and leaves every value empty", () => {
    for (const name of ENV_NAMES) {
      const line = example.split("\n").find((row) => row.startsWith(`${name}=`));
      expect(line).toBe(`${name}=`);
    }
    expect(example.split("\n").some((row) => row.startsWith("VAPID_PUBLIC_KEY="))).toBe(false);
    expect(example).toContain("baked into the client at build time");
    expect(example).toContain("Rotating it needs a rebuild.");
    expect(guide).toContain("baked into the client at build time");
    expect(guide).toContain("Rotating it needs a rebuild.");
    expect(example).toContain("Never commit real values.");
    expect(example).toContain("Never commit it.");
  });

  it("says an unfinished claim left past its time stays marked sent", () => {
    expect(guide).toContain("If the timer stays stopped until that unfinished claim's time has passed, the alert stays marked sent and is not listed as missed.");
  });
});
