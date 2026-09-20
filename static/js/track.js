/**
 * Lightweight server-side activity tracking, for the parent report (parent.html).
 * Fire-and-forget: never blocks or breaks the app if it fails.
 */
const Track = (() => {
  function send(event, meta = {}) {
    try {
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event, meta }),
        keepalive: true,
      }).catch(() => {});
    } catch (e) {
      /* tracking must never break the app */
    }
  }
  function pageView(page) {
    send("page_view", { page });
  }
  return { send, pageView };
})();
