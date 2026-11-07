self.addEventListener("push", (event) => {
  let alert = null;
  try {
    alert = event.data && event.data.json();
  } catch {
    return;
  }
  if (!alert || typeof alert.id !== "string" || typeof alert.message !== "string") return;
  event.waitUntil(deliver(alert));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data;
  if (!data || typeof data.kind !== "string" || typeof data.itemId !== "string") return;
  const target = "/app?alert=" + data.kind + ":" + data.itemId;
  event.waitUntil(openTarget(target, data));
});

async function deliver(alert) {
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  const visible = windows.filter((client) => client.visibilityState === "visible" && isApp(client.url));
  if (visible.length > 0) {
    for (const client of visible) {
      client.postMessage({ type: "kalend-alert", alert });
    }
    return;
  }
  await self.registration.showNotification(alert.message, {
    tag: alert.id,
    data: { kind: alert.kind, itemId: alert.itemId },
  });
}

async function openTarget(target, data) {
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  const existing = windows.find((client) => isApp(client.url));
  if (existing) {
    await existing.focus();
    existing.postMessage({ type: "kalend-open-alert", kind: data.kind, itemId: data.itemId });
    return;
  }
  await self.clients.openWindow(target);
}

function isApp(url) {
  try {
    return new URL(url).pathname === "/app";
  } catch {
    return false;
  }
}
