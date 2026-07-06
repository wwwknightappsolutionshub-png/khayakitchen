// Pilot: service worker disabled — network-only to prevent stale PWA bundles.
// Push handlers remain for future re-enablement behind a versioned SW file.

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.registration.unregister();
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
});
