// Copies tldraw's fonts, icons and translations into public/ so the canvas
// never depends on a third-party CDN. Runs after every install.
import { cpSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "node_modules", "@tldraw", "assets");
const target = join(root, "public", "tldraw");

if (!existsSync(source)) {
  console.warn("@tldraw/assets not installed; skipping asset copy.");
  process.exit(0);
}

rmSync(target, { recursive: true, force: true });
for (const folder of ["fonts", "icons", "translations", "embed-icons"]) {
  cpSync(join(source, folder), join(target, folder), { recursive: true });
}
console.log("Copied tldraw assets to public/tldraw");
