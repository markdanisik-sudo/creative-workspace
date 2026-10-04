// Starts the whole app on this computer with one command: `npm run local`.
// 1. checks Node.js and Docker, 2. starts the local database (Supabase),
// 3. writes .env.local with the local keys, 4. runs the app at http://localhost:3000.
import { execSync, spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
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

// 3. Environment
let status;
try {
  status = JSON.parse(run("npx supabase status -o json"));
} catch {
  fail("Could not read the database settings. Try `npx supabase stop` and run this again.");
}
const url = status.API_URL;
const key = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
if (!url || !key) fail("The database did not report its address and key.");

// Keep any other settings (e.g. a tldraw license key) the file already has.
const kept = existsSync(envPath)
  ? readFileSync(envPath, "utf8")
      .split("\n")
      .filter(
        (line) =>
          line.trim() &&
          !line.startsWith("NEXT_PUBLIC_SUPABASE_URL=") &&
          !line.startsWith("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="),
      )
  : [];
writeFileSync(
  envPath,
  [`NEXT_PUBLIC_SUPABASE_URL=${url}`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${key}`, ...kept].join(
    "\n",
  ) + "\n",
);
say("Settings written to .env.local");

// 4. App
say(`Starting the app… open http://localhost:${PORT} when it says Ready. Press Ctrl+C to stop.`);
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
