import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const service = readFileSync(new URL("../../../guides/kalend-alert-push.service", import.meta.url), "utf8");
const timer = readFileSync(new URL("../../../guides/kalend-alert-push.timer", import.meta.url), "utf8");
const guide = readFileSync(new URL("../../../guides/alert-push-timer.md", import.meta.url), "utf8");
const example = readFileSync(new URL("../../../.env.example", import.meta.url), "utf8");

const ENV_NAMES = [
  "VAPID_PUBLIC_KEY",
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

  it("calls the check on localhost with the secret from the environment file", () => {
    expect(service).toContain("-X POST");
    expect(service).toContain("http://127.0.0.1/api/alerts/push-due");
    expect(service).toContain('Authorization: Bearer $ALERT_PUSH_SECRET');
    expect(service).toContain("EnvironmentFile=/etc/kalend/alert-push.env");
    expect(service).not.toMatch(/Bearer [A-Za-z0-9+/=]{16,}/);
  });

  it("tells the owner to install the systemd timer on the server", () => {
    expect(guide).toContain("once a minute");
    expect(guide).toContain("systemd");
    expect(guide).toContain("127.0.0.1");
    expect(guide).toContain("systemctl enable --now kalend-alert-push.timer");
    expect(guide).toContain("The owner installs this timer");
  });

  it("documents the push keys and leaves every value empty", () => {
    for (const name of ENV_NAMES) {
      const line = example.split("\n").find((row) => row.startsWith(`${name}=`));
      expect(line).toBe(`${name}=`);
    }
    expect(example).toContain("Never commit real values.");
    expect(example).toContain("Never commit it.");
  });
});
