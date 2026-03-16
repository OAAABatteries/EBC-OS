// EBC-OS Service Worker — Offline Cache + Notifications
// Bumping version busts old caches on deploy
const CACHE_NAME = "ebc-os-v5";
const STATIC_ASSETS = ["/", "/index.html", "/manifest.json", "/favicon-48.png", "/icon-192.png", "/icon-512.png", "/eagle-blue.png"];

// ── Install: pre-cache app shell ──
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ──
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: network-first for navigation, cache-first for assets ──
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);

  // Navigation requests (HTML pages) — network first, fallback to cache
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  // Static assets (JS/CSS/fonts/images) — cache first, then network
  if (url.pathname.startsWith("/assets/") || url.pathname.endsWith(".js") || url.pathname.endsWith(".css") || url.pathname.endsWith(".svg") || url.pathname.endsWith(".png") || url.pathname.endsWith(".woff2")) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        if (cached) return cached;
        return fetch(e.request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
          return res;
        });
      })
    );
    return;
  }

  // API calls (Anthropic) — network only, no caching
  if (url.hostname.includes("anthropic")) return;

  // Everything else — network first with cache fallback
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// ── Clock-in reminder scheduling ──
const scheduledReminders = new Map();

self.addEventListener("message", (event) => {
  const { data } = event;

  if (data?.type === "SCHEDULE_CLOCK_REMINDER") {
    const { employeeId, employeeName, scheduledTime, projectName } = data;
    const delay = scheduledTime - Date.now();

    if (scheduledReminders.has(employeeId)) {
      clearTimeout(scheduledReminders.get(employeeId));
    }

    if (delay > 0 && delay < 8 * 60 * 60 * 1000) {
      const timer = setTimeout(() => {
        self.registration.showNotification("EBC-OS · Clock In Reminder", {
          body: `${employeeName}, time to clock in${projectName ? " for " + projectName : ""}`,
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          tag: `clock-reminder-${employeeId}`,
          requireInteraction: true,
          vibrate: [200, 100, 200],
          data: { url: "/#/employee" },
        });
        scheduledReminders.delete(employeeId);
      }, delay);
      scheduledReminders.set(employeeId, timer);
    }
  }

  if (data?.type === "CANCEL_CLOCK_REMINDER") {
    const id = data.employeeId;
    if (scheduledReminders.has(id)) {
      clearTimeout(scheduledReminders.get(id));
      scheduledReminders.delete(id);
    }
    self.registration
      .getNotifications({ tag: `clock-reminder-${id}` })
      .then((notifs) => notifs.forEach((n) => n.close()));
  }
});

// ── Notification click: open/focus app ──
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});
