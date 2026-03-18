// ═══════════════════════════════════════════════════════════════
//  EBC-OS · Service Worker — Full Offline PWA
//  Cache strategies: shell pre-cache, runtime cache, offline fallback
//  Version bump triggers cache bust on deploy
// ═══════════════════════════════════════════════════════════════

const CACHE_VERSION = "v8";
const SHELL_CACHE  = "ebc-shell-" + CACHE_VERSION;
const RUNTIME_CACHE = "ebc-runtime-" + CACHE_VERSION;
const FONT_CACHE   = "ebc-fonts-v1"; // fonts rarely change, separate long-lived cache
const DRAWINGS_CACHE = "ebc-drawings-v1"; // cached PDFs for offline viewing

// App shell — pre-cached on install
const SHELL_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon-16.png",
  "/favicon-32.png",
  "/favicon-48.png",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/eagle.png",
  "/eagle-gold.png",
];

// ── Install: pre-cache app shell ──────────────────────────────
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate: clean old caches, claim clients ─────────────────
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== RUNTIME_CACHE && k !== FONT_CACHE && k !== DRAWINGS_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => {
      // Notify all clients that a new version is active
      self.clients.matchAll({ type: "window" }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: "SW_UPDATED", version: CACHE_VERSION });
        });
      });
    })
  );
  self.clients.claim();
});

// ── Fetch: smart caching strategies ───────────────────────────
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;

  const url = new URL(e.request.url);

  // Skip Supabase API calls — always network
  if (url.hostname.includes("supabase")) return;
  // Skip Anthropic API — always network
  if (url.hostname.includes("anthropic")) return;
  // Skip chrome-extension and other non-http
  if (!url.protocol.startsWith("http")) return;

  // ── Google Fonts: cache-first (long-lived) ──
  if (url.hostname.includes("fonts.googleapis.com") || url.hostname.includes("fonts.gstatic.com")) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        if (cached) return cached;
        return fetch(e.request).then((res) => {
          const clone = res.clone();
          caches.open(FONT_CACHE).then((c) => c.put(e.request, clone));
          return res;
        });
      })
    );
    return;
  }

  // ── Navigation (HTML pages): network-first, fallback to cached shell ──
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  // ── Vite hashed assets (/assets/*): cache-first (immutable by hash) ──
  if (url.pathname.startsWith("/assets/")) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        if (cached) return cached;
        return fetch(e.request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(RUNTIME_CACHE).then((c) => c.put(e.request, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // ── Static assets (icons, images): stale-while-revalidate ──
  if (
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".woff2")
  ) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        const fetchPromise = fetch(e.request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(SHELL_CACHE).then((c) => c.put(e.request, clone));
          }
          return res;
        });
        return cached || fetchPromise;
      })
    );
    return;
  }

  // ── Leaflet tiles: cache-first with network fallback ──
  if (url.hostname.includes("tile.openstreetmap") || url.hostname.includes("basemaps.cartocdn")) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        if (cached) return cached;
        return fetch(e.request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(RUNTIME_CACHE).then((c) => c.put(e.request, clone));
          }
          return res;
        }).catch(() => new Response("", { status: 408 }));
      })
    );
    return;
  }

  // ── Everything else: network-first with cache fallback ──
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// ── Clock-in reminder scheduling ──────────────────────────────
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

  // ── Generic one-shot notification ──
  if (data?.type === "SHOW_NOTIFICATION") {
    const { title, body, tag, url, icon } = data;
    self.registration.showNotification(title || "EBC-OS", {
      body: body || "",
      icon: icon || "/icon-192.png",
      badge: "/icon-192.png",
      tag: tag || "ebc-general",
      vibrate: [200, 100, 200],
      data: { url: url || "/" },
    });
  }

  // ── Daily report reminder ──
  const reportReminders = self._reportReminders || (self._reportReminders = new Map());

  if (data?.type === "SCHEDULE_DAILY_REPORT_REMINDER") {
    const { employeeId, employeeName, scheduledTime } = data;
    const delay = scheduledTime - Date.now();

    if (reportReminders.has(employeeId)) {
      clearTimeout(reportReminders.get(employeeId));
    }

    if (delay > 0 && delay < 12 * 60 * 60 * 1000) {
      const timer = setTimeout(() => {
        self.registration.showNotification("EBC-OS · Daily Report", {
          body: `${employeeName}, don't forget to submit your daily report before leaving`,
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          tag: `report-reminder-${employeeId}`,
          requireInteraction: true,
          vibrate: [200, 100, 200],
          data: { url: "/#/foreman" },
        });
        reportReminders.delete(employeeId);
      }, delay);
      reportReminders.set(employeeId, timer);
    }
  }

  if (data?.type === "CANCEL_DAILY_REPORT_REMINDER") {
    const id = data.employeeId;
    if (reportReminders.has(id)) {
      clearTimeout(reportReminders.get(id));
      reportReminders.delete(id);
    }
    self.registration
      .getNotifications({ tag: `report-reminder-${id}` })
      .then((notifs) => notifs.forEach((n) => n.close()));
  }

  // Skip waiting when user clicks "Update"
  if (data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ── Real push events (from VAPID/web-push server) ────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;
  try {
    const payload = event.data.json();
    const { title, body, tag, url, icon } = payload;
    event.waitUntil(
      self.registration.showNotification(title || "EBC-OS", {
        body: body || "",
        icon: icon || "/icon-192.png",
        badge: "/icon-192.png",
        tag: tag || "ebc-push",
        vibrate: [200, 100, 200],
        data: { url: url || "/" },
      })
    );
  } catch {
    // Fallback for plain text payloads
    event.waitUntil(
      self.registration.showNotification("EBC-OS", {
        body: event.data.text(),
        icon: "/icon-192.png",
        badge: "/icon-192.png",
      })
    );
  }
});

// ── Notification click: open/focus app ────────────────────────
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
