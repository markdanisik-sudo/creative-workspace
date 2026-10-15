// Runs before `next build` on Vercel (the `vercel-build` script): applies any
// new files in supabase/migrations to the hosted database, so a deploy never
// needs a terminal. Uses SUPABASE_DB_URL, or the POSTGRES_* variables the
// Vercel ↔ Supabase integration sets. Skipped when none is set.
import { execFileSync } from "node:child_process";

const dbUrl =
  process.env.SUPABASE_DB_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
if (!dbUrl) {
  console.log("▸ No database connection string is set; skipping database migrations.");
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
