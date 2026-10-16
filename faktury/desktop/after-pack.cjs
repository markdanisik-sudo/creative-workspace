// Puts the app's server (built by scripts/build-desktop-server.mjs) into
// Contents/Resources/server. Copied here rather than through extraResources,
// which leaves out its node_modules.
//
// Without a paid Apple Developer ID the app is signed "ad hoc": macOS then
// lets it run after one confirmation (System Settings → Privacy & Security →
// Open Anyway) instead of calling it damaged. The universal app is signed
// once, after its two halves are merged.
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const UNIVERSAL = 4;

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== "darwin" || context.arch !== UNIVERSAL) return;
  const app = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  const source = path.join(__dirname, "..", ".next", "standalone");
  const target = path.join(app, "Contents", "Resources", "server");
  if (!fs.existsSync(path.join(source, "node_modules", "next"))) {
    throw new Error(`The server build is missing: ${source}`);
  }
  fs.rmSync(target, { recursive: true, force: true });
  fs.cpSync(source, target, { recursive: true, verbatimSymlinks: true });
  execFileSync("codesign", ["--force", "--deep", "--sign", "-", app], { stdio: "inherit" });
  execFileSync("codesign", ["--verify", "--deep", "--strict", "--verbose=2", app], { stdio: "inherit" });
};
