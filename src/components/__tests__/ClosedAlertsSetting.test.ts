import { afterEach, describe, expect, it, mock } from "bun:test";

mock.module("next/navigation", () => ({
  useRouter: () => ({ replace() {}, refresh() {}, push() {} }),
}));
import { act, createElement } from "react";
import type { Root } from "react-dom/client";
import type { ClosedAlertsControl } from "@/hooks/useClosedAlerts";
import "./test-dom";

const { createRoot } = await import("react-dom/client");
const { ThemeProvider } = await import("@/lib/theme");
const { default: ClosedAlertsSetting } = await import("../ClosedAlertsSetting");
const { default: SettingsMenu } = await import("../SettingsMenu");

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  if (root) await act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  document.body.replaceChildren();
});

function control(over: Partial<ClosedAlertsControl> = {}): ClosedAlertsControl {
  return {
    status: "off",
    message: null,
    busy: false,
    enable: mock(async () => {}),
    disable: mock(async () => {}),
    ...over,
  };
}

async function mount(node: ReturnType<typeof createElement>) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(() => root?.render(node));
}

describe("ClosedAlertsSetting", () => {
  it("turns the setting on from the switch", async () => {
    const value = control();
    await mount(createElement(ClosedAlertsSetting, { control: value }));
    const button = document.querySelector("[aria-label='Alerts when Kalend is closed']");
    expect(button?.getAttribute("aria-pressed")).toBe("false");
    await act(() => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(value.enable).toHaveBeenCalled();
  });

  it("turns the setting off when it is already on", async () => {
    const value = control({ status: "on" });
    await mount(createElement(ClosedAlertsSetting, { control: value }));
    const button = document.querySelector("[aria-label='Alerts when Kalend is closed']");
    expect(button?.getAttribute("aria-pressed")).toBe("true");
    await act(() => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(value.disable).toHaveBeenCalled();
    expect(value.enable).not.toHaveBeenCalled();
  });

  it("shows the plain message and does not ask when the browser can't", async () => {
    const value = control({
      status: "unsupported",
      message: "This browser can't show alerts when Kalend is closed.",
    });
    await mount(createElement(ClosedAlertsSetting, { control: value }));
    const button = document.querySelector("[aria-label='Alerts when Kalend is closed']") as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(document.body.textContent).toContain("This browser can't show alerts when Kalend is closed.");
    await act(() => {
      button.click();
    });
    expect(value.enable).not.toHaveBeenCalled();
  });
});

describe("SettingsMenu", () => {
  it("offers alerts when Kalend is closed", async () => {
    await mount(createElement(ThemeProvider, null, createElement(SettingsMenu)));
    const trigger = document.querySelector("[aria-label='Settings']") as HTMLButtonElement;
    await act(async () => {
      trigger.click();
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(document.body.textContent).toContain("Alerts when Kalend is closed");
  });
});
