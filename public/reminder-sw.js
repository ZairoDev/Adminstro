self.addEventListener("notificationclick", (event) => {
  const data = event.notification.data || {};
  const id = data.id;
  const url = data.url || "/dashboard/my-reminders";
  event.notification.close();

  if (event.action === "dismiss") {
    event.waitUntil(
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
        for (const client of list) {
          client.postMessage({ type: "personal-reminder-dismiss", id });
        }
      }),
    );
    return;
  }

  event.waitUntil(
    (async () => {
      const list = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of list) {
        if (!client.url.includes("/dashboard")) continue;
        await client.focus();
        if (typeof client.navigate === "function") {
          try {
            await client.navigate(url);
          } catch {
            /* The open dashboard tab is already focused. */
          }
        }
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});
