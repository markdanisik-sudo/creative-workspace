// Builds the self-contained server the Mac app runs (.next/standalone),
// with the static files it serves next to it.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, rmSync } from "node:fs";

const env = { ...process.env, FAKTURY_DESKTOP_BUILD: "1" };
// The desktop app has no Supabase; keep any local web settings out of the bundle.
for (const name of Object.keys(env)) if (name.includes("SUPABASE")) delete env[name];

rmSync(".next", { recursive: true, force: true });
execFileSync("npx", ["next", "build"], { stdio: "inherit", env });

if (!existsSync(".next/standalone/server.js")) {
  console.error("✕ .next/standalone/server.js is missing");
  process.exit(1);
}
cpSync("public", ".next/standalone/public", { recursive: true });
cpSync(".next/static", ".next/standalone/.next/static", { recursive: true });
// Image optimisation isn't used; its native modules would differ between
// Intel and Apple silicon and block a single (universal) Mac app.
for (const dir of ["sharp", "@img"]) {
  rmSync(`.next/standalone/node_modules/${dir}`, { recursive: true, force: true });
}
// Never ship local settings.
for (const file of [".env", ".env.local"]) rmSync(`.next/standalone/${file}`, { force: true });
console.log("✓ Desktop server ready in .next/standalone");
