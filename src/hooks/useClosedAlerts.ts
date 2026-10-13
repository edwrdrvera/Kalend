"use client";

import { useEffect, useRef, useState } from "react";
import { mutateResource } from "@/lib/api";

export type ClosedAlertsStatus = "loading" | "unsupported" | "unconfigured" | "denied" | "off" | "on";

export interface ClosedAlertsControl {
  status: ClosedAlertsStatus;
  message: string | null;
  busy: boolean;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
}

const UNSUPPORTED = "This browser can't show alerts when Kalend is closed.";
const DENIED = "Notifications are blocked, so alerts can't arrive when Kalend is closed.";
const UNCONFIGURED = "Alerts when Kalend is closed aren't set up on this server.";
const FAILED_ON = "Couldn't turn on alerts for this device.";
const FAILED_OFF = "Couldn't turn off alerts for this device.";

function publicKey(): string {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
}

export function closedAlertsSupported(): boolean {
  return typeof window !== "undefined"
    && "Notification" in window
    && "serviceWorker" in navigator
    && "PushManager" in window;
}

function keyBytes(value: string): ArrayBuffer {
  const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return buffer;
}

function statusMessage(status: ClosedAlertsStatus): string | null {
  if (status === "unsupported") return UNSUPPORTED;
  if (status === "unconfigured") return UNCONFIGURED;
  if (status === "denied") return DENIED;
  return null;
}

interface BrowserSubscription {
  endpoint: string;
  toJSON: () => { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  unsubscribe: () => Promise<boolean>;
}

/** Turns closed-tab alerts on or off for this browser. */
export function useClosedAlerts(): ClosedAlertsControl {
  const [status, setStatus] = useState<ClosedAlertsStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!closedAlertsSupported()) {
        if (!cancelled) setStatus("unsupported");
        return;
      }
      if (!publicKey()) {
        if (!cancelled) setStatus("unconfigured");
        return;
      }
      if (window.Notification.permission === "denied") {
        if (!cancelled) setStatus("denied");
        return;
      }
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        const subscription = await registration?.pushManager.getSubscription();
        if (!cancelled) setStatus(subscription ? "on" : "off");
      } catch {
        if (!cancelled) setStatus("off");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    if (busyRef.current) return;
    setError(null);
    if (!closedAlertsSupported()) {
      setStatus("unsupported");
      return;
    }
    const key = publicKey();
    if (!key) {
      setStatus("unconfigured");
      return;
    }
    busyRef.current = true;
    setBusy(true);
    try {
      let permission = window.Notification.permission;
      if (permission === "default") permission = await window.Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js");
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes(key),
      });
      const json = subscription.toJSON();
      const endpoint = json.endpoint;
      const p256dh = json.keys?.p256dh;
      const auth = json.keys?.auth;
      if (!endpoint || !p256dh || !auth) throw new Error("The browser did not return a subscription");
      await mutateResource("/api/push/subscriptions", "POST", { endpoint, keys: { p256dh, auth } }, FAILED_ON);
      setStatus("on");
    } catch {
      setError(FAILED_ON);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function disable() {
    if (busyRef.current) return;
    setError(null);
    busyRef.current = true;
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = (await registration?.pushManager.getSubscription()) as BrowserSubscription | null | undefined;
      const endpoint = subscription?.endpoint;
      await subscription?.unsubscribe();
      if (endpoint) {
        await mutateResource("/api/push/subscriptions", "DELETE", { endpoint }, FAILED_OFF);
      }
      setStatus("off");
    } catch {
      setError(FAILED_OFF);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return {
    status,
    message: error ?? statusMessage(status),
    busy,
    enable,
    disable,
  };
}
