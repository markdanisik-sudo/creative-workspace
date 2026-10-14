// Starts the whole app on this computer with one command: `npm run local`.
// 1. checks Node.js and Docker, 2. starts the local database (Supabase),
// 3. writes .env.local with the local keys, 4. runs the app at http://localhost:3000
// and, on the same Wi-Fi, at http://<this computer's address>:3000 for phones.
import { execSync, spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env.local");
const PORT = process.env.PORT ?? "3000";
const MIN_NODE_MAJOR = 20;
const DOCKER_TIMEOUT_MS = 60_000;

const say = (message) => console.log(`\n▸ ${message}`);
const fail = (message) => {
  console.error(`\n✕ ${message}\n`);
  process.exit(1);
};

function run(command, options = {}) {
  return execSync(command, { cwd: root, stdio: "pipe", encoding: "utf8", ...options });
}

// 1. Requirements
say(`Node.js ${process.versions.node}`);
const nodeMajor = Number(process.versions.node.split(".")[0]);
if (nodeMajor < MIN_NODE_MAJOR) {
  fail(
    `Node.js ${MIN_NODE_MAJOR} or newer is needed (you have ${process.versions.node}). Install the LTS version from https://nodejs.org`,
  );
}

say("Checking Docker…");
try {
  // `docker version` is quick; `docker info` can stall while Docker Desktop wakes up.
  run("docker version --format {{.Server.Version}}", { timeout: DOCKER_TIMEOUT_MS });
} catch (error) {
  if (error.code === "ETIMEDOUT" || error.signal === "SIGTERM") {
    fail(
      "Docker is not responding. Click the Docker Desktop window to wake it (it may be in Resource Saver mode), wait for “Engine running”, then run this again.",
    );
  }
  fail(
    "Docker is not running. Open Docker Desktop, wait until it says “Engine running”, then try again.",
  );
}
say("Docker is running.");

// 2. Database
say("Starting the local database (the first run downloads it and can take a few minutes)…");
try {
  execSync("npx supabase start", { cwd: root, stdio: "inherit" });
} catch {
  fail("The database could not start. Make sure Docker Desktop is running and try again.");
}
// An existing database keeps its data; apply any migrations pulled since the last run.
try {
  execSync("npx supabase migration up --local", { cwd: root, stdio: "inherit" });
} catch {
  fail("The database could not be updated. Run `npx supabase migration up --local` to see why.");
}

// 3. Environment
let status;
try {
  status = JSON.parse(run("npx supabase status -o json"));
} catch {
  fail("Could not read the database settings. Try `npx supabase stop` and run this again.");
}
const localUrl = status.API_URL;
const key = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
const secretKey = status.SECRET_KEY ?? status.SERVICE_ROLE_KEY;
if (!localUrl || !key) fail("The database did not report its address and key.");

/** This computer's address on the local network (Wi-Fi), if it has one. */
function lanAddress() {
  const isPrivate = (address) => /^(192\.168|10|172\.(1[6-9]|2\d|3[01]))\./.test(address);
  // Skip virtual networks (Docker, VMs, VPNs) that phones can't reach.
  const isVirtual = (name) => /^(bridge|docker|br-|veth|vmnet|utun|vboxnet|llw|awdl)/.test(name);
  const candidates = Object.entries(networkInterfaces())
    .filter(([name]) => !isVirtual(name))
    .flatMap(([name, entries]) =>
      (entries ?? [])
        .filter((entry) => entry.family === "IPv4" && !entry.internal && isPrivate(entry.address))
        .map((entry) => ({ name, address: entry.address })),
    );
  // en0 is the Wi-Fi (or built-in Ethernet) on a Mac.
  return (
    (
      candidates.find((candidate) => candidate.name === "en0") ??
      candidates.find(
        (candidate) =>
          candidate.name.startsWith("en") ||
          candidate.name.startsWith("eth") ||
          candidate.name.startsWith("wl"),
      ) ??
      candidates[0]
    )?.address ?? null
  );
}

// Phones load the app from this computer, so the browser must reach the
// database at the network address too, not at 127.0.0.1.
// LAB_LAN_ADDRESS overrides the guess (e.g. LAB_LAN_ADDRESS=192.168.1.20 npm run local).
const lan = process.env.LAB_LAN_ADDRESS || lanAddress();
let url = localUrl;
if (lan) {
  const lanUrl = localUrl.replace(/127\.0\.0\.1|localhost/, lan);
  try {
    const response = await fetch(`${lanUrl}/auth/v1/health`, {
      headers: { apikey: key },
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) url = lanUrl;
  } catch {
    // Not reachable over the network; phones won't work, this computer will.
  }
}

// Keep any other settings (e.g. a tldraw license key) the file already has.
const kept = existsSync(envPath)
  ? readFileSync(envPath, "utf8")
      .split("\n")
      .filter(
        (line) =>
          line.trim() &&
          !line.startsWith("NEXT_PUBLIC_SUPABASE_URL=") &&
          !line.startsWith("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=") &&
          !line.startsWith("SUPABASE_SECRET_KEY="),
      )
  : [];
writeFileSync(
  envPath,
  [
    `NEXT_PUBLIC_SUPABASE_URL=${url}`,
    `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${key}`,
    // Local-only key for signing in without a password (src/lib/supabase/dev-sign-in.ts).
    `SUPABASE_SECRET_KEY=${secretKey ?? ""}`,
    // Set to false to see the sign-in page again.
    ...(kept.some((line) => line.startsWith("LAB_DEV_AUTO_SIGN_IN="))
      ? []
      : ["LAB_DEV_AUTO_SIGN_IN=true"]),
    ...kept,
  ].join("\n") + "\n",
);
say("Settings written to .env.local");

// 4. App
say("Automatic sign-in as the studio: on (local development only).");
say(`Starting the app… open http://localhost:${PORT} when it says Ready. Press Ctrl+C to stop.`);
if (url !== localUrl) {
  const phoneUrl = `http://${lan}:${PORT}`;
  say(`On your phone (same Wi-Fi as this computer), open ${phoneUrl} or scan:`);
  try {
    const { default: qrcode } = await import("qrcode-terminal");
    qrcode.generate(phoneUrl, { small: true });
  } catch {
    // The QR code is a nicety; the address above is enough.
  }
} else {
  say("Phone access is off: this computer is not on a Wi-Fi/local network.");
}
const app = spawn("npx", ["next", "dev", "-p", PORT], {
  cwd: root,
  stdio: "inherit",
  shell: process.platform === "win32",
});
app.on("exit", (code) => {
  console.log(
    "\nThe app has stopped. The database keeps running; stop it with `npm run local:stop`.",
  );
  process.exit(code ?? 0);
});
