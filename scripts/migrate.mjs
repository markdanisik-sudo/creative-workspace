// Runs before `next build` on Vercel (the `vercel-build` script): applies any
// new files in supabase/migrations to the hosted database, so a deploy never
// needs a terminal. Skipped when SUPABASE_DB_URL is not set.
import { execFileSync } from "node:child_process";

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.log("▸ SUPABASE_DB_URL is not set; skipping database migrations.");
  process.exit(0);
}

console.log("▸ Applying database migrations…");
try {
  execFileSync("npx", ["supabase", "db", "push", "--db-url", dbUrl, "--include-all", "--yes"], {
    stdio: "inherit",
  });
} catch {
  console.error(
    "\n✕ The database could not be updated. Check SUPABASE_DB_URL (use the Session pooler connection string from Supabase → Connect, with your database password).\n",
  );
  process.exit(1);
}
