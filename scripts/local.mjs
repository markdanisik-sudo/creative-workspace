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

const say = (message) => console.log(`\n▸ ${message}`);
const fail = (message) => {
  console.error(`\n✕ ${message}\n`);
  process.exit(1);
};

function run(command, options = {}) {
  return execSync(command, { cwd: root, stdio: "pipe", encoding: "utf8", ...options });
}

// 1. Requirements
const nodeMajor = Number(process.versions.node.split(".")[0]);
if (nodeMajor < MIN_NODE_MAJOR) {
  fail(
    `Node.js ${MIN_NODE_MAJOR} or newer is needed (you have ${process.versions.node}). Install the LTS version from https://nodejs.org`,
  );
}

try {
  run("docker info");
} catch {
  fail(
    "Docker is not running. Open Docker Desktop, wait until it says it is running, then try again.",
  );
}

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
