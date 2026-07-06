self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title ?? "Khaya Kitchen";
  const body = data.body ?? data.message ?? "You have an update";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icon.svg",
      badge: "/icon.svg",
      data: data.data ?? {},
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data ?? {};
  const targetUrl =
    (typeof data.url === "string" && data.url) ||
    (data.campaign_id ? `/menu?campaign=${data.campaign_id}` : "/menu");
  event.waitUntil(clients.openWindow(targetUrl));
});

const CACHE_NAME = "khaya-kitchen-v4";

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(["/offline", "/manifest.json", "/icon.svg"])),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));

      const windowClients = await self.clients.matchAll({ type: "window" });
      await Promise.all(
        windowClients.map((client) => {
          if ("navigate" in client) {
            return client.navigate(client.url);
          }
          return client.focus();
        }),
      );
    })(),
  );
  self.clients.claim();
});

function isHtmlNavigation(request) {
  return (
    request.mode === "navigate" ||
    request.destination === "document" ||
    (request.headers.get("accept") || "").includes("text/html")
  );
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api/") || url.hostname !== self.location.hostname) {
    return;
  }

  if (url.pathname === "/sw.js" || url.pathname.startsWith("/_next/")) {
    return;
  }

  if (isHtmlNavigation(event.request)) {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(event.request).then((cached) => cached || caches.match("/offline")),
      ),
    );
  }
});
