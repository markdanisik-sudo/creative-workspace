import "server-only";
import { lookup } from "node:dns";
import { Agent, fetch as undiciFetch } from "undici";
import { isPublicAddress } from "./address";

const TIMEOUT_MS = 6000;
const MAX_REDIRECTS = 4;
const MAX_HTML_BYTES = 768 * 1024;
const USER_AGENT =
  "Mozilla/5.0 (compatible; AtelierLinkPreview/1.0; +https://atelier.app) facebookexternalhit/1.1";

/**
 * Every socket this agent opens is checked against private address ranges at
 * connect time, so DNS rebinding cannot reach internal services.
 */
const guardedAgent = new Agent({
  connect: {
    lookup(hostname, options, callback) {
      lookup(hostname, { ...options, all: true }, (error, addresses) => {
        if (error) return callback(error, "", 4);
        const list = Array.isArray(addresses) ? addresses : [{ address: addresses, family: 4 }];
        const safe = list.filter((entry) => isPublicAddress(entry.address));
        if (safe.length === 0 || safe.length !== list.length) {
          return callback(new Error(`Blocked address for ${hostname}`), "", 4);
        }
        if (options.all) return callback(null, safe as never, 4);
        callback(null, safe[0].address, safe[0].family);
      });
    },
  },
});

export class UnfurlError extends Error {}

export function validatePublicUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnfurlError("Invalid URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:")
    throw new UnfurlError("Unsupported protocol");
  if (url.username || url.password) throw new UnfurlError("Credentials not allowed");
  if (url.port && url.port !== "80" && url.port !== "443")
    throw new UnfurlError("Port not allowed");
  if (
    /^\d+\.\d+\.\d+\.\d+$|^\[/.test(url.hostname) &&
    !isPublicAddress(url.hostname.replace(/^\[|\]$/g, ""))
  ) {
    throw new UnfurlError("Private address");
  }
  return url;
}

async function readLimited(body: ReadableStream<Uint8Array>, limit: number): Promise<string> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < limit) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.byteLength;
  }
  await reader.cancel().catch(() => {});
  return new TextDecoder().decode(Buffer.concat(chunks).subarray(0, limit));
}

/** Fetches an HTML page safely: public hosts only, bounded time and size. */
export async function fetchPage(rawUrl: string): Promise<{ url: string; html: string }> {
  let url = validatePublicUrl(rawUrl);
  const signal = AbortSignal.timeout(TIMEOUT_MS);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const response = await undiciFetch(url, {
      dispatcher: guardedAgent,
      redirect: "manual",
      signal,
      headers: { "user-agent": USER_AGENT, accept: "text/html,application/xhtml+xml" },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location) throw new UnfurlError("Redirect without location");
      url = validatePublicUrl(new URL(location, url).href);
      continue;
    }

    if (!response.ok || !response.body) throw new UnfurlError(`Status ${response.status}`);
    const type = response.headers.get("content-type") ?? "";
    if (!type.includes("html")) {
      await response.body.cancel();
      throw new UnfurlError("Not an HTML page");
    }
    return {
      url: url.href,
      html: await readLimited(response.body as ReadableStream<Uint8Array>, MAX_HTML_BYTES),
    };
  }
  throw new UnfurlError("Too many redirects");
}
