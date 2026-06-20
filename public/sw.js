// ============================================================
// sw.js — Service Worker لإشعارات نبض
// ============================================================

const CACHE_NAME = "nabd-v1";

// تثبيت الـ SW
self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(clients.claim());
});

// ── استقبال الإشعار ─────────────────────────────────────────
self.addEventListener("push", (e) => {
  if (!e.data) return;

  let payload;
  try {
    payload = e.data.json();
  } catch {
    payload = { title: "نبض", body: e.data.text() };
  }

  const options = {
    body:    payload.body    ?? "",
    icon:    payload.icon    ?? "/Logo_Nabd_icon.png",
    badge:   payload.badge   ?? "/Logo_Nabd_badge.png",
    tag:     payload.tag     ?? "nabd-notif",
    data:    payload.data    ?? {},
    dir:     "rtl",
    lang:    "ar",
    vibrate: [200, 100, 200],
    actions: payload.actions ?? [],
    requireInteraction: payload.requireInteraction ?? false,
  };

  e.waitUntil(
    self.registration.showNotification(payload.title ?? "نبض", options)
  );
});

// ── النقر على الإشعار ────────────────────────────────────────
self.addEventListener("notificationclick", (e) => {
  e.notification.close();

  const url = e.notification.data?.url ?? "/appointments";
  const action = e.action;

  // زر "موافقة" في الإشعار
  if (action === "approve") {
    const approveUrl = e.notification.data?.approveUrl ?? "/appointments";
    e.waitUntil(clients.openWindow(approveUrl));
    return;
  }

  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      return clients.openWindow(url);
    })
  );
});
