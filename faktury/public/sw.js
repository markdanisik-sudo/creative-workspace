// Faktury service worker: only shows a calm offline screen instead of the
// browser's error page when a page can't load. Nothing is cached, so the app
// is never stale.
const OFFLINE_HTML = `<!doctype html>
<html lang="cs"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Faktury</title>
<style>
  :root { color-scheme: light dark; --bg: #ecebe8; --text: #0e0e0d; --muted: #6f6e69; }
  @media (prefers-color-scheme: dark) { :root { --bg: #0e0e0d; --text: #f4f3f1; --muted: #8e8d88; } }
  html, body { height: 100%; margin: 0; }
  body { background: var(--bg); color: var(--text); display: flex; align-items: center;
    justify-content: center; text-align: center; padding: 24px;
    font: 15px/1.45 -apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif; }
  h1 { font-size: 28px; font-weight: 600; letter-spacing: -0.02em; margin: 0 0 8px; }
  p { color: var(--muted); margin: 0 0 24px; }
  button { font: inherit; font-weight: 600; border: 0; border-radius: 999px; padding: 12px 22px;
    background: var(--text); color: var(--bg); }
</style></head>
<body><main>
  <h1>Jsi offline</h1>
  <p>Zkontroluj připojení k internetu.</p>
  <button onclick="location.reload()">Zkusit znovu</button>
</main></body></html>`;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(
      () => new Response(OFFLINE_HTML, { headers: { "content-type": "text/html; charset=utf-8" } }),
    ),
  );
});
