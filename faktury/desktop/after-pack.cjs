// Without a paid Apple Developer ID the app is signed "ad hoc": macOS then
// lets it run after one confirmation (System Settings → Privacy & Security →
// Open Anyway) instead of calling it damaged. The universal app is signed
// once, after its two halves are merged.
const { execFileSync } = require("node:child_process");
const path = require("node:path");

const UNIVERSAL = 4;

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== "darwin" || context.arch !== UNIVERSAL) return;
  const app = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  execFileSync("codesign", ["--force", "--deep", "--sign", "-", app], { stdio: "inherit" });
  execFileSync("codesign", ["--verify", "--deep", "--strict", "--verbose=2", app], { stdio: "inherit" });
};
