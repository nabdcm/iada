// ============================================================
// sw.js — Service Worker لإشعارات نبض
// ============================================================

const CACHE_NAME = "nabd-v3";
const DATA_CACHE  = "nabd-data-v1";

// تثبيت الـ SW
self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME && k !== DATA_CACHE).map(k => caches.delete(k)))
    ).then(() => clients.claim())
  );
});

// ── وضع Offline: تخزين مؤقت للتصفح والبيانات ─────────────────
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // بيانات الصيدلية: network-first مع fallback للنسخة المخزنة (قراءة عند انقطاع النت)
  if (url.pathname.startsWith("/api/pharmacy/data")) {
    e.respondWith(
      fetch(req).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(DATA_CACHE).then(c => c.put(req, clone));
        }
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }
  if (url.pathname.startsWith("/api/")) return;

  // التصفح: network-first مع fallback للصفحة المخزنة
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, clone));
        return res;
      }).catch(() => caches.match(req).then(m => m || caches.match("/pharmacy")))
    );
    return;
  }

  // ملفات ثابتة (_next, صور, خطوط): stale-while-revalidate
  e.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
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
